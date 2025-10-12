export type UserRole = 'admin' | 'direction' | 'magasin' | 'chauffeur';

export interface DashboardPermissions {
    viewAllStores: boolean;
    viewAllDrivers: boolean;
    viewMetrics: boolean;
    viewFinancials: boolean;
    editDeliveries: boolean;
}

export interface DashboardContext {
    role: UserRole;
    storeId?: string;
    driverId?: string;
    permissions: DashboardPermissions;
}

// Configurations des permissions par rôle
export const ROLE_PERMISSIONS: Record<UserRole, DashboardPermissions> = {
    admin: {
        viewAllStores: true,
        viewAllDrivers: true,
        viewMetrics: true,
        viewFinancials: true,
        editDeliveries: true
    },
    magasin: {
        viewAllStores: false,
        viewAllDrivers: false,
        viewMetrics: true,
        viewFinancials: false,
        editDeliveries: true
    },
    chauffeur: {
        viewAllStores: false,
        viewAllDrivers: false,
        viewMetrics: false,
        viewFinancials: false,
        editDeliveries: false
    },
    direction: {
        viewAllStores: true,
        viewAllDrivers: true,
        viewMetrics: true,
        viewFinancials: true,
        editDeliveries: true
    }
};