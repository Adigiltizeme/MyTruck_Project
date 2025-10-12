import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../services/api.service';
import { EyeIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ClientGDPR, ClientsResponse } from '../../types/business.types';
import ClientDetailsModal from '../../components/ClientDetailsModal';
import { isAdminRole } from '../../utils/role-helpers';

export default function ClientManagement() {
    const [clients, setClients] = useState<ClientGDPR[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<ClientGDPR | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    // 🔧 AJOUT : États pour debugging
    const [debugInfo, setDebugInfo] = useState<any>(null);

    const { user } = useAuth();
    const apiService = useApi();

    const canViewFullDetails = user?.role === 'admin';

    useEffect(() => {
        loadClients();
    }, [user]); // 🔧 AJOUT : Recharger si utilisateur change

    const loadClients = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔍 Chargement clients pour utilisateur:', {
                email: user?.email,
                role: user?.role,
                magasin: user?.magasin || user?.storeId
            });

            const response = await apiService.getClients();
            console.log('📡 Réponse API clients complète:', response);

            // 🔧 AMÉLIORATION : Gestion response structure
            const clientsData = response?.data || response || [];
            const meta = response?.meta;

            console.log('👥 Clients extraits:', Array.isArray(clientsData) ? clientsData.length : 0);
            console.log('📊 Meta informations:', meta);

            setClients(Array.isArray(clientsData) ? clientsData : []);
            setDebugInfo({ meta, userRole: user?.role, clientCount: Array.isArray(clientsData) ? clientsData.length : 0 });

            // 🔧 AJOUT : Alerte si aucun client pour magasin
            if (user?.role === 'magasin' && Array.isArray(clientsData) && clientsData.length === 0) {
                setError('Aucun client trouvé pour ce magasin. Vérifiez que des commandes ont été créées.');
            }

        } catch (error: any) {
            console.error('❌ Erreur chargement clients:', error);

            // 🔧 AMÉLIORATION : Messages d'erreur spécifiques
            if (error.message?.includes('401')) {
                setError('Session expirée. Veuillez vous reconnecter.');
            } else if (error.message?.includes('403')) {
                setError('Accès refusé. Permissions insuffisantes.');
            } else if (error.message?.includes('filtrage')) {
                setError('Erreur de filtrage des données. Contactez le support technique.');
            } else {
                setError(`Erreur lors du chargement: ${error.message || 'Erreur inconnue'}`);
            }

            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewClient = async (clientId: string) => {
        try {
            const client = await apiService.get(`/clients/${clientId}`);
            setSelectedClient(client as ClientGDPR);
            setShowDetails(true);
        } catch (error: any) {
            if (error.message?.includes('404')) {
                alert('Client non trouvé ou données expirées conformément au RGPD');
            } else {
                alert(`Erreur lors de la récupération: ${error.message}`);
            }
        }
    };

    const handleRetry = () => {
        loadClients();
    };

    const filteredClients = clients.filter(client =>
        client.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.prenom && client.prenom.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 🔧 AJOUT : Affichage erreur avec retry
    if (error) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Gestion des Clients</h1>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-red-800 mb-2">Erreur de chargement</h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    <button
                        onClick={handleRetry}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Réessayer
                    </button>
                </div>

                {/* 🔧 AJOUT : Debug info pour développement */}
                {process.env.NODE_ENV === 'development' && debugInfo && (
                    <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
                        <strong>Debug Info:</strong>
                        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Gestion des Clients</h1>

            {/* ✅ RGPD ASSOUPLI : Informations simplifiées */}
            {user?.role === 'magasin' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-blue-800">
                                📊 Clients de votre magasin - Conservation 2 ans après dernière commande
                            </p>
                        </div>
                        {debugInfo && process.env.NODE_ENV === 'development' && (
                            <div className="text-xs bg-white p-2 rounded border">
                                Rôle: {debugInfo.userRole} | Clients: {debugInfo.clientCount}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Barre de recherche */}
            <div className="mb-6">
                <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Liste des clients */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        Clients ({filteredClients.length})
                    </h3>
                </div>

                {filteredClients.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">
                            {searchTerm ? 'Aucun client trouvé pour cette recherche' :
                                user?.role === 'magasin' ? 'Aucun client n\'a encore commandé dans ce magasin' :
                                    'Aucun client enregistré'}
                        </p>
                        {user?.role === 'magasin' && (
                            <p className="text-sm text-gray-400 mt-2">
                                Les clients apparaissent automatiquement lors de la création de commandes
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredClients.map((client) => (
                            <div key={client.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium">
                                            {client.nom?.charAt(0) || '?'}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-lg font-medium text-gray-900">
                                                {client.prenom} {client.nom}
                                            </h4>
                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                <span>{client._count?.commandes || 0} commande(s)</span>
                                                {/* <span>
                                                    {typeof client.telephone === 'string'
                                                        ? client.telephone
                                                        : client.telephone
                                                            ? `${client.telephone.principal}${client.telephone.secondaire ? ' / ' + client.telephone.secondaire : ''}`
                                                            : 'Pas de téléphone'}
                                                </span> */}
                                                {client.pseudonymized && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                        Données masquées
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleViewClient(client.id)}
                                        className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                    >
                                        <EyeIcon className="h-4 w-4 mr-1" />
                                        Détails
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de détails */}
            {showDetails && selectedClient && (
                <ClientDetailsModal
                    client={selectedClient}
                    canViewFullDetails={canViewFullDetails}
                    onClose={() => {
                        setShowDetails(false);
                        setSelectedClient(null);
                    }}
                />
            )}
        </div>
    );
}