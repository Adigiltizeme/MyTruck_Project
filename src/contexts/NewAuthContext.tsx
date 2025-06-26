import React, { createContext, useContext, useState, useEffect } from 'react';
import { unifiedAuth, UnifiedUser, AuthResult } from '../services/unified-auth.service';

interface AuthContextType {
    user: UnifiedUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;

    // Debug helpers
    diagnoseAuth: () => any;
    testConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UnifiedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            console.log('🔄 Initialisation authentification unifiée...');

            // Récupérer l'utilisateur existant
            const existingUser = unifiedAuth.getCurrentUser();

            if (existingUser) {
                // Vérifier si la session est encore valide
                if (unifiedAuth.isAuthenticated()) {
                    setUser(existingUser);
                    console.log(`✅ Session restaurée: ${existingUser.email} (${existingUser.source})`);
                } else {
                    console.log('⚠️ Session expirée, nettoyage requis');
                    unifiedAuth.logout();
                }
            } else {
                console.log('ℹ️ Aucune session existante');
            }

        } catch (error) {
            console.error('❌ Erreur initialisation auth:', error);
            unifiedAuth.logout();
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<void> => {
        try {
            setIsLoading(true);
            console.log(`🔐 Tentative de connexion: ${email}`);

            const result: AuthResult = await unifiedAuth.login(email, password);

            if (result.success && result.user) {
                setUser(result.user);
                console.log(`✅ Connexion réussie: ${result.user.name} (${result.user.role})`);
            } else {
                throw new Error(result.error || 'Échec de connexion');
            }

        } catch (error) {
            console.error('❌ Erreur de connexion:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        console.log('🚪 Déconnexion...');
        unifiedAuth.logout();
        setUser(null);

        // Redirection vers login
        window.location.href = '/login';
    };

    const refreshUser = async (): Promise<void> => {
        try {
            console.log('🔄 Rafraîchissement utilisateur...');

            const currentUser = unifiedAuth.getCurrentUser();

            if (currentUser && unifiedAuth.isAuthenticated()) {
                setUser(currentUser);
                console.log('✅ Utilisateur rafraîchi');
            } else {
                console.log('⚠️ Session invalide lors du rafraîchissement');
                logout();
            }

        } catch (error) {
            console.error('❌ Erreur rafraîchissement utilisateur:', error);
            logout();
        }
    };

    const diagnoseAuth = () => {
        const diagnosis = unifiedAuth.diagnoseAuthState();
        console.group('🔍 Diagnostic Authentification');
        console.table(diagnosis);
        console.groupEnd();
        return diagnosis;
    };

    const testConnection = async (): Promise<boolean> => {
        try {
            const isConnected = await unifiedAuth.testConnection();
            console.log(`🌐 Test connexion: ${isConnected ? 'OK' : 'ÉCHEC'}`);
            return isConnected;
        } catch (error) {
            console.error('❌ Erreur test connexion:', error);
            return false;
        }
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: unifiedAuth.isAuthenticated(),
        isLoading,
        login,
        logout,
        refreshUser,
        diagnoseAuth,
        testConnection
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Hook de debug pour développement
export const useAuthDebug = () => {
    const { diagnoseAuth, testConnection } = useAuth();

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            // Exposer globalement pour debug
            (window as any).debugAuth = diagnoseAuth;
            (window as any).testAuthConnection = testConnection;

            console.log('💡 Debug auth disponible:');
            console.log('  - window.debugAuth()');
            console.log('  - window.testAuthConnection()');
        }
    }, [diagnoseAuth, testConnection]);
};