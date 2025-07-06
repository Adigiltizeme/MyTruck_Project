import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
import { AuthUser } from './authService';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    skip: number;
    take: number;
    hasMore: boolean;
  };
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    nom: string;
    prenom: string;
    role: string;
    status: string;
    magasin?: {
      id: string;
      nom: string;
    };
  };
}

export class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor() {
    // ✅ Configuration correcte pour Vite
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    this.token = localStorage.getItem('authToken');

    console.log('🔗 ApiService initialisé:', this.baseUrl);

    this.testConnectivity();
  }

  private async testConnectivity(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend API accessible:', data);
      } else {
        console.error('❌ Backend API erreur HTTP:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Backend API inaccessible:', error);
      console.log('🔍 URL testée:', `${this.baseUrl}/health`);
    }
  }

  // ✅ MÉTHODE DE TEST PUBLIC
  async testBackendConnection(): Promise<boolean> {
    try {
      console.log('🧪 Test connexion Backend API...');
      console.log('🔗 URL de base:', this.baseUrl);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // ✅ AJOUT: Options pour éviter les problèmes de cache/CORS
        cache: 'no-cache',
        mode: 'cors'
      });

      const isOk = response.ok;

      if (isOk) {
        const data = await response.json();
        console.log('✅ Backend API accessible:', data);
      } else {
        console.error('❌ Backend API erreur:', response.status, response.statusText);
        const text = await response.text();
        console.error('Réponse:', text);
      }

      return isOk;
    } catch (error) {
      console.error('❌ Erreur test Backend API:', error);

      // Diagnostics supplémentaires
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🚨 PROBLÈME: Impossible de joindre le Backend API');
        console.error('💡 Vérifications:');
        console.error('   1. Le Backend est-il démarré ? (npm run start:dev)');
        console.error('   2. URL correcte ?', this.baseUrl);
        console.error('   3. CORS configuré ?');
        console.error('   4. Firewall/antivirus ?');
      }

      return false;
    }
  }

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      // Vérifier immédiatement si le token stocké est valide
      // if (token && this.isTokenExpired(token)) {
      //   this.clearToken();
      //   return null;
      // }
      return token;
    }
    return null;
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }

  getToken(): string | null {
    return this.token || this.getStoredToken();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Vérifier si le token est expiré avant chaque requête
    // if (this.token && this.isTokenExpired(this.token)) {
    //   console.log('🔄 Token expiré, nettoyage automatique...');
    //   this.clearToken();
    //   // Rediriger vers la page de connexion
    //   if (typeof window !== 'undefined') {
    //     window.location.href = '/login';
    //   }
    //   throw new Error('Session expirée. Redirection en cours...');
    // }

    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined)
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      // Gestion des erreurs 401
      // if (response.status === 401 || response.status === 403) {
      //   console.error('❌ Erreur d\'authentification:', {
      //     url,
      //     status: response.status,
      //     currentPath: window.location.pathname,
      //     hasToken: !!localStorage.getItem('authToken')
      //   });

      //   // throw new Error('Session expirée. Veuillez vous reconnecter.');
      // }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && !url.includes('/auth/login')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }

        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      return response.json();

    } catch (error) {
      console.error(`❌ ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      // Ajouter une marge de 5 minutes pour éviter les expirations pendant les requêtes
      return payload.exp < (now + 300);
    } catch {
      return true;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =====================================
  // MÉTHODES HTTP DE BASE
  // =====================================

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // =====================================
  // AUTHENTIFICATION
  // =====================================

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    // ✅ Stocker le token automatiquement
    if (response.access_token) {
      this.setToken(response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  async register(userData: any): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/auth/register', userData);

    // ✅ Stocker le token automatiquement
    if (response.access_token) {
      this.setToken(response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  async getProfile(): Promise<AuthUser> {
    return this.get('/auth/profile');
  }

  async logout(): Promise<void> {
    try {
      // Appel API pour invalidation côté serveur
      await this.post('/auth/logout', {});
    } catch (error) {
      console.warn('Erreur logout serveur:', error);
      // Continue même si le serveur échoue
    } finally {
      // Nettoyage local
      this.clearToken();
    }
  }

  // =====================================
  // COMMANDES
  // =====================================

  async getCommandes(filters: any = {}): Promise<ApiResponse<CommandeMetier[]>> {
    const params = new URLSearchParams();

    // ✅ Ajouter les filtres comme paramètres de requête
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await apiService.get<ApiResponse<CommandeMetier[]>>(
      `/commandes?${params.toString()}`
    );
    return response;
  }

  async getCommande(id: string): Promise<CommandeMetier> {
    return this.get<CommandeMetier>(`/commandes/${id}`);
  }

  async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
    // ✅ Transformer les données du format frontend vers le format API
    const apiData = this.transformCommandeToApi(commande);
    return this.post<CommandeMetier>('/commandes', apiData);
  }

  async updateCommande(id: string, commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
    // ✅ Transformer les données du format frontend vers le format API
    const apiData = this.transformCommandeToApi(commande);
    return this.patch<CommandeMetier>(`/commandes/${id}`, apiData);
  }

  async deleteCommande(id: string): Promise<void> {
    await this.delete(`/commandes/${id}`);
  }

  async getCommandesStats(magasinId?: string): Promise<any> {
    const params = magasinId ? `?magasinId=${magasinId}` : '';
    return this.get(`/commandes/stats${params}`);
  }

  // =====================================
  // MAGASINS
  // =====================================

  async getMagasins(): Promise<MagasinInfo[]> {
    const response = await this.get<ApiResponse<MagasinInfo[]>>('/magasins');
    return response.data || response as any;
  }

  async getMagasin(id: string): Promise<MagasinInfo> {
    return this.get<MagasinInfo>(`/magasins/${id}`);
  }

  async createMagasin(magasin: Partial<MagasinInfo>): Promise<MagasinInfo> {
    return this.post<MagasinInfo>('/magasins', magasin);
  }

  async updateMagasin(id: string, magasin: Partial<MagasinInfo>): Promise<MagasinInfo> {
    return this.patch<MagasinInfo>(`/magasins/${id}`, magasin);
  }

  // =====================================
  // PERSONNEL / CHAUFFEURS
  // =====================================

  async getPersonnel(): Promise<PersonnelInfo[]> {
    const response = await this.get<ApiResponse<PersonnelInfo[]>>('/chauffeurs');
    return response.data || response as any;
  }

  async getChauffeur(id: string): Promise<PersonnelInfo> {
    return this.get<PersonnelInfo>(`/chauffeurs/${id}`);
  }

  async getChauffeursDisponibles(dateLivraison: string, excludeIds: string[] = []): Promise<PersonnelInfo[]> {
    const params = new URLSearchParams();
    params.append('dateLivraison', dateLivraison);
    if (excludeIds.length > 0) {
      params.append('excludeIds', excludeIds.join(','));
    }

    return this.get<PersonnelInfo[]>(`/chauffeurs/available?${params.toString()}`);
  }

  // =====================================
  // CLIENTS
  // =====================================

  async getClients(filters: any = {}): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return this.get<ApiResponse<any[]>>(`/clients?${params.toString()}`);
  }

  async searchClients(searchTerm: string): Promise<any[]> {
    const response = await this.get(`/clients/search?q=${encodeURIComponent(searchTerm)}`);
    return (response as any).data || response as any;
  }

  // =====================================
  // UTILITAIRES
  // =====================================

  // Vérification de santé
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health');
  }

  async getVersion(): Promise<any> {
    return this.get('/health/version');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }

  // =====================================
  // TRANSFORMATIONS DE DONNÉES
  // =====================================

  private transformCommandeToApi(commande: Partial<CommandeMetier>): any {
    // ✅ Transformer les données du format frontend (compatible Airtable) vers le format API
    const apiData: any = {
      dateLivraison: commande.dates?.livraison,
      creneauLivraison: commande.livraison?.creneau,
      categorieVehicule: commande.livraison?.vehicule,
      optionEquipier: commande.livraison?.equipiers || 0,
      tarifHT: commande.financier?.tarifHT || 0,
      reserveTransport: commande.livraison?.reserve || false,
      prenomVendeur: commande.magasin?.manager,
      magasinId: commande.magasin?.id,
    };

    // ✅ Informations client
    if (commande.client) {
      apiData.client = {
        nom: commande.client.nom,
        prenom: commande.client.prenom,
        telephone: commande.client.telephone?.principal,
        telephoneSecondaire: commande.client.telephone?.secondaire,
        adresseLigne1: commande.client.adresse?.ligne1,
        batiment: commande.client.adresse?.batiment,
        etage: commande.client.adresse?.etage,
        interphone: commande.client.adresse?.interphone,
        ascenseur: commande.client.adresse?.ascenseur || false,
        typeAdresse: commande.client.adresse?.type,
      };
    }

    // ✅ Informations articles
    if (commande.articles) {
      apiData.articles = {
        nombre: commande.articles.nombre || 0,
        details: commande.articles.details,
        categories: commande.articles.categories || [],
      };
    }

    // ✅ Chauffeurs assignés
    if (commande.chauffeurs && commande.chauffeurs.length > 0) {
      apiData.chauffeurIds = commande.chauffeurs.map(c => c.id);
    }

    // ✅ Statuts pour les mises à jour
    if (commande.statuts) {
      apiData.statutCommande = commande.statuts.commande;
      apiData.statutLivraison = commande.statuts.livraison;
    }

    return apiData;
  }

  // ✅ Vérifier si l'API est disponible
  async isApiAvailable(): Promise<boolean> {
    console.log('🔍 Vérification disponibilité API...');
    const isAvailable = await this.testBackendConnection();
    console.log(`📡 API disponible: ${isAvailable}`);
    return isAvailable;
  }

  // =====================================
  // UPLOAD DE FICHIERS
  // =====================================

  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers: HeadersInit = {};
    const currentToken = this.getToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erreur lors de l\'upload');
    }

    return response.json();
  }

  // =====================================
  // MÉTHODES DE COMPATIBILITÉ (pour transition)
  // =====================================

  // ✅ Méthodes pour maintenir la compatibilité avec l'ancien code
  async post_legacy(endpoint: string, data: any, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error: any = new Error(errorBody.message || response.statusText);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  async get_legacy(endpoint: string, options: RequestInit = {}) {
    const url = this.baseUrl + endpoint;
    const response = await fetch(url, { method: 'GET', ...options });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { status: response.status, ...error };
    }
    return response.json();
  }
}

// ✅ Export de l'instance singleton
export const apiService = new ApiService();

// ✅ Hook React pour utiliser l'API
export const useApi = () => {
  return apiService;
};