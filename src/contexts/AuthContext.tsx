import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { UserRole } from '../types/dashboard.types';
import { NotificationService } from '../services/notificationService';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    originalRole?: UserRole; // 🆕 Rôle réel de l'utilisateur (avant simulation RoleSelector)
    storeId?: string;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeStatus?: string;
    storeEnseigne?: string;
    driverId?: string;
    driverName?: string;
    token: string;
    lastLogin: Date;
    magasin?: {
        id: string;
        nom: string;
        adresse?: string;
    };
}

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
        driverName?: string;
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
        storeEnseigne?: string;
        driverId?: string;
        driverName?: string;
    }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configuration API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ⚠️ DEBUG URGENCE - À ajouter AVANT la classe ApiAuthService
if (typeof window !== 'undefined') {
    // Sauvegarder les méthodes originales
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    const originalClear = localStorage.clear;

    // Intercepter toutes les opérations localStorage
    localStorage.setItem = function (key, value) {
        if (key === 'authToken' || key === 'user') {
            console.log(`✅ STOCKAGE: ${key}`, new Error().stack);
        }
        return originalSetItem.apply(this, [...arguments] as [string, string]);
    };

    localStorage.removeItem = function (key) {
        if (key === 'authToken' || key === 'user') {
            console.error(`🚨 SUPPRESSION: ${key}`, new Error().stack);
        }
        return originalRemoveItem.apply(this, [...arguments] as [string]);
    };

    localStorage.clear = function () {
        console.error('🚨 CLEAR COMPLET localStorage', new Error().stack);
        return originalClear.apply(this);
    };

    console.log('🔍 Surveillance localStorage activée');
}
// Service API unifié
class ApiAuthService {
    public static getStoredUser(): AuthUser | null {
        try {
            console.log('🔍 Debug stockage localStorage:');
            console.log('- authToken:', !!localStorage.getItem('authToken'));
            console.log('- user:', !!localStorage.getItem('user'));
            // console.log('- Toutes les clés:', Object.keys(localStorage));

            const token = localStorage.getItem('authToken');
            const userData = localStorage.getItem('user');

            console.log('📦 Token trouvé:', !!token);
            console.log('📦 UserData trouvé:', !!userData);

            if (!token || !userData) {
                console.log('❌ Données manquantes dans localStorage');

                // ✅ TENTATIVE DE RÉCUPÉRATION DEPUIS D'AUTRES SOURCES
                const backupUser = localStorage.getItem('currentUser');
                if (backupUser) {
                    console.log('🔄 Tentative récupération backup user');
                    try {
                        const parsed = JSON.parse(backupUser);
                        if (parsed.token) {
                            // Restaurer les données
                            localStorage.setItem('authToken', parsed.token);
                            localStorage.setItem('user', JSON.stringify(parsed));
                            return this.getStoredUser(); // Rappel récursif
                        }
                    } catch (e) {
                        console.warn('Backup user invalide');
                    }
                }

                return null;
            }

            const user = JSON.parse(userData);
            const userRole = user.role?.toLowerCase() as UserRole;

            const authUser = {
                id: user.id,
                email: user.email,
                name: user.nom || `${user.prenom || ''} ${user.nom || ''}`.trim(),
                role: userRole,
                originalRole: user.originalRole || userRole, // 🆕 Préserver ou initialiser originalRole
                token,
                lastLogin: new Date(),
                magasin: user.magasin ? {
                    ...user.magasin,
                    name: user.magasin.nom || user.magasin.name || '',
                    address: user.magasin.adresse || user.magasin.address || '',
                    phone: user.magasin.telephone || user.magasin.phone || '',
                    status: user.magasin.status || '',
                    email: user.magasin.email || '',
                    manager: user.magasin.manager || ''
                } : undefined,
                // ✅ IMPORTANT: Prioriser les champs directs (RoleSelector) sur les champs imbriqués
                storeId: user.storeId || user.magasin?.id,
                storeName: user.storeName || user.magasin?.nom || user.magasin?.name,
                storeAddress: user.storeAddress || user.magasin?.adresse || user.magasin?.address,
                storePhone: user.storePhone || user.magasin?.telephone || user.magasin?.phone,
                // Si c'est un chauffeur, définir driverId et driverName
                driverId: user.driverId || (user.role?.toLowerCase() === 'chauffeur' ? user.id : undefined),
                driverName: user.driverName || (user.role?.toLowerCase() === 'chauffeur'
                    ? user.nom || `${user.prenom || ''} ${user.nom || ''}`.trim()
                    : undefined),
            };

            console.log('📦 User restauré depuis localStorage:', {
                role: authUser.role,
                storeId: authUser.storeId,
                driverId: authUser.driverId
            });

            return authUser;
        } catch (error) {
            console.error('❌ Erreur récupération utilisateur stocké:', error);
            return null;
        }
    }

