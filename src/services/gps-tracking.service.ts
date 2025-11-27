import io, { Socket } from 'socket.io-client';

/**
 * Service GPS Singleton Global
 *
 * ✅ Persiste même quand le chauffeur change de page/onglet
 * ✅ Une seule instance WebSocket active
 * ✅ Démarre automatiquement quand le chauffeur est en livraison
 * ✅ S'arrête uniquement quand la livraison est terminée
 */

interface GPSTrackingConfig {
    chauffeurId: string;
    chauffeurName: string;
    commandeId: string;
    statutLivraison: string;
    token: string;
}

class GPSTrackingService {
    private static instance: GPSTrackingService;
    private socket: Socket | null = null;
    private watchId: number | null = null;
    private isActive: boolean = false;
    private config: GPSTrackingConfig | null = null;
    private isConnected: boolean = false;

    private constructor() {
        // Singleton - constructeur privé
        console.log('[GPSTrackingService] 🏗️ Service GPS créé (singleton)');
    }

    static getInstance(): GPSTrackingService {
        if (!GPSTrackingService.instance) {
            GPSTrackingService.instance = new GPSTrackingService();
        }
        return GPSTrackingService.instance;
    }

    /**
     * Démarrer le tracking GPS
     */
    start(config: GPSTrackingConfig): void {
        console.log('[GPSTrackingService] 🚀 Starting GPS tracking...', config);

        // Si déjà actif avec la même config, ne rien faire
        if (this.isActive && this.config?.commandeId === config.commandeId) {
            console.log('[GPSTrackingService] ✅ GPS tracking already active for this commande');
            return;
        }

        // Arrêter le tracking précédent si différent
        if (this.isActive) {
            console.log('[GPSTrackingService] 🔄 Stopping previous tracking...');
            this.stop();
        }

        this.config = config;
        this.isActive = true;

        // Initialiser WebSocket si nécessaire
        this.initializeWebSocket();

        // Démarrer le GPS tracking
        this.startGPSWatch();
    }

    /**
     * Arrêter le tracking GPS
     */
    stop(): void {
        console.log('[GPSTrackingService] ⏹️ Stopping GPS tracking...');

        this.isActive = false;

        // Arrêter le GPS watch
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            console.log('[GPSTrackingService] ✅ GPS watch stopped');
        }

        // Déconnecter WebSocket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            console.log('[GPSTrackingService] ✅ WebSocket disconnected');
        }

        this.config = null;
    }

    /**
     * Vérifier si le tracking est actif
     */
    isTracking(): boolean {
        return this.isActive;
    }

    /**
     * Obtenir la config actuelle
     */
    getConfig(): GPSTrackingConfig | null {
        return this.config;
    }

    /**
     * Initialiser la connexion WebSocket
     */
    private initializeWebSocket(): void {
        if (this.socket && this.isConnected) {
            console.log('[GPSTrackingService] ✅ WebSocket already connected');
            return;
        }

        if (!this.config) {
            console.error('[GPSTrackingService] ❌ No config available');
            return;
        }

        // Déterminer l'URL WebSocket
        const wsUrl = import.meta.env.VITE_WS_URL ||
                      import.meta.env.VITE_BACKEND_URL ||
                      'http://localhost:3000';

        console.log('[GPSTrackingService] 🔌 Connecting to WebSocket:', wsUrl);

        // Créer la connexion Socket.IO
        this.socket = io(wsUrl, {
            auth: {
                token: this.config.token,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        // Event handlers
        this.socket.on('connect', () => {
            console.log('[GPSTrackingService] ✅ WebSocket connected! Socket ID:', this.socket?.id);
            this.isConnected = true;
        });

        this.socket.on('disconnect', (reason: string) => {
            console.log('[GPSTrackingService] ❌ WebSocket disconnected. Reason:', reason);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (err) => {
            console.error('[GPSTrackingService] 🔴 Connection error:', err.message);
            this.isConnected = false;
        });

        this.socket.on('error', (error) => {
            console.error('[GPSTrackingService] ❌ WebSocket error:', error);
        });
    }

    /**
     * Démarrer le GPS watch
     */
    private startGPSWatch(): void {
        if (!navigator.geolocation) {
            console.error('[GPSTrackingService] ❌ Geolocation not supported');
            return;
        }

        if (!this.config) {
            console.error('[GPSTrackingService] ❌ No config available');
            return;
        }

        console.log('[GPSTrackingService] 📍 Starting GPS watch...');

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.sendLocation(latitude, longitude);
            },
            (error) => {
                console.error('[GPSTrackingService] ❌ GPS error:', error.message, error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        console.log('[GPSTrackingService] ✅ GPS watch started');
    }

    /**
     * Envoyer la position au serveur
     */
    private sendLocation(latitude: number, longitude: number): void {
        if (!this.socket || !this.isConnected) {
            console.warn('[GPSTrackingService] ⚠️ Cannot send location - socket not connected');
            return;
        }

        if (!this.config) {
            console.error('[GPSTrackingService] ❌ Cannot send location - no config');
            return;
        }

        const locationData = {
            chauffeurId: this.config.chauffeurId,
            chauffeurName: this.config.chauffeurName,
            latitude,
            longitude,
            commandeId: this.config.commandeId,
            statutLivraison: this.config.statutLivraison,
        };

        this.socket.emit('location-update', locationData);
        console.log(`[GPSTrackingService] 📍 Location sent: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
}

// Export singleton instance
export const gpsTrackingService = GPSTrackingService.getInstance();
