import { useEffect, useState } from 'react';
import { mockDeliveries } from '../../mocks';
import MetricsSection from './components/MetricsSection';
import DeliveriesTable from '../../components/DeliveriesTable';
import { useMetricsData } from '../../hooks/useMetricsData';
import { FilterOptions } from '../../types/metrics';
import Filters from './components/Filters';

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
const Dashboard = () => {
    const [filters, setFilters] = useState<FilterOptions>({
        dateRange: 'day',
        store: ''
    });

    const { data: metricsData, loading: metricsLoading, error: metricsError } = useMetricsData(filters);

    // Log pour debug
    useEffect(() => {
        console.log('Données dashboard:', { filters, metricsData });
    }, [filters, metricsData]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-semibold">Tableau de bord</h1>
            </div>

            <Filters onFilterChange={setFilters} />

            {metricsLoading && <div>Chargement...</div>}
            {metricsError && <div className="text-red-500">{metricsError}</div>}
            {metricsData && (
                <div className="space-y-8">
                    <MetricsSection
                        selectedPeriod={filters.dateRange}
                        data={metricsData}
                        loading={metricsLoading}
                        error={metricsError}
                    />
                    <DeliveriesTable
                        commandes={metricsData?.commandes || []} 
                        store={filters.store}
                    />
                </div>
            )}
        </div>
    );
};

export default Dashboard;