import React from 'react';
import { DashboardContext, UserRole } from '../../types/dashboard.types';
import AdminDashboard from './AdminDashboard';
import StoreDashboard from './StoreDashboard';
import ChauffeurDashboard from '../ChauffeurDashboard';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardControllerProps {
    role: UserRole;
    storeId?: string;
}

const DashboardController: React.FC<DashboardControllerProps> = ({
    role,
    storeId,
}) => {
    const { user } = useAuth();

    // Sélection du dashboard en fonction du rôle
    const renderDashboard = () => {
        switch (role) {
            case 'admin':
            case 'direction':
                return <AdminDashboard />;
            case 'magasin':
                if (!storeId) {
                    return <div className="text-red-600">Erreur: ID du magasin manquant</div>;
                }
                return <StoreDashboard storeId={storeId} />;
            case 'chauffeur':
                // ✅ Passer le driverId du contexte utilisateur
                const driverId = user?.driverId || user?.id;
                return <ChauffeurDashboard driverId={driverId} />;
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