// // src/services/api.service.ts - Service API principal pour remplacer Airtable
// import axios, { AxiosInstance } from 'axios';
// import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
// import { AuthUser } from './authService';

// export interface ApiResponse<T> {
//   data: T;
//   meta?: {
//     total: number;
//     skip: number;
//     take: number;
//     hasMore: boolean;
//   };
// }

// export interface LoginResponse {
//   access_token: string;
//   user: {
//     id: string;
//     email: string;
//     nom: string;
//     prenom: string;
//     role: string;
//     status: string;
//     magasin?: {
//       id: string;
//       nom: string;
//     };
//   };
// }

// export class ApiService {
//   private axiosInstance: AxiosInstance;
//   private readonly baseURL: string;
//   token: string | null = null;

//   setToken(token: string) {
//     this.token = token;
//   }

//   clearToken() {
//     this.token = null;
//   }

//   constructor() {
//     this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
//     this.token = localStorage.getItem('authToken');
//     this.axiosInstance = axios.create({
//       baseURL: this.baseURL,
//       timeout: 10000,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });

//     this.setupInterceptors();
//   }

//   private setupInterceptors() {
//     // Intercepteur pour ajouter le token automatiquement
//     this.axiosInstance.interceptors.request.use((config) => {
//       const token = localStorage.getItem('authToken');
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//       return config;
//     });

//     // Intercepteur pour gérer les erreurs d'auth
//     this.axiosInstance.interceptors.response.use(
//       (response) => response,
//       (error) => {
//         if (error.response?.status === 401) {
//           // Token expiré ou invalide
//           localStorage.removeItem('authToken');
//           localStorage.removeItem('user');
//           window.location.href = '/login';
//         }
//         return Promise.reject(error);
//       }
//     );
//   }

//   // =====================================
//   // AUTHENTIFICATION
//   // =====================================

//   async login(email: string, password: string): Promise<LoginResponse> {
//     const response = await this.axiosInstance.post<LoginResponse>('/auth/login', {
//       email,
//       password,
//     });

//     // Stocker le token pour les prochaines requêtes
//     localStorage.setItem('authToken', response.data.access_token);
//     localStorage.setItem('user', JSON.stringify(response.data.user));

//     return response.data;
//   }

//   async register(userData: any): Promise<LoginResponse> {
//     const response = await this.axiosInstance.post<LoginResponse>('/auth/register', userData);

//     // Stocker le token pour les prochaines requêtes
//     localStorage.setItem('authToken', response.data.access_token);
//     localStorage.setItem('user', JSON.stringify(response.data.user));

//     return response.data;
//   }

//   async getProfile(): Promise<AuthUser> {
//     const response = await this.axiosInstance.get('/auth/profile');
//     return response.data;
//   }

//   logout() {
//     localStorage.removeItem('authToken');
//     localStorage.removeItem('user');
//   }

//   // =====================================
//   // COMMANDES
//   // =====================================

//   async getCommandes(filters: any = {}): Promise<ApiResponse<CommandeMetier[]>> {
//     const params = new URLSearchParams();

//     // Ajouter les filtres comme paramètres de requête
//     Object.entries(filters).forEach(([key, value]) => {
//       if (value !== undefined && value !== null && value !== '') {
//         params.append(key, String(value));
//       }
//     });

//     const response = await this.axiosInstance.get<ApiResponse<CommandeMetier[]>>(
//       `/commandes?${params.toString()}`
//     );
//     return response.data;
//   }

//   async getCommande(id: string): Promise<CommandeMetier> {
//     const response = await this.axiosInstance.get<CommandeMetier>(`/commandes/${id}`);
//     return response.data;
//   }

//   async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
//     // Transformer les données du format frontend vers le format API
//     const apiData = this.transformCommandeToApi(commande);

//     const response = await this.axiosInstance.post<CommandeMetier>('/commandes', apiData);
//     return response.data;
//   }

//   async updateCommande(id: string, commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
//     // Transformer les données du format frontend vers le format API
//     const apiData = this.transformCommandeToApi(commande);

//     const response = await this.axiosInstance.patch<CommandeMetier>(`/commandes/${id}`, apiData);
//     return response.data;
//   }

//   async deleteCommande(id: string): Promise<void> {
//     await this.axiosInstance.delete(`/commandes/${id}`);
//   }

//   async getCommandesStats(magasinId?: string): Promise<any> {
//     const params = magasinId ? `?magasinId=${magasinId}` : '';
//     const response = await this.axiosInstance.get(`/commandes/stats${params}`);
//     return response.data;
//   }

//   // =====================================
//   // MAGASINS
//   // =====================================

//   async getMagasins(): Promise<MagasinInfo[]> {
//     const response = await this.axiosInstance.get<ApiResponse<MagasinInfo[]>>('/magasins');
//     return response.data.data || response.data;
//   }

//   async getMagasin(id: string): Promise<MagasinInfo> {
//     const response = await this.axiosInstance.get<MagasinInfo>(`/magasins/${id}`);
//     return response.data;
//   }

//   async createMagasin(magasin: Partial<MagasinInfo>): Promise<MagasinInfo> {
//     const response = await this.axiosInstance.post<MagasinInfo>('/magasins', magasin);
//     return response.data;
//   }

//   async updateMagasin(id: string, magasin: Partial<MagasinInfo>): Promise<MagasinInfo> {
//     const response = await this.axiosInstance.patch<MagasinInfo>(`/magasins/${id}`, magasin);
//     return response.data;
//   }

//   // =====================================
//   // PERSONNEL / CHAUFFEURS
//   // =====================================

//   async getPersonnel(): Promise<PersonnelInfo[]> {
//     const response = await this.axiosInstance.get<ApiResponse<PersonnelInfo[]>>('/chauffeurs');
//     return response.data.data || response.data;
//   }

