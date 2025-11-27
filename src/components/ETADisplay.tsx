import React from 'react';
import { useETA } from '../hooks/useETA';

interface ETADisplayProps {
    fromLat: number;
    fromLng: number;
    toAddress: string;
    compact?: boolean; // Mode compact pour affichage dans cartes
}

export const ETADisplay: React.FC<ETADisplayProps> = ({
    fromLat,
    fromLng,
    toAddress,
    compact = false
}) => {
    const { etaData, loading, error } = useETA({
        fromLat,
        fromLng,
        toAddress,
        updateInterval: 60000, // Mettre à jour toutes les minutes
        enabled: !!toAddress,
    });

    if (loading && !etaData) {
        return (
            <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
                <svg className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Calcul ETA...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-red-600`}>
                <svg className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>ETA indisponible</span>
            </div>
        );
    }

    if (!etaData) {
        return null;
    }

    if (compact) {
        // Mode compact pour popup
        return (
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                    <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-blue-700">
                        Arrivée estimée: {etaData.formattedETA}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>{etaData.formattedDistance}</span>
                    <span className="text-gray-400">•</span>
                    <span>{etaData.formattedDuration}</span>
                </div>
            </div>
        );
    }

    // Mode complet pour carte détaillée
    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Estimation d'arrivée
                </h4>
                {loading && (
                    <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div className="text-2xl font-bold text-gray-900">
                            {etaData.formattedETA}
                        </div>
                        <div className="text-xs text-gray-600">
                            Heure d'arrivée prévue
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <div className="text-sm font-semibold text-gray-900">
                                {etaData.formattedDistance}
                            </div>
                            <div className="text-xs text-gray-500">Distance</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <div className="text-sm font-semibold text-gray-900">
                                {etaData.formattedDuration}
                            </div>
                            <div className="text-xs text-gray-500">Durée</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
