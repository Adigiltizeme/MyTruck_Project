export class MapboxService {
    private apiKey: string;
    private baseUrl: string = 'https://api.mapbox.com/directions/v5/mapbox/driving';
    private distanceCache: Map<string, number> = new Map();

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Calcule la distance entre deux adresses
     * @param originAddress Adresse de départ (magasin)
     * @param destinationAddress Adresse de livraison
     * @returns Distance en kilomètres
     */
    async calculateDistance(originAddress: string, destinationAddress: string): Promise<number> {
        // Créer une clé de cache pour éviter les appels répétés
        const cacheKey = `${originAddress}|${destinationAddress}`;

        // Vérifier si la distance est déjà en cache
        if (this.distanceCache.has(cacheKey)) {
            console.log(`[Mapbox] Utilisation du cache pour ${originAddress} → ${destinationAddress}`);
            return this.distanceCache.get(cacheKey)!;
        }

        try {
            // 1. Convertir les adresses en coordonnées
            const originCoords = await this.geocodeAddress(originAddress);
            const destinationCoords = await this.geocodeAddress(destinationAddress);

            if (!originCoords || !destinationCoords) {
                console.warn('Impossible de géocoder une ou plusieurs adresses, utilisation d\'une distance par défaut');
                return 10; // Valeur par défaut de 10km
            }

            // 2. Calculer l'itinéraire
            const route = await this.getRoute(originCoords, destinationCoords);

            // 3. Convertir la distance en kilomètres (depuis mètres)
            const distance = Math.round((route.distance / 1000) * 10) / 10;

            // Mettre en cache le résultat
            this.distanceCache.set(cacheKey, distance);

            return distance;
        } catch (error) {
            console.error('Erreur lors du calcul de distance:', error);

            // Utiliser une valeur par défaut basée sur le type d'adresses
            let defaultDistance = 10; // Valeur par défaut générale

            // Estimation basée sur le code postal si disponible
            if (originAddress && destinationAddress) {
                // Extraire les codes postaux s'ils existent
                const originPostalCode = this.extractPostalCode(originAddress);
                const destPostalCode = this.extractPostalCode(destinationAddress);

                if (originPostalCode && destPostalCode) {
                    // Estimer la distance basée sur les codes postaux
                    defaultDistance = this.estimateDistanceByPostalCode(originPostalCode, destPostalCode);
                    console.log(`Distance estimée basée sur les codes postaux: ${defaultDistance}km`);
                }
            }

            return defaultDistance;
        }
    }

    private extractPostalCode(address: string): string | null {
        // Rechercher un code postal français (5 chiffres)
        const match = address.match(/\b\d{5}\b/);
        return match ? match[0] : null;
    }

    private estimateDistanceByPostalCode(origin: string, destination: string): number {
        // Estimation simple basée sur les deux premiers chiffres (département)
        const originDept = origin.substring(0, 2);
        const destDept = destination.substring(0, 2);

        if (originDept === destDept) {
            // Même département
            return 15;
        } else if (Math.abs(parseInt(originDept) - parseInt(destDept)) <= 1) {
            // Départements adjacents
            return 30;
        } else {
            // Départements éloignés
            return 45;
        }
    }

    /**
     * Convertit une adresse en coordonnées géographiques
     */
    private async geocodeAddress(address: string): Promise<[number, number] | null> {
        try {
            if (!address || address.trim() === '') {
                console.warn('Adresse vide fournie au géocodage');
                return null;
            }

            const encodedAddress = encodeURIComponent(address);
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${this.apiKey}&country=fr&limit=1`
            );

            if (!response.ok) {
                throw new Error(`Erreur de géocodage: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center;
                return [lng, lat];
            }

            console.warn(`Aucun résultat trouvé pour l'adresse: ${address}`);
            return null;
        } catch (error) {
            console.error(`Erreur de géocodage pour l'adresse ${address}:`, error);
            return null;
        }
    }

    /**
     * Obtient un itinéraire entre deux points
     */
    private async getRoute(
        origin: [number, number],
        destination: [number, number]
    ): Promise<{ distance: number; duration: number }> {
        try {
            const response = await fetch(
                `${this.baseUrl}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${this.apiKey}`
            );

            if (!response.ok) {
                throw new Error(`Erreur d'itinéraire: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                return {
                    distance: data.routes[0].distance, // en mètres
                    duration: data.routes[0].duration // en secondes
                };
            }

            throw new Error('Aucun itinéraire trouvé');
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'itinéraire:', error);
            throw error;
        }
    }
}