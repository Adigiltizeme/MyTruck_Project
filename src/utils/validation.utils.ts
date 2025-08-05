import { CommandeMetier } from '../types/business.types';

export const isValidForModification = (commande: CommandeMetier): boolean => {
    if (!commande || !commande.statuts) {
        console.warn('⚠️ Commande ou statuts manquants:', commande);
        return false;
    }

    const statutCommande = commande.statuts.commande;
    const statutLivraison = commande.statuts.livraison;

    // ✅ RÈGLE MÉTIER : Ne peut pas être modifiée si annulée ou livrée
    if (statutCommande === 'Annulée' || statutLivraison === 'LIVREE') {
        return false;
    }

    // ✅ RÈGLE MÉTIER : Ne peut pas être modifiée si confirmée par My Truck
    if (statutLivraison === 'CONFIRMEE') {
        return false;
    }
    // ✅ RÈGLE MÉTIER : Peut être modifiée si en attente/confirmée par magasin ou annulée
    return statutCommande === 'Confirmée' &&
        statutLivraison === 'EN ATTENTE' ||
        commande.statuts.commande === 'Annulée';
};

export const validateCommande = {
    canModify: isValidForModification,
    canConfirmTransmission: (commande: CommandeMetier): boolean => {
        // ✅ CORRECTION : Vérification sécurisée
        if (!commande || !commande.statuts) {
            return false;
        }
        // ✅ RÈGLE MÉTIER : Peut être transmise si en attente et livraison en attente
        return commande.statuts.commande === 'Confirmée' &&
            commande.statuts.livraison === 'CONFIRMEE';
    },
    needsDevis: (commande: CommandeMetier): boolean => {
        return (commande.livraison?.equipiers || 0) > 2;
    }
};