//   async getChauffeur(id: string): Promise<PersonnelInfo> {
//     const response = await this.axiosInstance.get<PersonnelInfo>(`/chauffeurs/${id}`);
//     return response.data;
//   }

//   async getChauffeursDisponibles(dateLivraison: string, excludeIds: string[] = []): Promise<PersonnelInfo[]> {
//     const params = new URLSearchParams();
//     params.append('dateLivraison', dateLivraison);
//     if (excludeIds.length > 0) {
//       params.append('excludeIds', excludeIds.join(','));
//     }

//     const response = await this.axiosInstance.get<PersonnelInfo[]>(
//       `/chauffeurs/available?${params.toString()}`
//     );
//     return response.data;
//   }

//   // =====================================
//   // CLIENTS
//   // =====================================

//   async getClients(filters: any = {}): Promise<ApiResponse<any[]>> {
//     const params = new URLSearchParams();
//     Object.entries(filters).forEach(([key, value]) => {
//       if (value !== undefined && value !== null && value !== '') {
//         params.append(key, String(value));
//       }
//     });

//     const response = await this.axiosInstance.get<ApiResponse<any[]>>(
//       `/clients?${params.toString()}`
//     );
//     return response.data;
//   }

//   async searchClients(searchTerm: string): Promise<any[]> {
//     const response = await this.axiosInstance.get(`/clients/search?q=${encodeURIComponent(searchTerm)}`);
//     return response.data.data || response.data;
//   }

//   // =====================================
//   // UTILITAIRES
//   // =====================================

//   async healthCheck(): Promise<any> {
//     const response = await this.axiosInstance.get('/health');
//     return response.data;
//   }

//   async getVersion(): Promise<any> {
//     const response = await this.axiosInstance.get('/health/version');
//     return response.data;
//   }

//   // =====================================
//   // TRANSFORMATIONS DE DONNÉES
//   // =====================================

//   private transformCommandeToApi(commande: Partial<CommandeMetier>): any {
//     // Transformer les données du format frontend (compatible Airtable) vers le format API
//     const apiData: any = {
//       dateLivraison: commande.dates?.livraison,
//       creneauLivraison: commande.livraison?.creneau,
//       categorieVehicule: commande.livraison?.vehicule,
//       optionEquipier: commande.livraison?.equipiers || 0,
//       tarifHT: commande.financier?.tarifHT || 0,
//       reserveTransport: commande.livraison?.reserve || false,
//       prenomVendeur: commande.magasin?.manager,
//       magasinId: commande.magasin?.id,
//     };

//     // Informations client
//     if (commande.client) {
//       apiData.client = {
//         nom: commande.client.nom,
//         prenom: commande.client.prenom,
//         telephone: commande.client.telephone?.principal,
//         telephoneSecondaire: commande.client.telephone?.secondaire,
//         adresseLigne1: commande.client.adresse?.ligne1,
//         batiment: commande.client.adresse?.batiment,
//         etage: commande.client.adresse?.etage,
//         interphone: commande.client.adresse?.interphone,
//         ascenseur: commande.client.adresse?.ascenseur || false,
//         typeAdresse: commande.client.adresse?.type,
//       };
//     }

//     // Informations articles
//     if (commande.articles) {
//       apiData.articles = {
//         nombre: commande.articles.nombre || 0,
//         details: commande.articles.details,
//         categories: commande.articles.categories || [],
//       };
//     }

//     // Chauffeurs assignés
//     if (commande.chauffeurs && commande.chauffeurs.length > 0) {
//       apiData.chauffeurIds = commande.chauffeurs.map(c => c.id);
//     }

//     // Statuts pour les mises à jour
//     if (commande.statuts) {
//       apiData.statutCommande = commande.statuts.commande;
//       apiData.statutLivraison = commande.statuts.livraison;
//     }

//     return apiData;
//   }

//   // Vérifier si l'API est disponible
//   async isApiAvailable(): Promise<boolean> {
//     try {
//       await this.healthCheck();
//       return true;
//     } catch (error) {
//       console.warn('Backend API non disponible:', error);
//       return false;
//     }
//   }

//   async post(endpoint: string, data: any, options: RequestInit = {}): Promise<any> {
//     const url = `${process.env.VITE_API_URL || 'http://localhost:3000/api/v1'}${endpoint}`;
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         ...(options.headers || {})
//       },
//       body: JSON.stringify(data),
//       ...options
//     });

//     if (!response.ok) {
//       const errorBody = await response.json().catch(() => ({}));
//       const error: any = new Error(errorBody.message || response.statusText);
//       error.status = response.status;
//       throw error;
//     }

//     return response.json();
//   }

//   async get(endpoint: string, options: RequestInit = {}) {
//     const url = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1') + endpoint;
//     const response = await fetch(url, { method: 'GET', ...options });
//     if (!response.ok) {
//       const error = await response.json().catch(() => ({}));
//       throw { status: response.status, ...error };
//     }
//     return response.json();
//   }
// }

export class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // Correction pour Vite : utiliser import.meta.env au lieu de process.env
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    this.token = this.getStoredToken();

    console.log('🔗 ApiService initialisé:', this.baseUrl);
  }

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('authToken', token);
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('authToken');
    }
  }

  getToken(): string | null {
    return this.token || (typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('authToken') : null);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      const data = await response.json();

      // Log en mode développement
      if (import.meta.env.DEV) {
        console.log(`✅ ${options.method || 'GET'} ${endpoint}:`, data);
      }

      return data;

    } catch (error) {
      console.error(`❌ ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  }

  // Méthodes HTTP
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

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Méthodes utilitaires
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

// Export de l'instance singleton
export const apiService = new ApiService();