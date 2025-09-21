import { v4 as uuidv4 } from 'uuid';
import { Cession, CessionFormData, CessionStatus } from '../types/cession.types';
import { AirtableService } from './airtable.service';
import { CloudinaryService } from './cloudinary.service';
import { SafeDbService } from './safe-db.service';
import { DbMonitor } from '../utils/db-repair';
import { MagasinInfo, PersonnelInfo } from '../types/business.types';
import { DataServiceAdapter } from './data-service-adapter';

/**
 * Service de gestion des cessions inter-magasins
 */
export class CessionService {
  private dataService: DataServiceAdapter;
  private cloudinaryService: CloudinaryService;
  
  constructor(apiToken: string) {
    this.dataService = new DataServiceAdapter();
    this.cloudinaryService = new CloudinaryService();
  }
  
  /**
   * Récupère toutes les cessions inter-magasins
   * @param magasinId ID du magasin pour filtrer les cessions (optionnel)
   * @returns Liste des cessions
   */
  async getCessions(magasinId?: string): Promise<Cession[]> {
    try {
      // Déterminer si on doit faire une requête en ligne
      const isOnline = !localStorage.getItem('forceOfflineMode');
      
      if (isOnline) {
        // Effectuer la requête Airtable
        const response = await this.fetchCessionsFromAirtable(magasinId);
        
        // Sauvegarder en local
        await this.saveCessionsToLocal(response);
        
        return response;
      } else {
        // Récupérer depuis le stockage local
        return this.getCessionsFromLocal(magasinId);
      }
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
      // Déterminer si on doit faire une requête en ligne
      const isOnline = !localStorage.getItem('forceOfflineMode');
      
      if (isOnline) {
        // Effectuer la requête Airtable
        const response = await this.fetchCessionByIdFromAirtable(id);
        
        // Sauvegarder en local
        if (response) {
          await SafeDbService.put('cessions', response);
        }
        
        return response;
      } else {
        // Récupérer depuis le stockage local
        return await SafeDbService.getById<Cession>('cessions', id);
      }
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
      // Récupérer les informations des magasins
    const magasinOrigine = (await this.dataService.getMagasins()).find(
      (magasin: MagasinInfo) => magasin.id === cessionData.magasin_origine_id
    );
    const magasinDestination = (await this.dataService.getMagasins()).find(
      (magasin: MagasinInfo) => magasin.id === cessionData.magasin_destination_id
    );
      
      if (!magasinOrigine || !magasinDestination) {
        throw new Error('Magasin d\'origine ou de destination introuvable');
      }
      
      // Traiter les photos d'articles si présentes
      const articlesWithPhotos = await Promise.all(
        cessionData.articles.map(async (article) => {
          if (article.photo) {
            // Upload de l'image sur Cloudinary
            const uploadResult = await this.cloudinaryService.uploadImage(article.photo);
            
            return {
              ...article,
              photo: uploadResult.url
            };
          }
          
          return article;
        })
      );
      
      // Créer la nouvelle cession
      const newCession: Cession = {
        id: uuidv4(),
        reference: `CES-${Date.now()}`,
        date_demande: new Date().toISOString(),
        date_livraison_souhaitee: cessionData.date_livraison_souhaitee,
        magasin_origine: {
          id: magasinOrigine.id,
          name: magasinOrigine.name || "",
          address: magasinOrigine.address || "",
          phone: magasinOrigine.phone || "",
          status: magasinOrigine.status || ""
        },
        magasin_destination: {
          id: magasinDestination.id,
          name: magasinDestination.name || "",
          address: magasinDestination.address || "",
          phone: magasinDestination.phone || "",
          status: magasinDestination.status || ""
        },
        articles: articlesWithPhotos.map((article, index) => ({
          id: `art-${index}-${Date.now()}`,
          nom: article.nom,
          reference: article.reference,
          type: article.type,
          quantite: article.quantite,
          description: article.description,
          photo: typeof article.photo === 'string' ? article.photo : undefined
        })),
        statut: 'DEMANDE',
        createdBy: userId,
        motif: cessionData.motif,
        priorite: cessionData.priorite,
        commentaires: cessionData.commentaires ? [cessionData.commentaires] : [],
        numeroCession: `NC-${Date.now()}`, // Example value for numeroCession
        adresse_livraison: cessionData.adresse_livraison // Assuming this exists in cessionData
      };
      
      // Déterminer si on doit faire une requête en ligne
      const isOnline = !localStorage.getItem('forceOfflineMode');
      
      if (isOnline) {
        // Envoyer à Airtable
        const response = await this.createCessionInAirtable(newCession);
        
        // Sauvegarder en local
        await SafeDbService.add('cessions', response);
        
        return response;
      } else {
        // Enregistrer localement et dans les changements en attente
        await SafeDbService.add('cessions', newCession);
        await SafeDbService.add('pendingChanges', {
          id: uuidv4(),
          entityType: 'cession',
          entityId: newCession.id,
          action: 'create',
          data: newCession,
          timestamp: Date.now()
        });
        
        return newCession;
      }
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
      // Récupérer la cession actuelle
      const cession = await this.getCessionById(id);
      
      if (!cession) {
        throw new Error(`Cession ${id} introuvable`);
      }
      
      // Préparer la mise à jour
      const updatedCession: Cession = {
        ...cession,
        statut: newStatus,
        updatedBy: userId || cession.updatedBy || cession.createdBy
      };
      
      // Ajouter un commentaire si fourni
      if (commentaire) {
        updatedCession.commentaires = [
          ...(cession.commentaires || []),
          `${new Date().toISOString()} - ${commentaire}`
        ];
      }
      
      // Mettre à jour la date de livraison effective si le statut est "LIVREE"
      if (newStatus === 'LIVREE' && !updatedCession.date_livraison_effective) {
        updatedCession.date_livraison_effective = new Date().toISOString();
      }
      
      // Déterminer si on doit faire une requête en ligne
      const isOnline = !localStorage.getItem('forceOfflineMode');
      
      if (isOnline) {
        // Envoyer à Airtable
        const response = await this.updateCessionInAirtable(updatedCession);
        
        // Mettre à jour en local
        await SafeDbService.update('cessions', id, response);
        
        return response;
      } else {
        // Mettre à jour localement et dans les changements en attente
        await SafeDbService.update('cessions', id, updatedCession);
        await SafeDbService.add('pendingChanges', {
          id: uuidv4(),
          entityType: 'cession',
          entityId: id,
          action: 'update',
          data: { statut: newStatus, commentaires: updatedCession.commentaires },
          timestamp: Date.now()
        });
        
        return updatedCession;
      }
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
      // Récupérer la cession actuelle
      const cession = await this.getCessionById(id);
      
      if (!cession) {
        throw new Error(`Cession ${id} introuvable`);
      }
      
      // Récupérer les informations des chauffeurs
      const allPersonnel = await this.dataService.getPersonnel();
    const chauffeurs: PersonnelInfo[] = allPersonnel
      .filter((p: PersonnelInfo) => chauffeurIds.includes(p.id))
      .map((p: PersonnelInfo) => ({
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        telephone: p.telephone,
        role: p.role,
        status: p.status
      }));
      
      // Mettre à jour la cession
      const updatedCession: Cession = {
        ...cession,
        chauffeurs: chauffeurs,
        statut: cession.statut === 'ACCEPTEE' ? 'EN_PREPARATION' : cession.statut
      };
      
      // Déterminer si on doit faire une requête en ligne
      const isOnline = !localStorage.getItem('forceOfflineMode');
      
      if (isOnline) {
        // Envoyer à Airtable
        const response = await this.updateCessionInAirtable(updatedCession);
        
        // Mettre à jour en local
        await SafeDbService.update('cessions', id, response);
        
        return response;
      } else {
        // Mettre à jour localement et dans les changements en attente
        await SafeDbService.update('cessions', id, updatedCession);
        await SafeDbService.add('pendingChanges', {
          id: uuidv4(),
          entityType: 'cession',
          entityId: id,
          action: 'update',
          data: { chauffeurs: chauffeurIds },
          timestamp: Date.now()
        });
        
        return updatedCession;
      }
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
  
  /**
   * Récupère les cessions depuis Airtable
   * @param magasinId ID du magasin pour filtrer (optionnel)
   * @returns Liste des cessions
   */
  private async fetchCessionsFromAirtable(magasinId?: string): Promise<Cession[]> {
    // Normalement, nous ferions un appel API ici pour récupérer les cessions depuis Airtable
    // Pour cet exemple, nous allons simuler la réponse
    
    // Simulation d'une requête en attente
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Retour de données de test
    return [];
  }
  
  /**
   * Récupère une cession par ID depuis Airtable
   * @param id ID de la cession
   * @returns La cession trouvée ou null
   */
  private async fetchCessionByIdFromAirtable(id: string): Promise<Cession | null> {
    // Normalement, nous ferions un appel API ici pour récupérer la cession depuis Airtable
    // Pour cet exemple, nous allons simuler la réponse
    
    // Simulation d'une requête en attente
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Retour de données de test
    return null;
  }
  
  /**
   * Crée une cession dans Airtable
   * @param cession Cession à créer
   * @returns La cession créée
   */
  private async createCessionInAirtable(cession: Cession): Promise<Cession> {
    // Normalement, nous ferions un appel API ici pour créer la cession dans Airtable
    // Pour cet exemple, nous allons simuler la réponse
    
    // Simulation d'une requête en attente
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Retourner simplement la cession fournie (simulant une création réussie)
    return cession;
  }
  
  /**
   * Met à jour une cession dans Airtable
   * @param cession Cession à mettre à jour
   * @returns La cession mise à jour
   */
  private async updateCessionInAirtable(cession: Cession): Promise<Cession> {
    // Normalement, nous ferions un appel API ici pour mettre à jour la cession dans Airtable
    // Pour cet exemple, nous allons simuler la réponse
    
    // Simulation d'une requête en attente
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Retourner simplement la cession fournie (simulant une mise à jour réussie)
    return cession;
  }
}