import React from 'react';
import { MetricCard } from '../../../components/dashboard/MetricCard';
import { PerformanceChart } from '../../../components/dashboard/charts/PerformanceChart';
import { DistributionChart } from '../../../components/dashboard/charts/DistributionChart';
import DeliveriesTable from '../../../components/DeliveriesTable';
import { UserRole } from '../../../types/dashboard.types';
import { MetricData } from '../../../types/metrics';
import { useAuth } from '../../../contexts/AuthContext';
import { isAdminRole } from '../../../utils/role-helpers';

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
    const showFinancials = isAdminRole(user?.role);
    const showAllStores = isAdminRole(user?.role);

    return (
        <div className="space-y-6">
            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Livraisons"
                    value={data.totalLivraisons}
                    subtitle={`${data.enAttente} en attente`}
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
                {showFinancials && (
                    <MetricCard
                        title="Chiffre d'affaires"
                        value={`${data.chiffreAffaires.toLocaleString()}€`}
                        subtitle={`${data.totalLivraisons > 0 
                            ? Math.round(data.chiffreAffaires / data.totalLivraisons) 
                            : 0}€/livraison`}
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