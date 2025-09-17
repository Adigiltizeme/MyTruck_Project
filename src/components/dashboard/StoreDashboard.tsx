import React from 'react';
import { UnifiedDashboard } from './UnifiedDashboard';

interface StoreDashboardProps {
    storeId: string;
}

const StoreDashboard: React.FC<StoreDashboardProps> = ({ storeId }) => {
    return <UnifiedDashboard role="magasin" storeId={storeId} />;
};

export default StoreDashboard;