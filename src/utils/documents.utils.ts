import { CommandeMetier } from '../types/business.types';

export const getDocumentInfo = (commande: CommandeMetier, type: 'facture' | 'devis'): { id: string; fileName: string } | null => {
    if (type === 'facture' && commande.financier?.factures?.[0]) {
        const facture = commande.financier.factures[0];
        return {
            id: facture.id,
            fileName: `Facture_${facture.numeroFacture}.pdf`
        };
    }
    if (type === 'devis' && commande.financier?.devis?.[0]) {
        const devis = commande.financier.devis[0];
        return {
            id: devis.id,
            fileName: `Devis_${devis.numeroDevis}.pdf`
        };
    }
    return null;
};