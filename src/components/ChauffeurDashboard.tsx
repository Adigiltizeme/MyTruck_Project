import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UnifiedDashboard } from './dashboard/UnifiedDashboard';

interface ChauffeurDashboardProps {
    driverId?: string;
}

const ChauffeurDashboard: React.FC<ChauffeurDashboardProps> = ({ driverId }) => {
    const { user } = useAuth();

    // ✅ Utiliser le driverId passé en props, sinon fallback sur user
    const effectiveDriverId = driverId || user?.driverId || user?.id;

    console.log('🚛 ChauffeurDashboard - driverId:', {
        propDriverId: driverId,
        userDriverId: user?.driverId,
        userId: user?.id,
        effectiveDriverId
    });

    return <UnifiedDashboard role="chauffeur" driverId={effectiveDriverId} />;
};

export default ChauffeurDashboard;