    private static storeUser(token: string, userData: any): void {
        console.log('💾 STOCKAGE FORCÉ - Avant:', {
            token: !!localStorage.getItem('authToken'),
            user: !!localStorage.getItem('user')
        });

        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('preferredDataSource', 'backend_api');
        localStorage.setItem('userSource', 'backend');

        // ✅ CORRECTION CRITIQUE: Mettre à jour l'instance ApiService avec le nouveau token
        import('../services/api.service').then(({ apiService }) => {
            apiService.setToken(token);
            console.log('✅ Token mis à jour dans ApiService');
        }).catch(error => {
            console.warn('⚠️ Erreur mise à jour token ApiService:', error);
        });

        // ✅ VÉRIFICATION IMMÉDIATE
        setTimeout(() => {
            console.log('💾 STOCKAGE FORCÉ - Après 0ms:', {
                token: !!localStorage.getItem('authToken'),
                user: !!localStorage.getItem('user')
            });
        }, 0);

        setTimeout(() => {
            console.log('💾 STOCKAGE FORCÉ - Après 100ms:', {
                token: !!localStorage.getItem('authToken'),
                user: !!localStorage.getItem('user')
            });
        }, 100);
    }

    public static clearUser(): void {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('preferredDataSource');
        localStorage.removeItem('userSource');
    }

