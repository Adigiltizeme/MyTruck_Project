import { AuthUser, AuthService } from './authService';
import { ApiService } from './api.service';
import { UserRole } from '../types/roles';

export class AuthAdapter {
    private apiService: ApiService;
    private legacyAuthService: typeof AuthService;
    private useBackendAuth: boolean;

    constructor() {
        this.apiService = new ApiService();
        this.legacyAuthService = AuthService;

        // Déterminer quel système d'auth utiliser
        this.useBackendAuth = this.shouldUseBackendAuth();
    }

    private shouldUseBackendAuth(): boolean {
        // Vérifier si on a une préférence stockée
        const preference = localStorage.getItem('useBackendAuth');
        if (preference !== null) {
            return preference === 'true';
        }

        // Par défaut, essayer le backend si disponible
        return true;
    }

    // =====================================
    // MÉTHODES D'AUTHENTIFICATION
    // =====================================

    async login(email: string, password: string): Promise<AuthUser> {
        console.log(`🔐 Tentative de connexion avec: ${this.useBackendAuth ? 'Backend API' : 'Système hérité'}`);

        try {
            if (this.useBackendAuth) {
                // Essayer la connexion avec le backend API
                const response = await this.apiService.login(email, password);

                // Transformer la réponse API vers le format AuthUser attendu
                const authUser: AuthUser = {
                    id: response.user.id,
                    email: response.user.email,
                    name: response.user.nom,
                    role: this.mapApiRoleToLegacyRole(response.user.role) as UserRole,
                    token: response.access_token,
                    storeId: response.user.magasin?.id,
                    storeName: response.user.magasin?.nom,
                    storeAddress: '', // TODO: récupérer depuis l'API
                    lastLogin: new Date(),
                };

                // Stocker les informations d'authentification
                this.storeAuthData(authUser, response.access_token);

                console.log('✅ Connexion réussie avec le backend API');
                return authUser;
            } else {
                // Utiliser le système d'authentification hérité
                return await this.legacyAuthService.login(email, password);
            }
        } catch (error) {
            console.warn('❌ Échec connexion backend, fallback vers système hérité:', error);

            // Fallback vers le système hérité
            if (this.useBackendAuth) {
                this.useBackendAuth = false;
                localStorage.setItem('useBackendAuth', 'false');
                return await this.login(email, password); // Retry avec le système hérité
            }

            throw error;
        }
    }

    async signup(userData: any): Promise<AuthUser> {
        try {
            if (this.useBackendAuth) {
                const response = await this.apiService.register(userData);

                const authUser: AuthUser = {
                    id: response.user.id,
                    email: response.user.email,
                    name: response.user.nom,
                    role: this.mapApiRoleToLegacyRole(response.user.role) as UserRole,
                    token: response.access_token,
                    storeId: response.user.magasin?.id,
                    storeName: response.user.magasin?.nom,
                    storeAddress: '',
                    lastLogin: new Date(),
                };

                this.storeAuthData(authUser, response.access_token);

                console.log('✅ Inscription réussie avec le backend API');
                return authUser;
            } else {
                const legacyResult = await this.legacyAuthService.signup(userData);
                if (legacyResult && legacyResult.user) {
                    return legacyResult.user;
                }
                throw new Error(legacyResult?.message || 'Signup failed in legacy system');
            }
        } catch (error) {
            console.warn('❌ Échec inscription backend, fallback vers système hérité:', error);

            if (this.useBackendAuth) {
                this.useBackendAuth = false;
                localStorage.setItem('useBackendAuth', 'false');
                return await this.signup(userData);
            }

            throw error;
        }
    }

    getCurrentUser(): AuthUser | null {
        try {
            // 1. Vérifier d'abord le token JWT du backend
            const backendToken = localStorage.getItem('authToken');
            const backendUser = localStorage.getItem('user');

            if (backendToken && backendUser) {
                try {
                    const user = JSON.parse(backendUser);

                    const authUser: AuthUser = {
                        id: user.id,
                        email: user.email,
                        name: user.nom || user.name || 'Utilisateur',
                        role: this.mapApiRoleToLegacyRole(user.role) as UserRole,
                        token: backendToken,
                        storeId: user.magasin?.id || user.storeId,
                        storeName: user.magasin?.nom || user.storeName,
                        storeAddress: user.storeAddress || '',
                        lastLogin: new Date(),
                    };

                    console.log('✅ Utilisateur backend récupéré:', authUser);
                    return authUser;
                } catch (error) {
                    console.warn('Erreur parsing user backend:', error);
                }
            }

            // 2. Vérifier le stockage legacy/SecureStorage
            const legacyUser = this.legacyAuthService.getCurrentUser();
            if (legacyUser) {
                console.log('✅ Utilisateur legacy récupéré:', legacyUser);
                return legacyUser;
            }

            // 3. Vérifier d'autres formats de stockage possibles
            const oldFormatUser = localStorage.getItem('currentUser');
            if (oldFormatUser) {
                try {
                    const parsed = JSON.parse(oldFormatUser);
                    const authUser: AuthUser = {
                        id: parsed.id || 'legacy-user',
                        email: parsed.email || 'unknown@example.com',
                        name: parsed.name || parsed.nom || 'Utilisateur',
                        role: parsed.role || 'magasin',
                        token: parsed.token || backendToken,
                        storeId: parsed.storeId,
                        storeName: parsed.storeName,
                        storeAddress: parsed.storeAddress || '',
                        lastLogin: new Date(parsed.lastLogin || Date.now()),
                    };

                    console.log('✅ Utilisateur ancien format récupéré:', authUser);
                    return authUser;
                } catch (error) {
                    console.warn('Erreur parsing ancien format user:', error);
                }
            }

            console.log('❌ Aucun utilisateur trouvé');
            return null;
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            return null;
        }
    }

