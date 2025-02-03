import { AirtableService } from './airtable.service';
import { CommandeMetier } from '../types/business.types';

export class DocumentService {
    private airtableService: AirtableService;

    constructor(airtableToken: string) {
        this.airtableService = new AirtableService(airtableToken);
    }

    async getCommandeDocument(commande: CommandeMetier, type: 'facture' | 'devis'): Promise<Blob | null> {
        try {
            if (!commande.id) {
                throw new Error('ID de commande manquant');
            }

            const documentId = type === 'facture'
                ? commande.financier?.factures?.[0]?.id
                : commande.financier?.devis?.[0]?.id;

            if (!documentId) {
                return null;
            }

            const document = await this.airtableService.getDocument(commande.id, type);
            return document;
        } catch (error) {
            console.error('Erreur lors de la récupération du document:', error);
            return null;
        }
    }

    downloadDocument(blob: Blob, fileName: string) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}