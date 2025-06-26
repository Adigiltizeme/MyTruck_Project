import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { UserRole } from '../types/dashboard.types';
import { SecureStorageService } from '../services/secureStorage';
import { AuthService, AuthUser, SPECIAL_ACCOUNTS } from '../services/authService';
import { NotificationService } from '../services/notificationService';
import { authAdapter } from '../services/auth-adapter.service'; // AJOUT

interface AuthContextType {
    user: AuthUser | null;
    login: (email: string, password: string) => Promise<AuthUser>;
    logout: () => void;
    loading: boolean;
    setRole: (role: UserRole, options?: {
        storeId?: string;
        storeName?: string;
        storeAddress?: string;
        driverId?: string
    }) => void;
    refreshToken: () => Promise<void>;
    resetActivityTimer: () => void;
    updateUserInfo: (userData: { name: string, email: string, phone?: string }) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    refreshUserContext: () => Promise<void>;
    updateUserRole: (role: UserRole, options?: {
        storeId?: string;
        storeName?: string;
        storeAddress?: string;
        driverId?: string
    }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// ✅ Fonction de normalisation des rôles Backend
export function normalizeBackendRole(backendRole: string): string {
    const roleMap: Record<string, string> = {
        'ADMIN': 'admin',
        'DIRECTION': 'admin',
        'MAGASIN': 'magasin',
        'INTERLOCUTEUR': 'magasin',
        'CHAUFFEUR': 'chauffeur'
    };

    return roleMap[backendRole.toUpperCase()] || 'magasin';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [loading, setLoading] = useState(true);
    const [sessionTimeout] = useState(60 * 60 * 1000);
    const userActivityTimeout = useRef<NodeJS.Timeout | null>(null);
    const lastActivityTime = useRef<number>(Date.now());
    const [user, setUser] = useState<AuthUser | null>(() => {
        console.log('🔍 Initialisation AuthContext - Détection source utilisateur');

        // ✅ CORRECTION: Priorité absolue au système unifié

        // 1. Vérifier d'abord Backend API (plus récent)
        const backendToken = localStorage.getItem('authToken');
        const backendUser = localStorage.getItem('user');

        if (backendToken && backendUser) {
            try {
                const user = JSON.parse(backendUser);
                console.log('✅ Utilisateur Backend API détecté:', user.email);

                // FORCER la source Backend API
                localStorage.setItem('preferredDataSource', 'backend_api');
                localStorage.setItem('userSource', 'backend');

                // Transformer au format AuthUser
                const authUser: AuthUser = {
                    id: user.id,
                    email: user.email,
                    name: user.nom || `${user.prenom || ''} ${user.nom || ''}`.trim(),
                    role: normalizeBackendRole(user.role) as UserRole, // ✅ Normalisation
                    storeId: user.magasin?.id,
                    storeName: user.magasin?.nom,
                    storeAddress: user.magasin?.adresse,
                    driverId: user.chauffeur?.id,
                    token: backendToken,
                    lastLogin: new Date(),
                };

                return authUser;
            } catch (error) {
                console.warn('⚠️ Erreur parsing Backend user:', error);
            }
        }

        // 2. Fallback vers Legacy SEULEMENT si pas de Backend
        console.log('🔄 Tentative récupération Legacy user');
        const legacyUser = AuthService.getCurrentUser();
        if (legacyUser) {
            console.log('✅ Utilisateur Legacy récupéré:', legacyUser.email);
            // Forcer Airtable pour les utilisateurs Legacy
            localStorage.setItem('preferredDataSource', 'airtable');
            localStorage.setItem('userSource', 'legacy');
            return legacyUser;
        }

        console.log('❌ Aucun utilisateur trouvé');
        return null;
    });

    const resetActivityTimer = useCallback(() => {
        lastActivityTime.current = Date.now();

        if (userActivityTimeout.current) {
            clearTimeout(userActivityTimeout.current);
        }

        userActivityTimeout.current = setTimeout(() => {
            if (Date.now() - lastActivityTime.current >= sessionTimeout) {
                console.log("Session expirée par inactivité");
                logout();
                NotificationService.warning("Votre session a expiré en raison d'inactivité");
            }
        }, sessionTimeout);
    }, [sessionTimeout]);

    useEffect(() => {
        if (!user) return;

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const activityHandler = () => resetActivityTimer();
        events.forEach(event => {
            window.addEventListener(event, activityHandler);
        });

        resetActivityTimer();

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, activityHandler);
            });

            if (userActivityTimeout.current) {
                clearTimeout(userActivityTimeout.current);
            }
        };
    }, [user, resetActivityTimer]);

    useEffect(() => {
        // MODIFICATION: Vérifier l'utilisateur avec l'adaptateur d'abord
        const checkCurrentUser = () => {
            console.log('🔍 Vérification utilisateur au démarrage...');

            // 1. Essayer avec l'adaptateur (backend + legacy)
            const adapterUser = authAdapter.getCurrentUser();
            if (adapterUser) {
                console.log('✅ Utilisateur trouvé via adaptateur:', adapterUser.email);
                setUser(adapterUser);
                setLoading(false);
                return;
            }

            // 2. Fallback vers le système existant
            const currentUser = AuthService.getCurrentUser();
            if (currentUser) {
                console.log('✅ Utilisateur trouvé via AuthService:', currentUser.email);
                setUser(currentUser);
            } else {
                console.log('❌ Aucun utilisateur connecté trouvé');
            }

            setLoading(false);
        };

        checkCurrentUser();

        // Configurer un intervalle pour rafraîchir le token
        const tokenRefreshInterval = setInterval(() => {
            if (user) {
                refreshToken().catch(err => {
                    console.error('Erreur lors du rafraîchissement du token', err);
                    logout();
                });
            }
        }, 30 * 60 * 1000);

        return () => clearInterval(tokenRefreshInterval);
    }, []); // Dépendances vides pour ne s'exécuter qu'au montage

    const refreshToken = async () => {
        if (user) {
            try {
                // MODIFICATION: Essayer d'abord avec l'adaptateur
                const refreshedUser = authAdapter.refreshToken ?
                    await authAdapter.refreshToken() :
                    AuthService.refreshToken();

                if (refreshedUser) {
                    setUser(refreshedUser);
                }
            } catch (error) {
                console.error('Erreur refresh token:', error);
                logout();
            }
        }
    };

    const refreshUserContext = async () => {
        if (!user) return;

        try {
            // MODIFICATION: Utiliser l'adaptateur pour rafraîchir
            const refreshedUser = authAdapter.refreshToken ?
                await authAdapter.refreshToken() :
                await AuthService.refreshUserContext(user.id);

            if (refreshedUser) {
                setUser(refreshedUser);
            }

            // Vérifier aussi le stockage direct
            const currentUser = authAdapter.getCurrentUser() || AuthService.getCurrentUser();
            if (currentUser && currentUser.id === user.id) {
                setUser(currentUser);
            }

        } catch (error) {
            console.error('Erreur lors du rafraîchissement du contexte utilisateur:', error);
        }
    };

    const updateUserRole = async (role: UserRole, options?: any) => {
        // Implement the logic to update the user role and any related state
        if (!user) return;

        const updatedUser = {
            ...user,
            role,
            ...options
        };

        try {
            await AuthService.updateUserInfo(user.id, updatedUser);
            setUser(updatedUser);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du rôle utilisateur:', error);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            console.log('🔐 Connexion - Backend API PRIORITAIRE');

            let authenticatedUser: AuthUser;

            // ✅ CORRECTION: TOUJOURS essayer Backend en PREMIER
            try {
                console.log('🚀 PRIORITÉ: Tentative Backend API...');

                const apiResponse = await fetch('http://localhost:3000/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email.toLowerCase().trim(),
                        password: password
                    }),
                    signal: AbortSignal.timeout(5000) // Timeout 5s
                });

                if (!apiResponse.ok) {
                    const errorText = await apiResponse.text();
                    console.error('Backend API erreur:', apiResponse.status, errorText);
                    throw new Error(`Backend: ${apiResponse.status} ${apiResponse.statusText}`);
                }

                const backendData = await apiResponse.json();

                if (!backendData.access_token || !backendData.user) {
                    throw new Error('Format réponse Backend invalide');
                }

                // Transformation Backend → Unifié
                authenticatedUser = {
                    id: backendData.user.id,
                    email: backendData.user.email,
                    name: `${backendData.user.prenom || ''} ${backendData.user.nom || ''}`.trim(),
                    role: backendData.user.role?.toLowerCase() || 'magasin',
                    storeId: backendData.user.magasin?.id,
                    storeName: backendData.user.magasin?.nom,
                    storeAddress: backendData.user.magasin?.adresse || '',
                    driverId: backendData.user.chauffeur?.id,
                    token: backendData.access_token,
                    lastLogin: new Date(),
                    source: 'backend'
                };

                // ✅ FORCER utilisation Backend pour TOUT
                localStorage.setItem('preferredDataSource', 'backend_api');
                localStorage.setItem('userSource', 'backend');
                localStorage.setItem('authMethod', 'backend_api'); // ✅ NOUVEAU marqueur

                console.log('🎉 SUCCÈS Backend API - Source FORCÉE à Backend');

            } catch (backendError) {
                console.error('❌ Backend API échec:', backendError);

                // ✅ SEULEMENT en dernier recours : Legacy
                console.log('🔄 FALLBACK vers Legacy (Airtable)...');

                try {
                    authenticatedUser = await AuthService.login(email, password);
                    authenticatedUser.source = 'legacy';

                    // Marquer utilisation Legacy
                    localStorage.setItem('preferredDataSource', 'airtable');
                    localStorage.setItem('userSource', 'legacy');
                    localStorage.setItem('authMethod', 'airtable'); // ✅ NOUVEAU marqueur

                    console.log('✅ Fallback Legacy réussi');

                    // Avertir l'utilisateur
                    console.warn('🔶 ATTENTION: Connexion en mode dégradé (Airtable)');

                } catch (legacyError) {
                    console.error('❌ Legacy aussi échoué:', legacyError);
                    throw new Error('Échec de connexion sur tous les systèmes');
                }
            }

            setUser(authenticatedUser);
            return authenticatedUser;

        } catch (error) {
            console.error('❌ Erreur connexion finale:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        console.log('🚪 Déconnexion...');

        // MODIFICATION: Nettoyer les deux systèmes
        authAdapter.logout();
        AuthService.logout();
        setUser(null);

        // Rediriger vers la page de connexion
        window.location.href = '/login';
    };

    // Fonction pour changer de rôle
    const setRole = (role: UserRole, options?: {
        storeId?: string;
        storeName?: string;
        storeAddress?: string;
        driverId?: string
    }) => {
        if (!user) return;

        const newUser = {
            ...user,
            role,
            storeId: options?.storeId,
            storeName: options?.storeName,
            storeAddress: options?.storeAddress,
            driverId: options?.driverId,
            lastLogin: new Date()
        };

        AuthService.updateUserInfo(user.id, {
            role,
            storeId: options?.storeId,
            storeName: options?.storeName,
            storeAddress: options?.storeAddress,
            driverId: options?.driverId
        }).then(updatedUser => {
            if (updatedUser) {
                setUser(updatedUser);
            } else {
                setUser(newUser);
            }
        }).catch(error => {
            console.error('Failed to update user info:', error);
            setUser(newUser);
        });

        const updatedUser = {
            ...user,
            role
        };

        if (role === 'magasin' && options) {
            updatedUser.storeId = options.storeId || user.storeId;
            updatedUser.storeName = options.storeName || user.storeName;
            updatedUser.storeAddress = options.storeAddress || user.storeAddress;
        } else if (role === 'chauffeur' && options) {
            updatedUser.driverId = options.driverId || user.driverId;
        }

        if (updatedUser.token) {
            SecureStorageService.setAuthData(updatedUser.token, updatedUser);
        }

        setUser(updatedUser);

        setTimeout(() => {
            refreshUserContext();
        }, 100);
    };

    const updateUserInfo = async (userData: { name: string, email: string, phone?: string }) => {
        if (!user) return;

        try {
            const updatedUser = await AuthService.updateUserInfo(user.id, {
                ...user,
                name: userData.name,
                email: userData.email,
                storePhone: userData.phone
            });

            if (updatedUser) {
                setUser({
                    ...user,
                    name: userData.name,
                    email: userData.email,
                    storePhone: userData.phone
                });

                SecureStorageService.updateAuthData({
                    ...user,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone
                });
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour des informations:', error);
            throw error;
        }
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        if (!user) return;

        try {
            const isSpecialAccount = SPECIAL_ACCOUNTS.includes(user.email.toLowerCase());

            if (!isSpecialAccount) {
                const isCurrentPasswordValid = await AuthService.verifyPassword(currentPassword, user.passwordHash || '');

                if (!isCurrentPasswordValid) {
                    throw new Error('Mot de passe actuel incorrect');
                }
            }

            const newPasswordHash = await AuthService.hashPassword(newPassword);
            const updatedUser = await AuthService.updateUserPassword(user.id, newPasswordHash);

            if (updatedUser) {
                setUser({
                    ...user,
                    passwordHash: newPasswordHash
                });
            }
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);
            throw error;
        }
    };

    // AJOUT: Fonction de debug pour diagnostiquer les problèmes
    const debugAuthState = () => {
        console.log('=== DEBUG AUTH STATE ===');
        console.log('User dans le contexte:', user);
        console.log('Loading:', loading);
        console.log('User via adaptateur:', authAdapter.getCurrentUser());
        console.log('User via AuthService:', AuthService.getCurrentUser());
        console.log('LocalStorage authToken:', localStorage.getItem('authToken'));
        console.log('LocalStorage user:', localStorage.getItem('user'));
        console.log('========================');
    };

    // AJOUT: Exposer la fonction de debug en développement
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        (window as any).debugAuthState = debugAuthState;
    }

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            loading,
            setRole,
            refreshToken,
            resetActivityTimer,
            updateUserInfo,
            changePassword,
            refreshUserContext,
            updateUserRole
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};