import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../hooks/useMessaging';
import { Conversation, Message } from '../services/messaging.service';
import { useApi } from '../services/api.service';
import { MagasinInfo, PersonnelInfo } from '../types/business.types';
import CleanupConversations from './CleanupConversations';
import ConversationDebugger from './ConversationDebugger';

const RealTimeMessaging: React.FC = () => {
  const { user } = useAuth();
  const apiService = useApi();
  const [conversationCreated, setConversationCreated] = useState(false);

  // ✅ États pour la gestion admin des conversations
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateConversationModal, setShowCreateConversationModal] = useState(false);

  // États pour les données des participants (méthode éprouvée)
  const [allMagasins, setAllMagasins] = useState<MagasinInfo[]>([]);
  const [allChauffeurs, setAllChauffeurs] = useState<PersonnelInfo[]>([]);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);

  // Fonction pour charger tous les participants (méthode éprouvée de MagasinManagement/ChauffeurManagement)
  const loadAllParticipants = async () => {
    try {
      console.log('📊 Chargement des participants avec méthodes éprouvées...');

      // Méthode exacte de MagasinManagement.tsx
      const magasinsResponse = await apiService.get('/magasins') as { data: MagasinInfo[] };
      const magasinsData = Array.isArray(magasinsResponse) ? magasinsResponse : magasinsResponse.data;
      setAllMagasins(magasinsData || []);

      // Méthode exacte de ChauffeurManagement.tsx
      const chauffeursResponse = await apiService.get('/chauffeurs') as { data: PersonnelInfo[] } | PersonnelInfo[];
      const chauffeursData = Array.isArray(chauffeursResponse) ? chauffeursResponse : chauffeursResponse.data;
      setAllChauffeurs(chauffeursData || []);

      setParticipantsLoaded(true);
      console.log('✅ Participants chargés:', {
        magasins: magasinsData?.length || 0,
        chauffeurs: chauffeursData?.length || 0
      });

    } catch (error) {
      console.error('❌ Erreur chargement participants:', error);
      setParticipantsLoaded(true); // Continue même en cas d'erreur
    }
  };

  // Charger les participants au montage
  useEffect(() => {
    if (user) {
      loadAllParticipants();
    }
  }, [user]);

  // Debug de l'utilisateur au montage
  useEffect(() => {
    console.log('📱 RealTimeMessaging mounted with user:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email,
      fullUser: user
    });
  }, [user]);
  const {
    conversations,
    selectedConversation: currentConversation,
    messages,
    isConnected,
    isLoading,
    onlineUsers,
    typingUsers,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    selectConversation,
    loadConversations
  } = useMessaging();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize conversations on component mount - wait for hook to load first
  useEffect(() => {
    // Attendre que le hook ait fini de charger les conversations initiales
    if (user && !isLoading && !conversationCreated && conversations.length === 0) {
      console.log('🔍 Checking for default conversation creation:', {
        hasUser: !!user,
        isLoading,
        conversationCreated,
        conversationsCount: conversations.length
      });

      // Éviter les créations multiples avec un délai
      const timer = setTimeout(() => {
        if (!conversationCreated) {
          createDefaultConversations();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedConversationId]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversationId && user?.id) {
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId, user?.id, markAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createDefaultConversations = async () => {
    console.log('🏗️ createDefaultConversations called with user:', { hasUser: !!user, userId: user?.id, role: user?.role });

    if (!user) {
      console.warn('❌ No user found, skipping default conversations');
      return;
    }

    // Les admins/direction n'ont pas besoin de conversation avec eux-mêmes
    if (user.role === 'admin') {
      console.log('👑 Admin/Direction detected - no self-conversation needed');
      setConversationCreated(true);
      return;
    }

    // Marquer immédiatement pour éviter les appels multiples
    setConversationCreated(true);

    try {
      // ✅ Utiliser user.token au lieu de localStorage pour plus de fiabilité (comme spécifié dans CLAUDE.md)
      const token = user?.token || localStorage.getItem('authToken');
      console.log('🔑 Token for API call:', { hasToken: !!token, userRole: user?.role });

      // Vérifier d'abord si une conversation Direction existe déjà dans les conversations chargées
      const existingDirectionConv = conversations.find(conv =>
        (conv.type === 'PRIVATE' || conv.type === 'MAGASIN_DIRECTION') &&
        (conv.name?.includes('My Truck Direction') || conv.name?.includes('Discussion avec My Truck Direction'))
      );

      if (existingDirectionConv) {
        console.log('✅ Conversation Direction déjà existante:', existingDirectionConv.id);
        setConversationCreated(true);
        return;
      }

      // Double-vérification côté API avant création
      const checkResponse = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations?isActive=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 Check API response status:', checkResponse.status);

      if (!checkResponse.ok) {
        console.warn('⚠️ Erreur lors de la vérification des conversations:', checkResponse.status);
        if (checkResponse.status === 401) {
          console.error('🚫 Token invalide lors de la vérification - continuer avec création directe');
        }
      }

      if (checkResponse.ok) {
        const existingConversations = await checkResponse.json();
        const hasDirectionConv = existingConversations.some((conv: any) =>
          (conv.type === 'PRIVATE' || conv.type === 'MAGASIN_DIRECTION') &&
          (conv.name?.includes('My Truck Direction') || conv.name?.includes('Discussion avec My Truck Direction'))
        );

        if (hasDirectionConv) {
          console.log('✅ Conversation Direction trouvée via API - éviter duplication');
          setConversationCreated(true);
          await loadConversations();
          return;
        }
      }

      // Créer automatiquement la conversation avec la Direction pour tous les utilisateurs
      const response = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations/user-direction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        console.warn('❌ Impossible de créer la conversation Direction, status:', response.status);
        const errorText = await response.text();
        console.warn('Error details:', errorText);

        // ✅ Diagnostic spécifique pour 401/403
        if (response.status === 401) {
          console.error('🚫 Token invalide ou expiré - vérifier l\'authentification');
          console.error('🔍 User role:', user?.role);
          console.error('🔍 Token exists:', !!token);
          console.error('🔍 Token preview:', token ? token.substring(0, 20) + '...' : 'null');
        } else if (response.status === 403) {
          console.error('🚫 Permissions insuffisantes - vérifier les droits utilisateur');
          console.error('🔍 User role:', user?.role);
          console.error('🔍 Entity type expected:', user?.role === 'chauffeur' ? 'chauffeur' : user?.role === 'magasin' ? 'magasin' : 'user');
        }

        // Permettre de réessayer en cas d'erreur
        setConversationCreated(false);
      } else {
        console.log('✅ Conversation Direction créée/récupérée avec succès');
        const data = await response.json();
        console.log('🎯 CONVERSATION CRÉÉE - Response data:', data);
        console.log('🔍 Participants dans la conversation créée:', data.participantIds);
        console.log('🆔 ID de la conversation créée:', data.id);

        // Forcer le rechargement des conversations après création
        console.log('🔄 Rechargement forcé des conversations après création...');
        await loadConversations();
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création des conversations par défaut:', error);
      // Permettre de réessayer en cas d'erreur
      setConversationCreated(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedConversationId || !user) return;

    try {
      await sendMessage(messageContent.trim());

      setMessageContent('');
      if (selectedConversationId) {
        stopTyping(selectedConversationId);
      }
      setIsTyping(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  // ✅ FONCTIONS DE GESTION DES MESSAGES DE GROUPE (COMMANDE_GROUP)

  // Fonction pour créer une conversation de groupe pour une commande
  const createCommandeGroupConversation = async (commandeId: string, magasinId: string, chauffeurId: string) => {
    try {
      const token = user?.token || localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations/commande-group/${commandeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ magasinId, chauffeurId })
      });

      if (response.ok) {
        const newConversation = await response.json();
        console.log('✅ Conversation de groupe créée:', newConversation);
        await loadConversations(); // Recharger la liste
        return newConversation;
      } else {
        console.error('❌ Erreur lors de la création de la conversation de groupe:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de la conversation de groupe:', error);
      return null;
    }
  };

  // Fonction pour gérer l'état d'une conversation de commande selon les statuts
  const manageCommandeConversation = async (commandeId: string, magasinId: string, chauffeurId: string) => {
    try {
      const token = user?.token || localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations/manage-commande/${commandeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ magasinId, chauffeurId })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Conversation de commande gérée:', result);
        await loadConversations(); // Recharger la liste
        return result;
      } else {
        console.error('❌ Erreur lors de la gestion de la conversation de commande:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la gestion de la conversation de commande:', error);
      return null;
    }
  };

  // Fonction helper pour identifier les conversations de groupe
  const isGroupConversation = (conversation: Conversation): boolean => {
    return conversation.type === 'COMMANDE_GROUP';
  };

  // Fonction pour obtenir les détails d'une conversation de groupe
  const getGroupConversationDetails = (conversation: Conversation) => {
    if (!isGroupConversation(conversation)) return null;

    return {
      commandeId: conversation.commandeId,
      participantCount: conversation.participantIds.length,
      hasActiveCommande: !!conversation.commande,
      statutCommande: conversation.commande?.statutCommande,
      statutLivraison: conversation.commande?.statutLivraison
    };
  };

  // ✅ FONCTIONS DE GESTION ADMIN DES CONVERSATIONS (suivant le pattern de Deliveries.tsx)

  // Gestion de la sélection des conversations
  const handleConversationSelection = (conversationId: string, checked: boolean) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(conversationId);
      } else {
        newSet.delete(conversationId);
      }
      return newSet;
    });
  };

  // Sélectionner/désélectionner toutes les conversations
  const handleSelectAllConversations = (checked: boolean) => {
    if (checked) {
      setSelectedConversations(new Set(filteredConversations.map(c => c.id)));
    } else {
      setSelectedConversations(new Set());
    }
  };

  // Supprimer une conversation individuelle
  const handleDeleteConversation = async (conversationId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.')) {
      try {
        const token = user?.token || localStorage.getItem('authToken');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations/${conversationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          console.log('✅ Conversation supprimée:', conversationId);
          await loadConversations(); // Recharger la liste
          if (selectedConversationId === conversationId) {
            setSelectedConversationId(null); // Désélectionner si c'était la conversation active
          }
        } else {
          console.error('❌ Erreur lors de la suppression:', response.status);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la suppression de la conversation:', error);
      }
    }
  };

  // Supprimer plusieurs conversations
  const handleMultipleDeleteConversations = async () => {
    if (selectedConversations.size === 0) return;

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedConversations.size} conversation(s) sélectionnée(s) ? Cette action est irréversible.`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const token = user?.token || localStorage.getItem('authToken');
      const conversationsToDelete = Array.from(selectedConversations);

      for (const conversationId of conversationsToDelete) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations/${conversationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          console.log('✅ Conversation supprimée:', conversationId);
        } else {
          console.error('❌ Erreur lors de la suppression:', conversationId, response.status);
        }
      }

      // Recharger les conversations et réinitialiser la sélection
      await loadConversations();
      setSelectedConversations(new Set());

      // Désélectionner la conversation active si elle a été supprimée
      if (selectedConversationId && selectedConversations.has(selectedConversationId)) {
        setSelectedConversationId(null);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la suppression multiple:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTyping = (value: string) => {
    setMessageContent(value);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      if (selectedConversationId) {
        startTyping(selectedConversationId);
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConversationId) {
        stopTyping(selectedConversationId);
      }
      setIsTyping(false);
    }, 1000);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    selectConversation(conversation);
  };

  const filteredConversations = conversations.filter(conv =>
    (conv.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participantIds.some((p: string) => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Debug pour voir l'état des conversations
  useEffect(() => {
    console.log('📊 Conversations state:', {
      total: conversations.length,
      filtered: filteredConversations.length,
      isLoading,
      conversations: conversations.map(c => ({ id: c.id, name: c.name, type: c.type }))
    });
  }, [conversations, filteredConversations, isLoading]);

  const conversationMessages = selectedConversationId
    ? messages.filter(msg => msg.conversationId === selectedConversationId)
    : [];

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'DEVIS_REQUEST': return '💰';
      case 'DEVIS_RESPONSE': return '📄';
      case 'COMMANDE_UPDATE': return '📦';
      case 'SYSTEM_NOTIFICATION': return '🔔';
      default: return '';
    }
  };

  const getSenderTypeColor = (senderType: string) => {
    switch (senderType) {
      case 'DIRECTION': return 'text-blue-600';
      case 'CHAUFFEUR': return 'text-green-600';
      case 'MAGASIN': return 'text-purple-600';
      case 'SYSTEM': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusBadge = () => {
    if (isConnected) {
      return (
        <div className="flex items-center space-x-1 text-green-600 text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>En ligne</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1 text-red-600 text-xs">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>Hors ligne</span>
        </div>
      );
    }
  };

  // Fonction intelligente pour identifier le type de conversation PRIVATE et obtenir le bon titre
  const getConversationTitle = (conversation: Conversation): string => {
    console.log('🔍 getConversationTitle called:', {
      conversationId: conversation.id.slice(0, 8),
      type: conversation.type,
      name: conversation.name,
      userRole: user?.role,
      participantIds: conversation.participantIds,
      participantsLoaded
    });

    // Pour les conversations de type MAGASIN_DIRECTION (anciennes)
    if (conversation.type === 'MAGASIN_DIRECTION') {
      if (user?.role === 'admin') {
        const magasinName = conversation.magasin?.nom || `Magasin ${conversation.magasinId}`;
        return `Discussion avec ${magasinName}`;
      } else {
        return 'Discussion avec My Truck Direction';
      }
    }

    // Pour les conversations PRIVATE (nouvelles) - identifier le type selon les participants
    if (conversation.type === 'PRIVATE' && participantsLoaded && conversation.participantIds?.length === 2) {
      const otherParticipantId = conversation.participantIds.find(id => id !== user?.id);

      if (otherParticipantId) {
        // Chercher dans les magasins
        const magasin = allMagasins.find(m => m.id === otherParticipantId);
        if (magasin) {
          // Conversation My Truck ↔ Magasin
          if (user?.role === 'admin') {
            const magasinName = (magasin as any).nom || magasin.name;
            return `Discussion avec ${magasinName}`;
          } else {
            return 'Discussion avec My Truck Direction';
          }
        }

        // Chercher dans les chauffeurs
        const chauffeur = allChauffeurs.find(c => c.id === otherParticipantId);
        if (chauffeur) {
          // Conversation My Truck ↔ Chauffeur
          if (user?.role === 'admin') {
            return `Discussion avec ${chauffeur.nom} ${chauffeur.prenom}`.trim();
          } else {
            return 'Discussion avec My Truck Direction';
          }
        }

        // Si c'est entre chauffeur et magasin (ni l'un ni l'autre n'est l'admin)
        if (user?.role === 'chauffeur') {
          const magasinForChauffeur = allMagasins.find(m => m.id === otherParticipantId);
          if (magasinForChauffeur) {
            const magasinName = (magasinForChauffeur as any).nom || magasinForChauffeur.name;
            return `Discussion avec ${magasinName}`;
          }
        } else if (user?.role === 'magasin') {
          const chauffeurForMagasin = allChauffeurs.find(c => c.id === otherParticipantId);
          if (chauffeurForMagasin) {
            return `Discussion avec ${chauffeurForMagasin.nom} ${chauffeurForMagasin.prenom}`.trim();
          }
        }
      }
    }

    // Fallbacks pour autres types
    if (conversation.name && conversation.name.trim() !== '') return conversation.name;
    if (conversation.type === 'COMMANDE_GROUP') return `Commande ${conversation.commandeId}`;
    return 'Conversation privée';
  };

  const getUnreadCount = (conversation: Conversation): number => {
    return conversation._count?.messages || 0;
  };

  const getSenderName = (message: any, conversation: Conversation): string => {
    // Si c'est l'utilisateur actuel
    if (message.senderId === user?.id) {
      return 'Moi';
    }

    // Utiliser les données chargées pour identifier l'expéditeur
    if (participantsLoaded && message.senderId) {
      // Chercher dans les magasins
      const magasin = allMagasins.find(m => m.id === message.senderId);
      if (magasin) {
        return (magasin as any).nom || magasin.name;
      }

      // Chercher dans les chauffeurs
      const chauffeur = allChauffeurs.find(c => c.id === message.senderId);
      if (chauffeur) {
        return `${chauffeur.nom} ${chauffeur.prenom}`.trim();
      }
    }

    // Fallback vers les données de conversation si disponibles
    if (message.senderType === 'MAGASIN' && conversation.magasin?.nom) {
      return conversation.magasin.nom;
    }

    // Fallback vers le type d'expéditeur
    return message.senderType;
  };

  const getCurrentTypingUsers = (conversationId: string): string[] => {
    return typingUsers[conversationId] || [];
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Debug Component - Admin only */}
      {/* <ConversationDebugger /> */}

      {/* Cleanup Component - Admin only */}
      {/* <CleanupConversations /> */}

      {/* Sidebar - Liste des conversations */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-semibold text-gray-900">Messagerie</h1>
            {getConnectionStatusBadge()}
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* ✅ Contrôles Admin pour la gestion des conversations */}
          {user?.role === 'admin' && (
            <>
              {/* Boutons de gestion admin */}
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setShowCreateConversationModal(true)}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Nouvelle conversation</span>
                </button>

                {/* Contrôles de sélection et suppression */}
                {filteredConversations.length > 0 && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSelectAllConversations(selectedConversations.size !== filteredConversations.length)}
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-xs"
                    >
                      {selectedConversations.size === filteredConversations.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    {selectedConversations.size > 0 && (
                      <button
                        onClick={handleMultipleDeleteConversations}
                        disabled={isDeleting}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs"
                      >
                        {isDeleting ? 'Suppression...' : `Supprimer (${selectedConversations.size})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.456L3 21l2.456-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
              <p className="text-sm">Aucune conversation</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group p-3 rounded-lg transition-colors ${
                    selectedConversationId === conversation.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* ✅ Checkbox de sélection pour admin */}
                    {user?.role === 'admin' && (
                      <input
                        type="checkbox"
                        checked={selectedConversations.has(conversation.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleConversationSelection(conversation.id, e.target.checked);
                        }}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    )}

                    {/* Contenu de la conversation (cliquable) */}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {getConversationTitle(conversation)}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {getUnreadCount(conversation) > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                              {getUnreadCount(conversation)}
                            </span>
                          )}
                          {/* Bouton supprimer individuel pour admin */}
                          {user?.role === 'admin' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                              className="text-red-600 hover:text-red-800 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Supprimer cette conversation"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          {conversation.lastMessageAt && format(new Date(conversation.lastMessageAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                        {conversation.type === 'COMMANDE_GROUP' && conversation.commandeId && (
                          <div className="text-xs mt-1 space-y-1">
                            <div className="text-blue-600">
                              📦 Commande #{conversation.commandeId}
                              {conversation.commande && ` • ${conversation.commande.statutCommande}`}
                            </div>
                            {conversation.commande?.statutLivraison && (
                              <div className="text-purple-600">
                                🚛 Livraison: {conversation.commande.statutLivraison}
                              </div>
                            )}
                            <div className="text-gray-500">
                              👥 {conversation.participantIds.length} participant(s)
                            </div>
                            {/* Indicateur de conversation de groupe */}
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                              Groupe
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Chat header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="font-semibold text-gray-900">
                      {filteredConversations.find(c => c.id === selectedConversationId)?.name || 'Conversation'}
                    </h2>
                    {/* ✅ Indicateur spécial pour conversations de groupe */}
                    {(() => {
                      const selectedConv = filteredConversations.find(c => c.id === selectedConversationId);
                      if (selectedConv?.type === 'COMMANDE_GROUP') {
                        return (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            👥 Groupe
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                    <span>
                      {filteredConversations.find(c => c.id === selectedConversationId)?.participantIds.length} participant(s)
                    </span>
                    {onlineUsers.length > 0 && (
                      <span>• {onlineUsers.length} en ligne</span>
                    )}

                    {/* ✅ Détails spéciaux pour conversations de groupe */}
                    {(() => {
                      const selectedConv = filteredConversations.find(c => c.id === selectedConversationId);
                      if (selectedConv?.type === 'COMMANDE_GROUP' && selectedConv.commande) {
                        return (
                          <>
                            <span>• 📦 {selectedConv.commande.statutCommande}</span>
                            {selectedConv.commande.statutLivraison && (
                              <span>• 🚛 {selectedConv.commande.statutLivraison}</span>
                            )}
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* ✅ Boutons d'action pour admin sur conversations de groupe */}
                {user?.role === 'admin' && (() => {
                  const selectedConv = filteredConversations.find(c => c.id === selectedConversationId);
                  if (selectedConv?.type === 'COMMANDE_GROUP' && selectedConv.commandeId) {
                    return (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => manageCommandeConversation(selectedConv.commandeId!, selectedConv.magasinId!, selectedConv.chauffeurId!)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded"
                          title="Gérer l'état de la conversation"
                        >
                          ⚙️ Gérer
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Typing indicators */}
              {getCurrentTypingUsers(selectedConversationId).length > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  {getCurrentTypingUsers(selectedConversationId).join(', ')} {getCurrentTypingUsers(selectedConversationId).length === 1 ? 'est en train' : 'sont en train'} d'écrire...
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === user?.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.senderId !== user?.id && (
                      <div className={`text-xs mb-1 ${getSenderTypeColor(message.senderType)}`}>
                        {getSenderName(message, currentConversation)}
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      {getMessageTypeIcon(message.messageType) && (
                        <span className="text-sm">{getMessageTypeIcon(message.messageType)}</span>
                      )}
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p className={`text-xs mt-1 ${
                      message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {format(new Date(message.sentAt), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Tapez votre message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!messageContent.trim() || !isConnected}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.456L3 21l2.456-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sélectionnez une conversation</h3>
              <p className="text-gray-500">Choisissez une conversation dans la liste pour commencer à échanger</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeMessaging;