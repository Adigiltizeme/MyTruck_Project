import { CommandeMetier } from '../types/business.types';

export const isValidForModification = (commande: CommandeMetier): boolean => {
    return commande.statuts.commande === 'En attente' && 
           commande.statuts.livraison === 'EN ATTENTE' ||
           commande.statuts.commande === 'Annulée';
};

export const validateCommande = {
    canModify: isValidForModification,
    canConfirmTransmission: (commande: CommandeMetier): boolean => {
        return commande.statuts.commande === 'Confirmée' && 
               commande.statuts.livraison === 'CONFIRMEE';
    },
    needsDevis: (commande: CommandeMetier): boolean => {
        return (commande.livraison?.equipiers || 0) > 2;
    }
};