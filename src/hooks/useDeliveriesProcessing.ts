import { useCallback } from 'react';
import { CommandeMetier } from '../types/business.types';

export const useDeliveriesProcessing = () => {
    const processDeliveries = useCallback((commandes: CommandeMetier[]) => {
        if (!Array.isArray(commandes)) {
            console.warn('processDeliveries: commandes is not an array');
            return [];
        }

        return commandes
            .filter(commande => {
                // Log pour debug
                console.debug('Filtering commande:', commande?.numeroCommande, {
                    hasNumero: Boolean(commande?.numeroCommande),
                    hasStatuts: Boolean(commande?.statuts?.livraison),
                    hasDates: Boolean(commande?.dates?.livraison),
                });

                return Boolean(
                    commande?.numeroCommande &&
                    commande?.dates?.livraison &&
                    commande?.statuts?.livraison
                );
            })
            .map(commande => {
                // Log détaillé pour debug
                console.debug('Processing commande:', {
                    id: commande.numeroCommande,
                    magasinInfo: commande.magasin,
                    livraisonInfo: commande.livraison,
                });

                // Extraction sécurisée des données magasin
                const magasinName = commande.magasin?.name || 'Non spécifié';

                // Gestion sécurisée des chauffeurs
                let chauffeurDisplay = 'Non spécifié';
                if (commande.livraison?.chauffeurs?.length > 0) {
                    const chauffeur = commande.livraison.chauffeurs[0];
                    if (chauffeur?.prenom || chauffeur?.nom) {
                        chauffeurDisplay = [chauffeur.prenom, chauffeur.nom]
                            .filter(Boolean)
                            .join(' ');
                    }
                }

                return {
                    id: commande.numeroCommande,
                    reference: commande.numeroCommande,
                    magasin: magasinName,
                    chauffeur: chauffeurDisplay,
                    status: commande.statuts.livraison,
                    eta: new Date(commande.dates.livraison),
                    details: {
                        nombreArticles: commande.articles?.nombre || 0,
                        tarifHT: commande.financier?.tarifHT || 0,
                        adresseLivraison: commande.client?.adresse?.ligne1 || 'Non spécifiée'
                    }
                };
            });
    }, []);

    return { processDeliveries };
};