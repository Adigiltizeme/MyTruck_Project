import { useState, useEffect, useRef } from 'react';
import { etaService } from '../services/eta.service';

interface ETAData {
    distance: number;
    duration: number;
    eta: Date;
    formattedDistance: string;
    formattedDuration: string;
    formattedETA: string;
}

interface UseETAOptions {
    fromLat: number;
    fromLng: number;
    toLat?: number;
    toLng?: number;
    toAddress?: string;
    updateInterval?: number; // Mise à jour toutes les X ms (défaut: 60000 = 1 min)
    enabled?: boolean; // Activer/désactiver le calcul
}

export const useETA = (options: UseETAOptions) => {
    const {
        fromLat,
        fromLng,
        toLat,
        toLng,
        toAddress,
        updateInterval = 60000, // 1 minute par défaut
        enabled = true,
    } = options;

    const [etaData, setETAData] = useState<ETAData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) {
            console.log('[useETA] ⏸️ ETA calculation disabled');
            return;
        }

        const calculateETA = async () => {
            try {
                setLoading(true);
                setError(null);

                // Déterminer les coordonnées de destination
                let destLat = toLat;
                let destLng = toLng;

                // Si pas de coordonnées mais une adresse, géocoder
                if ((!destLat || !destLng) && toAddress) {
                    console.log('[useETA] 📍 Geocoding address:', toAddress);
                    const coords = await etaService.geocodeAddress(toAddress);

                    if (!coords) {
                        setError('Impossible de localiser l\'adresse de destination');
                        setLoading(false);
                        return;
                    }

                    destLat = coords.latitude;
                    destLng = coords.longitude;
                }

                if (!destLat || !destLng) {
                    setError('Coordonnées de destination manquantes');
                    setLoading(false);
                    return;
                }

                // Calculer l'ETA
                console.log('[useETA] 🚗 Calculating ETA from', { fromLat, fromLng }, 'to', { destLat, destLng });

                const result = await etaService.calculateETA(
                    { latitude: fromLat, longitude: fromLng },
                    { latitude: destLat, longitude: destLng }
                );

                if (!result) {
                    setError('Impossible de calculer l\'ETA');
                    setLoading(false);
                    return;
                }

                setETAData({
                    ...result,
                    formattedETA: etaService.formatETA(result.eta),
                });

                setLoading(false);
                console.log('[useETA] ✅ ETA calculated:', result);
            } catch (err) {
                console.error('[useETA] ❌ Error:', err);
                setError('Erreur lors du calcul de l\'ETA');
                setLoading(false);
            }
        };

        // Calculer immédiatement
        calculateETA();

        // Mettre à jour périodiquement
        intervalRef.current = setInterval(calculateETA, updateInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fromLat, fromLng, toLat, toLng, toAddress, updateInterval, enabled]);

    return {
        etaData,
        loading,
        error,
    };
};
