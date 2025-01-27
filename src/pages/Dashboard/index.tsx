// import { useEffect, useState } from 'react';
// import { mockDeliveries } from '../../mocks';
// import MetricsSection from './components/MetricsSection';
// import DeliveriesTable from '../../components/DeliveriesTable';
// import { useMetricsData } from '../../hooks/useMetricsData';
// import { BasicCommandeMetier, FilterOptions } from '../../types/metrics';
// import Filters from './components/Filters';
// import ErrorBoundary from '../../components/ErrorBoundary';
// import { CommandeMetier } from '../../types/business.types';

// const Dashboard = () => {
//     const [selectedPeriod, setSelectedPeriod] = useState<FilterOptions['dateRange']>('day');
//     const [filters, setFilters] = useState<FilterOptions>({
//         dateRange: 'day',
//         store: ''
//     });
//     const { data: metricsData, loading: metricsLoading, error: metricsError } = useMetricsData({dateRange: selectedPeriod});
//     const handleFilterChange = (newFilters: FilterOptions) => {
//         setFilters(prev => ({
//             ...prev,
//             ...newFilters
//         }));
//     };

//     // Pour tester le filtrage
//     useEffect(() => {
//         console.log('Filtres actuels:', filters);
//     }, [filters]);


//     return (
//         <div className="p-8">
//             <div className="flex justify-between items-center mb-8">
//                 <div className="flex items-center space-x-4">
//                     <h1 className="text-2xl font-semibold">Tableau de bord</h1>
//                     {metricsLoading && (
//                         <div className="text-sm text-gray-500">
//                             Chargement des données...
//                         </div>
//                     )}
//                     {metricsError && (
//                         <div className="text-sm text-red-500">
//                             {metricsError}
//                         </div>
//                     )}
//                 </div>
//                 <select
//                     value={selectedPeriod}
//                     onChange={(e) => setSelectedPeriod(e.target.value as FilterOptions['dateRange'])}
//                     className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
//                     disabled={metricsLoading}
//                 >
//                     <option value="today">Aujourd'hui</option>
//                     <option value="week">Cette semaine</option>
//                     <option value="month">Ce mois</option>
//                     <option value="year">Cette année</option>
//                 </select>
//             </div>

//             <Filters onFilterChange={handleFilterChange} />

//             <div className="space-y-8">
//                 <MetricsSection
//                     selectedPeriod={selectedPeriod}
//                     data={metricsData}
//                     loading={metricsLoading}
//                     error={metricsError}
//                 />
//                 <DeliveriesTable deliveries={mockDeliveries} />
//             </div>
//         </div>
//     );
// };

import React, { useState } from 'react';
import MetricsSection from './components/MetricsSection';
import Filters from './components/Filters';
import { useMetricsData } from '../../hooks/useMetricsData';
import { FilterOptions } from '../../types/metrics';
import { UserRole } from '../../types/dashboard.types';
import Loading from '../../components/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { RoleSelector } from '../../components/RoleSelector';

interface DashboardProps {
    userRole?: UserRole;
    storeId?: string;
}

const Dashboard: React.FC<DashboardProps> = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState<FilterOptions>({
        dateRange: 'day',
        store: user?.role === 'magasin' ? user.storeId : ''  // Filtre automatique pour les magasins
    });

    const { data, loading, error } = useMetricsData(filters);

    const handleFilterChange = (newFilters: FilterOptions) => {
        setFilters(newFilters);
    };

    if (loading) {
        return (
            <Loading />
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
                {error}
            </div>
        );
    }

    if (!data) {
        return <div>Aucune donnée disponible</div>;
    }

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <RoleSelector />
            </div>
            {/* En-tête avec filtres */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                    {user?.role === 'admin' ? 'Tableau de bord administrateur' : 'Tableau de bord'}
                </h1>
                <Filters 
                    onFilterChange={handleFilterChange}
                    stores={user?.role === 'admin' ? data?.store : undefined}
                    currentFilters={filters}
                    userRole={user?.role || 'magasin'}
                />
            </div>

            {/* Section des métriques */}
            <MetricsSection 
                data={data}
                userRole={user?.role || 'magasin'}
            />
        </div>
    );
};

export default Dashboard;