    static async login(email: string, password: string): Promise<AuthUser> {
        try {
            console.log('🔐 Connexion Backend API...');

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password: password
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erreur authentification:', response.status, errorText);
                throw new Error(`Échec de connexion: ${response.status}`);
            }

            const data = await response.json();

            if (!data.access_token || !data.user) {
                throw new Error('Réponse invalide du serveur');
            }

            // Stocker les données
            this.storeUser(data.access_token, data.user);

            // Transformer au format AuthUser
            const userRole = data.user.role?.toLowerCase() as UserRole;
            const authUser: AuthUser = {
                id: data.user.id,
                email: data.user.email,
                name: `${data.user.prenom || ''} ${data.user.nom || ''}`.trim(),
                role: userRole,
                originalRole: userRole, // 🆕 Stocker le rôle réel
                token: data.access_token,
                lastLogin: new Date(),
                magasin: data.user.magasin ? {
                    ...data.user.magasin,
                    name: data.user.magasin.nom || data.user.magasin.name || '',
                    address: data.user.magasin.adresse || data.user.magasin.address || '',
                    phone: data.user.magasin.telephone || data.user.magasin.phone || '',
                    status: data.user.magasin.status || '',
                    email: data.user.magasin.email || '',
                    manager: data.user.magasin.manager || ''
                } : undefined,
                storeId: data.user.magasin?.id,
                storeName: data.user.magasin?.nom || data.user.magasin?.name,
                storeAddress: data.user.magasin?.adresse || data.user.magasin?.address,
                storePhone: data.user.magasin?.telephone || data.user.magasin?.phone,
                // Si c'est un chauffeur, définir driverId et driverName
                driverId: data.user.role?.toLowerCase() === 'chauffeur' ? data.user.id : undefined,
                driverName: data.user.role?.toLowerCase() === 'chauffeur' 
                    ? `${data.user.prenom || ''} ${data.user.nom || ''}`.trim() 
                    : undefined,
            };

            console.log('✅ Connexion réussie:', authUser.email);
            return authUser;

        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            throw error;
        }
    }

    static async getProfile(token: string): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
        });

        if (!response.ok) {
            throw new Error('Erreur récupération profil');
        }

        return response.json();
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [sessionTimeout] = useState(24 * 60 * 60 * 1000); // 24 heures
    const userActivityTimeout = useRef<NodeJS.Timeout | null>(null);
    const lastActivityTime = useRef<number>(Date.now());

    // Initialisation de l'utilisateur depuis le stockage
    const [user, setUser] = useState<AuthUser | null>(() => {
        console.log('🔍 Initialisation AuthContext...');
        const storedUser = ApiAuthService.getStoredUser();
        if (storedUser) {
            console.log('✅ Utilisateur trouvé:', storedUser.email);
        } else {
            console.log('❌ Aucun utilisateur connecté');
        }
        return storedUser;
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
        if (!user) {
            setLoading(false);
            return;
        }

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const activityHandler = () => resetActivityTimer();
        events.forEach(event => {
            window.addEventListener(event, activityHandler);
        });

        resetActivityTimer();
        setLoading(false);

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, activityHandler);
            });

            if (userActivityTimeout.current) {
                clearTimeout(userActivityTimeout.current);
            }
        };
    }, [user, resetActivityTimer]);

    const login = async (email: string, password: string): Promise<AuthUser> => {
        try {
            setLoading(true);
            const authenticatedUser = await ApiAuthService.login(email, password);
            setUser(authenticatedUser);
            return authenticatedUser;
        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        console.log('🚪 Déconnexion...');
        ApiAuthService.clearUser();
        setUser(null);
        window.location.href = '/login';
    };

    const refreshToken = async () => {
        if (user && user.token) {
            try {
                const profile = await ApiAuthService.getProfile(user.token);

                const refreshedUser: AuthUser = {
                    ...user,
                    name: `${profile.prenom || ''} ${profile.nom || ''}`.trim(),
                    magasin: profile.magasin ? {
                        ...profile.magasin,
                        name: profile.magasin.nom || profile.magasin.name || '',
                        address: profile.magasin.adresse || profile.magasin.address || '',
                        phone: profile.magasin.telephone || profile.magasin.phone || '',
                        status: profile.magasin.status || '',
                        email: profile.magasin.email || '',
                        manager: profile.magasin.manager || ''
                    } : undefined,
                    storeId: profile.magasin?.id,
                    storeName: profile.magasin?.nom || profile.magasin?.name,
                    storeAddress: profile.magasin?.adresse || profile.magasin?.address,
                    storePhone: profile.magasin?.telephone || profile.magasin?.phone,
                };

                setUser(refreshedUser);
            } catch (error) {
                console.error('Erreur refresh token:', error);
                // ❌ NE PAS FORCER LA DÉCONNEXION
                // logout();
                // ✅ LAISSER L'UTILISATEUR CONNECTÉ
                console.warn('Refresh token échoué, utilisateur maintenu connecté');
            }
        }
    };

    const refreshUserContext = async () => {
        if (user && user.token) {
            try {
                await refreshToken();
            } catch (error) {
                console.error('Erreur rafraîchissement contexte:', error);
            }
        }
    };

    const setRole = (role: UserRole, options?: {
        storeId?: string;
        storeName?: string;
        storeAddress?: string;
        driverId?: string;
        driverName?: string;
    }) => {
        if (!user) return;

        const updatedUser = {
            ...user,
            role,
            // 🆕 Préserver originalRole lors de la simulation RoleSelector
            originalRole: user.originalRole || user.role,
            storeId: options?.storeId || user.storeId,
            storeName: options?.storeName || user.storeName,
            storeAddress: options?.storeAddress || user.storeAddress,
            driverId: options?.driverId || user.driverId,
            driverName: options?.driverName || user.driverName,
        };

        setUser(updatedUser);

        // ✅ IMPORTANT: Persister les changements dans localStorage pour survivre au rafraîchissement
        if (typeof window !== 'undefined') {
            window.currentAuthUser = updatedUser;
            // Récupérer les données user actuelles dans localStorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const userData = JSON.parse(userStr);
                    // Mettre à jour avec les nouvelles valeurs
                    const updatedUserData = {
                        ...userData,
                        role,
                        originalRole: userData.originalRole || userData.role,
                        storeId: options?.storeId || userData.storeId,
                        storeName: options?.storeName || userData.storeName,
                        storeAddress: options?.storeAddress || userData.storeAddress,
                        driverId: options?.driverId || userData.driverId,
                        driverName: options?.driverName || userData.driverName,
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUserData));
                    console.log('✅ User mis à jour dans localStorage:', { role, storeId: options?.storeId });
                } catch (error) {
                    console.error('❌ Erreur mise à jour localStorage:', error);
                }
            }
        }
    };

    const updateUserRole = async (role: UserRole, options?: any) => {
        if (!user) return;

        const updatedUser = {
            ...user,
            role,
            // 🆕 Préserver originalRole lors de la simulation RoleSelector
            originalRole: user.originalRole || user.role,
            ...options
        };

        setUser(updatedUser);
    };

    const updateUserInfo = async (userData: { name: string, email: string, phone?: string }) => {
        if (!user) return;

        const updatedUser = {
            ...user,
            name: userData.name,
            email: userData.email,
        };

        setUser(updatedUser);
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        if (!user) return;

        // TODO: Implémenter l'appel API pour changer le mot de passe
        console.log('Changement de mot de passe à implémenter');
    };

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