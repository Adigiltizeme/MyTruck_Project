import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    UsersIcon,
    ShoppingBagIcon,
    DocumentTextIcon,
    ReceiptRefundIcon,
    ArrowsRightLeftIcon,
    ExclamationTriangleIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useApi } from '../services/api.service';

interface DependenciesModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: 'magasin' | 'chauffeur' | 'admin' | 'direction';
    entityId: string;
    entityName: string;
    onForceDelete: () => void;
    showDeleteButton?: boolean;
    title: string;
    mode: 'delete' | 'view';
}

interface Dependency {
    count: number;
    items: any[];
    totalInDb?: number;
}

interface DependenciesData {
    magasin?: { id: string; nom: string };
    chauffeur?: { id: string; nom: string; prenom: string };
    dependencies: {
        [key: string]: {
            count: number;
            items: any[];
            totalInDb?: number;
        };
    };
    totaux: {
        [key: string]: number;
        total: number;
    };
}

export default function DependenciesModal({
    isOpen,
    onClose,
    entityType,
    entityId,
    entityName,
    onForceDelete,
    showDeleteButton
}: DependenciesModalProps) {
    const [dependencies, setDependencies] = useState<DependenciesData | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('users');

    const apiService = useApi();

    useEffect(() => {
        if (isOpen && entityId) {
            loadDependencies();
        }
    }, [isOpen, entityId]);

    const loadDependencies = async () => {
        try {
            setLoading(true);
            const endpoint = entityType === 'magasin'
                ? `/magasins/${entityId}/dependencies`
                : `/chauffeurs/${entityId}/dependencies`;

            const data = await apiService.get(endpoint);
            const dependenciesData = data as DependenciesData;
            setDependencies(dependenciesData);

            // Définir le premier onglet avec des données
            // Correction: Accéder à la clé correspondant à l'entité (magasin ou chauffeur)
            const dependenciesObj =
                entityType === 'magasin'
                    ? dependenciesData.dependencies
                    : dependenciesData.dependencies;

            const firstTabWithData = Object.keys(dependenciesData.dependencies || {}).find(
                key => dependenciesData.dependencies[key] && dependenciesData.dependencies[key].count > 0
            );

            if (firstTabWithData) {
                setActiveTab(firstTabWithData as string);
            }
        } catch (error) {
            console.error('Erreur chargement dépendances:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const getTabIcon = (tabName: string) => {
        const iconMap: { [key: string]: any } = {
            users: UsersIcon,
            commandes: ShoppingBagIcon,
            factures: ReceiptRefundIcon,
            devis: DocumentTextIcon,
            cessionsOrigine: ArrowsRightLeftIcon,
            cessionsDestination: ArrowsRightLeftIcon,
            assignations: ShoppingBagIcon,
            rapportsEnlevement: DocumentTextIcon,
            rapportsLivraison: DocumentTextIcon
        };
        return iconMap[tabName] || DocumentTextIcon;
    };

    const getTabLabel = (tabName: string) => {
        const labelMap: { [key: string]: string } = {
            users: 'Utilisateurs',
            commandes: 'Commandes',
            factures: 'Factures',
            devis: 'Devis',
            cessionsOrigine: 'Cessions (Origine)',
            cessionsDestination: 'Cessions (Destination)',
            assignations: 'Assignations',
            rapportsEnlevement: 'Rapports Enlèvement',
            rapportsLivraison: 'Rapports Livraison'
        };
        return labelMap[tabName] || tabName;
    };

    const renderTabContent = (tabName: string, dependency: Dependency) => {
        if (!dependency || dependency.count === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    Aucun élément lié trouvé
                </div>
            );
        }

        const showTotal = dependency.totalInDb && dependency.totalInDb > dependency.items.length;

        return (
            <div>
                {showTotal && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            Affichage des {dependency.items.length} premiers sur {dependency.totalInDb} au total
                        </p>
                    </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {dependency.items.map((item, index) => (
                        <div key={item.id || index} className="border border-gray-200 rounded-lg p-3">
                            {tabName === 'users' && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium">{item.nom} {item.prenom}</h4>
                                        <p className="text-sm text-gray-600">{item.email}</p>
                                        <p className="text-sm text-gray-500">Rôle: {item.role}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'Actif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>
                            )}

                            {tabName === 'commandes' && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium">#{item.numeroCommande}</h4>
                                        <p className="text-sm text-gray-600">
                                            Client: {item.client?.prenom} {item.client?.nom}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Date: {formatDate(item.dateCommande)}
                                        </p>
                                        {item.tarifHT && (
                                            <p className="text-sm text-gray-500">
                                                Montant: {item.tarifHT}€ HT
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs ${item.statutLivraison === 'LIVREE' ? 'bg-green-100 text-green-800' :
                                            item.statutLivraison === 'EN COURS DE LIVRAISON' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {item.statutLivraison}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">{item.statutCommande}</p>
                                    </div>
                                </div>
                            )}

                            {(tabName === 'factures' || tabName === 'devis') && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium">
                                            #{tabName === 'factures' ? item.numeroFacture : item.numeroDevis}
                                        </h4>
                                        {item.commande && (
                                            <p className="text-sm text-gray-600">
                                                Commande: #{item.commande.numeroCommande}
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-500">
                                            Date: {formatDate(tabName === 'factures' ? item.dateFacture : item.dateDevis)}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs ${item.statut === 'Validé' || item.statut === 'VALIDE' ? 'bg-green-100 text-green-800' :
                                        'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {item.statut}
                                    </span>
                                </div>
                            )}

                            {(tabName === 'cessionsOrigine' || tabName === 'cessionsDestination') && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium">#{item.numeroCession}</h4>
                                        <p className="text-sm text-gray-600">
                                            {tabName === 'cessionsOrigine' ? 'Vers: ' : 'De: '}
                                            {item.magasinDestination?.nom || item.magasinOrigine?.nom}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Date: {formatDate(item.dateCession)}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs ${item.statutCession === 'VALIDEE' ? 'bg-green-100 text-green-800' :
                                        'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {item.statutCession}
                                    </span>
                                </div>
                            )}

                            {tabName === 'assignations' && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium">#{item.commande?.numeroCommande || 'N/A'}</h4>
                                        <p className="text-sm text-gray-600">
                                            Client: {item.commande?.client?.prenom} {item.commande?.client?.nom}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Magasin: {item.commande?.magasin?.nom}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Assigné le: {formatDate(item.assignedAt)}
                                        </p>
                                        {item.commande?.dateLivraison && (
                                            <p className="text-sm text-gray-500">
                                                Livraison: {formatDate(item.commande.dateLivraison)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs ${item.commande?.statutLivraison === 'LIVREE' ? 'bg-green-100 text-green-800' :
                                            item.commande?.statutLivraison === 'EN COURS DE LIVRAISON' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {item.commande?.statutLivraison || 'Inconnu'}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">{item.commande?.statutCommande}</p>
                                    </div>
                                </div>
                            )}

                            {(tabName === 'rapportsEnlevement' || tabName === 'rapportsLivraison') && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium">Rapport #{item.commande?.numeroCommande || 'N/A'}</h4>
                                        <p className="text-sm text-gray-600">
                                            Client: {item.commande?.client?.prenom} {item.commande?.client?.nom}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Message: {item.message}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Date: {formatDate(item.createdAt)}
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                        {tabName === 'rapportsEnlevement' ? 'Enlèvement' : 'Livraison'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-8 w-8 text-orange-500 mr-3" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                Éléments liés à "{entityName}"
                            </h3>
                            <p className="text-gray-600">
                                {dependencies?.totaux?.total || 0} éléments liés
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-gray-600">Analyse des dépendances...</p>
                    </div>
                ) : dependencies ? (
                    (() => {
                        const entityKey = Object.keys(dependencies)[0] as keyof DependenciesData;
                        const entityData = dependencies[entityKey as keyof DependenciesData] as any;
                        return (
                            <>
                                {/* Résumé */}
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start">
                                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                                        <div>
                                            <p className="text-sm text-red-800 font-medium">
                                                ⚠️ ATTENTION : Dans le cas d'une suppression, elle sera définitive de {dependencies?.totaux?.total || 0} éléments liés
                                            </p>
                                            <p className="text-sm text-red-700 mt-1">
                                                Cette action supprimera de manière permanente tous les éléments liés.
                                            </p>
                                            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-red-700">
                                                {dependencies?.totaux && Object.entries(dependencies.totaux)
                                                    .filter(([key, count]) => key !== 'total' && typeof count === 'number' && count > 0)
                                                    .map(([key, count]) => (
                                                        <span key={key} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            {getTabLabel(key)}: {count}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Onglets */}
                                <div className="mb-4">
                                    <div className="border-b border-gray-200">
                                        <nav className="-mb-px flex space-x-8 overflow-x-auto">
                                            {Object.entries(dependencies?.dependencies || {})
                                                .filter(([_, dep]) => dep && dep.count > 0)
                                                .map(([tabName, dep]) => {
                                                    const Icon = getTabIcon(tabName);
                                                    return (
                                                        <button
                                                            key={tabName}
                                                            onClick={() => setActiveTab(tabName)}
                                                            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tabName
                                                                ? 'border-primary text-primary'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            <Icon className="h-4 w-4 mr-1" />
                                                            {getTabLabel(tabName)} ({dep.count})
                                                        </button>
                                                    );
                                                })}
                                        </nav>
                                    </div>
                                </div>

                                {/* Contenu de l'onglet actif */}
                                <div className="mb-6">
                                    {renderTabContent(
                                        activeTab,
                                        dependencies?.dependencies?.[activeTab] || { count: 0, items: [] }
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        Fermer
                                    </button>
                                    {showDeleteButton !== false && (
                                        <button
                                            onClick={() => {
                                                onClose();
                                                onForceDelete();
                                            }}
                                            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                                        >
                                            <TrashIcon className="h-4 w-4 mr-2" />
                                            Supprimer quand même
                                        </button>
                                    )}
                                </div>
                            </>
                        );
                    })()
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Erreur lors du chargement des dépendances</p>
                    </div>
                )}
            </div>
        </div>
    );
}