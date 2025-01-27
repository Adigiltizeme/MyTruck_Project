// import React, { useEffect, useMemo, useState } from 'react';
// import {
//     LineChart, Line, XAxis, YAxis, CartesianGrid,
//     Tooltip, ResponsiveContainer, AreaChart, Area,
//     Legend
// } from 'recharts';
// import Loading from '../../../components/Loading';
// import { HistoriqueData, MetricCardProps, MetricData, MetricsSectionProps } from '../../../types/metrics';
// import { useAirtable } from '../../../hooks/useAirtable';


// Composant pour le tooltip personnalisé
// const CustomTooltip: React.FC<{ active?: boolean, payload?: any[] }> = ({ active, payload }) => {
//     if (!active || !payload) return null;

//     const colors = {
//         'En attente': '#3B82F6',
//         'En cours': '#10B981',
//         'Terminé': '#059669',
//         'Échec': '#EF4444'
//     };

//     return (
//         <div className="bg-white p-3 shadow-md rounded-lg">
//             <div className="text-sm text-gray-600 mb-2">Statuts</div>
//             {payload.map((entry: { name: 'En attente' | 'En cours' | 'Terminé' | 'Échec', value: number }) => (
//                 <div
//                     key={entry.name}
//                     className="flex items-center gap-2 text-sm py-1"
//                 >
//                     <div
//                         className="w-3 h-3 rounded-full"
//                         style={{ backgroundColor: colors[entry.name] }}
//                     />
//                     <span className="text-gray-700">{entry.name}:</span>
//                     <span className="font-medium">
//                         {(entry.value * 100).toFixed(1)}%
//                     </span>
//                 </div>
//             ))}
//         </div>
//     );
// };

// // Composant pour une carte métrique optimisée
// const MetricCard: React.FC<MetricCardProps> = React.memo(({
//     title,
//     value,
//     subtitle,
//     variation,
//     chartData,
//     renderChart
// }) => (
//     <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
//         <div className="flex justify-between items-start mb-4">
//             <h3 className="text-gray-500 text-sm">{title}</h3>
//             <div className={`text-sm ${variation.toString().startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
//                 {variation.toString().startsWith('+') ? variation : (Number(variation) > 0 ? `+${variation}` : variation)}%
//             </div>
//         </div>
//         <p className="text-3xl font-semibold mb-2">{value}</p>
//         <p className="text-gray-500 text-sm">{subtitle}</p>
//         <div className="mt-4 h-24">
//             <ResponsiveContainer width="100%" height="100%">
//                 {renderChart(chartData)}
//             </ResponsiveContainer>
//         </div>
//     </div>
// ));

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// import React from 'react';
// import { useOptimizedMetrics, useOptimizedCharts } from '../../../hooks/useMetrics';
// import { MetricCardProps, MetricsSectionProps } from '../../../types/metrics';
// import { PerformanceChart } from '../../../components/dashboard/charts/PerformanceChart';
// import { DistributionChart } from '../../../components/dashboard/charts/DistributionChart';
// import { formatVariation } from '../../../utils/formatters';

// const MetricCard: React.FC<MetricCardProps> = React.memo(({
//     title,
//     value,
//     subtitle,
//     variation
// }) => {
//     return (
//         <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
//             <div className="flex justify-between items-start mb-4">
//                 <h3 className="text-gray-500 text-sm">{title}</h3>
//                 <div className={`text-sm ${variation >= 0 ? 'text-green-500' : 'text-red-500'}`}>
//                     {variation > 0 ? '+' : ''}{variation}%
//                 </div>
//             </div>
//             <p className="text-3xl font-semibold mb-2">{value}</p>
//             <p className="text-gray-500 text-sm">{subtitle}</p>
//         </div>
//     );
// });

// const MetricsSection: React.FC<MetricsSectionProps> = ({ data, loading, error }) => {
//     const metrics = useOptimizedMetrics(data);
//     const charts = useOptimizedCharts(metrics);

//     if (loading) {
//         return (
//             <div className="space-y-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                     {[...Array(4)].map((_, i) => (
//                         <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
//                             <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
//                             <div className="h-8 bg-gray-200 rounded mb-2"></div>
//                             <div className="h-4 bg-gray-200 rounded w-3/4"></div>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
//                 {error}
//             </div>
//         );
//     }

//     if (!metrics || !charts) return null;

