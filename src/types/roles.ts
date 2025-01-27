export type UserRole = 'magasin' | 'chauffeur' | 'admin';

export interface UserAccess {
    role: UserRole;
    storeId?: string;  // Pour les utilisateurs magasin
    driverId?: string; // Pour les chauffeurs
}

export interface DashboardAccess {
    canViewAllStores: boolean;
    canViewAllDrivers: boolean;
    canViewFinancials: boolean;
    canManageUsers: boolean;
    canEditDeliveries: boolean;
}

// Mapping des accès par rôle
export const roleAccess: Record<UserRole, DashboardAccess> = {
    admin: {
        canViewAllStores: true,
        canViewAllDrivers: true,
        canViewFinancials: true,
        canManageUsers: true,
        canEditDeliveries: true
    },
    magasin: {
        canViewAllStores: false,
        canViewAllDrivers: false,
        canViewFinancials: true, // Uniquement leurs propres données
        canManageUsers: false,
        canEditDeliveries: false
    },
    chauffeur: {
        canViewAllStores: false,
        canViewAllDrivers: false,
        canViewFinancials: false,
        canManageUsers: false,
        canEditDeliveries: false
    }
};