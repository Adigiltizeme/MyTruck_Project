import { ApiService } from './api.service';
import { AuthService } from './authService';

// Format unifié pour TOUS les systèmes
export interface UnifiedUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'magasin' | 'chauffeur';

    // Informations magasin (structure plate)
    storeId?: string;
    storeName?: string;
    storeAddress?: string;

    // Informations chauffeur
    driverId?: string;

    // Métadonnées
    token: string;
    lastLogin: Date;
    source: 'backend' | 'legacy' | 'hybrid';
}

export interface AuthResult {
    success: boolean;
    user?: UnifiedUser;
    error?: string;
}

/**
 * Service d'authentification unifié qui remplace TOUS les autres
 * Gère la compatibilité backend API + Legacy de façon transparente
 */
export class UnifiedAuthService {
    private apiService: ApiService;
    private currentUser: UnifiedUser | null = null;
    private readonly STORAGE_KEY = 'mytruck_unified_user';

    constructor() {
        this.apiService = new ApiService();
        this.initializeFromStorage();
    }

    // ==========================================
    // MÉTHODES PUBLIQUES PRINCIPALES
    // ==========================================

    async login(email: string, password: string): Promise<AuthResult> {
        try {
            console.log(`🔐 Tentative de connexion unifiée: ${email}`);

            // 1. Essayer Backend API d'abord
            try {
                const backendResult = await this.loginWithBackend(email, password);
                if (backendResult.success) {
                    console.log('✅ Connexion réussie via Backend API');
                    return backendResult;
                }
            } catch (backendError) {
                console.warn('⚠️ Backend API échec, tentative Legacy:', backendError);
            }

            // 2. Fallback Legacy
            try {
                const legacyResult = await this.loginWithLegacy(email, password);
                if (legacyResult.success) {
                    console.log('✅ Connexion réussie via Legacy');
                    return legacyResult;
                }
            } catch (legacyError) {
                console.error('❌ Legacy échec:', legacyError);
            }

            // 3. Échec complet
            return {
                success: false,
                error: 'Échec de connexion sur tous les systèmes'
            };

        } catch (error) {
            console.error('❌ Erreur critique lors de la connexion:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }

    logout(): void {
        console.log('🚪 Déconnexion unifiée');

        // Nettoyer tous les stockages
        this.currentUser = null;
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');

        // Nettoyer les services
        this.apiService.clearToken();
        AuthService.logout();

        console.log('✅ Déconnexion complète effectuée');
    }

    getCurrentUser(): UnifiedUser | null {
        return this.currentUser;
    }

    isAuthenticated(): boolean {
        const user = this.getCurrentUser();
        const isAuth = !!(user && user.token && !this.isTokenExpired(user.token));

        console.log(`🔍 Vérification auth: ${isAuth ? 'Connecté' : 'Déconnecté'}`);
        return isAuth;
    }

    // ==========================================
    // MÉTHODES BACKEND API
    // ==========================================

    private async loginWithBackend(email: string, password: string): Promise<AuthResult> {
        try {
            const response = await this.apiService.post('/auth/login', {
                email: email.toLowerCase().trim(),
                password
            });

            // Assurer que response est bien un objet attendu
            if (
                typeof response !== 'object' ||
                response === null ||
                !('access_token' in response) ||
                !('user' in response)
            ) {
                throw new Error('Réponse backend invalide');
            }

            // Transformer au format unifié
            const unifiedUser = this.transformBackendToUnified(response);

            // Stocker et configurer
            this.setCurrentUser(unifiedUser);
            this.apiService.setToken(response.access_token as string);

            return { success: true, user: unifiedUser };

        } catch (error) {
            throw new Error(`Backend login failed: ${error}`);
        }
    }

    private transformBackendToUnified(response: any): UnifiedUser {
        const user = response.user;

        return {
            id: user.id,
            email: user.email,
            name: this.formatFullName(user.prenom, user.nom),
            role: this.normalizeRole(user.role),
            storeId: user.magasin?.id || user.magasin_id,
            storeName: user.magasin?.nom || user.magasin_nom,
            storeAddress: user.magasin?.adresse || user.magasin_adresse,
            driverId: user.chauffeur?.id || user.chauffeur_id,
            token: response.access_token,
            lastLogin: new Date(),
            source: 'backend'
        };
    }

    // ==========================================
    // MÉTHODES LEGACY
    // ==========================================

    private async loginWithLegacy(email: string, password: string): Promise<AuthResult> {
        try {
            const legacyUser = await AuthService.login(email, password);

            if (!legacyUser) {
                throw new Error('Legacy login failed');
            }

            // Transformer au format unifié
            const unifiedUser = this.transformLegacyToUnified(legacyUser);

            // Stocker
            this.setCurrentUser(unifiedUser);

            return { success: true, user: unifiedUser };

        } catch (error) {
            throw new Error(`Legacy login failed: ${error}`);
        }
    }

    private transformLegacyToUnified(legacyUser: any): UnifiedUser {
        return {
            id: legacyUser.id,
            email: legacyUser.email,
            name: legacyUser.name || this.formatFullName(legacyUser.prenom, legacyUser.nom),
            role: this.normalizeRole(legacyUser.role),
            storeId: legacyUser.storeId,
            storeName: legacyUser.storeName,
            storeAddress: legacyUser.storeAddress,
            driverId: legacyUser.driverId,
            token: legacyUser.token || 'legacy-token',
            lastLogin: legacyUser.lastLogin || new Date(),
            source: 'legacy'
        };
    }

    // ==========================================
    // MÉTHODES UTILITAIRES
    // ==========================================

    private normalizeRole(role: string): 'admin' | 'magasin' | 'chauffeur' {
        if (!role) return 'magasin';

        const normalized = role.toLowerCase();

        // Mappings exhaustifs
        if (normalized.includes('admin') ||
            normalized.includes('direction') ||
            normalized === 'admin') {
            return 'admin';
        }

        if (normalized.includes('chauffeur') ||
            normalized.includes('driver') ||
            normalized === 'chauffeur') {
            return 'chauffeur';
        }

        // Par défaut : magasin (sécurisé)
        return 'magasin';
    }

    private formatFullName(prenom?: string, nom?: string): string {
        const parts = [prenom, nom].filter(Boolean);
        return parts.length > 0 ? parts.join(' ').trim() : 'Utilisateur';
    }

    private isTokenExpired(token: string): boolean {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            return payload.exp < now;
        } catch {
            return true;
        }
    }

    private setCurrentUser(user: UnifiedUser): void {
        this.currentUser = user;

        // Stockage unifié
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));

        // Compatibilité avec l'existant (temporaire)
        localStorage.setItem('authToken', user.token);
        localStorage.setItem('user', JSON.stringify({
            id: user.id,
            email: user.email,
            nom: user.name,
            role: user.role.toUpperCase(), // Pour backend
            magasin: user.storeId ? {
                id: user.storeId,
                nom: user.storeName
            } : null
        }));
    }

