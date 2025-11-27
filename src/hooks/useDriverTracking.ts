import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

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

interface UseDriverTrackingReturn {
    drivers: DriverLocation[];
    isConnected: boolean;
    error: string | null;
    sendLocation: (chauffeurId: string, latitude: number, longitude: number) => void;
}

export const useDriverTracking = (token: string | null): UseDriverTrackingReturn => {
    const [drivers, setDrivers] = useState<DriverLocation[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<ReturnType<typeof io> | null>(null);

    useEffect(() => {
        if (!token) {
            console.warn('[useDriverTracking] No token provided, skipping WebSocket connection');
            return;
        }

        // Créer la connexion WebSocket (utiliser VITE_WS_URL, pas VITE_API_URL qui contient /api/v1)
        const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const socket = io(wsUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        // Événements de connexion
        socket.on('connect', () => {
            console.log('[useDriverTracking] WebSocket connected');
            setIsConnected(true);
            setError(null);

            // S'abonner aux mises à jour de localisation des chauffeurs
            socket.emit('join-room', { userId: 'admin', userType: 'admin' });
        });

        socket.on('disconnect', () => {
            console.log('[useDriverTracking] WebSocket disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('[useDriverTracking] Connection error:', err.message);
            setError(`Erreur de connexion: ${err.message}`);
            setIsConnected(false);
        });

        // Écouter les mises à jour de position des chauffeurs
        socket.on('chauffeur-location', (data: {
            chauffeurId: string;
            latitude: number;
            longitude: number;
            chauffeurName?: string;
            commandeId?: string;
            statutLivraison?: string;
            clientAddress?: string; // ✅ Adresse client pour ETA
        }) => {
            console.log('[useDriverTracking] Location update received:', data);

            setDrivers((prevDrivers) => {
                const existingIndex = prevDrivers.findIndex(d => d.chauffeurId === data.chauffeurId);

                const updatedDriver: DriverLocation = {
                    chauffeurId: data.chauffeurId,
                    chauffeurName: data.chauffeurName || `Chauffeur ${data.chauffeurId.slice(0, 8)}`,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    lastUpdate: new Date(),
                    commandeId: data.commandeId,
                    statutLivraison: data.statutLivraison,
                    clientAddress: data.clientAddress, // ✅ Inclure l'adresse client
                };

                if (existingIndex >= 0) {
                    // Mettre à jour le chauffeur existant
                    const newDrivers = [...prevDrivers];
                    newDrivers[existingIndex] = updatedDriver;
                    return newDrivers;
                } else {
                    // Ajouter un nouveau chauffeur
                    return [...prevDrivers, updatedDriver];
                }
            });
        });

        // Nettoyer les chauffeurs inactifs (pas de mise à jour depuis 5 minutes)
        const cleanupInterval = setInterval(() => {
            setDrivers((prevDrivers) => {
                const now = new Date();
                return prevDrivers.filter((driver) => {
                    const timeSinceUpdate = now.getTime() - driver.lastUpdate.getTime();
                    return timeSinceUpdate < 5 * 60 * 1000; // 5 minutes
                });
            });
        }, 60000); // Vérifier toutes les minutes

        // Cleanup
        return () => {
            clearInterval(cleanupInterval);
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('connect_error');
                socket.off('chauffeur-location');
                socket.disconnect();
            }
        };
    }, [token]);

    // Fonction pour envoyer la position (pour les chauffeurs)
    const sendLocation = useCallback((chauffeurId: string, latitude: number, longitude: number) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('location-update', {
                chauffeurId,
                latitude,
                longitude,
            });
            console.log(`[useDriverTracking] Location sent: ${latitude}, ${longitude}`);
        } else {
            console.warn('[useDriverTracking] Cannot send location: socket not connected');
        }
    }, [isConnected]);

    return {
        drivers,
        isConnected,
        error,
        sendLocation,
    };
};

// Hook pour le tracking automatique (pour les chauffeurs en livraison)
export const useAutoTracking = (
    chauffeurId: string,
    isActive: boolean,
    token: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _updateInterval: number = 30000, // 30 secondes par défaut (non utilisé - watchPosition gère automatiquement)
    chauffeurName?: string,
    commandeId?: string,
    statutLivraison?: string
) => {
    const [lastPosition, setLastPosition] = useState<{ latitude: number; longitude: number } | null>(null);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const socketRef = useRef<ReturnType<typeof io> | null>(null);

    useEffect(() => {
        // ✅ Ne pas initialiser si pas de token OU pas de chauffeurId
        if (!token || !chauffeurId) {
            console.log('[useAutoTracking] 🚫 No token or chauffeurId - skipping WebSocket init');
            return;
        }

        // Créer connexion WebSocket séparée pour le chauffeur (utiliser VITE_WS_URL)
        const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        console.log('[useAutoTracking] 🔌 Initializing WebSocket to:', wsUrl);

        const socket = io(wsUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[useAutoTracking] ✅ WebSocket connected! Socket ID:', socket.id);
            setIsConnected(true);
        });

        socket.on('disconnect', (reason: string) => {
            console.log('[useAutoTracking] ❌ WebSocket disconnected. Reason:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('[useAutoTracking] 🔴 Connection error:', err.message, err);
            setIsConnected(false);
        });

        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('connect_error');
                socket.disconnect();
            }
        };
    }, [token, chauffeurId]);

    useEffect(() => {
        console.log('[useAutoTracking] Effect triggered:', {
            isActive,
            chauffeurId,
            hasToken: !!token,
            isConnected,
            chauffeurName,
            commandeId,
            statutLivraison
        });

        if (!isActive || !chauffeurId || !token) {
            console.log('[useAutoTracking] ❌ Conditions not met - tracking disabled');
            setIsTracking(false);
            return;
        }

        // Vérifier si la géolocalisation est disponible
        if (!navigator.geolocation) {
            console.error('[useAutoTracking] ❌ Geolocation not supported');
            setTrackingError('La géolocalisation n\'est pas supportée par votre navigateur');
            return;
        }

        console.log('[useAutoTracking] ✅ Starting GPS tracking...');
        setIsTracking(true);

        // Démarrer le tracking GPS
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLastPosition({ latitude, longitude });
                setTrackingError(null);

                // Envoyer la position au serveur via WebSocket avec toutes les infos
                if (socketRef.current && isConnected) {
                    socketRef.current.emit('location-update', {
                        chauffeurId,
                        chauffeurName,
                        latitude,
                        longitude,
                        commandeId,
                        statutLivraison,
                    });
                    console.log(`[useAutoTracking] ✅ Location sent: ${latitude}, ${longitude} (commande: ${commandeId})`);
                } else {
                    console.warn(`[useAutoTracking] ⚠️ GPS position obtained but NOT sent - socket: ${!!socketRef.current}, connected: ${isConnected}`);
                }
            },
            (error) => {
                console.error('[useAutoTracking] Geolocation error:', error);
                setTrackingError(`Erreur GPS: ${error.message}`);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        // Cleanup
        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
            setIsTracking(false);
        };
    }, [isActive, chauffeurId, token, isConnected, chauffeurName, commandeId, statutLivraison]);

    return {
        lastPosition,
        trackingError,
        isConnected,
        isTracking,
    };
};
