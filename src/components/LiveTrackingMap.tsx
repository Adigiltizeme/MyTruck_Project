import React, { useEffect, useState } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ETADisplay } from './ETADisplay';

interface DriverLocation {
    chauffeurId: string;
    chauffeurName: string;
    latitude: number;
    longitude: number;
    lastUpdate: Date;
    commandeId?: string;
    statutLivraison?: string;
    clientAddress?: string; // ✅ Adresse client pour calcul ETA
}

interface LastKnownPosition {
    latitude: number;
    longitude: number;
    timestamp: Date | string;
}

interface LiveTrackingMapProps {
    drivers: DriverLocation[];
    onDriverClick?: (driver: DriverLocation) => void;
    height?: string;
    showRoutes?: boolean;
    /** Affiche un marqueur grisé pour la dernière position connue (statuts terminaux) */
    lastKnownPosition?: LastKnownPosition | null;
    /** Callback déclenché quand l'utilisateur clique sur le bouton de partage */
    onShare?: () => void;
}

export // ✅ Utiliser les couleurs des statuts de livraison (selon getStatutLivraisonStyle)
    const getDriverStatusColor = (statut?: string): string => {
        switch (statut) {
            case 'EN ATTENTE':
                return '#93c5fd'; // bg-blue-300
            case 'CONFIRMEE':
                return '#a5b4fc'; // bg-indigo-300
            case 'ENLEVEE':
                return '#d8b4fe'; // bg-purple-300
            case 'EN COURS DE LIVRAISON':
                return '#fcd34d'; // bg-yellow-300
            case 'LIVREE':
                return '#86efac'; // bg-green-300
            case 'ANNULEE':
            case 'ECHEC':
                return '#fca5a5'; // bg-red-300
            default:
                return '#6b7280'; // gris
        }
    };

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
    drivers,
    onDriverClick,
    height = '600px',
    showRoutes = false,
    lastKnownPosition,
    onShare,
}) => {
    const [viewport, setViewport] = useState({
        longitude: 2.3488,
        latitude: 48.8534,
        zoom: 11
    });

    const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);

    // Centrer la carte sur les chauffeurs actifs ou la dernière position connue
    useEffect(() => {
        if (drivers.length > 0) {
            const avgLat = drivers.reduce((sum, d) => sum + d.latitude, 0) / drivers.length;
            const avgLng = drivers.reduce((sum, d) => sum + d.longitude, 0) / drivers.length;
            setViewport(prev => ({
                ...prev,
                latitude: avgLat,
                longitude: avgLng,
                zoom: drivers.length === 1 ? 13 : 11
            }));
        } else if (lastKnownPosition) {
            setViewport(prev => ({
                ...prev,
                latitude: lastKnownPosition.latitude,
                longitude: lastKnownPosition.longitude,
                zoom: 13,
            }));
        }
    }, [drivers.length, lastKnownPosition]);

    const getDriverIcon = (statut?: string): string => {
        switch (statut) {
            case 'EN ATTENTE':
                return '⏳';
            case 'CONFIRMEE':
                return '✓';
            case 'ENLEVEE':
                return '📤';
            case 'EN COURS DE LIVRAISON':
                return '🚚';
            case 'LIVREE':
                return '✅';
            case 'ANNULEE':
            case 'ECHEC':
                return '❌';
            default:
                return '📍';
        }
    };

    const handleDriverClick = (driver: DriverLocation) => {
        setSelectedDriver(driver);
        onDriverClick?.(driver);
        if (selectedDriver?.chauffeurId === driver.chauffeurId) {
            setSelectedDriver(null);
        }
    };

    return (
        <div className="relative" style={{ height }}>
            <Map
                {...viewport}
                onMove={evt => setViewport(evt.viewState)}
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
            >
                <NavigationControl position="top-right" />

                {/* Marqueur dernière position connue (statuts terminaux) */}
                {lastKnownPosition && (
                    <Marker
                        longitude={lastKnownPosition.longitude}
                        latitude={lastKnownPosition.latitude}
                        anchor="bottom"
                    >
                        <div className="relative">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white bg-gray-400">
                                <span className="text-xl">📍</span>
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-700 text-white text-xs rounded px-2 py-0.5 whitespace-nowrap">
                                Dernière position connue
                            </div>
                        </div>
                    </Marker>
                )}

                {/* Markers pour chaque chauffeur */}
                {drivers.map((driver) => {
                    const isSelected = selectedDriver?.chauffeurId === driver.chauffeurId;

                    return (
                        <Marker
                            key={driver.chauffeurId}
                            longitude={driver.longitude}
                            latitude={driver.latitude}
                            anchor="bottom"
                        >
                            <div
                                onClick={() => handleDriverClick(driver)}
                                className={`cursor-pointer transition-transform ${
                                    isSelected ? 'scale-125' : 'hover:scale-110'
                                }`}
                            >
                                {/* Pin du marqueur */}
                                <div className="relative">
                                    <div
                                        className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white"
                                        style={{ backgroundColor: getDriverStatusColor(driver.statutLivraison) }}
                                    >
                                        <span className="text-xl">{getDriverIcon(driver.statutLivraison)}</span>
                                    </div>

                                    {/* Popup d'informations */}
                                    {isSelected && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-xl p-3 min-w-[250px] max-w-[300px] z-50">
                                            <div className="text-xs font-semibold text-gray-900 mb-2">
                                                {driver.chauffeurName}
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

                                            {/* ✅ ETA Display */}
                                            {driver.clientAddress && (
                                                <div className="mb-2 pb-2 border-b border-gray-200">
                                                    <ETADisplay
                                                        fromLat={driver.latitude}
                                                        fromLng={driver.longitude}
                                                        toAddress={driver.clientAddress}
                                                        compact={true}
                                                    />
                                                </div>
                                            )}

                                            <div className="text-xs text-gray-500">
                                                Mis à jour à {new Date(driver.lastUpdate).toLocaleTimeString('fr-FR')}
                                            </div>
                                            {driver.commandeId && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                    Commande active
                                                </div>
                                            )}
                                            {/* Triangle pointer */}
                                            <div
                                                className="absolute top-full left-1/2 transform -translate-x-1/2"
                                                style={{
                                                    width: 0,
                                                    height: 0,
                                                    borderLeft: '6px solid transparent',
                                                    borderRight: '6px solid transparent',
                                                    borderTop: '6px solid white'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Marker>
                    );
                })}
            </Map>

            {/* Légende - Statuts de livraison */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
                <div className="text-xs font-semibold text-gray-700 mb-2">Légende</div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#93c5fd' }} />
                        <span>En attente</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#a5b4fc' }} />
                        <span>Confirmée</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#d8b4fe' }} />
                        <span>Enlevée</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#fcd34d' }} />
                        <span>En cours de livraison</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#86efac' }} />
                        <span>Livrée</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#fca5a5' }} />
                        <span>Annulée / Échec</span>
                    </div>
                </div>
            </div>

            {/* Compteur de chauffeurs actifs */}
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 z-10">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🚚</span>
                    <div>
                        <div className="text-sm font-semibold text-gray-900">
                            {drivers.length} chauffeur{drivers.length > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500">en livraison</div>
                    </div>
                </div>
            </div>

            {/* Bouton de partage du suivi */}
            {onShare && (
                <button
                    onClick={onShare}
                    title="Partager le lien de suivi"
                    className="absolute top-4 right-14 bg-white rounded-lg shadow-lg px-3 py-2 z-10 flex items-center gap-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-gray-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.475l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z" />
                    </svg>
                    Partager
                </button>
            )}
        </div>
    );
};
