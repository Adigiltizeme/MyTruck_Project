import { CommandeMetier, FactureInfo } from '../types/business.types';
import { AirtableService } from './airtable.service';
import { CloudinaryService } from './cloudinary.service';

export class DocumentService {
  private airtableService: AirtableService;
  private cloudinaryService: CloudinaryService;

  constructor(apiToken: string) {
    this.airtableService = new AirtableService(apiToken);
    this.cloudinaryService = new CloudinaryService();
  }

  /**
   * Récupère un document (devis ou facture) pour une commande donnée
   * @param commande La commande concernée
   * @param type Type de document ('devis' ou 'facture')
   * @returns Le blob du document PDF ou null si non trouvé
   */
  async getCommandeDocument(commande: CommandeMetier, type: 'devis' | 'facture'): Promise<Blob | null> {
    try {
      // Déterminer quel document récupérer
      const documents = type === 'devis' ? commande.financier?.devis : commande.financier?.factures;
      
      if (!documents || documents.length === 0) {
        console.warn(`Aucun ${type} trouvé pour la commande ${commande.id}`);
        return null;
      }
      
      // Récupérer l'URL du document le plus récent (supposons qu'il soit le dernier dans la liste)
      const documentId = documents[documents.length - 1].id;
      
      // Essayer d'abord de récupérer le document depuis Airtable (pour la compatibilité avec l'existant)
      try {
        const documentBlob = await this.airtableService.getDocument(commande.id, type);
        if (documentBlob) {
          return documentBlob;
        }
      } catch (error) {
        console.log(`Document non trouvé dans Airtable, recherche dans Cloudinary: ${error}`);
      }
      
      // Si non trouvé dans Airtable, essayer de récupérer depuis Cloudinary
      // Construire l'URL Cloudinary à partir de l'ID du document
      const cloudinaryUrl = this.buildCloudinaryUrl(documentId, type);
      
      // Télécharger le document depuis Cloudinary
      const response = await fetch(cloudinaryUrl);
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération du document: ${response.statusText}`);
      }
      
      const documentBlob = await response.blob();
      return documentBlob;
    } catch (error) {
      console.error(`Erreur lors de la récupération du document:`, error);
      return null;
    }
  }
  
  /**
   * Télécharge un document dans le navigateur
   * @param documentBlob Le blob du document PDF
   * @param fileName Nom du fichier pour le téléchargement
   */
  downloadDocument(documentBlob: Blob, fileName: string): void {
    const url = URL.createObjectURL(documentBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    // Ajouter temporairement au DOM et déclencher le clic
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer après le téléchargement
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * Construit l'URL Cloudinary pour un document
   * @param documentId Identifiant du document
   * @param type Type de document ('devis' ou 'facture')
   * @returns URL Cloudinary du document
   */
  private buildCloudinaryUrl(documentId: string, type: 'devis' | 'facture'): string {
    // Format: https://res.cloudinary.com/CLOUD_NAME/raw/upload/DOCUMENT_PATH
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
    const documentPath = `${type === 'devis' ? 'devis' : 'factures'}/${documentId}.pdf`;
    
    return `https://res.cloudinary.com/${cloudName}/raw/upload/${documentPath}`;
  }
  
  /**
   * Crée un devis pour une commande
   * @param commande La commande pour laquelle créer un devis
   * @param devisData Les données du devis
   * @returns La commande mise à jour avec le devis
   */
  async createDevis(commande: CommandeMetier, devisData: any): Promise<CommandeMetier> {
    try {
      // Générer un ID de devis unique
      const devisId = `DEV-${Date.now()}`;
      
      // Créer l'objet devis
      const devis = {
        id: devisId,
        numeroDevis: devisData.numeroDevis || devisId,
        dateDevis: devisData.dateDevis || new Date().toISOString(),
        dateEcheance: devisData.dateEcheance || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        montantHT: devisData.montantHT || 0,
        statut: "En attente" as "En attente",
        magasin: devisData.magasin || 'DefaultMagasin', // Replace 'DefaultMagasin' with appropriate default value
        client: devisData.client || 'DefaultClient'    // Replace 'DefaultClient' with appropriate default value
      };
      
      // Mettre à jour la commande avec le nouveau devis
      const updatedCommande = await this.airtableService.updateCommande({
        ...commande,
        id: commande.id,
        financier: {
          ...commande.financier,
          devis: [...(commande.financier?.devis || []), devis]
        }
      });
      
      return updatedCommande;
    } catch (error) {
      console.error('Erreur lors de la création du devis:', error);
      throw error;
    }
  }
  
  /**
   * Crée une facture pour une commande
   * @param commande La commande pour laquelle créer une facture
   * @param factureData Les données de la facture
   * @returns La commande mise à jour avec la facture
   */
  async createFacture(commande: CommandeMetier, factureData: any): Promise<CommandeMetier> {
    try {
      // Générer un ID de facture unique
      const factureId = `FAC-${Date.now()}`;
      
      // Créer l'objet facture
      const facture: FactureInfo = {
        id: factureId,
        numeroFacture: factureData.numeroFacture || factureId,
        dateFacture: factureData.dateFacture || new Date().toISOString(),
        dateEcheance: factureData.dateEcheance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        montantHT: factureData.montantHT || commande.financier?.tarifHT || 0,
        statut: 'En attente',
        magasin: factureData.magasin || 'DefaultMagasin', // Replace 'DefaultMagasin' with appropriate default value
        client: factureData.client || 'DefaultClient'    // Replace 'DefaultClient' with appropriate default value
      };
      
      // Mettre à jour la commande avec la nouvelle facture
      const updatedCommande = await this.airtableService.updateCommande({
        ...commande,
        id: commande.id,
        financier: {
          ...commande.financier,
          factures: [...(commande.financier?.factures || []), facture]
        }
      });
      
      return updatedCommande;
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      throw error;
    }
  }
}