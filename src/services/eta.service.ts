/**
 * Service ETA (Estimated Time of Arrival)
 *
 * Utilise Mapbox Directions API pour calculer:
 * - Distance restante
 * - Temps estimé d'arrivée
 * - Prend en compte le trafic en temps réel
 */

interface ETAResult {
    distance: number; // en mètres
    duration: number; // en secondes
    durationInTraffic?: number; // en secondes (avec trafic)
    eta: Date; // Heure d'arrivée estimée
    formattedDistance: string; // "5.2 km"
    formattedDuration: string; // "15 min"
}

interface Coordinates {
    latitude: number;
    longitude: number;
}

class ETAService {
    private readonly MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
    private readonly API_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

    /**
     * Calculer l'ETA depuis la position chauffeur vers l'adresse client
     */
    async calculateETA(
        from: Coordinates,
        to: Coordinates
    ): Promise<ETAResult | null> {
        try {
            // Construire l'URL de l'API Mapbox Directions
            const url = `${this.API_URL}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;

            const params = new URLSearchParams({
                access_token: this.MAPBOX_TOKEN,
                geometries: 'geojson',
                overview: 'full',
                steps: 'false',
                // Utiliser annotations pour obtenir le temps avec trafic
                annotations: 'duration,distance',
            });

            const response = await fetch(`${url}?${params.toString()}`);

            if (!response.ok) {
                console.error('[ETAService] ❌ Mapbox API error:', response.status);
                return null;
            }

            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
                console.warn('[ETAService] ⚠️ No routes found');
                return null;
            }

            const route = data.routes[0];
            const distance = route.distance; // mètres
            const duration = route.duration; // secondes

            // Calculer l'heure d'arrivée estimée
            const eta = new Date(Date.now() + duration * 1000);

            // Formater les valeurs
            const formattedDistance = this.formatDistance(distance);
            const formattedDuration = this.formatDuration(duration);

            return {
                distance,
                duration,
                eta,
                formattedDistance,
                formattedDuration,
            };
        } catch (error) {
            console.error('[ETAService] ❌ Error calculating ETA:', error);
            return null;
        }
    }

    /**
     * Formater la distance
     */
    private formatDistance(meters: number): string {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }
        return `${(meters / 1000).toFixed(1)} km`;
    }

    /**
     * Formater la durée
     */
    private formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);

        if (minutes < 60) {
            return `${minutes} min`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (remainingMinutes === 0) {
            return `${hours}h`;
        }

        return `${hours}h${remainingMinutes}`;
    }

    /**
     * Formater l'heure d'arrivée
     */
    formatETA(eta: Date): string {
        return eta.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    /**
     * Obtenir les coordonnées d'une adresse (géocodage)
     */
    async geocodeAddress(address: string): Promise<Coordinates | null> {
        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;

            const params = new URLSearchParams({
                access_token: this.MAPBOX_TOKEN,
                limit: '1',
                country: 'FR', // Limiter à la France
            });

            const response = await fetch(`${url}?${params.toString()}`);

            if (!response.ok) {
                console.error('[ETAService] ❌ Geocoding error:', response.status);
                return null;
            }

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                console.warn('[ETAService] ⚠️ Address not found:', address);
                return null;
            }

            const [longitude, latitude] = data.features[0].center;

            return { latitude, longitude };
        } catch (error) {
            console.error('[ETAService] ❌ Error geocoding address:', error);
            return null;
        }
    }
}

// Export singleton
export const etaService = new ETAService();