    // Nouvelle méthode pour vérifier si l'utilisateur est connecté
    isAuthenticated(): boolean {
        const user = this.getCurrentUser();
        const isAuth = user !== null && (user.token || user.id);

        console.log('🔐 Vérification authentification:', {
            user: user ? `${user.email} (${user.role})` : 'null',
            isAuthenticated: isAuth,
            hasToken: !!user?.token,
            hasId: !!user?.id
        });

        return !!isAuth;
    }

    // Méthode pour diagnostiquer l'état d'authentification
    diagnoseAuthState(): any {
        return {
            backendToken: !!localStorage.getItem('authToken'),
            backendUser: !!localStorage.getItem('user'),
            legacyUser: !!this.legacyAuthService.getCurrentUser(),
            oldFormatUser: !!localStorage.getItem('currentUser'),
            currentUser: this.getCurrentUser(),
            isAuthenticated: this.isAuthenticated(),
            allLocalStorageKeys: Object.keys(localStorage),
        };
    }

    logout(): void {
        // Nettoyer les deux systèmes
        this.apiService.logout();
        this.legacyAuthService.logout();

        console.log('🔄 Basculement d\'authentification');
        // Nettoyer les préférences
        // localStorage.removeItem('useBackendAuth');

        console.log('🚪 Déconnexion complète');
    }

    async refreshToken(): Promise<AuthUser | null> {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return null;

        try {
            if (this.useBackendAuth) {
                // Récupérer le profil utilisateur pour vérifier la validité du token
                const profile = await this.apiService.getProfile();

                // Mettre à jour les informations utilisateur
                const updatedUser: AuthUser = {
                    ...currentUser,
                    name: profile.name || profile.name,
                    role: this.mapApiRoleToLegacyRole(profile.role) as UserRole,
                    storeId: profile.storeId || profile.storeId,
                    storeName: profile.storeName || profile.storeName,
                };

                this.storeAuthData(updatedUser, currentUser.token!);
                return updatedUser;
            } else {
                return this.legacyAuthService.refreshToken();
            }
        } catch (error) {
            console.warn('Erreur refresh token:', error);
            // ❌ NE PAS FORCER LA DÉCONNEXION - LAISSER L'UTILISATEUR CONNECTÉ
            // this.logout();
            return currentUser; // ✅ RETOURNER L'UTILISATEUR ACTUEL
        }
    }

    // =====================================
    // MÉTHODES UTILITAIRES
    // =====================================

    private mapApiRoleToLegacyRole(apiRole: string): string {
        const roleMapping: { [key: string]: string } = {
            'ADMIN': 'admin',
            'DIRECTION': 'admin',
            'MAGASIN': 'magasin',
            'CHAUFFEUR': 'chauffeur',
            'INTERLOCUTEUR': 'magasin',
        };

        return roleMapping[apiRole] || 'magasin';
    }

    private storeAuthData(user: AuthUser, token: string): void {
        try {
            // 1. Stocker dans le format backend
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({
                id: user.id,
                email: user.email,
                nom: user.name,
                role: this.mapLegacyRoleToApiRole(user.role),
                magasin: user.storeId ? {
                    id: user.storeId,
                    nom: user.storeName,
                } : null,
            }));

            // 2. Stocker aussi dans le format legacy pour compatibilité
            localStorage.setItem('currentUser', JSON.stringify(user));

            // 3. Utiliser le système legacy si disponible
            // Vérifier si la méthode existe sur l'instance ou le prototype
            if (typeof (this.legacyAuthService as any).storeAuthData === 'function') {
                (this.legacyAuthService as any).storeAuthData(user);
            }

            console.log('✅ Données d\'authentification stockées dans tous les formats');
        } catch (error) {
            console.error('Erreur stockage auth data:', error);
        }
    }

    private mapLegacyRoleToApiRole(legacyRole: string): string {
        const roleMapping: { [key: string]: string } = {
            'admin': 'ADMIN',
            'magasin': 'MAGASIN',
            'chauffeur': 'CHAUFFEUR',
        };

        return roleMapping[legacyRole] || 'MAGASIN';
    }

    // =====================================
    // MÉTHODES DE CONFIGURATION
    // =====================================

    switchToBackendAuth(): void {
        this.useBackendAuth = true;
        localStorage.setItem('useBackendAuth', 'true');
        console.log('🔄 Basculé vers l\'authentification backend');
    }

    switchToLegacyAuth(): void {
        this.useBackendAuth = false;
        localStorage.setItem('useBackendAuth', 'false');
        console.log('🔄 Basculé vers l\'authentification héritée');
    }

    isUsingBackendAuth(): boolean {
        return this.useBackendAuth;
    }
}

// Instance singleton
export const authAdapter = new AuthAdapter();