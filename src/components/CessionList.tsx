import React, { useState, useEffect } from 'react';
import { Cession, CessionStatus } from '../types/cession.types';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';
import { CessionService } from '../services/cession.service';
import { formatData } from '../utils/formatters';
import { Modal } from './Modal';
import CessionForm from './CessionForm';
import { Plus, Truck, Check, X, Clock, ArrowRight, AlertTriangle, Search } from 'lucide-react';

interface CessionListProps {
    filterByStore?: string;
}

const CessionList: React.FC<CessionListProps> = ({ filterByStore }) => {
    const { user } = useAuth();
    const { dataService, isOnline } = useOffline();
    const [loading, setLoading] = useState(true);
    const [cessions, setCessions] = useState<Cession[]>([]);
    const [filteredCessions, setFilteredCessions] = useState<Cession[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showNewForm, setShowNewForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CessionStatus | 'TOUS'>('TOUS');

    // Service pour les cessions
    const cessionService = new CessionService(import.meta.env.VITE_AIRTABLE_TOKEN);

    // Charger les cessions au chargement du composant
    useEffect(() => {
        loadCessions();
    }, [filterByStore]);

    // Filtrer les cessions lorsque les filtres changent
    useEffect(() => {
        filterCessions();
    }, [cessions, searchTerm, statusFilter]);

    const loadCessions = async () => {
        try {
            setLoading(true);
            setError(null);

            // Charger les cessions depuis le service
            const cessionsData = await cessionService.getCessions(filterByStore);
            setCessions(cessionsData);
        } catch (error) {
            console.error('Erreur lors du chargement des cessions:', error);
            setError('Impossible de charger les cessions. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    const filterCessions = () => {
        let filtered = [...cessions];

        // Filtrer par statut
        if (statusFilter !== 'TOUS') {
            filtered = filtered.filter(cession => cession.statut === statusFilter);
        }

        // Filtrer par terme de recherche
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(cession =>
                cession.reference.toLowerCase().includes(term) ||
                cession.magasin_origine.name.toLowerCase().includes(term) ||
                cession.magasin_destination.name.toLowerCase().includes(term) ||
                cession.articles.some(article =>
                    article.nom.toLowerCase().includes(term) ||
                    article.reference.toLowerCase().includes(term)
                )
            );
        }

        // Filtrer par magasin si nécessaire (utilisateur magasin)
        if (user?.role === 'magasin' && user.storeId) {
            filtered = filtered.filter(cession =>
                cession.magasin_origine.id === user.storeId ||
                cession.magasin_destination.id === user.storeId
            );
        }

        setFilteredCessions(filtered);
    };

    const handleCreateCession = async (formData: any) => {
        try {
            // Créer la cession via le service
            await cessionService.createCession(formData, user?.id || '');

            // Recharger les cessions
            await loadCessions();

            // Fermer le formulaire
            setShowNewForm(false);
        } catch (error) {
            console.error('Erreur lors de la création de la cession:', error);
            throw error; // Laisser le formulaire gérer l'erreur
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: CessionStatus, commentaire?: string) => {
        try {
            // Mettre à jour le statut via le service
            await cessionService.updateCessionStatus(id, newStatus, commentaire, user?.id);

            // Recharger les cessions
            await loadCessions();
        } catch (error) {
            console.error(`Erreur lors de la mise à jour du statut de la cession ${id}:`, error);
            setError('Impossible de mettre à jour le statut. Veuillez réessayer.');
        }
    };

    // Fonction pour déterminer si l'utilisateur peut effectuer une action sur une cession
    const canPerformAction = (cession: Cession, action: 'accept' | 'reject' | 'prepare' | 'transit' | 'deliver'): boolean => {
        // Admin peut tout faire
        if (user?.role === 'admin') return true;

        // Règles spécifiques selon le rôle et l'état de la cession
        if (user?.role === 'magasin') {
            // Magasin d'origine - peut préparer
            if (cession.magasin_origine.id === user.storeId) {
                if (action === 'prepare' && cession.statut === 'ACCEPTEE') return true;
                return false;
            }

            // Magasin de destination - peut accepter/refuser et confirmer la livraison
            if (cession.magasin_destination.id === user.storeId) {
                if (action === 'accept' && cession.statut === 'DEMANDE') return true;
                if (action === 'reject' && cession.statut === 'DEMANDE') return true;
                if (action === 'deliver' && cession.statut === 'EN_TRANSIT') return true;
                return false;
            }
        }

        // Chauffeur - peut mettre en transit
        if (user?.role === 'chauffeur') {
            if (action === 'transit' && cession.statut === 'EN_PREPARATION') {
                // Vérifier si le chauffeur est assigné à cette cession
                return cession.chauffeurs?.some(chauffeur => chauffeur.id === user.driverId) || false;
            }
        }

        return false;
    };

    // Fonction pour obtenir la couleur du badge de statut
    const getStatusColor = (status: CessionStatus): string => {
        switch (status) {
            case 'DEMANDE':
                return 'bg-blue-100 text-blue-800';
            case 'ACCEPTEE':
                return 'bg-green-100 text-green-800';
            case 'REFUSEE':
                return 'bg-red-100 text-red-800';
            case 'EN_PREPARATION':
                return 'bg-yellow-100 text-yellow-800';
            case 'EN_TRANSIT':
                return 'bg-purple-100 text-purple-800';
            case 'LIVREE':
                return 'bg-emerald-100 text-emerald-800';
            case 'ANNULEE':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Fonction pour formater le statut
    const formatStatus = (status: CessionStatus): string => {
        switch (status) {
            case 'DEMANDE':
                return 'Demande';
            case 'ACCEPTEE':
                return 'Acceptée';
            case 'REFUSEE':
                return 'Refusée';
            case 'EN_PREPARATION':
                return 'En préparation';
            case 'EN_TRANSIT':
                return 'En transit';
            case 'LIVREE':
                return 'Livrée';
            case 'ANNULEE':
                return 'Annulée';
            default:
                return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Cessions inter-magasins</h2>

                {/* Bouton Nouvelle cession */}
                {(user?.role === 'admin' || user?.role === 'magasin') && (
                    <button
                        onClick={() => setShowNewForm(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nouvelle cession
                    </button>
                )}
            </div>

            {/* Filtres */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Recherche */}
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher par référence, magasin ou article..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                    />
                </div>

                {/* Filtre par statut */}
                <div className="flex-shrink-0">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as CessionStatus | 'TOUS')}
                        className="border border-gray-300 rounded-lg p-2 w-full md:w-auto"
                    >
                        <option value="TOUS">Tous les statuts</option>
                        <option value="DEMANDE">Demandes</option>
                        <option value="ACCEPTEE">Acceptées</option>
                        <option value="EN_PREPARATION">En préparation</option>
                        <option value="EN_TRANSIT">En transit</option>
                        <option value="LIVREE">Livrées</option>
                        <option value="REFUSEE">Refusées</option>
                        <option value="ANNULEE">Annulées</option>
                    </select>
                </div>
            </div>

            {/* Message d'erreur */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Mode hors ligne */}
            {!isOnline && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    Vous êtes en mode hors ligne. Certaines fonctionnalités peuvent être limitées.
                </div>
            )}

            {/* Liste des cessions */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
                </div>
            ) : filteredCessions.length > 0 ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Référence
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Origine → Destination
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Articles
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Statut
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredCessions.map((cession) => (
                                    <tr key={cession.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {cession.reference}
                                            {cession.priorite === 'Urgente' && (
                                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Urgent
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>Demande: {formatData?.commandeData ? String(formatData.commandeData({ date: cession.date_demande })) : cession.date_demande?.toString()}</div>
                                            <div>Souhaitée: {formatData?.price ? String(formatData.price(Number(cession.date_livraison_souhaitee))) : cession.date_livraison_souhaitee?.toString()}</div>
                                            {cession.date_livraison_effective && (
                                                <div>Effective: {formatData?.commandeData ? String(formatData.commandeData({ date: cession.date_livraison_effective })) : cession.date_livraison_effective?.toString()}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center space-x-2">
                                                <span>{cession.magasin_origine.name}</span>
                                                <ArrowRight className="w-4 h-4" />
                                                <span>{cession.magasin_destination.name}</span>
                                            </div>
                                            {cession.motif && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {cession.motif}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>
                                                {cession.articles.length} article(s)
                                            </div>
                                            <div className="text-xs">
                                                {cession.articles.map(article => article.nom).join(', ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(cession.statut)}`}>
                                                {formatStatus(cession.statut)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                {/* Actions selon le statut et les permissions */}
                                                {cession.statut === 'DEMANDE' && canPerformAction(cession, 'accept') && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(cession.id, 'ACCEPTEE', 'Demande acceptée')}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Accepter"
                                                    >
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {cession.statut === 'DEMANDE' && canPerformAction(cession, 'reject') && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(cession.id, 'REFUSEE', 'Demande refusée')}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Refuser"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {cession.statut === 'ACCEPTEE' && canPerformAction(cession, 'prepare') && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(cession.id, 'EN_PREPARATION', 'Cession en préparation')}
                                                        className="text-yellow-600 hover:text-yellow-900"
                                                        title="Marquer en préparation"
                                                    >
                                                        <Clock className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {cession.statut === 'EN_PREPARATION' && canPerformAction(cession, 'transit') && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(cession.id, 'EN_TRANSIT', 'Cession en transit')}
                                                        className="text-purple-600 hover:text-purple-900"
                                                        title="Marquer en transit"
                                                    >
                                                        <Truck className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {cession.statut === 'EN_TRANSIT' && canPerformAction(cession, 'deliver') && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(cession.id, 'LIVREE', 'Cession livrée')}
                                                        className="text-emerald-600 hover:text-emerald-900"
                                                        title="Marquer comme livrée"
                                                    >
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'TOUS' ? (
                        <>
                            <p className="text-lg font-medium">Aucune cession ne correspond à vos critères</p>
                            <p className="mt-2">Essayez de modifier vos filtres</p>
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-medium">Aucune cession inter-magasins</p>
                            <p className="mt-2">Les cessions apparaîtront ici une fois créées</p>
                        </>
                    )}
                </div>
            )}

            {/* Modal pour nouvelle cession */}
            <Modal
                isOpen={showNewForm}
                onClose={() => setShowNewForm(false)}
            >
                <CessionForm
                    onSubmit={handleCreateCession}
                    onCancel={() => setShowNewForm(false)}
                />
            </Modal>
        </div>
    );
};

export default CessionList;