import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Même pattern que contact.service.ts / simple-backend.service.ts (VITE_API_URL inclut déjà /api/v1)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface PublicTrackingData {
    numeroCommande: string;
    creneau: string | null;
    dateLivraison: string | null;
    statutLivraison: string;
    chauffeurPrenom: string | null;
    lastPosition: { latitude: number; longitude: number; timestamp: string } | null;
    isTerminal: boolean;
    adresseLivraison: string | null;
}

export interface LivePosition {
    latitude: number;
    longitude: number;
    chauffeurPrenom: string | null;
    timestamp: string;
}

interface UsePublicTrackingResult {
    data: PublicTrackingData | null;
    livePosition: LivePosition | null;
    isEnded: boolean;
    loading: boolean;
    error: string | null;
}

export function usePublicTracking(token: string | undefined): UsePublicTrackingResult {
    const [data, setData] = useState<PublicTrackingData | null>(null);
    const [livePosition, setLivePosition] = useState<LivePosition | null>(null);
    const [isEnded, setIsEnded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const fetchInitialData = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/tracking/public/${token}`);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || 'Lien de suivi invalide ou expiré');
            }
            const json: PublicTrackingData = await res.json();
            setData(json);
            if (json.isTerminal) setIsEnded(true);
            // Position initiale depuis les événements stockés
            if (json.lastPosition) {
                setLivePosition({
                    latitude: json.lastPosition.latitude,
                    longitude: json.lastPosition.longitude,
                    chauffeurPrenom: json.chauffeurPrenom,
                    timestamp: json.lastPosition.timestamp,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            setError('Token manquant');
            return;
        }

        fetchInitialData();

        // Connexion WebSocket publique (sans JWT, avec trackingToken)
        const socket = io(WS_URL, {
            auth: { trackingToken: token },
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-tracking-room', { token });
        });

        socket.on('tracking-joined', (payload: { statutLivraison: string }) => {
            setData(prev => prev ? { ...prev, statutLivraison: payload.statutLivraison } : prev);
        });

        socket.on('tracking-location', (payload: LivePosition) => {
            setLivePosition(payload);
        });

        socket.on('tracking-ended', () => {
            setIsEnded(true);
            // Rafraîchir les données finales
            fetchInitialData();
        });

        socket.on('tracking-error', (payload: { message: string }) => {
            setError(payload.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token, fetchInitialData]);

    return { data, livePosition, isEnded, loading, error };
}
