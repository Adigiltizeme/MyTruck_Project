import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CommandeMetier } from '../types/business.types';
import { apiService } from '../services/api.service';

const ChauffeurDashboard: React.FC = () => {
    const { user } = useAuth();
    const [commandesAssignees, setCommandesAssignees] = useState<CommandeMetier[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

    useEffect(() => {
        loadCommandesAssignees();
    }, [user]);

    const loadCommandesAssignees = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            console.log('🚛 [CHAUFFEUR] Chargement des commandes assignées pour:', user.id);

            // 🔍 ENDPOINT SPÉCIFIQUE CHAUFFEUR
            const response = await apiService.get<{ data: CommandeMetier[] }>(`/commandes/chauffeur/${user.id}`);
            const commandes = response.data || response;

            console.log('📦 [CHAUFFEUR] Commandes reçues:', Array.isArray(commandes) ? commandes.length : 'undefined');
            console.log('📦 [CHAUFFEUR] Type de données:', typeof commandes, commandes);
            
            // Protection contre données undefined ou non-array
            if (Array.isArray(commandes)) {
                setCommandesAssignees(commandes);
            } else {
                console.error('❌ [CHAUFFEUR] Données reçues ne sont pas un tableau:', commandes);
                setCommandesAssignees([]);
            }

        } catch (error) {
            console.error('❌ Erreur chargement commandes chauffeur:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredCommandes = () => {
        switch (filter) {
            case 'pending':
                return commandesAssignees.filter(cmd =>
                    cmd.statuts?.livraison === 'CONFIRMEE' || cmd.statuts?.livraison === 'EN ATTENTE'
                );
            case 'in_progress':
                return commandesAssignees.filter(cmd =>
                    cmd.statuts?.livraison === 'ENLEVEE' || cmd.statuts?.livraison === 'EN COURS DE LIVRAISON'
                );
            case 'completed':
                return commandesAssignees.filter(cmd =>
                    cmd.statuts?.livraison === 'LIVREE'
                );
            default:
                return commandesAssignees;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'EN ATTENTE':
            case 'CONFIRMEE':
                return 'bg-yellow-100 text-yellow-800';
            case 'ENLEVEE':
            case 'EN COURS DE LIVRAISON':
                return 'bg-blue-100 text-blue-800';
            case 'LIVREE':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Chargement de vos livraisons...</p>
                </div>
            </div>
        );
    }

    const filteredCommandes = getFilteredCommandes();

    return (
        <div className="space-y-6">
            {/* 🚛 HEADER CHAUFFEUR */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">🚛 Tableau de Bord Chauffeur</h1>
                        <p className="text-blue-100 mt-1">
                            Bonjour {user?.name || 'Chauffeur'}, voici vos livraisons assignées
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{commandesAssignees.length}</div>
                        <div className="text-blue-100 text-sm">Livraisons assignées</div>
                    </div>
                </div>
            </div>

            {/* 📊 STATISTIQUES RAPIDES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <span className="text-2xl mr-3">⏳</span>
                        <div>
                            <div className="text-xl font-bold text-yellow-800">
                                {commandesAssignees.filter(cmd =>
                                    cmd.statuts?.livraison === 'EN ATTENTE' || cmd.statuts?.livraison === 'CONFIRMEE'
                                ).length}
                            </div>
                            <div className="text-yellow-700 text-sm">En attente</div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <span className="text-2xl mr-3">🚛</span>
                        <div>
                            <div className="text-xl font-bold text-blue-800">
                                {commandesAssignees.filter(cmd =>
                                    cmd.statuts?.livraison === 'ENLEVEE' || cmd.statuts?.livraison === 'EN COURS DE LIVRAISON'
                                ).length}
                            </div>
                            <div className="text-blue-700 text-sm">En cours</div>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <span className="text-2xl mr-3">✅</span>
                        <div>
                            <div className="text-xl font-bold text-green-800">
                                {commandesAssignees.filter(cmd => cmd.statuts?.livraison === 'LIVREE').length}
                            </div>
                            <div className="text-green-700 text-sm">Livrées</div>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <span className="text-2xl mr-3">📦</span>
                        <div>
                            <div className="text-xl font-bold text-purple-800">
                                {commandesAssignees.reduce((sum, cmd) => sum + (cmd.articles?.nombre || 0), 0)}
                            </div>
                            <div className="text-purple-700 text-sm">Articles total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔍 FILTRES */}
            <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Mes Livraisons</h2>
                    <div className="flex space-x-2">
                        {[
                            { key: 'all', label: 'Toutes', count: commandesAssignees.length },
                            { key: 'pending', label: 'En attente', count: commandesAssignees.filter(cmd => cmd.statuts?.livraison === 'EN ATTENTE' || cmd.statuts?.livraison === 'CONFIRMEE').length },
                            { key: 'in_progress', label: 'En cours', count: commandesAssignees.filter(cmd => cmd.statuts?.livraison === 'ENLEVEE' || cmd.statuts?.livraison === 'EN COURS DE LIVRAISON').length },
                            { key: 'completed', label: 'Terminées', count: commandesAssignees.filter(cmd => cmd.statuts?.livraison === 'LIVREE').length }
                        ].map((filterOption) => (
                            <button
                                key={filterOption.key}
                                onClick={() => setFilter(filterOption.key as any)}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === filterOption.key
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {filterOption.label} ({filterOption.count})
                            </button>
                        ))}
                    </div>
                </div>

                {/* 📋 LISTE DES COMMANDES */}
                {filteredCommandes.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-6xl mb-4">📭</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {filter === 'all' ? 'Aucune livraison assignée' : 'Aucune livraison dans cette catégorie'}
                        </h3>
                        <p className="text-gray-600">
                            {filter === 'all'
                                ? 'Vous n\'avez pas encore de livraisons assignées.'
                                : 'Aucune livraison ne correspond au filtre sélectionné.'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredCommandes.map((commande) => (
                            <div key={commande.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="font-medium text-lg">
                                                {commande.numeroCommande}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(commande.statuts?.livraison || '')}`}>
                                                {commande.statuts?.livraison}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                            <div>
                                                <span className="font-medium">Client :</span><br />
                                                {commande.client?.nom}
                                            </div>
                                            <div>
                                                <span className="font-medium">Livraison :</span><br />
                                                {new Date(commande.dates?.livraison || '').toLocaleDateString('fr-FR')}
                                            </div>
                                            <div>
                                                <span className="font-medium">Créneau :</span><br />
                                                {commande.livraison?.creneau}
                                            </div>
                                            <div>
                                                <span className="font-medium">Articles :</span><br />
                                                {commande.articles?.nombre || 0} articles
                                            </div>
                                        </div>

                                        {/* 🎯 CONDITIONS SPÉCIALES POUR CHAUFFEUR */}
                                        {(() => {
                                            let deliveryConditions = null;
                                            try {
                                                if (typeof commande.livraison?.details === 'string') {
                                                    deliveryConditions = JSON.parse(commande.livraison.details);
                                                } else if (commande.livraison?.details) {
                                                    deliveryConditions = commande.livraison.details;
                                                }
                                            } catch (e) {
                                                // Ignorer erreurs parsing
                                            }

                                            const hasSpecialConditions = deliveryConditions && (
                                                deliveryConditions.rueInaccessible ||
                                                deliveryConditions.paletteComplete ||
                                                (deliveryConditions.parkingDistance && deliveryConditions.parkingDistance > 50) ||
                                                deliveryConditions.needsAssembly ||
                                                (deliveryConditions.isDuplex && deliveryConditions.deliveryToUpperFloor) ||
                                                (deliveryConditions.hasStairs && deliveryConditions.stairCount > 20)
                                            );

                                            if (!hasSpecialConditions) return null;

                                            return (
                                                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                                                    <div className="flex items-center mb-2">
                                                        <span className="text-orange-600 mr-2">⚠️</span>
                                                        <span className="font-medium text-orange-800">Conditions spéciales</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {deliveryConditions.rueInaccessible && (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                                                🚫 Rue inaccessible
                                                            </span>
                                                        )}
                                                        {deliveryConditions.paletteComplete && (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                                                📦 Palette complète
                                                            </span>
                                                        )}
                                                        {deliveryConditions.parkingDistance > 50 && (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                                                📏 Distance {deliveryConditions.parkingDistance}m
                                                            </span>
                                                        )}
                                                        {deliveryConditions.needsAssembly && (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                                                🔧 Montage requis
                                                            </span>
                                                        )}
                                                        {deliveryConditions.isDuplex && deliveryConditions.deliveryToUpperFloor && (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                                                🏠 Duplex étage
                                                            </span>
                                                        )}
                                                        {deliveryConditions.hasStairs && deliveryConditions.stairCount > 20 && (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                                                🪜 {deliveryConditions.stairCount} marches
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="ml-4">
                                        <button
                                            onClick={() => window.location.href = `/commandes/${commande.id}`}
                                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                                        >
                                            Voir détails
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChauffeurDashboard;
