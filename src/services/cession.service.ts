import { v4 as uuidv4 } from 'uuid';
import { Cession, CessionFormData, CessionStatus } from '../types/cession.types';
import { CloudinaryService } from './cloudinary.service';
import { SafeDbService } from './safe-db.service';
import { DbMonitor } from '../utils/db-repair';
import { apiService } from './api.service';

/**
 * Service de gestion des cessions inter-magasins
 * Les cessions sont maintenant des commandes avec type='INTER_MAGASIN'
 */
export class CessionService {
  private cloudinaryService: CloudinaryService;

  constructor(apiToken: string) {
    this.cloudinaryService = new CloudinaryService();
  }

  /**
   * Récupère toutes les cessions inter-magasins
   * @param magasinId ID du magasin pour filtrer les cessions (optionnel)
   * @returns Liste des cessions
   */
  async getCessions(magasinId?: string): Promise<Cession[]> {
    try {
      const params: any = {};
      if (magasinId) {
        params.magasinId = magasinId;
      }

      const response = await apiService.get('/cessions', params) as { data: any[] };
      const cessions = response.data.map((cmd) => this.transformCommandeToCession(cmd));

      // Sauvegarder en local
      await this.saveCessionsToLocal(cessions);

      return cessions;
    } catch (error) {
      console.error('Erreur lors de la récupération des cessions:', error);
      DbMonitor.recordDbOperation(
        false,
        'getCessions',
        error instanceof Error ? error.message : String(error)
      );

      // En cas d'erreur, essayer de récupérer depuis le stockage local
      return this.getCessionsFromLocal(magasinId);
    }
  }

