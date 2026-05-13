import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api.service';
import io from 'socket.io-client';
import { isAdminRole } from '../utils/role-helpers';
import { useLocation } from 'react-router-dom';

interface UnreadCounts {
  messages: number;
  contacts: number;
  loading: boolean;
}

/**
 * Hook personnalisé pour gérer les compteurs de messages et contacts non lus
 * Se met à jour automatiquement selon le rôle utilisateur
 */
export const useUnreadCounts = () => {
  const { user } = useAuth();
  const location = useLocation();
  const socketRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [counts, setCounts] = useState<UnreadCounts>({
    messages: 0,
    contacts: 0,
    loading: true
  });

  const fetchUnreadCounts = async () => {
    if (!user) {
      setCounts({ messages: 0, contacts: 0, loading: false });
      return;
    }

    // Vérifier que l'utilisateur a un token valide
    const token = localStorage.getItem('authToken') || user.token;
    if (!token) {
      console.warn('🔒 Pas de token disponible pour fetchUnreadCounts', {
        userExists: !!user,
        userId: user?.id,
        userRole: user?.role,
        userToken: !!user?.token,
        localStorageToken: !!localStorage.getItem('authToken')
      });
      setCounts({ messages: 0, contacts: 0, loading: false });
      return;
    }

    // console.log('🔔 fetchUnreadCounts démarré pour', {
    //   userId: user.id,
    //   role: user.role,
    //   hasToken: !!token
    // });

    try {
      setCounts(prev => ({ ...prev, loading: true }));

      // Compteur messages non lus (tous les rôles)
      let unreadMessages = 0;
      try {
        const conversations = await apiService.get('/messaging/conversations');
        const conversationsArray = Array.isArray(conversations)
          ? conversations
          : (conversations as { data?: any[] })?.data || [];

        unreadMessages = conversationsArray.reduce((total, conv) => {
          return total + (conv._count?.messages || 0);
        }, 0);
      } catch (error) {
        console.warn('📨 Erreur chargement messages non lus:', error);
      }

      // Compteur contacts non lus (uniquement pour les admins)
      let unreadContacts = 0;
      if (isAdminRole(user?.role)) {
        try {
          const contactsResponse = await apiService.get('/contacts') as { data?: any[] };
          const contacts = contactsResponse?.data || [];

          // Les admins voient tous les contacts NOUVEAU
          unreadContacts = contacts.filter(contact => contact.statut === 'NOUVEAU').length;
        } catch (error) {
          console.warn('📋 Erreur chargement contacts non lus (admin):', error);
        }
      }
      // Note: Les magasins n'ont pas accès à l'endpoint /contacts
      // Leurs notifications de contact seront gérées différemment

      setCounts({
        messages: unreadMessages,
        contacts: unreadContacts,
        loading: false
      });

    } catch (error) {
      console.error('❌ Erreur chargement compteurs non lus:', error);
      setCounts({ messages: 0, contacts: 0, loading: false });
    }
  };

  // Version robuste - Attendre que l'AuthContext soit stable
  useEffect(() => {
    if (!user?.id || !user?.token) {
      setIsReady(false);
      setCounts({ messages: 0, contacts: 0, loading: false });
      return;
    }

    // Attendre un délai pour s'assurer que l'API service est synchronisé
    const checkAuthState = async () => {
      try {
        // Test simple pour vérifier que l'authentification fonctionne
        const testResponse = await apiService.get('/auth/me');
        if (testResponse) {
          // console.log('🔔 useUnreadCounts: Authentification vérifiée, activation du hook');
          setIsReady(true);
        }
      } catch (error) {
        // console.log('🔔 useUnreadCounts: Authentification pas encore prête, attente...');
        setIsReady(false);
        setCounts({ messages: 0, contacts: 0, loading: false });
      }
    };

    // Délai pour laisser l'AuthContext se stabiliser
    const timer = setTimeout(checkAuthState, 2000);
    return () => clearTimeout(timer);
  }, [user?.id, user?.role, user?.token]);

  // Charger les compteurs quand l'utilisateur est prêt
  useEffect(() => {
    if (!isReady) return;

    // console.log('🔔 useUnreadCounts: Démarrage fetchUnreadCounts...');
    const timer = setTimeout(() => {
      fetchUnreadCounts();
    }, 500); // Délai de sécurité

    return () => clearTimeout(timer);
  }, [isReady]);

  // Actualiser les compteurs périodiquement (toutes les 30 secondes)
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      // Vérifier que l'utilisateur est toujours connecté et prêt
      if (isReady && user?.id && localStorage.getItem('authToken')) {
        // console.log('🔔 useUnreadCounts: Actualisation périodique...');
        fetchUnreadCounts();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isReady, user?.id]);

  // Rafraîchir immédiatement les compteurs lors du changement de route
  // Ceci permet de mettre à jour les badges dès qu'on consulte une page (messagerie/contacts)
  useEffect(() => {
    if (!isReady || !user?.id) return;

    // Délai court pour laisser la page se charger et marquer les messages comme lus
    const timer = setTimeout(() => {
      // console.log('🔔 useUnreadCounts: Rafraîchissement suite au changement de route ->', location.pathname);
      fetchUnreadCounts();
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname, isReady]);

  // DÉSACTIVÉ - Initialiser et nettoyer WebSocket
  useEffect(() => {
    // Désactivé pour éviter les erreurs WebSocket
    return;

    // Code original commenté :
    /*
    if (user) {
      initializeSocket();
    }

    // Nettoyage lors du démontage du composant ou changement d'utilisateur
    return () => {
      cleanupSocket();
    };
    */
  }, [user?.id, user?.token]);

  // Fonction pour forcer un rechargement (appelée après lecture de messages)
  const refreshCounts = () => {
    // Vérifier que l'utilisateur est connecté et prêt
    if (isReady && user?.id && localStorage.getItem('authToken')) {
      // console.log('🔔 useUnreadCounts: Actualisation forcée...');
      fetchUnreadCounts();
    } else {
      // console.log('🔔 useUnreadCounts: refreshCounts ignoré - pas prêt');
    }
  };

  // Initialiser la connexion WebSocket pour les mises à jour temps réel
  const initializeSocket = () => {
    if (!user || socketRef.current) return;

    const token = localStorage.getItem('authToken') || user.token;
    if (!token) return;

    try {
      // Configuration WebSocket identique à useMessaging
      const isProduction = import.meta.env.PROD ||
                          window.location.hostname !== 'localhost';

      const defaultWsUrl = isProduction
        ? 'https://mytruckprojectbackend-production.up.railway.app'
        : 'http://localhost:3000';

      const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
      console.log('🔔 WebSocket notifications config:', {
        VITE_WS_URL: import.meta.env.VITE_WS_URL,
        NODE_ENV: import.meta.env.NODE_ENV,
        MODE: import.meta.env.MODE,
        hostname: window.location.hostname,
        isProduction,
        resolvedUrl: wsUrl
      });

      // Configuration spéciale pour Railway
      const isRailway = wsUrl.includes('railway.app');

      const socket = io(wsUrl, {
        auth: {
          token: token
        },
        // Sur Railway, commencer par polling puis passer à websocket si possible
        transports: isRailway ? ['polling', 'websocket'] : ['websocket', 'polling'],
        forceNew: true,
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socketRef.current = socket;

      // Écouter les événements de nouveaux messages
      socket.on('new-message', (data: any) => {
        console.log('📨 Nouveau message reçu via WebSocket:', data);
        // Actualiser les compteurs en temps réel
        refreshCounts();
      });

      // Écouter les événements de nouveaux contacts (pour admins seulement)
      socket.on('new-contact', (data: any) => {
        console.log('📋 Nouveau contact reçu via WebSocket:', data);
        if (isAdminRole(user?.role)) {
          // Actualiser les compteurs en temps réel
          refreshCounts();
        }
      });

      // Écouter les événements de lecture de messages
      socket.on('messages-read', (data: any) => {
        console.log('👁️ Messages marqués comme lus via WebSocket:', data);
        // Actualiser les compteurs en temps réel
        refreshCounts();
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket notifications connecté');
      });

      socket.on('disconnect', (reason: string) => {
        console.log('❌ WebSocket notifications déconnecté:', reason);
      });

      socket.on('connect_error', (error: any) => {
        console.warn('⚠️ Erreur connexion WebSocket notifications:', error.message || error);
        // Ne pas essayer de reconnecter en boucle en mode développement si le serveur n'est pas démarré
        const isDev = window.location.hostname === 'localhost';
        if (error.message?.includes('ECONNREFUSED') && isDev) {
          console.log('🔄 Serveur WebSocket probablement non démarré en mode dev');
        }
      });

      socket.on('reconnect', (attemptNumber: number) => {
        console.log('🔄 WebSocket notifications reconnecté après', attemptNumber, 'tentative(s)');
        // Actualiser les compteurs après reconnexion
        refreshCounts();
      });

      socket.on('reconnect_error', (error: any) => {
        console.warn('❌ Erreur reconnexion WebSocket notifications:', error.message || error);
      });

    } catch (error) {
      console.error('❌ Erreur initialisation WebSocket notifications:', error);
    }
  };

  // Nettoyer la connexion WebSocket
  const cleanupSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log('🧹 WebSocket notifications nettoyé');
    }
  };

  return {
    ...counts,
    refreshCounts
  };
};