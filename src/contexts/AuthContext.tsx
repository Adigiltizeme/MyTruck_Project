import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types/dashboard.types';

interface AuthUser {
    id: string;
    role: UserRole;
    storeId?: string;  // Pour les utilisateurs magasins
    driverId?: string; // Pour les chauffeurs
    name: string;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    setRole: (role: UserRole, options?: { storeId?: string; driverId?: string }) => void; // Nouvelle fonction
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : {
            id: '1',
            role: 'admin',
            name: 'Test User'
        };
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Vérifier si l'utilisateur est déjà connecté
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    // Fonction pour changer de rôle
    const setRole = (role: UserRole, options?: { storeId?: string; driverId?: string }) => {
        const newUser = {
            ...user,
            id: user?.id || '',
            name: user?.name || '',
            role,
            storeId: options?.storeId,
            driverId: options?.driverId
        };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const login = async (email: string, password: string) => {
        try {
            // Simulation d'authentification pour le moment
            // À remplacer par votre véritable logique d'authentification
            let mockUser: AuthUser;

            if (email.includes('admin')) {
                mockUser = {
                    id: '1',
                    role: 'admin',
                    name: 'Admin User'
                };
            } else if (email.includes('store')) {
                mockUser = {
                    id: '2',
                    role: 'magasin',
                    storeId: 'store123',
                    name: 'Store Manager'
                };
            } else {
                mockUser = {
                    id: '3',
                    role: 'chauffeur',
                    driverId: 'driver123',
                    name: 'Driver User'
                };
            }

            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, setRole }}>
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