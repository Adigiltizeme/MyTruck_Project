import React, { useState, useEffect, useCallback } from 'react';
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
import { isAdminRole } from '../../utils/role-helpers';
import { useDriverTracking } from '../../hooks/useDriverTracking';
import { useNavigate } from 'react-router-dom';

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

    // ✅ État pour forcer le refresh lors des mises à jour WebSocket
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // ✅ Données métriques avec dates personnalisées et filtre spécifique selon le rôle
    const filtersWithCustomDates = {
        ...filters,
        customDateRange: customDateRange,
        // ✅ Pour chauffeur, s'assurer que le driver est filtré
        driver: role === 'chauffeur' ? driverId || '' : filters.driver,
        // ✅ Trigger pour forcer le rechargement
        _refreshTrigger: refreshTrigger
    };

    const { data, loading, error } = useMetricsData(filtersWithCustomDates);

    // ✅ ÉCOUTER LES ÉVÉNEMENTS WEBSOCKET GLOBAUX (émis par App.tsx) pour refresh temps réel
    useEffect(() => {
        const handleCommandeUpdate = (event: Event) => {
            console.log('📡 [UnifiedDashboard] Commande mise à jour reçue:', (event as CustomEvent).detail);
            setRefreshTrigger(prev => prev + 1);
        };

        const handleStatusChange = (event: Event) => {
            console.log('📡 [UnifiedDashboard] Changement statut reçu:', (event as CustomEvent).detail);
            setRefreshTrigger(prev => prev + 1);
        };

        const handleChauffeurAssigned = (event: Event) => {
            console.log('📡 [UnifiedDashboard] Chauffeur assigné reçu:', (event as CustomEvent).detail);
            setRefreshTrigger(prev => prev + 1);
        };

        window.addEventListener('commande-updated', handleCommandeUpdate);
        window.addEventListener('commande-status-changed', handleStatusChange);
        window.addEventListener('commande-chauffeurs-assigned', handleChauffeurAssigned);

        return () => {
            window.removeEventListener('commande-updated', handleCommandeUpdate);
            window.removeEventListener('commande-status-changed', handleStatusChange);
            window.removeEventListener('commande-chauffeurs-assigned', handleChauffeurAssigned);
        };
    }, []);

    // ✅ Hook GPS tracking pour admins
    const token = localStorage.getItem('authToken');
    const { drivers } = useDriverTracking(isAdminRole(role) ? token : null);
    const navigate = useNavigate();

    // Filtrer les chauffeurs actifs en livraison
    const activeDrivers = drivers.filter(d =>
        d.statutLivraison && ['EN COURS DE LIVRAISON', 'EN COURS', 'EN ROUTE'].includes(d.statutLivraison)
    );

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

    // ✅ Fonction chargement commandes chauffeur
    const loadCommandesChauffeur = useCallback(async () => {
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
    }, [driverId]);

    // ✅ Chargement spécifique chauffeur
    useEffect(() => {
        if (role === 'chauffeur' && driverId) {
            loadCommandesChauffeur();
        }
    }, [role, driverId, loadCommandesChauffeur]);

    // ✅ Mise à jour des filtres quand les props changent
    useEffect(() => {
        if (role === 'magasin' && storeId && filters.store !== storeId) {
            setFilters(prev => ({ ...prev, store: storeId }));
        }
        if (role === 'chauffeur' && driverId && filters.driver !== driverId) {
            setFilters(prev => ({ ...prev, driver: driverId }));
        }
    }, [role, storeId, driverId, filters.store, filters.driver]);

    // ✅ Gestion du loading unifié
    const isLoading = role === 'chauffeur' ? chauffeurLoading : loading;

    // ✅ Titres conditionnels
    const getDashboardTitle = () => {
        switch (role) {
            case 'admin': return 'Tableau de bord administrateur';
            case 'direction': return 'Tableau de bord direction';
            case 'magasin': return 'Tableau de bord magasin';
            case 'chauffeur': return 'Mes livraisons';
            default: return 'Tableau de bord';
        }
    };

    // ✅ Filtres visibles selon le rôle
    const shouldShowStoreFilter = isAdminRole(role);
    const shouldShowDriverFilter = isAdminRole(role);
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

            {/* ✅ GPS Tracking déplacé dans CommandeDetails (onglet Actions) */}

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

            {/* ✅ Widget GPS Tracking pour Admins */}
            {isAdminRole(role) && (
                <div
                    onClick={() => navigate('/tracking')}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 cursor-pointer hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {activeDrivers.length} chauffeur{activeDrivers.length > 1 ? 's' : ''}
                                </h3>
                                <p className="text-gray-600">
                                    {activeDrivers.length > 0 ? 'en livraison actuellement' : 'Aucun chauffeur actif'}
                                </p>
                                {activeDrivers.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {activeDrivers.slice(0, 3).map((driver) => (
                                            <span
                                                key={driver.chauffeurId}
                                                className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full"
                                            >
                                                {driver.chauffeurName}
                                            </span>
                                        ))}
                                        {activeDrivers.length > 3 && (
                                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                                +{activeDrivers.length - 3} autres
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-md">
                                Voir la carte GPS →
                            </button>
                            <p className="text-xs text-gray-500 mt-2">Suivi en temps réel</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Graphiques (cachés pour chauffeur) */}
            {dashboardData.historique && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Performance dans le temps</h3>
                        <PerformanceChart data={dashboardData.historique} />
                    </div>

                    {isAdminRole(role) && (
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