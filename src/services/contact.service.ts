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
      // Avant tout, tester la connectivité
      console.log('🔍 Testing connectivity before submission...');
      const isConnected = await this.testConnectivity();
      console.log('🔍 Connectivity test result:', isConnected);

      // Route publique - utiliser fetch directement pour éviter les conflits d'auth
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

      console.log('🔍 Environment check:');
      console.log('  - VITE_API_URL:', import.meta.env.VITE_API_URL);
      console.log('  - baseUrl computed:', baseUrl);
      console.log('  - Current origin:', window.location.origin);
      console.log('  - Full URL:', `${baseUrl}/contacts`);

      console.log('📤 Envoi vers:', `${baseUrl}/contacts`);
      console.log('📤 Données:', formData);
      console.log('📤 JSON stringified:', JSON.stringify(formData));

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(formData),
      };

      console.log('📤 Request options:', requestOptions);

      const response = await fetch(`${baseUrl}/contacts`, requestOptions);

      console.log('📥 Response received:');
      console.log('  - Status:', response.status);
      console.log('  - StatusText:', response.statusText);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
      console.log('  - OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📥 Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Success result:', result);
      return result;
    } catch (error) {
      console.error('❌ Complete error details:');
      console.error('  - Error type:', error.constructor.name);
      console.error('  - Error message:', error instanceof Error ? error.message : String(error));
      console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack available');
      console.error('  - Full error object:', error);

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