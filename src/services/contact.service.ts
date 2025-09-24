import { ApiService } from './api.service';

export interface ContactFormData {
  nomMagasin: string;
  adresse: string;
  telephone: string;
  email: string;
  raison: 'RENSEIGNEMENTS' | 'DEVIS' | 'LITIGE' | 'RECLAMATION';
  message: string;
  magasinId?: string;
  userId?: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    createdAt: string;
  };
  error?: string;
}

export interface Contact {
  id: string;
  nomMagasin: string;
  adresse: string;
  telephone: string;
  email: string;
  raison: string;
  message: string;
  statut: 'NOUVEAU' | 'LU' | 'EN_COURS' | 'TRAITE' | 'ARCHIVE';
  response?: string;
  magasinId?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  treatedAt?: string;
  treatedBy?: string;
  magasin?: {
    id: string;
    nom: string;
  };
  user?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
}

export interface ContactFilters {
  raison?: 'RENSEIGNEMENTS' | 'DEVIS' | 'LITIGE' | 'RECLAMATION';
  statut?: 'NOUVEAU' | 'LU' | 'EN_COURS' | 'TRAITE' | 'ARCHIVE';
  magasinId?: string;
  dateDebut?: string;
  dateFin?: string;
  search?: string;
}

export interface ContactStats {
  total: number;
  parStatut: {
    nouveau: number;
    enCours: number;
    traite: number;
  };
  parRaison: Record<string, number>;
}

export class ContactService {
  private apiService: ApiService;

  constructor() {
    this.apiService = new ApiService();
  }

  /**
   * Soumettre un nouveau formulaire de contact (route publique)
   */
  async submitContact(formData: ContactFormData): Promise<ContactResponse> {
    try {
      // Route publique - utiliser la méthode post_legacy sans auth automatique
      return await this.apiService.post_legacy('/contacts', formData);
    } catch (error) {
      console.error('Erreur lors de la soumission du contact:', error);
      return {
        success: false,
        message: 'Une erreur de connexion s\'est produite. Veuillez réessayer.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Récupérer tous les contacts (admin uniquement)
   */
  async getAllContacts(filters?: ContactFilters): Promise<{
    success: boolean;
    data: Contact[];
    total: number;
  }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
    }

    const url = `/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return this.apiService.get(url);
  }

  /**
   * Récupérer un contact spécifique (admin uniquement)
   */
  async getContact(id: string): Promise<{
    success: boolean;
    data: Contact;
  }> {
    return this.apiService.get(`/contacts/${id}`);
  }

  /**
   * Mettre à jour un contact (admin uniquement)
   */
  async updateContact(id: string, updateData: {
    statut?: 'NOUVEAU' | 'LU' | 'EN_COURS' | 'TRAITE' | 'ARCHIVE';
    response?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: Contact;
  }> {
    return this.apiService.patch(`/contacts/${id}`, updateData);
  }

  /**
   * Marquer comme lu (admin uniquement)
   */
  async markAsRead(id: string): Promise<{
    success: boolean;
    message: string;
    data: Contact;
  }> {
    return this.apiService.patch(`/contacts/${id}/mark-read`, {});
  }

  /**
   * Marquer comme en cours de traitement (admin uniquement)
   */
  async markAsInProgress(id: string): Promise<{
    success: boolean;
    message: string;
    data: Contact;
  }> {
    return this.apiService.patch(`/contacts/${id}/mark-in-progress`, {});
  }

  /**
   * Marquer comme traité avec réponse (admin uniquement)
   */
  async markAsTreated(id: string, response: string): Promise<{
    success: boolean;
    message: string;
    data: Contact;
  }> {
    return this.apiService.patch(`/contacts/${id}/mark-treated`, { response });
  }

  /**
   * Supprimer un contact (admin uniquement)
   */
  async deleteContact(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.apiService.delete(`/contacts/${id}`);
  }

  /**
   * Récupérer les statistiques des contacts (admin uniquement)
   */
  async getStats(): Promise<{
    success: boolean;
    data: ContactStats;
  }> {
    return this.apiService.get('/contacts/stats');
  }

  /**
   * Récupérer les contacts d'un magasin (magasin connecté)
   */
  async getMyContacts(): Promise<{
    success: boolean;
    data: Contact[];
    total: number;
  }> {
    return this.apiService.get('/contacts/magasin/my-contacts');
  }
}