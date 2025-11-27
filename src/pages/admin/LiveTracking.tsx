import React, { useState } from 'react';
import { useDriverTracking } from '../../hooks/useDriverTracking';
import { getDriverStatusColor, LiveTrackingMap } from '../../components/LiveTrackingMap';

interface DriverLocation {
    chauffeurId: string;
    chauffeurName: string;
    latitude: number;
    longitude: number;
    lastUpdate: Date;
    commandeId?: string;
    statutLivraison?: string;
}

export const LiveTracking: React.FC = () => {
    const token = localStorage.getItem('authToken');
    const { drivers, isConnected, error } = useDriverTracking(token);
    const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);

    const handleDriverClick = (driver: DriverLocation) => {
        setSelectedDriver(driver);
    };

    // Filtrer les chauffeurs actifs (en livraison)
    const activeDrivers = drivers.filter(d =>
        d.statutLivraison && ['EN COURS', 'EN ROUTE', 'EN COURS DE LIVRAISON'].includes(d.statutLivraison)
    );

    return (
        <div className="p-6">
            {/* En-tête */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    🗺️ Suivi GPS Temps Réel
                </h1>
                <p className="text-gray-600">
                    Visualisez en temps réel la position de vos chauffeurs en livraison
                </p>
            </div>

            {/* Statut de connexion */}
            <div className="mb-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className={isConnected ? 'text-green-700' : 'text-gray-600'}>
                        {isConnected ? 'Connecté au serveur' : 'Déconnecté'}
                    </span>
                </div>
            </div>

            {/* Carte principale */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
                <LiveTrackingMap
                    drivers={activeDrivers}
                    onDriverClick={handleDriverClick}
                    height="600px"
                    showRoutes={false}
                />
            </div>

            {/* Liste des chauffeurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.length === 0 ? (
                    <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <div className="text-4xl mb-2">📭</div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">
                            Aucun chauffeur actif
                        </h3>
                        <p className="text-gray-500 text-sm">
                            Les chauffeurs en livraison apparaîtront ici automatiquement
                        </p>
                    </div>
                ) : (
                    drivers.map((driver) => {
                        const isActive = driver.statutLivraison && ['EN COURS', 'EN ROUTE', 'EN COURS DE LIVRAISON'].includes(driver.statutLivraison);
                        const isSelected = selectedDriver?.chauffeurId === driver.chauffeurId;

                        return (
                            <div
                                key={driver.chauffeurId}
                                onClick={() => handleDriverClick(driver)}
                                className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-lg'
                                    } ${!isActive ? 'opacity-60' : ''}`}
                            >
                                {/* En-tête */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                        <h3 className="font-semibold text-gray-900">
                                            {driver.chauffeurName}
                                        </h3>
                                    </div>
                                    <span className="text-2xl">🚚</span>
                                </div>
                                
                                {driver.statutLivraison && (
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-xs text-gray-600">Statut:</span>
                                        <span
                                            className="text-xs font-medium px-2 py-0.5 rounded"
                                            style={{
                                                backgroundColor: getDriverStatusColor(driver.statutLivraison),
                                                color: 'white'
                                            }}
                                        >
                                            {driver.statutLivraison}
                                        </span>
                                    </div>
                                )}

                                {/* Informations */}
                                <div className="space-y-1 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">📍</span>
                                        <span className="text-xs">
                                            {driver.latitude.toFixed(4)}, {driver.longitude.toFixed(4)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">🕐</span>
                                        <span className="text-xs">
                                            Dernière position: {new Date(driver.lastUpdate).toLocaleTimeString('fr-FR')}
                                        </span>
                                    </div>

                                    {driver.commandeId && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">📦</span>
                                            <span className="text-xs text-blue-600">
                                                Commande active
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Informations complémentaires */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">ℹ️</span>
                    <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Comment ça marche ?</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Les chauffeurs envoient automatiquement leur position GPS toutes les 30 secondes pendant une livraison</li>
                            <li>• Cliquez sur un marqueur ou une carte pour voir les détails d'un chauffeur</li>
                            <li>• Les positions sont mises à jour en temps réel via WebSocket</li>
                            <li>• Les chauffeurs inactifs depuis plus de 5 minutes sont automatiquement retirés</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
