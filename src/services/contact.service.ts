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
  statut: 'NOUVEAU' | 'LU' | 'EN_COURS' | 'DEVIS_GENERE' | 'DEVIS_VALIDE' | 'DEVIS_REFUSE' | 'TRAITE' | 'ARCHIVE';
  response?: string;
  magasinId?: string;
  userId?: string;
  devisDocumentId?: string;
  validatedAt?: string;
  validatedBy?: string;
  validationNote?: string;
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
   * Test de connectivité avec l'API
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      console.log('🔍 Testing connectivity to:', `${baseUrl}/health`);

      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      console.log('🔍 Health check response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      return response.ok;
    } catch (error) {
      console.error('🔍 Health check failed:', error);
      return false;
    }
  }

  /**
   * Soumettre un nouveau formulaire de contact (route publique)
   */
  async submitContact(formData: ContactFormData): Promise<ContactResponse> {
    try {
      // Route publique - utiliser fetch directement pour éviter les conflits d'auth
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

      console.log('📤 Envoi du formulaire de contact vers:', `${baseUrl}/contacts`);

      // Jeton optionnel : permet au backend de rattacher le message à l'organisation de l'expéditeur
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${baseUrl}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      console.log('📥 Réponse reçue - Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📥 Erreur réponse:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Contact envoyé avec succès');
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la soumission du contact:', error);
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
    message?: string;
  }> {
    return this.apiService.get('/contacts/magasin/my-contacts');
  }

  /**
   * Répondre à un contact en tant que magasin
   */
  async replyToMyContact(id: string, response: string): Promise<{
    success: boolean;
    message: string;
    data: Contact;
  }> {
    return this.apiService.patch(`/contacts/magasin/${id}/reply`, { response });
  }

  /**
   * Récupérer le devis d'un contact
   */
  async getContactDevis(contactId: string): Promise<{
    success: boolean;
    message?: string;
    data: any | null;
  }> {
    return this.apiService.get(`/contacts/${contactId}/devis`);
  }

  /**
   * Valider un devis (Magasin)
   */
  async validateDevis(contactId: string, note?: string): Promise<{
    success: boolean;
    message: string;
    data: Contact;
  }> {
    return this.apiService.patch(`/contacts/${contactId}/validate-devis`, { note });
  }

  /**
   * Rejeter un devis (Magasin)
   */
  async rejectDevis(contactId: string, note?: string): Promise<{
    success: boolean;
    message: string;
    data: Contact;
  }> {
    return this.apiService.patch(`/contacts/${contactId}/reject-devis`, { note });
  }
}