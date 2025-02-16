import React, { useEffect, useMemo, useState } from 'react';
import { AirtableService } from '../../services/airtable.service';
import { CommandeMetier } from '../../types/business.types';
import Pagination from '../../components/Pagination';
import CommandeDetails from '../../components/CommandeDetails';
import { useAuth } from '../../contexts/AuthContext';
import { useAirtable } from '../../hooks/useAirtable';
import { RoleSelector } from '../../components/RoleSelector';
import { getStatutCommandeStyle, getStatutLivraisonStyle } from '../../helpers/getStatus';
import { useSearch } from '../../hooks/useSearch';
import { useDateRange } from '../../hooks/useDateRange';
import { useSort } from '../../hooks/useSort';
import { usePagination } from '../../hooks/usePagination';
import { DateRange, SortableFields } from '../../types/hooks.types';
import { dateFormatter } from '../../utils/formatters';
import { Modal } from '../../components/Modal';
import AjoutCommande from '../../components/AjoutCommande';
import { useDraftStorage } from '../../hooks/useDraftStorage';

const Deliveries = () => {
    const { user } = useAuth();
    const airtable = useAirtable();

    console.log('Utilisateur actuel:', user); // Pour déboguer

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

    const filteredData: CommandeMetier[] = useMemo(() => {
        return data.filter(item => {
            if (!dateRange.start || !dateRange.end) return true;
            const itemDate = new Date(item.dates.livraison);
            return itemDate >= new Date(dateRange.start) &&
                itemDate <= new Date(dateRange.end);
        });
    }, [data, dateRange]);

    const { clearDraft } = useDraftStorage();

    const searchKeys: Array<keyof CommandeMetier | string> = [
        'numeroCommande',
        'client.nomComplet',
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
            const records = await airtableService.getCommandes();
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
                await airtableService.deleteCommande(id);
                setData(prevData => prevData.filter(commande => commande.id !== id));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression');
            }
        }
    };

    const [showNewCommandeModal, setShowNewCommandeModal] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleCreateCommande = async (commande: Partial<CommandeMetier>) => {
        setLoading(true);
        try {
            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
            await airtableService.createCommande(commande);
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
            setLoading(false);
        }
    };

    const sortableFields: SortableFields[] = ['dates', 'creneau', 'statuts', 'magasin', 'chauffeur'];

    return (
        <div className="p-6">
            <div className="mb-6">
                <RoleSelector />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">
                    {user?.role === 'admin' && 'Direction My Truck'}
                    {user?.role === 'magasin' && 'Gestion des Commandes'}
                    {user?.role === 'chauffeur' && 'Mes Livraisons'}
                </h1>
                <select
                    className="border rounded px-3 py-2"
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
                            className="w-full px-4 py-2 border rounded-lg"
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
                        onClose={() => setShowNewCommandeModal(false)}
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
                                magasin: { id: '', name: '', address: '', phone: '', status: '' },
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
                        className="border rounded-lg px-3 py-2"
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
                            className="border rounded-lg px-3 py-2"
                        />
                    ) : (
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={dateRange.start || ''}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="border rounded-lg px-3 py-2"
                            />
                            <span className="text-gray-500 content-center">à</span>
                            <input
                                type="date"
                                value={dateRange.end || ''}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="border rounded-lg px-3 py-2"
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
                                className={`px-3 py-1 rounded-lg text-sm ${sortConfig.key === key ? 'bg-red-100 text-red-800' : 'bg-gray-100'
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
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="w-10 px-4 py-2"></th>
                                    <th
                                        className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100"
                                    >
                                        Numéro {sortConfig.key === 'numeroCommande' && (
                                            sortConfig.direction === 'asc' ? '↑' : '↓'
                                        )}
                                    </th>
                                    {user?.role !== 'magasin' && (
                                        <th className="px-4 py-2 text-left">Client</th>
                                    )}
                                    <th className="px-4 py-2 text-left">Date livraison</th>
                                    {user?.role !== 'magasin' && (
                                        <th className="px-4 py-2 text-left">Statut commande</th>
                                    )}
                                    <th className="px-4 py-2 text-left">Statut livraison</th>
                                    <th className="px-4 py-2 text-left">Créneau</th>
                                    <th className="px-4 py-2 text-left">Véhicule</th>
                                    <th className="px-4 py-2 text-left">Réserve</th>
                                    {user?.role === 'admin' && (
                                        <th className="px-4 py-2 text-right">Tarif HT</th>
                                    )}
                                    {(user?.role === 'admin' || user?.role === 'magasin') && (
                                        <th className="px-4 py-2"></th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {(paginatedItems as CommandeMetier[]).map((commande: CommandeMetier) => (
                                    console.log('Date de livraison:', commande.dates.livraison),
                                    <React.Fragment key={commande.id}>
                                        <tr className="border-t hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <button
                                                    onClick={() => setExpandedRow(
                                                        expandedRow === commande.id ? null : (commande.id || null)
                                                    )}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    {expandedRow === commande.id ? '▼' : '▶'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-2">{commande.numeroCommande || 'N/A'}</td>
                                            {user?.role !== 'magasin' && (
                                                <td className="px-4 py-2">{commande.client?.nomComplet || 'N/A'}</td>
                                            )}
                                            <td className="px-4 py-2 secondary">
                                                {(commande.dates?.livraison) ?
                                                    dateFormatter.forDisplay(commande.dates?.livraison) : 'N/A'}
                                            </td>
                                            {user?.role !== 'magasin' && (
                                                <td className="px-4 py-2">
                                                    <span className={getStatutCommandeStyle(commande.statuts?.commande || 'N/A')}>
                                                        {commande.statuts?.commande || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-2">
                                                <span className={getStatutLivraisonStyle(commande.statuts?.livraison || 'N/A')}>
                                                    {commande.statuts?.livraison || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">{commande.livraison?.creneau || 'N/A'}</td>
                                            <td className="px-4 py-2">{commande.livraison?.vehicule || 'N/A'}</td>
                                            <td className="px-4 py-2">{commande.livraison.reserve || 'N/A'}</td>
                                            {user?.role === 'admin' && (
                                                <td className="px-4 py-2 text-right">
                                                    {commande.financier?.tarifHT
                                                        ? `${commande.financier.tarifHT}€`
                                                        : 'N/A'
                                                    }
                                                </td>
                                            )}
                                            {(user?.role === 'admin') && (
                                                <td className="px-4 py-2">
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
                                                <td colSpan={10} className="px-4 py-2">
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
                            <div className="fixed bottom-5 right-5 bg-green-400 text-white px-6 py-3 rounded shadow-lg z-50">
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
        //         <div className="p-6">
        //        {/* En-tête */}
        //        <div className="mb-6">
        //            <RoleSelector />
        //        </div>

        //        <div className="flex justify-between items-center mb-8">
        //            <h1 className="text-2xl font-bold">Administration Airtable</h1>
        //            <div className="flex space-x-4">
        //                <select
        //                    value={rowsPerPage}
        //                    className="border rounded px-3 py-2"
        //                >
        //                    <option value={10}>10 par page</option>
        //                    <option value={25}>25 par page</option>
        //                    <option value={50}>50 par page</option>
        //                </select>
        //            </div>
        //        </div>

        //        {/* Filtres */}
        //        <div className="mb-8">
        //            {/* Barre de recherche */}
        //            <div className="flex gap-4 items-center mb-4">
        //                <div className="relative flex-1">
        //                    <input
        //                        type="text"
        //                        value={search}
        //                        onChange={(e) => setSearch(e.target.value)}
        //                        placeholder="Rechercher..."
        //                        className="w-full px-4 py-2 border rounded-lg"
        //                    />
        //                    {search && (
        //                        <button 
        //                            onClick={() => setSearch("")}
        //                            className="absolute right-3 top-1/2 -translate-y-1/2"
        //                        >
        //                            ×
        //                        </button>
        //                    )}
        //                </div>
        //            </div>

        //            {/* Sélecteur de dates */}
        //            <div className="flex items-center gap-4 mb-4">
        //                <span className="text-sm text-gray-500">Période:</span>
        //                <div className="flex gap-2">
        //                    <input
        //                        type="date"
        //                        value={dateRange.start || ''}
        //                        onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
        //                        className="border rounded-lg px-3 py-2"
        //                    />
        //                    <span className="text-gray-500">à</span>
        //                    <input
        //                        type="date"
        //                        value={dateRange.end || ''}
        //                        onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
        //                        className="border rounded-lg px-3 py-2"
        //                    />
        //                </div>
        //                {(dateRange.start || dateRange.end) && (
        //                    <button
        //                        onClick={() => setDateRange({ start: null, end: null })}
        //                        className="text-sm text-gray-500 hover:text-gray-700"
        //                    >
        //                        Réinitialiser
        //                    </button>
        //                )}
        //            </div>

        //            {/* Système de tri */}
        //            <div className="flex items-center gap-2">
        //                <span className="text-sm text-gray-500">Trier par:</span>
        //                {sortableFields.map((key) => (
        //                    <button
        //                        key={key}
        //                        onClick={() => setSortConfig({
        //                            key,
        //                            direction: sortConfig.key === key && sortConfig.direction === 'asc' 
        //                                ? 'desc' 
        //                                : 'asc'
        //                        })}
        //                        className={`px-3 py-1 rounded-lg text-sm ${
        //                            sortConfig.key === key ? 'bg-red-100 text-red-800' : 'bg-gray-100'
        //                        }`}
        //                    >
        //                        {key.charAt(0).toUpperCase() + key.slice(1)}
        //                        {sortConfig.key === key && (
        //                            <span className="ml-1">
        //                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
        //                            </span>
        //                        )}
        //                    </button>
        //                ))}
        //            </div>
        //        </div>

        //        {/* Table */}
        //        {loading ? (
        //            <div>Chargement...</div>
        //        ) : error ? (
        //            <div className="text-red-600">{error}</div>
        //        ) : (
        //            <div className="bg-white rounded-lg shadow overflow-hidden">
        //                <div className="overflow-x-auto">
        //                    <table className="min-w-full">
        //                        <thead>
        //                            <tr>
        //                                <th className="px-4 py-2">Numéro</th>
        //                                {user?.role !== 'magasin' && (
        //                                    <th className="px-4 py-2">Client</th>
        //                                )}
        //                                <th className="px-4 py-2">Chauffeur</th>
        //                                <th className="px-4 py-2">Statut</th>
        //                                <th className="px-4 py-2">Date livraison</th>
        //                                <th className="px-4 py-2">Actions</th>
        //                            </tr>
        //                        </thead>
        //                        <tbody>
        //                            {(paginatedItems as CommandeMetier[]).map((commande: CommandeMetier) => (
        //                                <tr key={commande.id} className="border-t">
        //                                    <td className="px-4 py-2">{commande.numeroCommande}</td>
        //                                    {user?.role !== 'magasin' && (
        //                                        <td className="px-4 py-2">{commande.client?.nomComplet || 'N/A'}</td>
        //                                    )}
        //                                    <td className="px-4 py-2">
        //                                        {commande.chauffeurs?.[0]?.nom || 'N/A'}
        //                                    </td>
        //                                    <td className="px-4 py-2">
        //                                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
        //                                            commande.statuts.livraison === 'LIVREE' 
        //                                                ? 'bg-green-100 text-green-800'
        //                                                : 'bg-blue-100 text-blue-800'
        //                                        }`}>
        //                                            {commande.statuts.livraison}
        //                                        </span>
        //                                    </td>
        //                                    <td className="px-4 py-2">
        //                                        {format(new Date(commande.dates.livraison), 'dd/MM/yyyy')}
        //                                    </td>
        //                                    <td className="px-4 py-2">
        //                                        <div className="flex gap-2">
        //                                            <button className="text-blue-600 hover:text-blue-800">
        //                                                Éditer
        //                                            </button>
        //                                            <button className="text-red-600 hover:text-red-800">
        //                                                Supprimer
        //                                            </button>
        //                                        </div>
        //                                    </td>
        //                                </tr>
        //                            ))}
        //                        </tbody>
        //                    </table>
        //                </div>

        //                {/* Pagination */}
        //                <div className="p-4 border-t">
        //                    <div className="flex justify-between items-center">
        //                        <div className="text-sm text-gray-500">
        //                            Affichage de {paginatedItems.length} sur {data.length} commandes
        //                        </div>
        //                        <div className="flex gap-2">
        //                            {Array.from({ length: totalPages }, (_, i) => (
        //                                <button
        //                                    key={i}
        //                                    onClick={() => setCurrentPage(i + 1)}
        //                                    className={`px-3 py-1 rounded ${
        //                                        currentPage === i + 1
        //                                            ? 'bg-red-600 text-white'
        //                                            : 'bg-gray-100 hover:bg-gray-200'
        //                                    }`}
        //                                >
        //                                    {i + 1}
        //                                </button>
        //                            ))}
        //                        </div>
        //                    </div>
        //                </div>
        //            </div>
        //        )}
        //    </div>
    );
};

export default Deliveries;