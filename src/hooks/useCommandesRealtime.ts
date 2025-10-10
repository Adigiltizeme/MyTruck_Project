import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import io, { Socket } from 'socket.io-client';

interface UseCommandesRealtimeProps {
  onCommandeUpdated?: (data: any) => void;
  onCommandeStatusChanged?: (data: any) => void;
  onCommandeChauffeurAssigned?: (data: any) => void;
  autoConnect?: boolean;
}

/**
 * Hook pour gérer les mises à jour temps réel des commandes via WebSocket
 *
 * Événements supportés:
 * - commande-updated: Mise à jour générale d'une commande
 * - commande-status-changed: Changement de statut (commande ou livraison)
 * - commande-chauffeurs-assigned: Assignation/réassignation de chauffeurs
 */
export const useCommandesRealtime = ({
  onCommandeUpdated,
  onCommandeStatusChanged,
  onCommandeChauffeurAssigned,
  autoConnect = true
}: UseCommandesRealtimeProps = {}) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);

  const connectWebSocket = useCallback(() => {
    console.log('🔌 [CommandesRealtime] Connecting WebSocket...', {
      hasUser: !!user?.id,
      isConnected: socketRef.current?.connected,
      isConnecting: isConnectingRef.current
    });

    // Éviter connexions multiples
    if (!user?.id || socketRef.current?.connected || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    const token = localStorage.getItem('authToken') || user.token;
    if (!token) {
      console.warn('❌ [CommandesRealtime] No auth token, skipping WebSocket connection');
      isConnectingRef.current = false;
      return;
    }

    // Détection environnement (production vs développement)
    const isProduction = import.meta.env.NODE_ENV === 'production' ||
                          window.location.hostname.includes('vercel.app') ||
                          window.location.hostname.includes('mytrucktransport');

    const defaultWsUrl = isProduction
      ? 'https://my-truck-api-production.up.railway.app'
      : 'http://localhost:3000';

    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;

    console.log('🔌 [CommandesRealtime] Connecting to:', wsUrl);

    // Créer connexion WebSocket
    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Événements de connexion
    socket.on('connect', () => {
      console.log('✅ [CommandesRealtime] WebSocket connected:', socket.id);
      isConnectingRef.current = false;

      // Rejoindre la room de l'utilisateur
      socket.emit('join-room', {
        userId: user.id,
        userType: user.role
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [CommandesRealtime] WebSocket disconnected:', reason);
      isConnectingRef.current = false;
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [CommandesRealtime] WebSocket connection error:', error);
      isConnectingRef.current = false;
    });

    // ✅ ÉVÉNEMENTS COMMANDES TEMPS RÉEL
    socket.on('commande-updated', (data) => {
      console.log('📦 [CommandesRealtime] Commande updated:', data);
      onCommandeUpdated?.(data);
    });

    socket.on('commande-status-changed', (data) => {
      console.log('🔄 [CommandesRealtime] Commande status changed:', data);
      onCommandeStatusChanged?.(data);
    });

    socket.on('commande-chauffeurs-assigned', (data) => {
      console.log('🚛 [CommandesRealtime] Chauffeurs assigned:', data);
      onCommandeChauffeurAssigned?.(data);
    });

    socketRef.current = socket;
  }, [user, onCommandeUpdated, onCommandeStatusChanged, onCommandeChauffeurAssigned]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 [CommandesRealtime] Disconnecting WebSocket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectingRef.current = false;
    }
  }, []);

  // Connexion automatique au montage du composant
  useEffect(() => {
    if (autoConnect && user) {
      connectWebSocket();
    }

    return () => {
      disconnect();
    };
  }, [user, autoConnect, connectWebSocket, disconnect]);

  return {
    isConnected: socketRef.current?.connected || false,
    disconnect,
    reconnect: connectWebSocket
  };
};
