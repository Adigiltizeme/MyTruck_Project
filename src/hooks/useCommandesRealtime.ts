import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

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
  console.log('🎯 [useCommandesRealtime] Hook initialized', { autoConnect });

  const { user } = useAuth();
  const socketRef = useRef<any>(null);
  const isConnectingRef = useRef(false);

  // ✅ Stocker les callbacks dans des refs pour éviter reconnexions inutiles
  const onCommandeUpdatedRef = useRef(onCommandeUpdated);
  const onCommandeStatusChangedRef = useRef(onCommandeStatusChanged);
  const onCommandeChauffeurAssignedRef = useRef(onCommandeChauffeurAssigned);

  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onCommandeUpdatedRef.current = onCommandeUpdated;
    onCommandeStatusChangedRef.current = onCommandeStatusChanged;
    onCommandeChauffeurAssignedRef.current = onCommandeChauffeurAssigned;
  }, [onCommandeUpdated, onCommandeStatusChanged, onCommandeChauffeurAssigned]);

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
    const isProduction = import.meta.env.PROD ||
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
      transports: ['polling', 'websocket'], // polling en premier : compatible Railway proxy, upgrade auto vers WS
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
      onCommandeUpdatedRef.current?.(data);
    });

    socket.on('commande-status-changed', (data) => {
      console.log('🔄 [CommandesRealtime] Commande status changed:', data);
      onCommandeStatusChangedRef.current?.(data);
    });

    socket.on('commande-chauffeurs-assigned', (data) => {
      console.log('🚛 [CommandesRealtime] Chauffeurs assigned:', data);
      onCommandeChauffeurAssignedRef.current?.(data);
    });

    socketRef.current = socket;
  }, [user]); // ✅ Plus besoin des callbacks en dépendances

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, autoConnect]); // ✅ Optimisation: seulement user.id et autoConnect

  return {
    isConnected: socketRef.current?.connected || false,
    disconnect,
    reconnect: connectWebSocket
  };
};
