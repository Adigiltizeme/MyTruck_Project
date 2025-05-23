import React, { useState, useEffect } from 'react';
import { db } from '../services/offline-db.service';
import { SafeDbService } from '../services/safe-db.service';

// Types pour l'affichage des données
type TableInfo = {
    name: string;
    count: number;
};

const DatabaseExplorer: React.FC = () => {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredData, setFilteredData] = useState<any[]>([]);

    // États pour le stockage local et de session
    const [showLocalStorage, setShowLocalStorage] = useState(false);
    const [showSessionStorage, setShowSessionStorage] = useState(false);
    const [localStorageItems, setLocalStorageItems] = useState<[string, string][]>([]);
    const [sessionStorageItems, setSessionStorageItems] = useState<[string, string][]>([]);

    // État pour la pagination
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    // État pour la prévisualisation des images
    const [imagePreview, setImagePreview] = useState<{ url: string, blob: Blob } | null>(null);

    // Charger la liste des tables
    useEffect(() => {
        const loadTables = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Récupérer toutes les tables
                const tableNames = ['commandes', 'personnel', 'magasins', 'users', 'pendingChanges'];

                // Récupérer le nombre d'éléments dans chaque table
                const tablesWithCount: TableInfo[] = await Promise.all(
                    tableNames.map(async tableName => {
                        try {
                            const count = await SafeDbService.count(tableName);
                            return { name: tableName, count };
                        } catch (err) {
                            console.error(`Erreur lors du comptage pour ${tableName}:`, err);
                            return { name: tableName, count: -1 }; // -1 indique une erreur
                        }
                    })
                );

                setTables(tablesWithCount);
            } catch (err) {
                console.error('Erreur lors du chargement des tables:', err);
                setError(`Erreur lors du chargement des tables: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setIsLoading(false);
            }
        };

        loadTables();
    }, []);

    // Charger les données d'une table spécifique avec pagination
    const loadTableData = async (tableName: string) => {
        setIsLoading(true);
        setError(null);
        setSelectedTable(tableName);
        setCurrentPage(0);

        try {
            // Obtenir le nombre total d'éléments
            const count = await SafeDbService.count(tableName);
            setTotalCount(count);

            // Charger la première page
            const data = await SafeDbService.getPaginated(tableName, 0, pageSize);

            setTableData(data);
            setFilteredData(data);
            setHasMore(count > pageSize);
        } catch (err) {
            console.error(`Erreur lors du chargement des données de ${tableName}:`, err);
            setError(`Erreur lors du chargement des données: ${err instanceof Error ? err.message : String(err)}`);
            setTableData([]);
            setFilteredData([]);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour charger plus de données
    const loadMoreData = async () => {
        if (!selectedTable || !hasMore) return;

        setIsLoading(true);

        try {
            const nextPage = currentPage + 1;
            const offset = nextPage * pageSize;

            const moreData = await SafeDbService.getPaginated(selectedTable, nextPage, pageSize);

            if (moreData.length > 0) {
                setTableData(prevData => [...prevData, ...moreData]);
                setCurrentPage(nextPage);
                setHasMore(offset + moreData.length < totalCount);

                // Mettre à jour les données filtrées si une recherche est active
                if (searchTerm) {
                    const searchTermLower = searchTerm.toLowerCase();
                    const newFilteredData = [...tableData, ...moreData].filter(item => {
                        const itemStr = JSON.stringify(item).toLowerCase();
                        return itemStr.includes(searchTermLower);
                    });
                    setFilteredData(newFilteredData);
                } else {
                    setFilteredData(prevData => [...prevData, ...moreData]);
                }
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error(`Erreur lors du chargement de données supplémentaires:`, err);
            setError(`Erreur lors du chargement de données supplémentaires: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour basculer l'état d'expansion d'un élément
    const toggleItemExpansion = (id: string) => {
        const newExpandedItems = new Set(expandedItems);
        if (newExpandedItems.has(id)) {
            newExpandedItems.delete(id);
        } else {
            newExpandedItems.add(id);
        }
        setExpandedItems(newExpandedItems);
    };

    // Filtrer les données selon le terme de recherche
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredData(tableData);
            return;
        }

        const searchTermLower = searchTerm.toLowerCase();
        const filtered = tableData.filter(item => {
            // Convertir l'élément en chaîne JSON pour recherche
            const itemStr = JSON.stringify(item).toLowerCase();
            return itemStr.includes(searchTermLower);
        });

        setFilteredData(filtered);
    }, [searchTerm, tableData]);

    // Fonction pour prévisualiser une image depuis un Blob
    const previewImage = (url: string, blob: Blob) => {
        setImagePreview({ url, blob });
    };

    // Fonction pour fermer la prévisualisation
    const closePreview = () => {
        setImagePreview(null);
    };

    // Fonction pour formater la valeur selon son type
    const formatValue = (value: any, key: string, level = 0): JSX.Element => {
        if (value === null || value === undefined) {
            return <span className="text-gray-400 italic">null</span>;
        }

        if (typeof value === 'object' && value instanceof Blob) {
            // Ajouter un bouton de prévisualisation pour les Blobs
            const isImage = value.type.startsWith('image/');

            return (
                <div>
                    <span className="text-purple-600">[Blob: {value.size} bytes, type: {value.type}]</span>
                    {isImage && (
                        <button
                            onClick={() => previewImage(key, value)}
                            className="ml-2 text-blue-500 hover:text-blue-700 text-sm"
                        >
                            Prévisualiser
                        </button>
                    )}
                </div>
            );
        }

        if (typeof value === 'object' && value instanceof Date) {
            return <span className="text-blue-600">{value.toLocaleString()}</span>;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-gray-500">[]</span>;
            }

            const itemId = `${key}-${level}-${JSON.stringify(value).slice(0, 20)}`;
            const isExpanded = expandedItems.has(itemId);

            return (
                <div>
                    <button
                        onClick={() => toggleItemExpansion(itemId)}
                        className="text-blue-500 hover:text-blue-700"
                    >
                        {isExpanded ? '▼' : '►'} Array({value.length})
                    </button>

                    {isExpanded && (
                        <div className="ml-4 border-l-2 border-gray-300 pl-2 mt-1">
                            {value.map((item, idx) => (
                                <div key={idx} className="my-1">
                                    <span className="text-gray-500">{idx}: </span>
                                    {formatValue(item, `${key}-${idx}`, level + 1)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (typeof value === 'object') {
            if (Object.keys(value).length === 0) {
                return <span className="text-gray-500">{'{}'}</span>;
            }

            const itemId = `${key}-${level}-${JSON.stringify(value).slice(0, 20)}`;
            const isExpanded = expandedItems.has(itemId);

            return (
                <div>
                    <button
                        onClick={() => toggleItemExpansion(itemId)}
                        className="text-blue-500 hover:text-blue-700"
                    >
                        {isExpanded ? '▼' : '►'} Object({Object.keys(value).length} props)
                    </button>

                    {isExpanded && (
                        <div className="ml-4 border-l-2 border-gray-300 pl-2 mt-1">
                            {Object.entries(value).map(([k, v]) => (
                                <div key={k} className="my-1">
                                    <span className="text-gray-700 font-medium">{k}: </span>
                                    {formatValue(v, `${key}-${k}`, level + 1)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (typeof value === 'string') {
            if (value.startsWith('http://') || value.startsWith('https://')) {
                return <a href={value} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">{value}</a>;
            }
            return <span className="text-green-600">"{value}"</span>;
        }

        if (typeof value === 'number') {
            return <span className="text-blue-600">{value}</span>;
        }

        if (typeof value === 'boolean') {
            return <span className="text-purple-600">{value.toString()}</span>;
        }

        return <span>{String(value)}</span>;
    };

    // Exporter les données au format JSON
    const handleExportData = () => {
        if (!selectedTable || filteredData.length === 0) return;

        const dataStr = JSON.stringify(filteredData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTable}_export_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Supprimer une entrée
    const handleDeleteItem = async (id: any) => {
        if (!selectedTable || !id) return;

        if (!confirm(`Êtes-vous sûr de vouloir supprimer cet élément (id: ${id}) ?`)) {
            return;
        }

        try {
            await SafeDbService.delete(selectedTable, id);
            // Recharger les données
            await loadTableData(selectedTable);
            // Mettre à jour le comptage
            const updatedTables = [...tables];
            const tableIndex = updatedTables.findIndex(t => t.name === selectedTable);
            if (tableIndex >= 0) {
                updatedTables[tableIndex].count--;
                setTables(updatedTables);
            }
        } catch (err) {
            console.error(`Erreur lors de la suppression de l'élément:`, err);
            setError(`Erreur lors de la suppression: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // Fonction pour charger les données du localStorage
    const loadLocalStorage = () => {
        const items: [string, string][] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                items.push([key, localStorage.getItem(key) || '']);
            }
        }
        setLocalStorageItems(items);
        setShowLocalStorage(!showLocalStorage);
    };

    // Fonction pour charger les données du sessionStorage
    const loadSessionStorage = () => {
        const items: [string, string][] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
                items.push([key, sessionStorage.getItem(key) || '']);
            }
        }
        setSessionStorageItems(items);
        setShowSessionStorage(!showSessionStorage);
    };

    // Fonction pour supprimer un élément du localStorage
    const removeLocalStorageItem = (key: string) => {
        if (confirm(`Supprimer "${key}" du localStorage ?`)) {
            localStorage.removeItem(key);
            loadLocalStorage();
        }
    };

    // Fonction pour supprimer un élément du sessionStorage
    const removeSessionStorageItem = (key: string) => {
        if (confirm(`Supprimer "${key}" du sessionStorage ?`)) {
            sessionStorage.removeItem(key);
            loadSessionStorage();
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mt-6">
            <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
                Explorateur de base de données
            </h2>

            {error && (
                <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="flex flex-wrap mb-4">
                <div className="w-full md:w-64 mr-4">
                    <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Tables</h3>
                    {isLoading && !selectedTable ? (
                        <div className="p-4 text-gray-600 dark:text-gray-400">Chargement...</div>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {tables.map(table => (
                                <li key={table.name} className="py-2">
                                    <button
                                        onClick={() => loadTableData(table.name)}
                                        className={`w-full text-left px-2 py-1 rounded ${selectedTable === table.name
                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <span className="font-medium">{table.name}</span>
                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                            {table.count >= 0 ? `(${table.count})` : '(erreur)'}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="w-full md:flex-1 mt-4 md:mt-0">
                    {selectedTable && (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                    Table: {selectedTable} ({filteredData.length} éléments)
                                </h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleExportData}
                                        disabled={filteredData.length === 0}
                                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                        Exporter
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Rechercher dans les données..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {isLoading ? (
                                <div className="p-4 text-gray-600 dark:text-gray-400">Chargement des données...</div>
                            ) : (
                                <>
                                    {filteredData.length === 0 ? (
                                        <div className="p-4 text-gray-600 dark:text-gray-400">
                                            {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée dans cette table'}
                                        </div>
                                    ) : (
                                        <div className="overflow-auto max-h-96 border border-gray-200 dark:border-gray-700 rounded">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-800">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            ID
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Données
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {filteredData.map((item, index) => {
                                                        // Essayer de déterminer l'ID de l'élément
                                                        const id = item.id || item.url || index;

                                                        return (
                                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                    {String(id)}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                                    <div className="max-w-lg overflow-auto">
                                                                        {Object.entries(item).map(([key, value]) => (
                                                                            key !== 'id' && (
                                                                                <div key={key} className="my-1">
                                                                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{key}: </span>
                                                                                    {formatValue(value, key)}
                                                                                </div>
                                                                            )
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                    <button
                                                                        onClick={() => handleDeleteItem(id)}
                                                                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                                                    >
                                                                        Supprimer
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {hasMore && (
                                        <div className="text-center mt-4">
                                            <button
                                                onClick={loadMoreData}
                                                disabled={isLoading}
                                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {isLoading ? 'Chargement...' : 'Charger plus'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="mt-8">
                <div className="flex space-x-4 mb-4">
                    <button
                        onClick={loadLocalStorage}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        {showLocalStorage ? 'Masquer' : 'Afficher'} localStorage
                    </button>
                    <button
                        onClick={loadSessionStorage}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        {showSessionStorage ? 'Masquer' : 'Afficher'} sessionStorage
                    </button>
                </div>

                {showLocalStorage && (
                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
                            localStorage ({localStorageItems.length} éléments)
                        </h3>
                        <div className="overflow-auto max-h-60 border border-gray-200 dark:border-gray-700 rounded">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Clé
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Valeur
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {localStorageItems.map(([key, value]) => (
                                        <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {key}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="max-w-xs overflow-hidden text-ellipsis">
                                                    {value.length > 100 ? `${value.substring(0, 100)}...` : value}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => removeLocalStorageItem(key)}
                                                    className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                                >
                                                    Supprimer
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {showSessionStorage && (
                    <div>
                        <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
                            sessionStorage ({sessionStorageItems.length} éléments)
                        </h3>
                        <div className="overflow-auto max-h-60 border border-gray-200 dark:border-gray-700 rounded">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Clé
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Valeur
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {sessionStorageItems.map(([key, value]) => (
                                        <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {key}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="max-w-xs overflow-hidden text-ellipsis">
                                                    {value.length > 100 ? `${value.substring(0, 100)}...` : value}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => removeSessionStorageItem(key)}
                                                    className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                                >
                                                    Supprimer
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {imagePreview && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-2xl max-h-full overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                Prévisualisation de l'image
                            </h3>
                            <button
                                onClick={closePreview}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="text-sm mb-2 text-gray-500 dark:text-gray-400 break-all">
                            URL: {imagePreview.url}
                        </div>

                        <div className="text-center">
                            <img
                                src={URL.createObjectURL(imagePreview.blob)}
                                alt="Image preview"
                                className="max-w-full max-h-[60vh] object-contain"
                                onLoad={() => URL.revokeObjectURL(URL.createObjectURL(imagePreview.blob))}
                            />
                        </div>

                        <div className="mt-4 text-center">
                            <a
                                href={URL.createObjectURL(imagePreview.blob)}
                                download={`image-${Date.now()}.${imagePreview.blob.type.split('/')[1] || 'png'}`}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={(e) => {
                                    // Permet le téléchargement puis révoque l'URL
                                    setTimeout(() => URL.revokeObjectURL((e.currentTarget as HTMLAnchorElement).href), 100);
                                }}
                            >
                                Télécharger l'image
                            </a>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default DatabaseExplorer;