//     return (
//         <div className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                 <MetricCard
//                     title="Total Livraisons"
//                     value={metrics.totalLivraisons}
//                     subtitle={`${metrics.enAttente} en attente`}
//                     variation={formatVariation(metrics.variation?.livraisons)}
//                     chartData={metrics.historique}
//                     renderChart={charts.totalLivraisons}
//                 />

//                 <MetricCard
//                     title="En cours"
//                     value={metrics.enCours}
//                     subtitle={`${metrics.chauffeursActifs} chauffeurs actifs`}
//                     variation={formatVariation(metrics.variation?.enCours)}
//                     chartData={metrics.historique}
//                     renderChart={charts.enCours}
//                 />

//                 <MetricCard
//                     title="Performance"
//                     value={`${metrics.performance}%`}
//                     subtitle="Taux de livraison"
//                     variation={formatVariation(metrics.variation?.performance)}
//                     chartData={metrics.historique}
//                     renderChart={charts.performance}
//                 />

//                 <MetricCard
//                     title="Chiffre d'affaires"
//                     value={`${metrics.chiffreAffaires.toLocaleString()}€`}
//                     subtitle={`${Math.round(metrics.chiffreAffaires / metrics.totalLivraisons)}€/livraison`}
//                     variation={formatVariation(metrics.variation?.chiffreAffaires)}
//                     chartData={metrics.historique}
//                     renderChart={charts.chiffreAffaires}
//                 />
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="bg-white rounded-xl p-6">
//                     <h3 className="text-lg font-semibold mb-6">Évolution détaillée</h3>
//                     <div className="h-80">
//                         <PerformanceChart data={charts.performance} />
//                     </div>
//                 </div>

//                 <div className="bg-white rounded-xl p-6">
//                     <h3 className="text-lg font-semibold mb-6">Répartition des statuts</h3>
//                     <div className="h-80">
//                         <DistributionChart data={charts.distribution} />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default React.memo(MetricsSection);

import React from 'react';
import { MetricCard } from '../../../components/dashboard/MetricCard';
import { PerformanceChart } from '../../../components/dashboard/charts/PerformanceChart';
import { DistributionChart } from '../../../components/dashboard/charts/DistributionChart';
import DeliveriesTable from '../../../components/DeliveriesTable';
import { UserRole } from '../../../types/dashboard.types';
import { MetricData } from '../../../types/metrics';
import { useAuth } from '../../../contexts/AuthContext';

// Fonction utilitaire pour valider et convertir les commandes
interface MetricsSectionProps {
    data: MetricData;
    userRole: UserRole;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({
    data,
    userRole
}) => {
    const { user } = useAuth();
    const showFinancials = user?.role === 'admin';
    const showAllStores = user?.role === 'admin';

    return (
        <div className="space-y-6">
            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Livraisons"
                    value={data.totalLivraisons}
                    subtitle={`${data.enAttente} en attente`}
                    variation={0}
                    chartData={data.historique}
                    color="#3B82F6"
                />
                <MetricCard
                    title="En cours"
                    value={data.enCours}
                    subtitle={showAllStores 
                        ? `${data.chauffeursActifs} chauffeurs actifs`
                        : 'Livraisons en cours'
                    }
                    variation={0}
                    chartData={data.historique}
                    color="#10B981"
                />
                <MetricCard
                    title="Performance"
                    value={`${data.performance}%`}
                    subtitle="Taux de livraison"
                    variation={0}
                    chartData={data.historique}
                    color="#6366F1"
                />
                {showFinancials && (
                    <MetricCard
                        title="Chiffre d'affaires"
                        value={`${data.chiffreAffaires.toLocaleString()}€`}
                        subtitle={`${data.totalLivraisons > 0 
                            ? Math.round(data.chiffreAffaires / data.totalLivraisons) 
                            : 0}€/livraison`}
                        variation={0}
                        chartData={data.historique}
                        color="#F59E0B"
                    />
                )}
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Évolution détaillée</h3>
                    <div className="h-[300px]">
                        <PerformanceChart data={data.historique} />
                    </div>
                </div>

                {showFinancials && (
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-6">Répartition des statuts</h3>
                        <div className="h-[300px]">
                            <DistributionChart data={[data.statutsDistribution]} />
                        </div>
                    </div>
                )}
            </div>

            {/* Table des livraisons */}
            <DeliveriesTable 
                commandes={data.commandes}
                userRole={userRole}
            />
        </div>
    );
};

export default React.memo(MetricsSection);