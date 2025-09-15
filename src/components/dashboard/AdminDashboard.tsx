import React, { useState } from 'react';
import { useMetricsData } from '../../hooks/useMetricsData';
import { MetricCard } from './MetricCard';
import { DeliveriesTable } from '../../components/DeliveriesTable';
import { PerformanceChart } from './charts/PerformanceChart';
import { DistributionChart } from './charts/DistributionChart';
import { FilterOptions, PeriodType } from '../../types/metrics';

const AdminDashboard: React.FC = () => {
    const [filters, setFilters] = useState<FilterOptions>({
        dateRange: 'day',
        store: ''
    });

    const { data, loading, error } = useMetricsData(filters);

    // Gestionnaires des filtres
    const handlePeriodChange = (period: PeriodType) => {
        setFilters(prev => ({ ...prev, dateRange: period }));
    };

    const handleStoreChange = (storeId: string) => {
        setFilters(prev => ({ ...prev, store: storeId }));
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                {/* Placeholders de chargement */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-6 h-32"/>
                    ))}
                </div>
            </div>
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
            {/* En-tête avec filtres */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Tableau de bord administrateur</h1>
                <div className="flex space-x-4">
                    <select 
                        value={filters.dateRange}
                        onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
                        className="border rounded-lg px-3 py-2 bg-white"
                    >
                        <option value="day">Aujourd'hui</option>
                        <option value="week">Cette semaine</option>
                        <option value="month">Ce mois</option>
                        <option value="year">Cette année</option>
                    </select>

                    <select
                        value={filters.store}
                        onChange={(e) => handleStoreChange(e.target.value)}
                        className="border rounded-lg px-3 py-2 bg-white"
                    >
                        <option value="">Tous les magasins</option>
                        {data.magasins?.map((magasin) => (
                            <option key={magasin.id} value={magasin.id}>
                                {magasin.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Livraisons réussies"
                    value={data.totalLivraisons}
                    subtitle={`${data.totalLivraisons} sur ${data.totalCommandes} livraisons`}
                    chartData={data.historique}
                    color="#3B82F6"
                />
                <MetricCard
                    title="En cours"
                    value={data.enCours}
                    subtitle={`${data.chauffeursActifs} chauffeurs actifs`}
                    chartData={data.historique}
                    color="#10B981"
                />
                <MetricCard
                    title="Performance"
                    value={`${data.performance}%`}
                    subtitle="Taux de livraison"
                    chartData={data.historique}
                    color="#6366F1"
                />
                <MetricCard
                    title="Chiffre d'affaires"
                    value={`${data.chiffreAffaires.toLocaleString()}€`}
                    subtitle={`${data.totalLivraisons > 0 
                        ? Math.round(data.chiffreAffaires / data.totalLivraisons) 
                        : 0}€/livraison`}
                    chartData={data.historique}
                    color="#F59E0B"
                />
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Évolution détaillée</h3>
                    <div className="h-[300px]">
                        <PerformanceChart data={data.historique} />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Répartition des statuts</h3>
                    <div className="h-[300px]">
                        <DistributionChart data={[data.statutsDistribution]} />
                    </div>
                </div>
            </div>

            {/* Table des livraisons */}
            <DeliveriesTable 
                commandes={data.commandes}
                userRole="admin"
            />
        </div>
    );
};

export default AdminDashboard;