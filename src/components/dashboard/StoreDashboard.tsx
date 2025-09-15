import React, { useMemo } from 'react';
import { useMetricsData } from '../../hooks/useMetricsData';
import { MetricCard } from './MetricCard';
import { DeliveriesTable } from '../../components/DeliveriesTable';
import { PerformanceChart } from './charts/PerformanceChart';

interface StoreDashboardProps {
    storeId: string;
}

const StoreDashboard: React.FC<StoreDashboardProps> = ({ storeId }) => {
    console.log('🏪 StoreDashboard render avec storeId:', storeId);
    
    const filters = useMemo(() => ({
        dateRange: 'day' as const,
        store: storeId
    }), [storeId]);
    
    const { data, loading, error } = useMetricsData(filters);
    
    // ✅ DEBUG: Vérifier cohérence des données reçues
    if (data && !loading) {
        console.log('🏪 StoreDashboard - Données reçues:');
        console.log('  - Total livraisons (métriques):', data.totalLivraisons);
        console.log('  - Commandes dans tableau:', data.commandes?.length || 0);
        console.log('  - Exemples commandes:', data.commandes?.slice(0, 2).map(c => ({
            id: c.id,
            magasin: c.magasin?.name || c.magasin?.nom,
            statut: c.statuts?.livraison
        })));
    }

    if (loading) {
        return <div className="animate-pulse">Chargement...</div>;
    }

    if (error) {
        return <div className="text-red-600">{error}</div>;
    }

    if (!data) {
        return <div>Aucune donnée disponible</div>;
    }

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Tableau de bord</h1>
                <div className="flex space-x-4">
                    {/* Filtres de période si nécessaire */}
                </div>
            </div>

            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard
                    title="Livraisons réussies"
                    value={data.totalLivraisons}
                    subtitle={`${data.enAttente} en attente`}
                    chartData={data.historique}
                    color="#3B82F6"
                />
                <MetricCard
                    title="En cours"
                    value={data.enCours}
                    subtitle="Livraisons en cours"
                    chartData={data.historique}
                    color="#10B981"
                />
                <MetricCard
                    title="Taux de livraison"
                    value={`${data.performance}%`}
                    subtitle="Taux de réussite"
                    chartData={data.historique}
                    color="#6366F1"
                />
            </div>

            {/* Graphiques et tableaux */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Évolution des livraisons</h3>
                    <div className="h-[300px]">
                        <PerformanceChart data={data.historique} />
                    </div>
                </div>

                <DeliveriesTable 
                    commandes={data.commandes}
                    userRole={'magasin'}
                />
            </div>
        </div>
    );
};

export default StoreDashboard;