import React from 'react';
import { useParams } from 'react-router-dom';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { usePublicTracking } from '../hooks/usePublicTracking';
import { ETADisplay } from '../components/ETADisplay';

const STATUT_LABELS: Record<string, string> = {
    'EN ATTENTE': 'En attente',
    'EN_ATTENTE': 'En attente',
    'EN COURS DE LIVRAISON': 'En cours de livraison',
    'EN_COURS_DE_LIVRAISON': 'En cours de livraison',
    'LIVREE': 'Livrée ✅',
    'ANNULEE': 'Annulée',
    'ECHEC': 'Échec de livraison',
};

const STATUT_COLORS: Record<string, string> = {
    'EN ATTENTE': 'bg-yellow-100 text-yellow-800',
    'EN_ATTENTE': 'bg-yellow-100 text-yellow-800',
    'EN COURS DE LIVRAISON': 'bg-blue-100 text-blue-800',
    'EN_COURS_DE_LIVRAISON': 'bg-blue-100 text-blue-800',
    'LIVREE': 'bg-green-100 text-green-800',
    'ANNULEE': 'bg-gray-100 text-gray-800',
    'ECHEC': 'bg-red-100 text-red-800',
};

const PublicTrackingPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const { data, livePosition, isEnded, loading, error } = usePublicTracking(token);

    // Position active : position temps réel en priorité, puis dernière position connue
    const position = livePosition ?? (data?.lastPosition
        ? { ...data.lastPosition, chauffeurPrenom: data.chauffeurPrenom }
        : null);

    const hasPosition = !!position;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Chargement du suivi...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="text-5xl mb-4">🔗</div>
                    <h1 className="text-xl font-semibold text-gray-800 mb-2">Lien de suivi invalide</h1>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const statutLabel = STATUT_LABELS[data.statutLivraison] || data.statutLivraison;
    const statutColor = STATUT_COLORS[data.statutLivraison] || 'bg-gray-100 text-gray-800';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* En-tête */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
                    <span className="text-2xl">🚚</span>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Suivi de livraison</h1>
                        <p className="text-sm text-gray-500">Commande {data.numeroCommande}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                {/* Infos livraison */}
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">Statut</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statutColor}`}>
                            {statutLabel}
                        </span>
                    </div>
                    {data.creneau && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 font-medium">Créneau</span>
                            <span className="text-sm text-gray-800">{data.creneau}</span>
                        </div>
                    )}
                    {data.chauffeurPrenom && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 font-medium">Chauffeur</span>
                            <span className="text-sm text-gray-800">{data.chauffeurPrenom}</span>
                        </div>
                    )}
                </div>

                {/* Carte Mapbox */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b flex items-center gap-2">
                        <span className="text-base">📍</span>
                        <span className="text-sm font-medium text-gray-700">
                            {hasPosition
                                ? (isEnded ? 'Dernière position connue' : 'Position en temps réel')
                                : 'En attente de localisation...'}
                        </span>
                        {!isEnded && hasPosition && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                En direct
                            </span>
                        )}
                    </div>

                    <div className="h-72 w-full">
                        <Map
                            mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                            initialViewState={{
                                longitude: position?.longitude ?? 2.3488,
                                latitude: position?.latitude ?? 48.8534,
                                zoom: hasPosition ? 13 : 10,
                            }}
                            style={{ width: '100%', height: '100%' }}
                            mapStyle="mapbox://styles/mapbox/streets-v12"
                        >
                            <NavigationControl position="top-right" />

                            {position && (
                                <Marker
                                    longitude={position.longitude}
                                    latitude={position.latitude}
                                    anchor="bottom"
                                >
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-lg text-xl ${isEnded ? 'bg-gray-400' : 'bg-blue-600'}`}>
                                        {isEnded ? '📍' : '🚚'}
                                    </div>
                                </Marker>
                            )}
                        </Map>
                    </div>

                    {!hasPosition && (
                        <div className="px-4 py-2 text-center text-xs text-gray-400 border-t">
                            La position GPS sera affichée dès que le chauffeur démarre la livraison
                        </div>
                    )}
                </div>

                {/* ETA — uniquement si position disponible, livraison en cours et adresse connue */}
                {hasPosition && !isEnded && data.adresseLivraison && (
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <ETADisplay
                            fromLat={position!.latitude}
                            fromLng={position!.longitude}
                            toAddress={data.adresseLivraison}
                        />
                    </div>
                )}

                {/* Adresse de livraison */}
                {data.adresseLivraison && (
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-base mt-0.5">
                                📍
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">Adresse de livraison</p>
                                <p className="text-sm text-gray-800">{data.adresseLivraison}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Livraison terminée */}
                {isEnded && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">
                            {data.statutLivraison === 'LIVREE' ? '✅' : '📦'}
                        </div>
                        <p className="text-green-800 font-medium">
                            {data.statutLivraison === 'LIVREE'
                                ? 'Votre livraison a été effectuée avec succès !'
                                : 'Cette livraison est terminée.'}
                        </p>
                        <p className="text-green-600 text-sm mt-1">
                            Ce lien de suivi restera actif encore 30 minutes.
                        </p>
                    </div>
                )}

                <p className="text-center text-xs text-gray-400 pb-4">Propulsé par My Truck</p>
            </main>
        </div>
    );
};

export default PublicTrackingPage;
