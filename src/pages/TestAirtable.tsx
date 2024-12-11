import { useCallback, useEffect, useState } from 'react';
import { AirtableService } from '../services/airtable.service';
import { CommandeMetier, transformCommande } from '../types/business.types';
import Pagination from '../components/Pagination';
import CommandeDetails from '../components/CommandeDetails';

const TestAirtable = () => {
    const [data, setData] = useState<CommandeMetier[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof CommandeMetier | 'dates.livraison' | '';
        direction: 'asc' | 'desc';
    }>({ key: '', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
                const records = await airtableService.getCommandes();

                // Afficher la structure exacte des données
                console.log('Structure des données brutes:', {
                    nombreRecords: records.length,
                    premierRecord: JSON.stringify(records[0], null, 2),
                    fields: records[0]?.fields ? Object.keys(records[0].fields) : []
                });

                // Test sur un enregistrement
                if (records[0]) {
                    const fields = records[0].fields;
                    console.log('Champs disponibles:', fields);
                    console.log('Test des champs spécifiques:', {
                        numeroCommande: fields['NUMERO DE COMMANDE'],
                        nomClient: fields['NOM DU CLIENT'],
                        statutCommande: fields['STATUT DE LA COMMANDE']
                    });
                }

                const commandesTransformees = records.map(transformCommande);
                setData(commandesTransformees);
            } catch (err: any) {
                console.error('Erreur:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatutCommandeStyle = (statut: CommandeMetier['statuts']['commande']) => {
        const baseStyle = 'px-2 py-1 rounded-full text-sm font-medium';

        switch (statut) {
            case 'En attente':
                return `${baseStyle} bg-blue-100 text-blue-800`;
            case 'Confirmée':
                return `${baseStyle} bg-green-100 text-green-800`;
            case 'Transmise':
                return `${baseStyle} bg-purple-100 text-purple-800`;
            case 'Annulée':
                return `${baseStyle} bg-red-100 text-red-800`;
            case 'Modifiée':
                return `${baseStyle} bg-yellow-100 text-yellow-800`;
            default:
                return baseStyle;
        }
    };

    const getStatutLivraisonStyle = (statut: CommandeMetier['statuts']['livraison']) => {
        const baseStyle = 'px-2 py-1 rounded-full text-sm font-medium';

        switch (statut) {
            case 'EN ATTENTE':
                return `${baseStyle} bg-blue-100 text-blue-800`;
            case 'CONFIRMEE':
                return `${baseStyle} bg-indigo-100 text-indigo-800`;
            case 'ENLEVEE':
                return `${baseStyle} bg-purple-100 text-purple-800`;
            case 'EN COURS DE LIVRAISON':
                return `${baseStyle} bg-yellow-100 text-yellow-800`;
            case 'LIVREE':
                return `${baseStyle} bg-green-100 text-green-800`;
            case 'ANNULEE':
                return `${baseStyle} bg-red-100 text-red-800`;
            case 'ECHEC':
                return `${baseStyle} bg-red-200 text-red-900`;
            default:
                return baseStyle;
        }
    };

    // Fonction de tri
    const sortData = useCallback((data: CommandeMetier[]) => {
        if (!sortConfig.key) return data;

        return [...data].sort((a, b) => {
            if (sortConfig.key === 'dates.livraison' && a.dates && b.dates) {
                const aDate = new Date(a.dates.livraison);
                const bDate = new Date(b.dates.livraison);
                return sortConfig.direction === 'asc'
                    ? aDate.getTime() - bDate.getTime()
                    : bDate.getTime() - aDate.getTime();
            }

            // Ajout d'autres cas de tri selon le type de données
            return 0;
        });
    }, [sortConfig]);

    const handleSort = (key: keyof CommandeMetier) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const formatPrice = (price: number | undefined): string => {
        if (typeof price === 'undefined') return '0 €';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(price);
    };

    const handleEdit = (id: string) => {
        //Implémenter l'édition
        console.log('Éditer commande:', id);
    };

    const handleDelete = (id: string) => {
        // TODO: Implémenter la suppression
        console.log('Supprimer commande:', id);
    };

    // Pagination
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = sortData(data).slice(indexOfFirstRow, indexOfLastRow);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Test Airtable</h1>
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

            {loading && <div>Chargement...</div>}
            {error && <div className="text-red-500">Erreur: {error}</div>}

            {data.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="w-10 px-4 py-2"></th>
                                    <th
                                        className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('numeroCommande')}
                                    >
                                        Numéro {sortConfig.key === 'numeroCommande' && (
                                            sortConfig.direction === 'asc' ? '↑' : '↓'
                                        )}
                                    </th>
                                    <th className="px-4 py-2 text-left">Client</th>
                                    <th className="px-4 py-2 text-left">Date livraison</th>
                                    <th className="px-4 py-2 text-left">Statut commande</th>
                                    <th className="px-4 py-2 text-left">Statut livraison</th>
                                    <th className="px-4 py-2 text-left">Créneau</th>
                                    <th className="px-4 py-2 text-left">Véhicule</th>
                                    <th className="px-4 py-2 text-right">Tarif HT</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentRows.map((commande) => (
                                    <>
                                        <tr key={commande.id} className="border-t hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <button
                                                    // Vérifie si commande.id existe ET fournit null comme fallback
                                                    onClick={() => setExpandedRow(
                                                        expandedRow === commande.id ? null : (commande.id || null)
                                                    )}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    {expandedRow === commande.id ? '▼' : '▶'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-2">{commande.numeroCommande}</td>
                                            <td className="px-4 py-2">{commande.client.nomComplet}</td>
                                            <td className="px-4 py-2">
                                                {commande.dates.livraison.toLocaleDateString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={getStatutCommandeStyle(commande.statuts.commande)}>
                                                    {commande.statuts.commande}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={getStatutLivraisonStyle(commande.statuts.livraison)}>
                                                    {commande.statuts.livraison}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">{commande.livraison.creneau}</td>
                                            <td className="px-4 py-2">{commande.livraison.vehicule}</td>
                                            <td className="px-4 py-2 text-right">
                                                {formatPrice(commande.financier.tarifHT)}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        // Utilise le court-circuit pour s'assurer que l'id existe avant d'appeler les handlers
                                                        onClick={() => commande.id && handleEdit(commande.id)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                    >
                                                        Éditer
                                                    </button>
                                                    <button
                                                        // Utilise le court-circuit pour s'assurer que l'id existe avant d'appeler les handlers
                                                        onClick={() => commande.id && handleDelete(commande.id)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedRow === commande.id && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={10} className="px-4 py-2">
                                                    <div className="border-l-4 border-blue-500 pl-4">
                                                        <CommandeDetails commande={commande} />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 py-3 border-t">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(data.length / rowsPerPage)}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestAirtable;