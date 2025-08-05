import { CRENEAUX_LIVRAISON, VEHICULES } from '../components/constants/options';
import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
import { FilterOptions, MetricData } from '../types/metrics';
import { AuthUser } from './authService';
import { MetricsCalculator } from './metrics.service';

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

interface MagasinMap {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: string;
}

interface PersonnelMap {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: string;
  status: 'Actif' | 'Inactif';
  email?: string;
  // autres propriétés...
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

  initialize(): void {
    this.token = this.getStoredToken();
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
    const token = this.token || this.getStoredToken();
    console.log('🔍 getToken appelé:', {
      hasToken: !!token,
      tokenLength: token?.length,
      source: this.token ? 'memory' : 'localStorage'
    });
    return token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // ✅ CORRECTION: Récupérer le token à chaque requête
    const currentToken = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined)
    };

    // ✅ CORRECTION: Vérifier et ajouter le token
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    } else {
      console.warn('⚠️ Aucun token disponible pour la requête:', endpoint);
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ Erreur d\'authentification:', {
            endpoint,
            hasToken: !!currentToken,
            tokenLength: currentToken?.length
          });

          // ✅ Nettoyer le token invalide
          this.clearToken();
          throw new Error('Token invalide ou expiré');
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`❌ ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  }

  private async checkClockSkew(): Promise<number> {
    try {
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/health`);
      const serverTime = response.headers.get('date');

      if (serverTime) {
        const serverTimestamp = new Date(serverTime).getTime();
        const clientTimestamp = Date.now();
        const skew = Math.abs(serverTimestamp - clientTimestamp);

        console.log(`🕐 Clock skew: ${skew}ms`);

        if (skew > 60000) { // Plus d'1 minute
          console.warn(`⚠️ Décalage horloge important: ${Math.round(skew / 1000)}s`);
        }

        return skew;
      }
    } catch (error) {
      console.error('Erreur vérification horloge:', error);
    }

    return 0;
  }

  private isTokenExpired(token: string, toleranceSeconds: number = 30): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      // ✅ Ajouter une tolérance côté client aussi
      return payload.exp < (now - toleranceSeconds);
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
    console.log('📤 ===== ENVOI CRÉATION COMMANDE =====');
    console.log('📤 Données brutes reçues:', commande);

    // ✅ Transformer les données du format frontend vers le format API
    const apiData = this.transformCommandeToApi(commande);
    console.log('📤 Données transformées pour API:', apiData);
    console.log('📤 JSON final:', JSON.stringify(apiData, null, 2));

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

  async addPhotosToCommande(commandeId: string, newPhotos: Array<{ url: string }>, existingPhotos: Array<{ url: string }> = []) {
    const allPhotos = [...existingPhotos, ...newPhotos];
    const response = await fetch(`/api/commandes/${commandeId}/photos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: allPhotos }),
    });
    if (!response.ok) {
      throw new Error('Failed to add photos to commande');
    }
    return await response.json();
  }

  async deletePhotoFromCommande(commandeId: string, updatedPhotos: Array<{ url: string }>) {
    const response = await fetch(`/api/commandes/${commandeId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: updatedPhotos }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete photo from commande');
    }
    return await response.json();
  }

  async getFieldOptions(field: string): Promise<string[]> {
    // Retourner directement les constantes sans appel API
    if (field === 'CRENEAU DE LIVRAISON') {
      return CRENEAUX_LIVRAISON;
    }
    if (field === 'CATEGORIE DE VEHICULE') {
      return Object.values(VEHICULES);
    }
    return [];
  }

  // async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
  //   try {
  //     const fields = {
  //       'TARIF HT': Number(tarif)
  //     };
  //     const response = await this.patch<CommandeMetier>(`/commandes/${commandeId}`, { fields });
  //     console.log('✅ Tarif mis à jour avec succès:', response);
  //     return response;
  //   } catch (error) {
  //     console.error('Erreur lors de la mise à jour du tarif:', error);
  //     throw error;
  //   }
  // }
  async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
    try {
      console.log('💰 ===== UPDATE TARIF =====');
      console.log('💰 Commande ID:', commandeId);
      console.log('💰 Nouveau tarif:', tarif);

      // ✅ Structure exacte attendue par Backend
      const updateData = {
        tarifHT: Number(tarif)
      };

      console.log('💰 Données envoyées:', updateData);

      const response = await this.patch<CommandeMetier>(`/commandes/${commandeId}`, updateData);

      console.log('✅ Tarif mis à jour avec succès:', response);
      return response;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du tarif:', error);
      throw error;
    }
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
    console.log('🔍 API getPersonnel appelé');

    try {
      // ✅ CORRECTION : Utiliser l'endpoint chauffeurs
      const response = await this.get<ApiResponse<PersonnelInfo[]>>('/chauffeurs');
      const personnel = response.data || response as any;

      console.log('📊 Réponse Backend getPersonnel:', personnel);
      return personnel;
    } catch (error) {
      console.error('❌ Erreur API getPersonnel:', error);
      throw error;
    }
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

  // async getMetrics(filters: FilterOptions): Promise<MetricData> {
  //   const [commandes, personnel, magasins] = await Promise.all([
  //     this.getCommandes(),
  //     this.getPersonnel(),
  //     this.getMagasins()
  //   ]);
  //   const calculateur = new MetricsCalculator({ dateRange: filters.dateRange });

  //   const filteredCommandes = filters.store
  //     ? commandes.data.filter(cmd => cmd.magasin?.name === filters.store)
  //     : commandes.data;

  //   const historique = calculateur.calculateHistorique(filteredCommandes);
  //   const statutsDistribution = calculateur.calculateStatutsDistribution(filteredCommandes);

  //   const chauffeursActifs = new Set(
  //     filteredCommandes
  //       .filter(c => ['EN COURS DE LIVRAISON', 'CONFIRMEE', 'ENLEVEE']
  //         .includes(c.statuts.livraison))
  //       .flatMap(c => c.chauffeurs || [])
  //   ).size;

  //   return {
  //     totalLivraisons: filteredCommandes.length,
  //     enCours: filteredCommandes.filter(c => c.statuts.livraison === 'EN COURS DE LIVRAISON').length,
  //     enAttente: filteredCommandes.filter(c => c.statuts.livraison === 'EN ATTENTE').length,
  //     performance: statutsDistribution.termine,
  //     chauffeursActifs,
  //     chiffreAffaires: filteredCommandes.reduce((acc, c) => acc + (typeof c.financier?.tarifHT === 'number' ? c.financier?.tarifHT : 0), 0),
  //     historique,
  //     statutsDistribution,
  //     commandes: filteredCommandes,
  //     store: magasins.map((m: MagasinMap) => m.name || ''),
  //     chauffeurs: personnel
  //       .filter((p: PersonnelMap) => p.role === 'Chauffeur')
  //       .map((c: PersonnelMap) => c.nom),
  //   };
  // }

  // =====================================
  // TRANSFORMATIONS DE DONNÉES
  // =====================================

  private transformCommandeToApi(commande: Partial<CommandeMetier>): any {
    console.log('🔄 Transformation Frontend → API...');
    console.log('🔄 ===== TRANSFORMATION DISPATCH =====');
    console.log('🔄 Commande Frontend reçue:', commande);
    console.log('🔄 Chauffeurs Frontend:', commande.chauffeurs);

    const apiData: any = {};

    if (commande.chauffeurIds && Array.isArray(commande.chauffeurIds)) {
      apiData.chauffeurIds = commande.chauffeurIds;
      console.log('🔄 ChauffeurIds ajoutés:', apiData.chauffeurIds);
    }

    if (commande.statutCommande) {
      apiData.statutCommande = commande.statutCommande;
    }
    if (commande.statutLivraison) {
      apiData.statutLivraison = commande.statutLivraison;
    }
    // ✅ CRITIQUE : Gérer tarifHT
    if (commande.tarifHT !== undefined) {
      apiData.tarifHT = Number(commande.tarifHT);
      console.log('💰 TarifHT ajouté:', apiData.tarifHT);
    }

    // ✅ GESTION FINANCIER OBJECT (structure alternative)
    if (commande.financier?.tarifHT !== undefined) {
      apiData.tarifHT = Number(commande.financier.tarifHT);
      console.log('💰 TarifHT depuis financier:', apiData.tarifHT);
    }

    // ✅ Champs de base
    if (commande.numeroCommande) apiData.numeroCommande = commande.numeroCommande;
    if (commande.dates?.livraison) apiData.dateLivraison = commande.dates.livraison;
    if (commande.livraison?.creneau) apiData.creneauLivraison = commande.livraison.creneau;
    if (commande.livraison?.vehicule) apiData.categorieVehicule = commande.livraison.vehicule;
    if (commande.livraison?.equipiers !== undefined) apiData.optionEquipier = parseInt(String(commande.livraison.equipiers), 10);
    if (commande.livraison?.reserve !== undefined) apiData.reserveTransport = commande.livraison.reserve;

    // ✅ STATUTS
    if (commande.statuts?.commande) apiData.statutCommande = commande.statuts.commande;
    if (commande.statuts?.livraison) apiData.statutLivraison = commande.statuts.livraison;
    if (commande.statutCommande) apiData.statutCommande = commande.statutCommande;
    if (commande.statutLivraison) apiData.statutLivraison = commande.statutLivraison;

    // ✅ CHAUFFEURS
    if (commande.chauffeurIds && Array.isArray(commande.chauffeurIds)) {
      apiData.chauffeurIds = commande.chauffeurIds;
      console.log('🚛 ChauffeurIds ajoutés:', apiData.chauffeurIds);
    }

    console.log('🔄 Output API final:', apiData);

    return {
      // ✅ Champs de base
      numeroCommande: commande.numeroCommande || `CMD${Date.now()}`,
      dateLivraison: commande.dates?.livraison || new Date().toISOString(),
      creneauLivraison: commande.livraison?.creneau,
      categorieVehicule: commande.livraison?.vehicule,
      optionEquipier: parseInt(String(commande.livraison?.equipiers || 0), 10),
      tarifHT: parseFloat(String(commande.financier?.tarifHT || 0)),
      reserveTransport: commande.livraison?.reserve || false,
      prenomVendeur: commande.vendeur?.prenom || null, // ✅ null au lieu d'undefined
      // ✅ Magasin
      magasinId: commande.magasin?.id,
      // ✅ STRUCTURE NESTED pour client
      client: {
        nom: commande.client?.nom,
        prenom: commande.client?.prenom,
        telephone: commande.client?.telephone?.principal || commande.client?.telephone,
        telephoneSecondaire: commande.client?.telephone?.secondaire || '',
        adresseLigne1: commande.client?.adresse?.ligne1,
        batiment: commande.client?.adresse?.batiment || '',
        etage: commande.client?.adresse?.etage || '',
        interphone: commande.client?.adresse?.interphone || '',
        ascenseur: commande.client?.adresse?.ascenseur || false,
        typeAdresse: commande.client?.adresse?.type || 'Domicile',
      },

      // ✅ STRUCTURE NESTED pour articles
      articles: {
        nombre: parseInt(String(commande.articles?.nombre || 1), 10),
        details: commande.articles?.details || '',
        dimensions: commande.articles?.dimensions || [],
        photos: commande.articles?.photos || [],
        newPhotos: commande.articles?.newPhotos || [],
        canBeTilted: commande.articles?.canBeTilted || false,
      },
      // ✅ STRUCTURE NESTED pour statuts
      statuts: {
        livraison: commande.statuts?.livraison || 'EN ATTENTE',
        commande: commande.statuts?.commande || 'En attente',
      },
    };
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