import React from 'react';
import { DashboardContext, UserRole } from '../../types/dashboard.types';
import AdminDashboard from './AdminDashboard';
import StoreDashboard from './StoreDashboard';
// import DriverDashboard from './DriverDashboard';

interface DashboardControllerProps {
    role: UserRole;
    storeId?: string;
    driverId?: string;
}

const DashboardController: React.FC<DashboardControllerProps> = ({
    role,
    storeId,
    // driverId
}) => {
    // Sélection du dashboard en fonction du rôle
    const renderDashboard = () => {
        switch (role) {
            case 'admin':
                return <AdminDashboard />;
            case 'magasin':
                if (!storeId) {
                    return <div className="text-red-600">Erreur: ID du magasin manquant</div>;
                }
                return <StoreDashboard storeId={storeId} />;
            // case 'chauffeur':
            //     if (!driverId) {
            //         return <div className="text-red-600">Erreur: ID du chauffeur manquant</div>;
            //     }
            //     return <DriverDashboard driverId={driverId} />;
            default:
                return <div className="text-red-600">Rôle non reconnu</div>;
        }
    };

    return (
        <div className="p-6">
            {renderDashboard()}
        </div>
    );
};

export default DashboardController;