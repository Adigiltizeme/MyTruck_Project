import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { UserRole } from '../types/dashboard.types';
import { SecureStorageService } from '../services/secureStorage';
import { AuthService, AuthUser, SPECIAL_ACCOUNTS } from '../services/authService';
import { NotificationService } from '../services/notificationService';


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
    resetActivityTimer: () => void; // Add resetActivityTimer to the interface
    updateUserInfo: (userData: { name: string, email: string, phone?: string }) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    refreshUserContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(() => {
        return AuthService.getCurrentUser() || null;
    });
    const [loading, setLoading] = useState(true);
    const [sessionTimeout] = useState(60 * 60 * 1000); // 60 minutes par défaut
    const userActivityTimeout = useRef<NodeJS.Timeout | null>(null);
    const lastActivityTime = useRef<number>(Date.now());

    const resetActivityTimer = useCallback(() => {
        lastActivityTime.current = Date.now();

        if (userActivityTimeout.current) {
            clearTimeout(userActivityTimeout.current);
        }

        userActivityTimeout.current = setTimeout(() => {
            // Vérifier si le délai d'inactivité est dépassé
            if (Date.now() - lastActivityTime.current >= sessionTimeout) {
                console.log("Session expirée par inactivité");
                logout();
                NotificationService.warning("Votre session a expiré en raison d'inactivité");
            }
        }, sessionTimeout);
    }, [sessionTimeout]);

    // surveiller l'activité utilisateur
    useEffect(() => {
        if (!user) return;

        // Événements qui réinitialisent le timer d'inactivité
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Configurer les écouteurs d'événements
        const activityHandler = () => resetActivityTimer();
        events.forEach(event => {
            window.addEventListener(event, activityHandler);
        });

        // Initialiser le timer
        resetActivityTimer();

        // Nettoyer les écouteurs d'événements lors du démontage
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
        // Vérifier si l'utilisateur est déjà connecté
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
        setLoading(false);

        // Configurer un intervalle pour rafraîchir le token
        const tokenRefreshInterval = setInterval(() => {
            if (user) {
                refreshToken().catch(err => {
                    console.error('Erreur lors du rafraîchissement du token', err);
                    // Si le rafraîchissement échoue, déconnexion
                    logout();
                });
            }
        }, 30 * 60 * 1000); // 30 minutes

        return () => clearInterval(tokenRefreshInterval);
    }, []);

    const refreshToken = async () => {
        if (user) {
            const refreshedUser = AuthService.refreshToken();
            if (refreshedUser) {
                setUser(refreshedUser);
            }
        }
    };

    const refreshUserContext = async () => {
        if (!user) return;

        try {
            const refreshedUser = await AuthService.refreshUserContext(user.id);

            if (refreshedUser) {
                setUser(refreshedUser);
            }

            const currentUser = AuthService.getCurrentUser();
            if (currentUser && currentUser.id === user.id) {
              setUser(currentUser);
            }
            
        } catch (error) {
            console.error('Erreur lors du rafraîchissement du contexte utilisateur:', error);
        }
    };

    // Fonction pour changer de rôle
    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            const authenticatedUser = await AuthService.login(email, password);
            setUser(authenticatedUser);
            return authenticatedUser;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
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

        // Ajouter les options supplémentaires selon le rôle
        if (role === 'magasin' && options) {
            updatedUser.storeId = options.storeId || user.storeId;
            updatedUser.storeName = options.storeName || user.storeName;
            updatedUser.storeAddress = options.storeAddress || user.storeAddress;
        } else if (role === 'chauffeur' && options) {
            updatedUser.driverId = options.driverId || user.driverId;
        }

        // Mettre à jour le stockage sécurisé
        if (updatedUser.token) {
            SecureStorageService.setAuthData(updatedUser.token, updatedUser);
        }

        // Mettre à jour l'état
        setUser(updatedUser);

        // Forcer un rafraîchissement du contexte après un court délai
        // pour permettre à la mise à jour du stockage de se terminer
        setTimeout(() => {
            refreshUserContext();
        }, 100);
    };

    const updateUserInfo = async (userData: { name: string, email: string, phone?: string }) => {
        if (!user) return;

        try {
            // Mettre à jour l'utilisateur dans le service d'authentification
            const updatedUser = await AuthService.updateUserInfo(user.id, {
                ...user,
                name: userData.name,
                email: userData.email,
                storePhone: userData.phone
            });

            if (updatedUser) {
                // Mise à jour de l'état local
                setUser({
                    ...user,
                    name: userData.name,
                    email: userData.email,
                    storePhone: userData.phone
                });

                // Mise à jour du localStorage
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
            // Vérifier si l'utilisateur est un compte spécial
            const isSpecialAccount = SPECIAL_ACCOUNTS.includes(user.email.toLowerCase());

            if (!isSpecialAccount) {
                // Vérifier le mot de passe actuel
                const isCurrentPasswordValid = await AuthService.verifyPassword(currentPassword, user.passwordHash || '');

                if (!isCurrentPasswordValid) {
                    throw new Error('Mot de passe actuel incorrect');
                }
            }

            // Hacher le nouveau mot de passe
            const newPasswordHash = await AuthService.hashPassword(newPassword);

            // Mettre à jour l'utilisateur dans le service d'authentification
            const updatedUser = await AuthService.updateUserPassword(user.id, newPasswordHash);

            if (updatedUser) {
                // Mise à jour de l'état local
                setUser({
                    ...user,
                    passwordHash: newPasswordHash
                });

                // Pas besoin de mettre à jour le passwordHash dans le localStorage pour des raisons de sécurité
            }
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);
            throw error;
        }
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