import { useEffect } from 'react';
import { CommandeMetier } from '../types/business.types';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../utils/role-helpers';

interface ExpirationHookOptions {
    commandes: CommandeMetier[];
    onCommandesUpdated: () => Promise<void>;
    enabled?: boolean;
}

export const useCommandeExpiration = ({ 
    commandes, 
    onCommandesUpdated, 
    enabled = true 
}: ExpirationHookOptions) => {
    const { dataService } = useOffline();
    const { user } = useAuth();

    const checkExpiredCommandes = async () => {
        console.log('🔍 checkExpiredCommandes appelé');
        console.log('🔍 enabled:', enabled, 'user:', user?.role, 'isAdmin:', isAdminRole(user?.role));

        if (!enabled || !user || !isAdminRole(user?.role)) {
            console.log('⚠️ Expiration désactivée ou utilisateur non admin');
            return; // Seuls les admins peuvent déclencher l'expiration automatique
        }

        // ✅ Utiliser le fuseau horaire français pour les comparaisons
        const todayFranceStr = new Date().toLocaleDateString('en-CA', {
            timeZone: 'Europe/Paris'
        });
        const todayFrance = new Date(todayFranceStr + 'T00:00:00'); // Conversion en Date pour comparaison robuste

        console.log(`📅 Date du jour (France): ${todayFranceStr}`);
        console.log(`📅 Nombre total de commandes: ${commandes.length}`);

        const commandesToProcess: { commande: CommandeMetier; action: 'cancel' | 'archive' }[] = [];

        commandes.forEach(commande => {
            const livraisonDate = commande.dates?.livraison || commande.dateLivraison;
            if (!livraisonDate) return;

            // ✅ Convertir la date de livraison en Date object pour comparaison native
            const itemDate = new Date(livraisonDate);
            const itemDateStr = itemDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

            // ✅ Vérifier si la date de livraison est passée (comparaison Date, pas String)
            if (itemDate < todayFrance) {
                const statutCommande = commande.statuts?.commande;
                const statutLivraison = commande.statuts?.livraison;

                // ✅ EXCLUSION : Ignorer les commandes déjà livrées (statut final positif)
                if (statutLivraison === 'LIVREE') {
                    return; // Commandes livrées ne sont jamais considérées comme expirées
                }

                // Règle 1 : Commandes en attente/confirmées expirées → Annulation automatique
                if (
                    (statutCommande === 'En attente' || statutCommande === 'Confirmée') &&
                    (statutLivraison === 'EN ATTENTE' || statutLivraison === 'CONFIRMEE')
                ) {
                    console.log(`✅ Commande ${commande.numeroCommande} → À ANNULER`);
                    commandesToProcess.push({
                        commande,
                        action: 'cancel'
                    });
                }
                // Règle 2 : Commandes déjà annulées expirées → Mise en historique
                else if (
                    statutCommande === 'Annulée' &&
                    statutLivraison === 'ANNULEE'
                ) {
                    console.log(`✅ Commande ${commande.numeroCommande} → À ARCHIVER`);
                    commandesToProcess.push({
                        commande,
                        action: 'archive'
                    });
                }
                // Note : Autres statuts (En cours, En route, etc.) avec date passée sont ignorés
            }
        });

        // Traitement des commandes expirées
        if (commandesToProcess.length === 0) {
            console.log('ℹ️ Aucune commande expirée à traiter');
            return;
        }

        console.log(`📅 Traitement automatique de ${commandesToProcess.length} commande(s) expirée(s)`);

        for (const { commande, action } of commandesToProcess) {
            try {
                if (action === 'cancel') {
                    // Annuler la commande automatiquement (statutCommande ET statutLivraison)
                    await dataService.updateStatutsCommande(
                        commande.id,
                        'Annulée',        // statutCommande
                        'ANNULEE',        // statutLivraison
                        'Expiration automatique - Date de livraison passée'  // reason
                    );
                    console.log(`❌ Commande ${commande.numeroCommande} annulée automatiquement (expirée)`);
                }
                else if (action === 'archive') {
                    // Pour l'archivage, on pourrait ajouter un champ "archived" ou déplacer vers un système d'historique
                    // Pour l'instant, on logge simplement l'action
                    console.log(`📁 Commande ${commande.numeroCommande} devrait être archivée (déjà annulée et expirée)`);

                    // Si vous avez un système d'archivage, vous pouvez l'appeler ici :
                    // await dataService.archiveCommande(commande.id);
                }
            } catch (error) {
                console.error(`❌ Erreur lors du traitement automatique de la commande ${commande.numeroCommande}:`, error);
            }
        }

        // Rafraîchir les données après traitement
        await onCommandesUpdated();
    };

    useEffect(() => {
        if (enabled && commandes.length > 0) {
            checkExpiredCommandes();
        }
    }, [commandes.length, enabled, user?.role]); // Se déclenche quand les commandes sont chargées

    // Vérification périodique (optionnelle - toutes les 10 minutes)
    useEffect(() => {
        if (!enabled || !isAdminRole(user?.role)) return;

        const interval = setInterval(() => {
            if (commandes.length > 0) {
                checkExpiredCommandes();
            }
        }, 10 * 60 * 1000); // 10 minutes

        return () => clearInterval(interval);
    }, [enabled, user?.role, commandes.length]);

    return {
        checkExpiredCommandes: () => checkExpiredCommandes()
    };
};