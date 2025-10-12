import React from 'react';
import { MetricCard } from '../dashboard/MetricCard';
import { PerformanceChart } from '../dashboard/charts/PerformanceChart';
import { DistributionChart } from '../dashboard/charts/DistributionChart';
import DeliveriesTable from '../DeliveriesTable';
import { UserRole } from '../../types/roles';
import { isAdminRole } from '../../utils/role-helpers';

interface DashboardLayoutProps {
  data: any;
  userRole: UserRole;
  loading?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  data,
  userRole,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const renderMetrics = () => {
    switch(userRole) {
      case 'magasin':
        return (
          <>
            <MetricCard
              title="Total Commandes"
              value={data.totalLivraisons}
              subtitle={`${data.enAttente} en attente`}
              chartData={data.historique}
              color="#3B82F6"
            />
            <MetricCard
              title="En préparation"
              value={data.enCours}
              subtitle="À expédier"
              chartData={data.historique}
              color="#10B981"
            />
            <MetricCard
              title="Taux de livraison"
              value={`${data.performance}%`}
              subtitle="Succès des livraisons"
              chartData={data.historique}
              color="#6366F1"
            />
          </>
        );
      
      case 'chauffeur':
        return (
          <>
            <MetricCard
              title="Mes livraisons"
              value={data.totalLivraisons}
              subtitle={`${data.enAttente} à récupérer`}
              chartData={data.historique}
              color="#3B82F6"
            />
            <MetricCard
              title="En cours"
              value={data.enCours}
              subtitle="En livraison"
              chartData={data.historique}
              color="#10B981"
            />
            <MetricCard
              title="Performance"
              value={`${data.performance}%`}
              subtitle="Taux de réussite"
              chartData={data.historique}
              color="#6366F1"
            />
          </>
        );
      
      default:
        return (
          <>
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
              subtitle={`${data.totalLivraisons > 0 ? Math.round(data.chiffreAffaires / data.totalLivraisons) : 0}€/livraison`}
              chartData={data.historique}
              color="#F59E0B"
            />
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetrics()}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isAdminRole(userRole) && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Évolution détaillée
              </h3>
              <div className="h-[300px]">
                <PerformanceChart data={data.historique} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Répartition des statuts
              </h3>
              <div className="h-[300px]">
                <DistributionChart data={[data.statutsDistribution]} />
              </div>
            </div>
          </>
        )}

        <DeliveriesTable 
          commandes={data.commandes} 
          userRole={userRole}
        />
      </div>
    </div>
  );
};

export default DashboardLayout;