import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area,
    Legend
} from 'recharts';
import Loading from '../../../components/Loading';
import { HistoriqueData, MetricCardProps, MetricsSectionProps } from '../../../types/metrics';

// Composant pour le tooltip personnalisé
const CustomTooltip: React.FC<{ active?: boolean, payload?: any[] }> = ({ active, payload }) => {
    if (!active || !payload) return null;

    const colors = {
        'En attente': '#3B82F6',
        'En cours': '#10B981',
        'Terminé': '#059669',
        'Échec': '#EF4444'
    };

    return (
        <div className="bg-white p-3 shadow-md rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Statuts</div>
            {payload.map((entry: { name: 'En attente' | 'En cours' | 'Terminé' | 'Échec', value: number }) => (
                <div
                    key={entry.name}
                    className="flex items-center gap-2 text-sm py-1"
                >
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[entry.name] }}
                    />
                    <span className="text-gray-700">{entry.name}:</span>
                    <span className="font-medium">
                        {(entry.value * 100).toFixed(1)}%
                    </span>
                </div>
            ))}
        </div>
    );
};

// // Composant pour une carte métrique optimisée
const MetricCard: React.FC<MetricCardProps> = React.memo(({
    title,
    value,
    subtitle,
    variation,
    chartData,
    renderChart
}) => (
    <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-500 text-sm">{title}</h3>
            <div className={`text-sm ${variation.toString().startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
                {variation.toString().startsWith('+') ? variation : (Number(variation) > 0 ? `+${variation}` : variation)}%
            </div>
        </div>
        <p className="text-3xl font-semibold mb-2">{value}</p>
        <p className="text-gray-500 text-sm">{subtitle}</p>
        <div className="mt-4 h-24">
            <ResponsiveContainer width="100%" height="100%">
                {renderChart(chartData)}
            </ResponsiveContainer>
        </div>
    </div>
));

const MetricsSection: React.FC<MetricsSectionProps> = ({ data, loading, error }) => {

    if (!data) {
        return loading ? <Loading /> : null;
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
                {error}
            </div>
        );
    }

    // S'assurer que toutes les propriétés requises existent
    const metrics = {
        totalLivraisons: data.totalLivraisons || 0,
        enCours: data.enCours || 0,
        enAttente: data.enAttente || 0,
        performance: data.performance || 0,
        chiffreAffaires: data.chiffreAffaires || 0,
        chauffeursActifs: data.chauffeursActifs || 0,
        historique: data.historique || [],
        statutsDistribution: data.statutsDistribution || {
            enAttente: 0,
            enCours: 0,
            termine: 0,
            echec: 0
        }
    };

    // Calcul des variations mémorisé
    const variations = useMemo(() => {
        if (!metrics?.historique || metrics.historique.length < 2) return {};

        const current = metrics.historique[metrics.historique.length - 1];
        const previous = metrics.historique[metrics.historique.length - 2];

        return {
            livraisons: previous.totalLivraisons ? 
                ((current.totalLivraisons - previous.totalLivraisons) / previous.totalLivraisons * 100).toFixed(1) : '0',
            performance: previous.performance ? 
                ((current.performance - previous.performance) / previous.performance * 100).toFixed(1) : '0',
            chiffreAffaires: previous.chiffreAffaires ? 
                ((current.chiffreAffaires - previous.chiffreAffaires) / previous.chiffreAffaires * 100).toFixed(1) : '0',
            enCours: previous.enCours ? 
                ((current.enCours - previous.enCours) / previous.enCours * 100).toFixed(1) : '0'
        };
    }, [metrics?.historique]);


    const chartConfig = useMemo(() => ({
        totalLivraisons: (chartData: HistoriqueData[]) => (
            <AreaChart data={chartData}>
                <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="totalLivraisons"
                    stroke="#10B981"
                    fill="url(#totalColor)"
                    strokeWidth={2}
                // isAnimationActive={false}
                />
            </AreaChart>
        ),
        performance: (chartData: HistoriqueData[]) => (
            <LineChart data={chartData}>
                <Line
                    type="monotone"
                    dataKey="performance"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={false}
                // isAnimationActive={false}
                />
            </LineChart>
        ),
        chiffreAffaires: (chartData: HistoriqueData[]) => (
            <AreaChart data={chartData}>
                <defs>
                    <linearGradient id="caColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EC4899" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="chiffreAffaires"
                    stroke="#EC4899"
                    fill="url(#caColor)"
                    strokeWidth={2}
                // isAnimationActive={false}
                />
            </AreaChart>
        ),
        enCours: (chartData: HistoriqueData[]) => (
            <AreaChart data={chartData}>
                <Area
                    type="monotone"
                    dataKey="enCours"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#93C5FD"
                // isAnimationActive={false}
                />
                <Area
                    type="monotone"
                    dataKey="enAttente"
                    stackId="1"
                    stroke="#60A5FA"
                    fill="#DBEAFE"
                // isAnimationActive={false}
                />
            </AreaChart>
        ),
        chauffeurs: (chartData: HistoriqueData[]) => (
            <LineChart data={chartData}>
                <Line
                    type="monotone"
                    dataKey="chauffeursActifs"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                // isAnimationActive={false}
                />
            </LineChart>
        )
    }), []);

    return (
        <div className="space-y-6 transition-opacity duration-300 ease-in-out">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Livraisons"
                    value={metrics.totalLivraisons.toLocaleString()}
                    subtitle="sur la période"
                    variation={Number(variations.livraisons) || 0}
                    chartData={metrics.historique}
                    renderChart={chartConfig.totalLivraisons}
                />

                <MetricCard
                    title="En cours"
                    value={metrics.enCours.toLocaleString()}
                    subtitle={`${metrics.enAttente} en attente`}
                    variation={Number(variations.enCours) || 0}
                    chartData={metrics.historique}
                    renderChart={chartConfig.enCours}
                />

                <MetricCard
                    title="Performance"
                    value={`${metrics.performance}%`}
                    subtitle="Satisfaction client"
                    variation={Number(variations.performance) || 0}
                    chartData={metrics.historique}
                    renderChart={chartConfig.performance}
                />

                <MetricCard
                    title="Chiffre d'affaires"
                    value={`${metrics.chiffreAffaires.toLocaleString()}€`}
                    subtitle={`Moy: ${(metrics.chiffreAffaires / metrics.totalLivraisons).toFixed(0)}€/livraison`}
                    variation={Number(variations.chiffreAffaires) || 0}
                    chartData={metrics.historique}
                    renderChart={chartConfig.chiffreAffaires}
                />

                <MetricCard
                    title="Chauffeurs actifs"
                    value={metrics.chauffeursActifs}
                    subtitle="en service"
                    variation={0}
                    chartData={metrics.historique}
                    renderChart={chartConfig.chauffeurs}
                />
            </div>

            <div className="bg-white rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6">Évolution détaillée</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.historique}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                            <XAxis
                                dataKey="date"
                                stroke="#6B7280"
                                fontSize={12}
                            />
                            <YAxis
                                stroke="#6B7280"
                                fontSize={12}
                                tickFormatter={(value) => value.toLocaleString()}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                name="Livraisons"
                                dataKey="totalLivraisons"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={{ fill: '#10B981', strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                                isAnimationActive={false}
                            />
                            <Line
                                type="monotone"
                                name="Performance"
                                dataKey="performance"
                                stroke="#6366F1"
                                strokeWidth={2}
                                dot={{ fill: '#6366F1', strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                                isAnimationActive={false}
                            />
                            <Line
                                type="monotone"
                                name="Chiffre d'affaires"
                                dataKey="chiffreAffaires"
                                stroke="#EC4899"
                                strokeWidth={2}
                                dot={{ fill: '#EC4899', strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-6">Répartition des statuts</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={[metrics.statutsDistribution]}
                                stackOffset="expand"
                            >
                                <XAxis />
                                <YAxis
                                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                    // axisLine={false}
                                    // tickLine={false}
                                    tick={{ fill: '#94949C' }}
                                />
                                <Tooltip content={CustomTooltip} />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    layout="vertical"
                                    wrapperStyle={{
                                        paddingLeft: "20px",
                                        width: "150px"
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="enAttente"
                                    name="En attente"
                                    stackId="1"
                                    stroke="#3B82F6"
                                    fill="#93C5FD"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="enCours"
                                    name="En cours"
                                    stackId="1"
                                    stroke="#10B981"
                                    fill="#6EE7B7"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="termine"
                                    name="Terminé"
                                    stackId="1"
                                    stroke="#059669"
                                    fill="#34D399"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="echec"
                                    name="Échec"
                                    stackId="1"
                                    stroke="#EF4444"
                                    fill="#FCA5A5"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(MetricsSection);

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