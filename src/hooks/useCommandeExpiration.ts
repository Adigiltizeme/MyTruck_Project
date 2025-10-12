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
        if (!enabled || !user || !isAdminRole(user?.role)) {
            return; // Seuls les admins peuvent déclencher l'expiration automatique
        }

        // Utiliser le fuseau horaire français pour les comparaisons
        const todayFrance = new Date().toLocaleDateString('en-CA', {
            timeZone: 'Europe/Paris'
        });

        const commandesToProcess: { commande: CommandeMetier; action: 'cancel' | 'archive' }[] = [];

        commandes.forEach(commande => {
            const livraisonDate = commande.dates?.livraison || commande.dateLivraison;
            if (!livraisonDate) return;

            // Convertir la date de livraison en format français
            const itemDate = new Date(livraisonDate);
            const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                timeZone: 'Europe/Paris'
            });

            // Vérifier si la date de livraison est passée
            if (itemDateStr < todayFrance) {
                const statutCommande = commande.statuts?.commande;
                const statutLivraison = commande.statuts?.livraison;

                // Règle 1 : Commandes en attente/confirmées expirées → Annulation automatique
                if (
                    (statutCommande === 'En attente' || statutCommande === 'Confirmée') &&
                    (statutLivraison === 'EN ATTENTE' || statutLivraison === 'CONFIRMEE')
                ) {
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
                    commandesToProcess.push({ 
                        commande, 
                        action: 'archive'
                    });
                }
            }
        });

        // Traitement des commandes expirées
        if (commandesToProcess.length > 0) {
            console.log(`📅 Traitement automatique de ${commandesToProcess.length} commande(s) expirée(s)`);

            for (const { commande, action } of commandesToProcess) {
                try {
                    if (action === 'cancel') {
                        // Annuler la commande automatiquement
                        await dataService.updateStatutsCommande(
                            commande.id,
                            'Annulée',
                            // 'ANNULEE',
                            'Expiration automatique - Date de livraison passée'
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
        }
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