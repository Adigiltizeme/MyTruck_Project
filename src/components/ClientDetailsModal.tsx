import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    UserIcon,
    PhoneIcon,
    HomeIcon,
    ShoppingBagIcon,
    DocumentTextIcon,
    CalendarIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { useApi } from '../services/api.service';
import { ClientGDPR } from '../types/business.types';

interface ClientDetailsModalProps {
    client: ClientGDPR;
    canViewFullDetails: boolean;
    onClose: () => void;
}

interface ClientDetailedData {
    client: ClientGDPR;
    commandes: any[];
    statistics: {
        totalCommandes: number;
        montantTotal: number;
        derniereCommande?: string;
        premiereCommande?: string;
    };
}

export default function ClientDetailsModal({ client, canViewFullDetails, onClose }: ClientDetailsModalProps) {
    const [detailedData, setDetailedData] = useState<ClientDetailedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('info');

    const apiService = useApi();

    useEffect(() => {
        if (client?.id) {
            loadClientDetails();
        }
    }, [client?.id]);

    const loadClientDetails = async () => {
        try {
            setLoading(true);
            console.log('🔍 Chargement détails pour client:', client.id);
            const data = await apiService.get(`/clients/${client.id}`) as ClientGDPR & {
                commandes?: any[];
                _count?: { commandes?: number };
            };
            console.log('📡 Réponse API détails client:', data);
            
            // Adapter la structure de l'API au format attendu
            const adaptedData: ClientDetailedData = {
                client: {
                    id: data.id,
                    consentGiven: data.consentGiven,
                    dataRetentionUntil: data.dataRetentionUntil,
                    lastActivityAt: data.lastActivityAt,
                    nomComplet: data.nomComplet,
                    prenom: data.prenom,
                    nom: data.nom,
                    telephone: data.telephone,
                    adresse: data.adresse,
                    _count: data._count,
                    pseudonymized: data.pseudonymized,
                    deletionRequested: data.deletionRequested,
                    // Add other required ClientGDPR properties here if needed
                },
                commandes: data.commandes || [],
                statistics: {
                    totalCommandes: data._count?.commandes || 0,
                    montantTotal: data.commandes?.reduce((sum: number, cmd: any) => sum + (cmd.tarifHT || 0), 0) || 0,
                    derniereCommande: data.commandes?.[0]?.dateCommande,
                    premiereCommande: data.commandes?.[data.commandes.length - 1]?.dateCommande
                }
            };
            
            console.log('🔄 Données adaptées:', adaptedData);
            setDetailedData(adaptedData);
        } catch (error) {
            console.error('❌ Erreur chargement détails client:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | Date) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const formatPhone = (phone: any) => {
        if (typeof phone === 'string') return phone;
        if (phone?.principal) {
            const secondary = phone?.secondaire ? ` / ${phone.secondaire}` : '';
            return `${phone.principal}${secondary}`;
        }
        return 'Non renseigné';
    };

    const tabs = [
        { key: 'info', label: 'Informations', icon: UserIcon },
        { key: 'commandes', label: 'Commandes', icon: ShoppingBagIcon },
        { key: 'stats', label: 'Statistiques', icon: DocumentTextIcon }
    ];

    const renderTabContent = () => {
        const data = detailedData || { client: client, commandes: [], statistics: { totalCommandes: 0, montantTotal: 0 } };
        
        console.log('🎯 Rendu du contenu pour onglet:', activeTab);
        console.log('📊 Données disponibles:', {
            detailedData,
            client,
            data,
            hasClient: !!data.client
        });
        
        // Sécurité: vérifier que client existe
        if (!data.client) {
            console.log('⚠️ Aucun client disponible');
            return (
                <div className="text-center py-8 text-gray-500">
                    <p>Aucune donnée client disponible</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'info':
                return (
                    <div className="space-y-6">
                        {/* Informations personnelles */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
                                Informations personnelles
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Nom complet</label>
                                    <p className="text-sm font-medium text-gray-900">
                                        {data.client.nomComplet || `${data.client.prenom || ''} ${data.client.nom || ''}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <PhoneIcon className="h-5 w-5 mr-2 text-green-500" />
                                Contact
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Téléphone</label>
                                    <p className="text-sm text-gray-900">{formatPhone(data.client.telephone)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Informations système */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                                Gestion des données
                            </h4>
                            <div className="space-y-2 text-sm">
                                {data.client.dataRetentionUntil && (
                                    <p className="text-blue-800">
                                        📅 Conservation jusqu'au: {formatDate(data.client.dataRetentionUntil)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'commandes':
                return (
                    <div className="space-y-4">
                        {data.commandes && data.commandes.length > 0 ? (
                            <>
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        📦 {data.commandes.length} commande(s) trouvée(s)
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Revenir à l'onglet "Livraisons" pour plus de détails.
                                    </p>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {data.commandes.map((commande, index) => (
                                        <div key={commande.id || index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900">
                                                        #{commande.numeroCommande}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">
                                                        📍 {commande.magasin?.nom || commande.magasin?.name || 'Magasin non spécifié'}
                                                    </p>
                                                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                                                        <p>📅 Commande: {formatDate(commande.dateCommande)}</p>
                                                        {commande.dateLivraison && (
                                                            <p>🚚 Livraison: {formatDate(commande.dateLivraison)}</p>
                                                        )}
                                                        {commande.tarifHT && (
                                                            <p>💰 Montant: {commande.tarifHT}€ HT</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        commande.statutLivraison === 'LIVREE' ? 'bg-green-100 text-green-800' :
                                                        commande.statutLivraison === 'EN COURS DE LIVRAISON' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {commande.statutLivraison || 'En attente'}
                                                    </span>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {commande.statutCommande}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <ShoppingBagIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p>Aucune commande trouvée</p>
                            </div>
                        )}
                    </div>
                );

            case 'stats':
                return (
                    <div className="space-y-6">
                        {/* Statistiques principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <ShoppingBagIcon className="h-8 w-8 text-blue-500 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total commandes</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {data.statistics?.totalCommandes || data.client._count?.commandes || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {(data.statistics?.montantTotal || 0) > 0 && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="flex items-center">
                                        <DocumentTextIcon className="h-8 w-8 text-green-500 mr-3" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Montant total</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {data.statistics?.montantTotal}€
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <CalendarIcon className="h-8 w-8 text-purple-500 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Client depuis</p>
                                        <p className="text-lg font-bold text-purple-600">
                                            Date inconnue
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Historique */}
                        {(data.statistics?.derniereCommande || data.statistics?.premiereCommande) && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-3">Historique d'activité</h4>
                                <div className="space-y-2 text-sm">
                                    {data.statistics?.premiereCommande && (
                                        <p className="text-gray-600">
                                            🎯 Première commande: {formatDate(data.statistics.premiereCommande)}
                                        </p>
                                    )}
                                    {data.statistics?.derniereCommande && (
                                        <p className="text-gray-600">
                                            🕐 Dernière commande: {formatDate(data.statistics.derniereCommande)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <UserIcon className="h-8 w-8 text-blue-500 mr-3" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                {client.nomComplet || `${client.prenom || ''} ${client.nom || ''}`}
                            </h3>
                            <p className="text-gray-600">
                                Infos client
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Chargement des détails...</p>
                    </div>
                ) : (
                    <>
                        {/* Onglets */}
                        <div className="mb-6">
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex space-x-8">
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.key}
                                                onClick={() => setActiveTab(tab.key)}
                                                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                                                    activeTab === tab.key
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                <Icon className="h-4 w-4 mr-2" />
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </div>

                        {/* Contenu de l'onglet actif */}
                        <div className="mb-6">
                            {renderTabContent()}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Fermer
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}