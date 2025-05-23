import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AirtableService } from '../../services/airtable.service';
import { CommandeMetier } from '../../types/business.types';
import Pagination from '../../components/Pagination';
import CommandeDetails from '../../components/CommandeDetails';
import { useAuth } from '../../contexts/AuthContext';
import { useAirtable } from '../../hooks/useAirtable';
import { RoleSelector } from '../../components/RoleSelector';
import { getStatutCommandeStyle, getStatutLivraisonStyle } from '../../styles/getStatus';
import { useSearch } from '../../hooks/useSearch';
import { useSort } from '../../hooks/useSort';
import { usePagination } from '../../hooks/usePagination';
import { DateRange, SortableFields } from '../../types/hooks.types';
import { dateFormatter } from '../../utils/formatters';
import { Modal } from '../../components/Modal';
import AjoutCommande from '../../components/AjoutCommande';
import { useDraftStorage } from '../../hooks/useDraftStorage';
import { useOffline } from '../../contexts/OfflineContext';

const Deliveries = () => {
    const { user } = useAuth();
    const { dataService, isOnline } = useOffline();
    const airtable = useAirtable();

    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [data, setData] = useState<CommandeMetier[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>({
        start: null,
        end: null,
        mode: 'range',
        singleDate: null
    });
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Filtrer les données selon le rôle de l'utilisateur
    const filteredByRoleData = useMemo(() => {
        // Si c'est un admin, pas de filtrage
        if (user?.role === 'admin') return data;

        // Si c'est un magasin, filtrer par storeId
        if (user?.role === 'magasin' && user.storeId) {
            return data.filter(item => item.magasin?.id === user.storeId);
        }

        // Si c'est un chauffeur, filtrer par driverId
        if (user?.role === 'chauffeur' && user.driverId) {
            return data.filter(item =>
                item.chauffeurs?.some(chauffeur => chauffeur.id === user.driverId)
            );
        }

        // Par défaut, retourner toutes les données
        // (ce cas ne devrait pas arriver souvent)
        return data;
    }, [data, user?.role, user?.storeId, user?.driverId]);

    // Filtrer par date après le filtrage par rôle
    const filteredData: CommandeMetier[] = useMemo(() => {
        return filteredByRoleData.filter(item => {
            if (!dateRange.start || !dateRange.end) return true;
            const itemDate = new Date(item.dates.livraison);
            return itemDate >= new Date(dateRange.start) &&
                itemDate <= new Date(dateRange.end);
        });
    }, [filteredByRoleData, dateRange]);

    const { clearDraft } = useDraftStorage();

    const isCreatingCommandeRef = useRef(false);

    const searchKeys: Array<keyof CommandeMetier | string> = [
        'numeroCommande',
        'client.nom',
        'client.prenom',
        'client.adresse.ligne1',
        'client.adresse.type',
        'client.telephone.principal',
        'client.telephone.secondaire',
        'magasin.name',
        'dates.livraison',
        'statuts.livraison',
        'statuts.commande',
        'livraison.creneau',
        'livraison.vehicule',
        'livraison.reserve',
        'chauffeurs',
        'financier.tarifHT',
    ];

    const { search, setSearch, filteredItems: searchedItems } = useSearch({
        items: filteredData,
        searchKeys
    });

    const { sortConfig, setSortConfig, sortedItems } = useSort(searchedItems, 'dates');

    const { currentPage, setCurrentPage, paginatedItems, totalPages } = usePagination({
        items: sortedItems,
        itemsPerPage: rowsPerPage
    });

    useEffect(() => {
        fetchData();
    }, [user]);

    // Réagir aux changements de rôle/magasin
    useEffect(() => {
        const handleRoleChange = (event: Event) => {
            console.log('Changement de rôle détecté, rechargement des commandes...');
            // Recharger les données
            fetchData();
            // Réinitialiser la pagination
            setCurrentPage(1);
        };

        window.addEventListener('rolechange', handleRoleChange);
        window.addEventListener('storechange', handleRoleChange);

        return () => {
            window.removeEventListener('rolechange', handleRoleChange);
            window.removeEventListener('storechange', handleRoleChange);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
            const records = await dataService.getCommandes();
            setData(records);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    function handleEdit(id: string): void {
        // Navigate to the edit page with the selected commande id
        window.location.href = `/edit-commande/${id}`;
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
            try {
                const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
                await dataService.deleteCommande(id);
                setData(prevData => prevData.filter(commande => commande.id !== id));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression');
            }
        }
    };

    const [showNewCommandeModal, setShowNewCommandeModal] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleCreateCommande = async (commande: Partial<CommandeMetier>) => {
        // Éviter les créations multiples
        if (loading || isCreatingCommandeRef.current) {
            console.log('Création déjà en cours, blocage');
            return;
        }

        setLoading(true);
        isCreatingCommandeRef.current = true;
        console.log('=== DÉBUT CRÉATION COMMANDE ===');

        try {
            // S'assurer que le magasin est correctement spécifié pour les utilisateurs magasin
            let commandeToCreate = { ...commande };

            if (user?.role === 'magasin' && user.storeId && (!commande.magasin?.id || commande.magasin.id === '')) {
                console.log('Ajout des informations du magasin à la commande');
                commandeToCreate.magasin = {
                    ...(commandeToCreate.magasin || {}),
                    id: user.storeId,
                    name: user.storeName || '',
                    address: user.storeAddress || '',
                    phone: commande.magasin?.phone || '',
                    status: commande.magasin?.status || ''
                };
            }

            // Appel unique à dataService.createCommande
            console.log('Appel à createCommande (UNIQUE)');
            await dataService.createCommande(commandeToCreate);

            // Nettoyer après création réussie
            console.log('Commande créée, nettoyage...');
            // La commande a été créée avec succès, maintenant on peut supprimer le brouillon
            await clearDraft();

            setShowNewCommandeModal(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            await fetchData(); // Recharge les données
        } catch (error) {
            if (error instanceof Error && error.message.includes('Token')) {
                console.error('Erreur d\'authentification Airtable. Vérifiez votre token.');
                // Afficher un message à l'utilisateur
            } else {
                console.error('Erreur lors de la création:', error);
            }
        } finally {
            console.log('=== FIN CRÉATION COMMANDE ===');
            setLoading(false);
            // Réinitialiser le drapeau après un délai de sécurité
            setTimeout(() => {
                isCreatingCommandeRef.current = false;
            }, 1000);
        }
    };

    const sortableFields: SortableFields[] = ['dates', 'creneau', 'statuts', 'magasin', 'chauffeur', 'tarifHT'];

    return (
        <div className="p-6">
            {/* Indicateur de mode hors ligne - sans l'OfflineIndicator qui est déjà dans App */}
            {!isOnline && (
                <div className="mb-4 bg-yellow-100 text-yellow-800 p-3 rounded">
                    Vous êtes en mode hors ligne. Les données seront synchronisées lorsque vous serez à nouveau connecté.
                </div>
            )}

            <div className="mb-6">
                <RoleSelector />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">
                    {user?.role === 'admin' && 'Direction My Truck - Toutes les commandes'}
                    {user?.role === 'magasin' && `Commandes ${user.storeName || 'du magasin'}`}
                    {user?.role === 'chauffeur' && 'Mes Livraisons'}
                </h1>
                <select
                    className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    value={rowsPerPage}
                    onChange={(e) => {
                        setCurrentPage(1);
                        setRowsPerPage(Number(e.target.value));
                    }}
                >
                    <option value={10}>10 par page</option>
                    <option value={25}>25 par page</option>
                    <option value={50}>50 par page</option>
                </select>
            </div>

            {loading && <div className='secondary'>Chargement...</div>}
            {error && <div className="text-red-500">Erreur: {error}</div>}

            <div className="mb-8">
                {/* Barre de recherche */}
                <div className="flex gap-4 items-center mb-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                        {search && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                onClick={() => setSearch("")}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setShowNewCommandeModal(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                        Nouvelle commande
                    </button>

                    <Modal
                        isOpen={showNewCommandeModal}
                        onClose={() => {
                            // Nettoyer complètement lors de la fermeture
                            setShowNewCommandeModal(false);
                            // Utiliser un court délai pour s'assurer que le modal est bien fermé
                            // setTimeout(() => {
                            //     clearDraft().catch(err => console.error('Erreur lors du nettoyage du brouillon:', err));
                            // }, 100);
                        }}
                    >
                        <AjoutCommande
                            onSubmit={handleCreateCommande}
                            onCancel={() => setShowNewCommandeModal(false)}
                            commande={{} as CommandeMetier}
                            isEditing={false}
                            initialData={{
                                id: '',
                                numeroCommande: '',
                                dates: { commande: '', livraison: '', misAJour: '' },
                                statuts: { livraison: 'EN ATTENTE', commande: 'En attente' },
                                client: { nom: '', prenom: '', nomComplet: '', adresse: { ligne1: '', type: 'Domicile', batiment: '', etage: '', ascenseur: false, interphone: '' }, telephone: { principal: '', secondaire: '' } },
                                magasin: user?.role === 'magasin' ? {
                                    id: user.storeId || '',
                                    name: user.storeName || '',
                                    address: user.storeAddress || '',
                                    phone: '',
                                    email: '',
                                    status: ''
                                } : {
                                    id: '',
                                    name: '',
                                    address: '',
                                    phone: '',
                                    email: '',
                                    status: ''
                                },
                                livraison: { creneau: '', vehicule: '', reserve: false, equipiers: 0, chauffeurs: [] },
                                chauffeurs: [],
                                financier: { tarifHT: 0 },
                                articles: { nombre: 0, details: '', photos: [] }
                            }}
                        />
                    </Modal>
                </div>

                {/* Sélecteur de dates */}
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm text-gray-500">Date:</span>
                    <select
                        value={dateRange.mode}
                        onChange={(e) => setDateRange(prev => ({
                            ...prev,
                            mode: e.target.value as 'range' | 'single',
                            // Réinitialiser les valeurs lors du changement de mode
                            start: null,
                            end: null,
                            singleDate: null
                        }))}
                        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    >
                        <option value="range">Période</option>
                        <option value="single">Date unique</option>
                    </select>

                    {dateRange.mode === 'single' ? (
                        <input
                            type="date"
                            value={dateRange.singleDate || ''}
                            onChange={e => setDateRange(prev => ({
                                ...prev,
                                singleDate: e.target.value,
                                start: e.target.value,
                                end: e.target.value
                            }))}
                            className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                    ) : (
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={dateRange.start || ''}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-gray-500 content-center dark:text-gray-100">à</span>
                            <input
                                type="date"
                                value={dateRange.end || ''}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                            />
                        </div>
                    )}

                    {((dateRange.mode === 'single' && dateRange.singleDate) ||
                        (dateRange.mode === 'range' && (dateRange.start || dateRange.end))) && (
                            <button
                                onClick={() => setDateRange({
                                    start: null,
                                    end: null,
                                    mode: dateRange.mode,
                                    singleDate: null
                                })}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Réinitialiser
                            </button>
                        )}
                </div>

                {/* Système de tri */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Trier par:</span>
                    {sortableFields.map((key) => {
                        const handleClick = () => setSortConfig({
                            key,
                            direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                        });

                        return (
                            <button
                                key={key}
                                onClick={handleClick}
                                className={`px-3 py-1 rounded-lg text-sm ${sortConfig.key === key ? 'bg-red-100 text-red-800' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}
                            >
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                                {sortConfig.key === key && (
                                    <span className="ml-1">
                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {data.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Afficher le nombre de résultats filtrés */}
                    <div className="mb-2 text-sm text-gray-500">
                        {filteredByRoleData.length !== data.length && (
                            <div>
                                Affichage de {filteredByRoleData.length} commandes
                                {user?.role === 'magasin' && ` pour ${user.storeName || 'ce magasin'}`}
                                {user?.role === 'chauffeur' && ` assignées à ce chauffeur`}
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="w-10 px-4 py-2"></th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                    >
                                        Numéro {sortConfig.key === 'numeroCommande' && (
                                            sortConfig.direction === 'asc' ? '↑' : '↓'
                                        )}
                                    </th>
                                    {user?.role !== 'magasin' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Client</th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date livraison</th>
                                    {user?.role !== 'magasin' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statut commande</th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statut livraison</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Créneau</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Véhicule</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Réserve</th>
                                    {user?.role === 'admin' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tarif HT</th>
                                    )}
                                    {user?.role === 'admin' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Magasin</th>
                                    )}
                                    {(user?.role === 'admin' || user?.role === 'magasin') && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"></th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {(paginatedItems as CommandeMetier[]).map((commande: CommandeMetier) => (
                                    <React.Fragment key={commande.id}>
                                        <tr className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                <button
                                                    onClick={() => setExpandedRow(
                                                        expandedRow === commande.id ? null : (commande.id || null)
                                                    )}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    {expandedRow === commande.id ? '▼' : '▶'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{commande.numeroCommande || 'N/A'}</td>
                                            {user?.role !== 'magasin' && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{commande?.client?.nom.toUpperCase() || 'N/A'} {commande.client?.prenom}</td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium secondary">
                                                {(commande.dates?.livraison) ?
                                                    dateFormatter.forDisplay(commande.dates?.livraison) : 'N/A'}
                                            </td>
                                            {user?.role !== 'magasin' && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    <span className={getStatutCommandeStyle(commande.statuts?.commande || 'N/A')}>
                                                        {commande.statuts?.commande || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                <span className={getStatutLivraisonStyle(commande.statuts?.livraison || 'N/A')}>
                                                    {commande.statuts?.livraison || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{commande.livraison?.creneau || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{commande.livraison?.vehicule || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{commande.livraison?.reserve || 'NON'}</td>
                                            {user?.role === 'admin' && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                                                    {commande.financier?.tarifHT
                                                        ? `${commande.financier.tarifHT}€`
                                                        : 'N/A'
                                                    }
                                                </td>
                                            )}
                                            {user?.role === 'admin' && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium secondary dark:text-gray-100 text-left">
                                                    {commande.magasin?.name}
                                                </td>
                                            )}
                                            {(user?.role === 'admin') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => commande.id && handleEdit(commande.id)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                        >
                                                            Éditer
                                                        </button>
                                                        <button
                                                            onClick={() => commande.id && handleDelete(commande.id)}
                                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        {expandedRow === commande.id && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={10} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    <div className="border-l-4 border-blue-500 pl-4">
                                                        <CommandeDetails
                                                            commande={commande}
                                                            onUpdate={(updatedCommande) => {
                                                                setData(prevData => prevData.map(c => c.id === updatedCommande.id ? updatedCommande : c));
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                        {showSuccess && (
                            <div className="fixed bottom-5 left-5 bg-green-400 text-white px-6 py-3 rounded shadow-lg z-50">
                                Commande créée avec succès !
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="px-4 py-3 border-t">
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(data.length / rowsPerPage)}
                    onPageChange={setCurrentPage}
                    paginatedItems={paginatedItems}
                    data={data}
                />
            </div>
        </div>
    );
};

export default Deliveries;