  /**
   * Récupère une cession par son ID
   * @param id ID de la cession
   * @returns La cession trouvée ou null
   */
  async getCessionById(id: string): Promise<Cession | null> {
    try {
      const response = await apiService.get(`/cessions/${id}`) as { data: any };
      const cession = this.transformCommandeToCession(response.data);

      // Sauvegarder en local
      await SafeDbService.put('cessions', cession);

      return cession;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la cession ${id}:`, error);
      DbMonitor.recordDbOperation(
        false,
        'getCessionById',
        error instanceof Error ? error.message : String(error)
      );

      // En cas d'erreur, essayer de récupérer depuis le stockage local
      return await SafeDbService.getById<Cession>('cessions', id);
    }
  }

  /**
   * Crée une nouvelle cession inter-magasins
   * @param cessionData Données du formulaire de cession
   * @param userId ID de l'utilisateur qui crée la cession
   * @returns La cession créée
   */
  async createCession(cessionData: CessionFormData, userId: string): Promise<Cession> {
    try {
      // Traiter les photos d'articles si présentes
      const articlesWithPhotos = await Promise.all(
        cessionData.articles.map(async (article) => {
          // Si la photo est un objet File, l'uploader sur Cloudinary
          if (article.photo && article.photo instanceof File) {
            const uploadResult = await this.cloudinaryService.uploadImage(article.photo);

            return {
              ...article,
              photo: uploadResult.url
            };
          }

          // Si c'est déjà une URL string ou null, garder tel quel
          return article;
        })
      );

      // Préparer le DTO pour le backend
      const dto: any = {
        magasinOrigineId: cessionData.magasin_origine_id,
        dateLivraisonSouhaitee: cessionData.date_livraison_souhaitee,
      };

      // Ajouter soit l'ID du magasin de destination (mode liste), soit les infos magasin externe (mode manuel)
      if (cessionData.magasin_destination_id) {
        dto.magasinDestinationId = cessionData.magasin_destination_id;
      } else if (cessionData.magasin_externe) {
        dto.magasinExterne = {
          nom: cessionData.magasin_externe.nom,
          adresse: cessionData.magasin_externe.adresse,
          telephone: cessionData.magasin_externe.telephone || '',
          email: cessionData.magasin_externe.email || ''
        };
      }

      // Compléter le DTO avec les articles et autres infos
      dto.articles = articlesWithPhotos.map(article => ({
        nom: article.nom,
        reference: article.reference || article.nom,
        type: article.type || 'Autre',
        quantite: article.quantite,
        description: article.description || '',
        photo: typeof article.photo === 'string' ? article.photo : undefined,
        dimensions: (article.hauteur || article.largeur || article.longueur || article.poids) ? {
          hauteur: article.hauteur,
          largeur: article.largeur,
          profondeur: article.longueur,
          poids: article.poids
        } : undefined,
        poids: article.poids,
        autresArticles: article.autresArticles || 0
      }));

      dto.motif = cessionData.motif || '';
      dto.priorite = cessionData.priorite || 'Normale';
      dto.remarques = cessionData.remarques || '';
      dto.categorieVehicule = cessionData.vehicule || '';
      dto.optionEquipier = cessionData.equipiers || 0;
      dto.creneauLivraison = cessionData.creneau || '';
      dto.tarifHT = cessionData.tarifHT || 0;

      const response = await apiService.post('/cessions', dto) as any;
      console.log('✅ Réponse backend cession COMPLÈTE:', response);

      // Le backend peut retourner soit { data: ... } soit directement l'objet
      const commandeData = response.data || response;
      console.log('✅ Données commande extraites:', commandeData);

      if (!commandeData || !commandeData.id) {
        console.error('❌ Réponse backend invalide - pas d\'ID:', response);
        throw new Error('La réponse du serveur ne contient pas d\'ID de cession');
      }

      const cession = this.transformCommandeToCession(commandeData);

      // Sauvegarder en local
      await SafeDbService.add('cessions', cession);

      return cession;
    } catch (error) {
      console.error('Erreur lors de la création de la cession:', error);
      DbMonitor.recordDbOperation(
        false,
        'createCession',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une cession
   * @param id ID de la cession
   * @param newStatus Nouveau statut
   * @param commentaire Commentaire optionnel
   * @param userId ID de l'utilisateur qui effectue la mise à jour
   * @returns La cession mise à jour
   */
  async updateCessionStatus(
    id: string,
    newStatus: CessionStatus,
    commentaire?: string,
    userId?: string
  ): Promise<Cession> {
    try {
      const dto = {
        statut: newStatus,
        commentaire: commentaire || ''
      };

      const response = await apiService.patch(`/cessions/${id}/statut`, dto) as { data: any };
      const cession = this.transformCommandeToCession(response.data);

      // Mettre à jour en local
      await SafeDbService.update('cessions', id, cession);

      return cession;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du statut de la cession ${id}:`, error);
      DbMonitor.recordDbOperation(
        false,
        'updateCessionStatus',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Attribut des chauffeurs à une cession
   * @param id ID de la cession
   * @param chauffeurIds IDs des chauffeurs à attribuer
   * @returns La cession mise à jour
   */
  async assignDriversToCession(id: string, chauffeurIds: string[]): Promise<Cession> {
    try {
      const dto = { chauffeurIds };

      const response = await apiService.patch(`/cessions/${id}/chauffeurs`, dto) as { data: any };
      const cession = this.transformCommandeToCession(response.data);

      // Mettre à jour en local
      await SafeDbService.update('cessions', id, cession);

      return cession;
    } catch (error) {
      console.error(`Erreur lors de l'attribution des chauffeurs à la cession ${id}:`, error);
      DbMonitor.recordDbOperation(
        false,
        'assignDriversToCession',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Supprime une cession (soft delete via statut ANNULEE)
   * @param id ID de la cession à supprimer
   * @returns Confirmation de suppression
   */
  async deleteCession(id: string): Promise<void> {
    try {
      await apiService.delete(`/cessions/${id}`);

      // Supprimer en local
      await SafeDbService.delete('cessions', id);

      DbMonitor.recordDbOperation(true, 'deleteCession');
    } catch (error) {
      console.error(`Erreur lors de la suppression de la cession ${id}:`, error);
      DbMonitor.recordDbOperation(
        false,
        'deleteCession',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Transforme une commande backend (type INTER_MAGASIN) en Cession frontend
   * @param commande Commande du backend
   * @returns Cession pour le frontend
   */
  private transformCommandeToCession(commande: any): Cession {
    // 🔍 LOG DEBUG: Voir les articles reçus du backend
    console.log('🔍 transformCommandeToCession - articles bruts:', JSON.stringify(commande.articles, null, 2));

    return {
      id: commande.id,
      numeroCession: commande.numeroCommande,
      reference: commande.numeroCommande,
      date_demande: commande.dateCommande || commande.createdAt,
      date_livraison_souhaitee: commande.dateLivraison,
      date_livraison_effective: commande.statutLivraison === 'LIVREE' ? commande.updatedAt : undefined,
      magasin_origine: commande.magasin ? {
        id: commande.magasin.id,
        name: commande.magasin.nom,
        address: commande.magasin.adresse,
        phone: commande.magasin.telephone || '',
        status: commande.magasin.status
      } : commande.magasinOrigine ? {
        id: commande.magasinOrigine.id,
        name: commande.magasinOrigine.nom,
        address: commande.magasinOrigine.adresse,
        phone: commande.magasinOrigine.telephone || '',
        status: commande.magasinOrigine.status || 'Actif'
      } : {
        id: '',
        name: 'Non spécifié',
        address: '',
        phone: '',
        status: 'Actif'
      },
      magasin_destination: commande.magasinDestination ? {
        id: commande.magasinDestination.id,
        name: commande.magasinDestination.nom,
        address: commande.magasinDestination.adresse,
        phone: commande.magasinDestination.telephone || '',
        status: commande.magasinDestination.status
      } : {
        id: '',
        name: 'Non spécifié',
        address: '',
        phone: '',
        status: 'Actif'
      },
      adresse_livraison: commande.magasinDestination?.adresse || '',
      // Transformer articles array en objet ArticlesType (copie du modèle simple-backend.service.ts)
      articles: (() => {
        const articlesTransformed = {
          nombre: commande.articles && commande.articles.length > 0
            ? commande.articles[0].nombre
            : 0,
          details: commande.articles && commande.articles.length > 0
            ? commande.articles[0].details || ''
            : '',
          photos: [],
          newPhotos: [],
          categories: commande.articles && commande.articles.length > 0
            ? commande.articles[0].categories || []
            : [],
          dimensions: this.extractDimensions(commande),
          autresArticles: commande.articles && commande.articles.length > 0
            ? commande.articles[0].autresArticles || 0
            : 0,
          canBeTilted: commande.articles && commande.articles.length > 0
            ? commande.articles[0].canBeTilted || false
            : false
        };
        console.log('🔍 Articles transformés:', articlesTransformed);
        return articlesTransformed;
      })(),
      statut: this.mapCommandeStatusToCessionStatus(commande.statutCommande, commande.statutLivraison),
      chauffeurs: (commande.chauffeurs || [])
        .filter((ch: any) => ch.chauffeur && ch.chauffeur.id)
        .map((ch: any) => ({
          id: ch.chauffeur.id,
          nom: ch.chauffeur.nom,
          prenom: ch.chauffeur.prenom,
          telephone: ch.chauffeur.telephone,
          role: ch.chauffeur.role || 'Chauffeur',
          status: ch.chauffeur.status
        })),
      commentaires: commande.remarques ? [commande.remarques] : [],
      createdBy: commande.createdBy || '',
      updatedBy: commande.updatedBy || '',
      motif: commande.motifCession || '',
      priorite: commande.prioriteCession as any || 'Normale',
      // ✅ Ajout des champs manquants depuis le backend
      categorieVehicule: commande.categorieVehicule || '',
      optionEquipier: commande.optionEquipier || 0,
      creneauLivraison: commande.creneauLivraison || '',
      tarifHT: commande.tarifHT || 0,
      reserve: commande.reserve || false,
      // ✅ Ajout documents, photos et historique pour les onglets
      documents: commande.documents || [],
      photos: commande.photos || [],
      statusHistory: commande.statusHistory || []
    } as any; // Cast to any car Cession n'a pas ces champs dans son type
  }

  /**
   * Extrait les dimensions des articles (copie de simple-backend.service.ts)
   */
  private extractDimensions(backendData: any): any[] {
    try {
      console.log('🔍 extractDimensions - backendData.articles:', backendData.articles);

      if (!backendData.articles || backendData.articles.length === 0) {
        return [];
      }

      const article = backendData.articles[0];
      const dimensionsRaw = article.dimensions;

      console.log('🔍 extractDimensions - dimensionsRaw type:', typeof dimensionsRaw);
      console.log('🔍 extractDimensions - dimensionsRaw value:', dimensionsRaw);

      // Si c'est déjà un array
      if (Array.isArray(dimensionsRaw)) {
        console.log('✅ extractDimensions - Déjà un array:', dimensionsRaw);
        return dimensionsRaw;
      }

      // Si c'est une string JSON
      if (typeof dimensionsRaw === 'string') {
        const parsed = JSON.parse(dimensionsRaw);
        console.log('✅ extractDimensions - Parsé depuis string:', parsed);
        return Array.isArray(parsed) ? parsed : [];
      }

      // Si c'est un objet (JSON parse automatique de Prisma)
      if (dimensionsRaw && typeof dimensionsRaw === 'object') {
        // Si c'est un objet unique, le mettre dans un array
        if (dimensionsRaw.hauteur || dimensionsRaw.largeur || dimensionsRaw.profondeur || dimensionsRaw.poids) {
          console.log('✅ extractDimensions - Objet unique mis en array:', [dimensionsRaw]);
          return [dimensionsRaw];
        }
      }

      console.log('⚠️ extractDimensions - Aucune condition matchée, retour []');
      return [];
    } catch (error) {
      console.error('❌ Erreur extraction dimensions:', error);
      return [];
    }
  }

  /**
   * Map les statuts de commande vers les statuts de cession
   */
  private mapCommandeStatusToCessionStatus(statutCommande: string, statutLivraison: string): CessionStatus {
    // Mapping basé sur le double système de statuts
    if (statutLivraison === 'LIVREE') return 'LIVREE';
    if (statutLivraison === 'EN ROUTE') return 'EN_TRANSIT';
    if (statutLivraison === 'ANNULEE') return 'ANNULEE';

    if (statutCommande === 'Annulée') return 'ANNULEE';
    if (statutCommande === 'Livrée') return 'LIVREE';
    if (statutCommande === 'En cours') return 'EN_TRANSIT';
    if (statutCommande === 'Assignée') return 'EN_PREPARATION';
    if (statutCommande === 'Validée') return 'ACCEPTEE';
    if (statutCommande === 'En attente') return 'DEMANDE';

    return 'DEMANDE';
  }

  /**
   * Récupère les cessions depuis le stockage local
   * @param magasinId ID du magasin pour filtrer (optionnel)
   * @returns Liste des cessions filtrées
   */
  private async getCessionsFromLocal(magasinId?: string): Promise<Cession[]> {
    try {
      const cessions = await SafeDbService.getAll<Cession>('cessions');

      // Filtrer par magasin si nécessaire
      if (magasinId) {
        return cessions.filter(cession =>
          cession.magasin_origine.id === magasinId ||
          cession.magasin_destination.id === magasinId
        );
      }

      return cessions;
    } catch (error) {
      console.error('Erreur lors de la récupération locale des cessions:', error);
      return [];
    }
  }

  /**
   * Sauvegarde les cessions dans le stockage local
   * @param cessions Liste des cessions à sauvegarder
   */
  private async saveCessionsToLocal(cessions: Cession[]): Promise<void> {
    try {
      await SafeDbService.transaction('rw', 'cessions', async () => {
        // Vider la table
        await SafeDbService.clear('cessions');

        // Ajouter les nouvelles cessions
        for (const cession of cessions) {
          await SafeDbService.add('cessions', cession);
        }
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde locale des cessions:', error);
      throw error;
    }
  }
}
