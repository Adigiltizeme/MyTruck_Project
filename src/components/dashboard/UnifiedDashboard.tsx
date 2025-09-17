import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMetricsData } from '../../hooks/useMetricsData';
import { MetricCard } from './MetricCard';
import { DeliveriesTable } from '../DeliveriesTable';
import { PerformanceChart } from './charts/PerformanceChart';
import { DistributionChart } from './charts/DistributionChart';
import { DateSelector } from '../DateSelector';
import { FilterOptions, PeriodType } from '../../types/metrics';
import { UserRole } from '../../types/dashboard.types';
import { CommandeMetier } from '../../types/business.types';
import { DateRange } from '../../types/hooks.types';
import { simpleBackendService } from '../../services/simple-backend.service';

interface UnifiedDashboardProps {
    role: UserRole;
    storeId?: string;
    driverId?: string;
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
    role,
    storeId,
    driverId
}) => {
    const { user } = useAuth();

    // ✅ État unifié pour tous les dashboards
    const [filters, setFilters] = useState<FilterOptions>({
        dateRange: 'day',
        store: role === 'magasin' ? storeId || '' : '',
        driver: role === 'chauffeur' ? driverId || '' : ''
    });

    // ✅ État pour DateSelector
    const [customDateRange, setCustomDateRange] = useState<DateRange>({
        start: null,
        end: null,
        mode: 'range',
        singleDate: null
    });

    // ✅ État spécifique chauffeur (si nécessaire)
    const [commandesAssignees, setCommandesAssignees] = useState<CommandeMetier[]>([]);
    const [chauffeurLoading, setChauffeurLoading] = useState(false);

    // ✅ Données métriques avec dates personnalisées et filtre spécifique selon le rôle
    const filtersWithCustomDates = {
        ...filters,
        customDateRange: customDateRange,
        // ✅ Pour chauffeur, s'assurer que le driver est filtré
        driver: role === 'chauffeur' ? driverId || '' : filters.driver
    };


    const { data, loading, error } = useMetricsData(filtersWithCustomDates);

    // ✅ Gestionnaires des filtres
    const handlePeriodChange = (period: PeriodType) => {
        setFilters(prev => ({ ...prev, dateRange: period }));
    };

    const handleStoreChange = (storeId: string) => {
        setFilters(prev => ({ ...prev, store: storeId }));
    };

    const handleDriverChange = (driverId: string) => {
        setFilters(prev => ({ ...prev, driver: driverId }));
    };

    // ✅ Gestionnaire pour DateSelector
    const handleCustomDateChange = (dateRange: DateRange) => {
        console.log('📅 DateSelector changement:', dateRange);
        setCustomDateRange(dateRange);

        // ✅ Forcer un refresh des données quand les dates personnalisées changent
        // Détecter la réinitialisation (toutes les dates nulles)
        const isReset = !dateRange.start && !dateRange.end && !dateRange.singleDate;
        if (isReset) {
            console.log('🔄 Dates réinitialisées - retour aux filtres de période');
        }
    };

    // ✅ Chargement spécifique chauffeur
    useEffect(() => {
        if (role === 'chauffeur' && driverId) {
            loadCommandesChauffeur();
        }
    }, [role, driverId]);

    // ✅ Mise à jour des filtres quand les props changent
    useEffect(() => {
        if (role === 'magasin' && storeId && filters.store !== storeId) {
            setFilters(prev => ({ ...prev, store: storeId }));
        }
        if (role === 'chauffeur' && driverId && filters.driver !== driverId) {
            setFilters(prev => ({ ...prev, driver: driverId }));
        }
    }, [role, storeId, driverId, filters.store, filters.driver]);

    const loadCommandesChauffeur = async () => {
        if (!driverId) return;

        try {
            setChauffeurLoading(true);
            const commandes = await simpleBackendService.getCommandesByChauffeur(driverId);
            setCommandesAssignees(commandes);
        } catch (error) {
            console.error('❌ Erreur chargement commandes chauffeur:', error);
            setCommandesAssignees([]);
        } finally {
            setChauffeurLoading(false);
        }
    };

    // ✅ Gestion du loading unifié
    const isLoading = role === 'chauffeur' ? chauffeurLoading : loading;

    // ✅ Titres conditionnels
    const getDashboardTitle = () => {
        switch (role) {
            case 'admin': return 'Tableau de bord administrateur';
            case 'magasin': return 'Tableau de bord magasin';
            case 'chauffeur': return 'Mes livraisons';
            default: return 'Tableau de bord';
        }
    };

    // ✅ Filtres visibles selon le rôle
    const shouldShowStoreFilter = role === 'admin';
    const shouldShowDriverFilter = role === 'admin';
    const shouldShowPeriodFilter = role;

    // ✅ Loading state
    if (isLoading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-6 h-32" />
                    ))}
                </div>
            </div>
        );
    }

    // ✅ Error state
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
                {error}
            </div>
        );
    }

    // ✅ No data state
    if (!data) {
        return <div>Aucune donnée disponible</div>;
    }

    // ✅ Données conditionnelles selon le rôle - maintenant tous utilisent useMetricsData
    const dashboardData = data;

    return (
        <div className="space-y-6">
            {/* En-tête avec titre et filtres */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">{getDashboardTitle()}</h1>

                {/* Filtres conditionnels */}
                <div className="flex space-x-4">
                    {shouldShowPeriodFilter && (
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
                    )}

                    {shouldShowStoreFilter && (
                        <select
                            value={filters.store}
                            onChange={(e) => handleStoreChange(e.target.value)}
                            className="border rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="">Tous les magasins</option>
                            {dashboardData.magasins?.map((magasin) => (
                                <option key={magasin.id} value={magasin.id}>
                                    {magasin.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {shouldShowDriverFilter && (
                        <select
                            value={filters.driver}
                            onChange={(e) => handleDriverChange(e.target.value)}
                            className="border rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="">Tous les chauffeurs</option>
                            {dashboardData.chauffeurs?.map((chauffeur) => (
                                <option key={chauffeur.id} value={chauffeur.id}>
                                    {chauffeur.prenom} {chauffeur.nom}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Sélecteur de dates (visible pour tous) */}
            <DateSelector
                value={customDateRange}
                onChange={handleCustomDateChange}
            />

            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Livraisons réussies"
                    value={dashboardData.totalLivraisons}
                    subtitle={`${dashboardData.totalLivraisons} sur ${dashboardData.totalCommandes || dashboardData.commandes?.length || 0} livraisons`}
                    chartData={dashboardData.historique}
                    color="#10B981"
                />
                <MetricCard
                    title="En cours"
                    value={dashboardData.enCours}
                    subtitle={role === 'chauffeur' ? 'Mes livraisons actives' : 'Livraisons en cours'}
                    chartData={dashboardData.historique}
                    color="#F59E0B"
                />
                <MetricCard
                    title="En attente"
                    value={dashboardData.enAttente}
                    subtitle={role === 'chauffeur' ? 'À traiter' : 'Planification requise'}
                    chartData={dashboardData.historique}
                    color="#3B82F6"
                />
                <MetricCard
                    title="Performance"
                    value={`${dashboardData.performance}%`}
                    subtitle="Taux de réussite"
                    chartData={dashboardData.historique}
                    color="#8B5CF6"
                />
            </div>

            {/* Graphiques (cachés pour chauffeur) */}
            {dashboardData.historique && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Performance dans le temps</h3>
                        <PerformanceChart data={dashboardData.historique} />
                    </div>

                    {role === 'admin' && (
                        <div className="bg-white rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4">Distribution des statuts</h3>
                            <DistributionChart data={[dashboardData.statutsDistribution || {
                                enAttente: 0,
                                enCours: 0,
                                termine: 0,
                                echec: 0
                            }]} />
                        </div>
                    )}
                </div>
            )}

            {/* Table des livraisons récentes */}
            <DeliveriesTable
                commandes={dashboardData.commandes || []}
                userRole={role}
            />
        </div>
    );
};

export default UnifiedDashboard;