import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessagingService, Conversation, Message } from '../services/messaging.service';
import io from 'socket.io-client';
import { isAdminRole } from '../utils/role-helpers';

interface UseMessagingProps {
  conversationId?: string;
  autoConnect?: boolean;
}

interface UseMessagingReturn {
  // État des conversations
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];

  // État de connexion
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Fonctions de gestion des conversations
  selectConversation: (conversation: Conversation) => void;
  loadConversations: () => Promise<void>;
  createConversation: (data: any) => Promise<Conversation | null>;

  // Fonctions de gestion des messages
  sendMessage: (content: string, messageType?: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;

  // État temps réel
  onlineUsers: string[];
  typingUsers: { [conversationId: string]: string[] };

  // Fonctions temps réel
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;

  // Fonctions utilitaires
  refreshMessages: () => Promise<void>;
  disconnect: () => void;
}

export const useMessaging = ({
  conversationId,
  autoConnect = true
}: UseMessagingProps = {}): UseMessagingReturn => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: string[] }>({});

  const socketRef = useRef<any>(null);
  const messagingService = useRef(new MessagingService());

  // Initialisation WebSocket
  useEffect(() => {
    if (autoConnect && user) {
      connectWebSocket();
    }

    return () => {
      disconnect();
    };
  }, [user, autoConnect]);

  // Chargement de la conversation initiale
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  const connectWebSocket = useCallback(() => {
    console.log('🔌 connectWebSocket called:', { hasUserId: !!user?.id, isConnected: socketRef.current?.connected });

    if (!user?.id || socketRef.current?.connected) {
      console.log('⏭️ Skipping WebSocket connection:', { noUser: !user?.id, alreadyConnected: socketRef.current?.connected });
      return;
    }

    const token = localStorage.getItem('authToken') || user.token;
    console.log('🔑 Token check:', { hasToken: !!token, tokenSource: localStorage.getItem('authToken') ? 'localStorage' : 'user.token' });

    if (!token) {
      console.warn('❌ No auth token available, skipping WebSocket connection');
      return;
    }

    // Détection automatique production vs développement
    const isProduction = import.meta.env.PROD ||
                          window.location.hostname.includes('vercel.app') ||
                          window.location.hostname.includes('mytrucktransport');

    const defaultWsUrl = isProduction
      ? 'https://my-truck-api-production.up.railway.app'
      : 'http://localhost:3000';

    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
    console.log('🌐 WebSocket config debug:', {
      VITE_WS_URL: import.meta.env.VITE_WS_URL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
      hostname: window.location.hostname,
      isProduction,
      defaultWsUrl,
      resolvedUrl: wsUrl
    });
    console.log('🌐 Attempting WebSocket connection to:', wsUrl);

    try {
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
        reconnectionDelay: 1000,
        secure: wsUrl.startsWith('https'),
        // Options spécifiques pour Railway
        ...(isRailway && {
          upgrade: true,
          rememberUpgrade: true
        })
      });

      console.log('🔧 WebSocket instance created');

      // Événements de connexion
      socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully!');
        setIsConnected(true);
        setError(null);

        // Rejoindre la room utilisateur
        console.log('🚪 Joining user room:', { userId: user.id, userType: user.role });
        socket.emit('join-room', {
          userId: user.id,
          userType: user.role
        });
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (error: Error) => {
        console.error('❌ WebSocket connection error:', error);
        setError('Erreur de connexion temps réel');
        setIsConnected(false);
      });

      // Événements de messagerie
      socket.on('new-message', (data: { message: Message; timestamp: string }) => {
        console.log('📨 Received new message via WebSocket:', data);
        setMessages(prev => {
          // Éviter les doublons
          const exists = prev.find(msg => msg.id === data.message.id);
          if (exists) {
            console.log('🔄 Message already exists, skipping duplicate:', data.message.id);
            return prev;
          }

          console.log('➕ Adding new message to state:', data.message.id);
          return [...prev, data.message].sort((a, b) =>
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
          );
        });

        // Mettre à jour la dernière activité des conversations
        setConversations(prev =>
          prev.map(conv =>
            conv.id === data.message.conversationId
              ? { ...conv, lastMessageAt: data.timestamp }
              : conv
          )
        );
      });

      // Événement d'erreur pour l'envoi de messages
      socket.on('message-error', (data: { error: string; details?: any }) => {
        console.error('❌ Message send error from server:', data);
        setError(`Erreur d'envoi: ${data.error}`);
      });

      socket.on('new-conversation', (data: { conversation: Conversation; timestamp: string }) => {
        setConversations(prev => {
          const exists = prev.find(conv => conv.id === data.conversation.id);
          if (exists) {
            console.log('🔄 Conversation already exists, skipping duplicate:', data.conversation.id);
            return prev;
          }
          console.log('➕ Adding new conversation from WebSocket:', data.conversation.id);
          return [...prev, data.conversation];
        });
      });

      socket.on('messages-read', (data: { conversationId: string; userId: string; timestamp: string }) => {
        if (data.userId !== user.id) {
          setMessages(prev =>
            prev.map(msg =>
              msg.conversationId === data.conversationId && !msg.readBy.includes(data.userId)
                ? { ...msg, readBy: [...msg.readBy, data.userId], isRead: true }
                : msg
            )
          );
        }
      });

      socket.on('user-typing', (data: { userId: string; userName: string; conversationId: string; isTyping: boolean }) => {
        if (data.userId !== user.id) {
          setTypingUsers(prev => {
            const conversationTyping = prev[data.conversationId] || [];

            if (data.isTyping) {
              if (!conversationTyping.includes(data.userName)) {
                return {
                  ...prev,
                  [data.conversationId]: [...conversationTyping, data.userName]
                };
              }
            } else {
              return {
                ...prev,
                [data.conversationId]: conversationTyping.filter(name => name !== data.userName)
              };
            }

            return prev;
          });
        }
      });

      socket.on('user-joined-conversation', (data: { userId: string; conversationId: string }) => {
        if (!onlineUsers.includes(data.userId)) {
          setOnlineUsers(prev => [...prev, data.userId]);
        }
      });

      socket.on('user-left-conversation', (data: { userId: string; conversationId: string }) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Erreur lors de la connexion WebSocket:', error);
      setError('Impossible de se connecter au service de messagerie temps réel');
    }
  }, [user, onlineUsers]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let result;

      // Utiliser la fonction spécifique selon le rôle
      if (user?.role === 'chauffeur') {
        result = await messagingService.current.getConversationsForChauffeur(user.id);
      } else if (user?.role === 'magasin') {
        result = await messagingService.current.getConversationsForMagasin(user.id);
      } else {
        // Admin/Direction utilise la fonction générale
        result = await messagingService.current.getConversations({ isActive: true });
      }

      if (result.success) {
        setConversations(result.data);
      } else {
        setError('Erreur lors du chargement des conversations');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des conversations:', err);
      setError('Erreur lors du chargement des conversations');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (convId: string) => {
    console.log('🔍 markAsRead called with:', { convId, userId: user?.id, hasUser: !!user });

    if (!user?.id) {
      console.warn('❌ markAsRead: userId is undefined, skipping');
      return;
    }

    try {
      console.log('📡 Calling markConversationAsRead API...');
      await messagingService.current.markConversationAsRead(convId);
      console.log('✅ markConversationAsRead API success');

      // Mettre à jour immédiatement le compteur local pour cette conversation
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === convId
            ? { ...conv, _count: { ...conv._count, messages: 0 } }
            : conv
        )
      );

      // Notifier via WebSocket
      if (socketRef.current?.connected) {
        console.log('🔌 Emitting mark-messages-read via WebSocket:', { conversationId: convId, userId: user.id });
        socketRef.current.emit('mark-messages-read', {
          conversationId: convId,
          userId: user.id
        });
      } else {
        console.warn('❌ WebSocket not connected, skipping mark-messages-read emit');
      }

      // Recharger les conversations pour avoir les données à jour du serveur
      // Délai court pour laisser le serveur traiter
      setTimeout(() => {
        loadConversations();
      }, 300);
    } catch (err) {
      console.error('❌ Erreur lors du marquage comme lu:', err);
    }
  }, [user, loadConversations]);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const result = await messagingService.current.getConversation(convId);

      if (result.success && result.data) {
        setSelectedConversation(result.data);
        setMessages(result.data.messages || []);

        // Rejoindre la room WebSocket
        if (socketRef.current?.connected && user?.id) {
          socketRef.current.emit('join-conversation', {
            conversationId: convId,
            userId: user.id
          });
        }

        // Marquer comme lu seulement si user.id existe
        if (user?.id) {
          await markAsRead(convId);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la conversation:', err);
      setError('Erreur lors du chargement de la conversation');
    }
  }, [user, markAsRead]);

  const selectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadConversation(conversation.id);
  }, [loadConversation]);

  const createConversation = useCallback(async (data: any): Promise<Conversation | null> => {
    try {
      const result = await messagingService.current.createConversation(data);

      if (result.success && result.data) {
        setConversations(prev => [...prev, result.data!]);
        return result.data;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la création de la conversation:', err);
      setError('Erreur lors de la création de la conversation');
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (content: string, messageType = 'TEXT') => {
    if (!selectedConversation || !content.trim()) {
      console.warn('❌ sendMessage: missing required data:', {
        hasConversation: !!selectedConversation,
        hasContent: !!content.trim(),
        conversationId: selectedConversation?.id
      });
      return;
    }

    console.log('📤 Sending message:', {
      conversationId: selectedConversation.id,
      content: content.trim(),
      messageType,
      userId: user?.id,
      userRole: user?.role,
      isConnected: socketRef.current?.connected
    });

    try {
      // Mapping correct du rôle utilisateur vers senderType
      let senderType = 'DIRECTION'; // par défaut
      if (user?.role === 'magasin') senderType = 'MAGASIN';
      else if (user?.role === 'chauffeur') senderType = 'CHAUFFEUR';
      else if (isAdminRole(user?.role) || user?.role === 'direction') senderType = 'DIRECTION';

      console.log('👤 Sender type mapping:', { userRole: user?.role, senderType });

      // TEMPORAIRE: Forcer l'utilisation de l'API à cause des problèmes WebSocket
      // TODO: Restaurer WebSocket quand l'erreur "server.handleUpgrade() was called more than once" sera résolue
      const FORCE_API_FALLBACK = true;

      if (!FORCE_API_FALLBACK && socketRef.current?.connected && isConnected) {
        console.log('🔌 Sending via WebSocket...');
        socketRef.current.emit('send-message', {
          conversationId: selectedConversation.id,
          senderId: user?.id,
          senderType,
          content: content.trim(),
          messageType
        });
      } else {
        console.log('📡 Using API fallback for message sending...');
        // Fallback API
        const result = await messagingService.current.sendMessage({
          conversationId: selectedConversation.id,
          senderId: user?.id,
          senderType: senderType as any,
          content: content.trim(),
          messageType: messageType as any
        });

        console.log('📡 API sendMessage result:', result);

        if (result.success && result.data) {
          setMessages(prev => [...prev, result.data!]);
          console.log('✅ Message sent successfully via API');
        } else {
          console.error('❌ API sendMessage failed:', result);
          setError('Erreur lors de l\'envoi du message via API');
        }
      }
    } catch (err) {
      console.error('❌ Erreur lors de l\'envoi du message:', err);
      setError('Erreur lors de l\'envoi du message');
    }
  }, [selectedConversation, user]);

  const startTyping = useCallback((convId: string) => {
    if (socketRef.current?.connected && user) {
      socketRef.current.emit('typing-start', {
        conversationId: convId,
        userId: user.id,
        userName: `${user.name}`
      });
    }
  }, [user]);

  const stopTyping = useCallback((convId: string) => {
    if (socketRef.current?.connected && user) {
      socketRef.current.emit('typing-stop', {
        conversationId: convId,
        userId: user.id
      });
    }
  }, [user]);

  const refreshMessages = useCallback(async () => {
    if (selectedConversation) {
      await loadConversation(selectedConversation.id);
    }
  }, [selectedConversation, loadConversation]);

  // Chargement initial
  useEffect(() => {
    if (user?.id) {
      console.log('🔍 User authenticated with ID:', user.id);
      console.log('🧾 Full user object for debugging:', user);
      loadConversations();
    } else {
      console.warn('❌ User not authenticated or missing ID:', user);
    }
  }, [user, loadConversations]);

  return {
    // État des conversations
    conversations,
    selectedConversation,
    messages,

    // État de connexion
    isConnected,
    isLoading,
    error,

    // Fonctions de gestion des conversations
    selectConversation,
    loadConversations,
    createConversation,

    // Fonctions de gestion des messages
    sendMessage,
    markAsRead,

    // État temps réel
    onlineUsers,
    typingUsers,

    // Fonctions temps réel
    startTyping,
    stopTyping,

    // Fonctions utilitaires
    refreshMessages,
    disconnect
  };
};