import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../services/api.service';
import { EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ClientGDPR, ClientsResponse } from '../../types/business.types';
import ClientDetailsModal from '../../components/ClientDetailsModal';

export default function ClientManagement() {
    const [clients, setClients] = useState<ClientGDPR[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<ClientGDPR | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const { user } = useAuth();
    const apiService = useApi();

    const canViewFullDetails = user?.role === 'admin';

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            setLoading(true);
            console.log('🔍 Appel API getClients...');
            const response = await apiService.getClients();
            console.log('📡 Réponse API clients:', response);

            const clientsData = response.data || response;
            console.log('👥 Clients extraits:', clientsData);

            setClients(Array.isArray(clientsData) ? clientsData : []);
        } catch (error) {
            console.error('❌ Erreur chargement clients:', error);
            console.error('🔍 Détail erreur:', error);
            
            // Afficher le type d'erreur pour diagnostic
            if (error instanceof Error) {
                console.error('📝 Message:', error.message);
                console.error('🌐 Network error?', error.message.includes('fetch'));
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
            if (error.message.includes('404')) {
                alert('Client non trouvé ou données expirées conformément au RGPD');
            }
        }
    };

    const filteredClients = clients.filter(client =>
        client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Gestion des Clients</h1>

            {/* Avertissement RGPD */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    ⚖️ Conformité RGPD : Les données clients sont automatiquement
                    {canViewFullDetails ? ' accessibles' : ' pseudonymisées'} selon votre rôle.
                    Conservation limitée à 3 ans après la dernière commande.
                </p>
            </div>

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
                            {searchTerm ? 'Aucun client trouvé pour cette recherche' : 'Aucun client enregistré'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredClients.map((client) => (
                            <div key={client.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium">
                                            {client.nom.charAt(0)}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-lg font-medium text-gray-900">
                                                {client.prenom} {client.nom}
                                            </h4>
                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                <span>{client._count?.commandes || 0} commande(s)</span>
                                                <span>
                                                    {typeof client.telephone === 'string'
                                                        ? client.telephone
                                                        : client.telephone
                                                            ? [client.telephone.principal, client.telephone.secondaire].filter(Boolean).join(' / ')
                                                            : 'Pas de téléphone'}
                                                </span>
                                                {!canViewFullDetails && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                        Données pseudonymisées
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