    private initializeFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const user = JSON.parse(stored);

                // Vérifier validité
                if (user.token && !this.isTokenExpired(user.token)) {
                    this.currentUser = user;
                    this.apiService.setToken(user.token);
                    console.log(`✅ Session restaurée: ${user.email} (${user.source})`);
                } else {
                    console.log('⚠️ Session expirée, nettoyage');
                    this.logout();
                }
            }
        } catch (error) {
            console.error('Erreur restauration session:', error);
            this.logout();
        }
    }

    // ==========================================
    // MÉTHODES DE DIAGNOSTIC
    // ==========================================

    diagnoseAuthState(): any {
        const user = this.getCurrentUser();

        return {
            current_user: user,
            is_authenticated: this.isAuthenticated(),
            storage_unified: !!localStorage.getItem(this.STORAGE_KEY),
            storage_legacy: !!localStorage.getItem('currentUser'),
            storage_backend: !!localStorage.getItem('user'),
            token_present: !!localStorage.getItem('authToken'),
            api_configured: !!this.apiService.getToken(),
            user_source: user?.source || 'none'
        };
    }

    async testConnection(): Promise<boolean> {
        try {
            if (this.currentUser?.source === 'backend') {
                return await this.apiService.testConnection();
            }
            return true; // Legacy toujours OK
        } catch {
            return false;
        }
    }
}

// ==========================================
// INSTANCE SINGLETON
// ==========================================

export const unifiedAuth = new UnifiedAuthService();

// Hook React pour utilisation
export const useUnifiedAuth = () => {
    return unifiedAuth;
};