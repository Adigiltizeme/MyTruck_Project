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

  // États pour le modal de création de conversation
  const [newConversationType, setNewConversationType] = useState<string>('');
  const [newConversationParticipant, setNewConversationParticipant] = useState<string>('');
  const [newConversationSecondParticipant, setNewConversationSecondParticipant] = useState<string>(''); // Pour double sélection admin
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  // ✅ Type étendu pour inclure commandeId nécessaire à la validation backend
  const [eligibleMagasins, setEligibleMagasins] = useState<Array<MagasinInfo & { commandeId?: string }>>([]);
  const [eligibleChauffeurs, setEligibleChauffeurs] = useState<Array<PersonnelInfo & { commandeId?: string }>>([]);
  const [eligibleChauffeursForMagasin, setEligibleChauffeursForMagasin] = useState<Array<PersonnelInfo & { commandeId?: string }>>([]);

  // Fonction pour charger tous les participants (méthode éprouvée de MagasinManagement/ChauffeurManagement)
  const loadAllParticipants = async () => {
    try {
      console.log('📊 Chargement des participants avec méthodes éprouvées...');

      // ✅ Charger seulement les données auxquelles l'utilisateur a accès
      if (user?.role === 'admin') {
        // Admin peut voir tout
        const magasinsResponse = await apiService.get('/magasins') as { data: MagasinInfo[] };
        const magasinsData = Array.isArray(magasinsResponse) ? magasinsResponse : magasinsResponse.data;
        setAllMagasins(magasinsData || []);

        const chauffeursResponse = await apiService.get('/chauffeurs') as { data: PersonnelInfo[] } | PersonnelInfo[];
        const chauffeursData = Array.isArray(chauffeursResponse) ? chauffeursResponse : chauffeursResponse.data;
        setAllChauffeurs(chauffeursData || []);
      } else if (user?.role === 'magasin') {
        // Magasin peut voir les chauffeurs
        const chauffeursResponse = await apiService.get('/chauffeurs') as { data: PersonnelInfo[] } | PersonnelInfo[];
        const chauffeursData = Array.isArray(chauffeursResponse) ? chauffeursResponse : chauffeursResponse.data;
        setAllChauffeurs(chauffeursData || []);
        setAllMagasins([]); // Pas d'accès aux autres magasins
      } else if (user?.role === 'chauffeur') {
        // Chauffeur n'a pas besoin de ces listes pour les conversations
        setAllMagasins([]);
        setAllChauffeurs([]);
      }

      setParticipantsLoaded(true);
      console.log('✅ Participants chargés selon rôle:', {
        userRole: user?.role,
        magasins: allMagasins.length,
        chauffeurs: allChauffeurs.length
      });

    } catch (error) {
      console.error('❌ Erreur chargement participants:', error);
      setParticipantsLoaded(true); // Continue même en cas d'erreur
    }
  };

  // Fonction pour récupérer les magasins éligibles pour un chauffeur
  const loadEligibleMagasinsForChauffeur = async () => {
    if (!user || user.role !== 'chauffeur' || !user.driverId) return;

    try {
      console.log('🔍 Récupération des commandes actives pour chauffeur:', user.driverId);

      // ✅ Utiliser simpleBackendService comme dans Deliveries.tsx
      const { simpleBackendService } = await import('../services/simple-backend.service');
      const allCommandes = await simpleBackendService.getCommandes();

      // Filtrer les commandes du chauffeur
      const commandesChauffeur = allCommandes.filter(commande =>
        commande.chauffeurs?.some(c => c.id === user.driverId)
      );

      console.log('📊 Total commandes chauffeur trouvées:', commandesChauffeur.length);

      // Filtrer les commandes actives et extraire les magasins uniques avec commandeId
      const magasinsUniques = new Map();

      commandesChauffeur.forEach((commande) => {
        const isCommandeActive = commande.statuts?.commande !== 'En attente';
        const isLivraisonActive = commande.statuts?.livraison !== 'EN ATTENTE';
        const shouldBeActive = isCommandeActive && isLivraisonActive;

        console.log(`📦 Commande ${commande.numeroCommande}: commande=${commande.statuts?.commande} (${isCommandeActive}), livraison=${commande.statuts?.livraison} (${isLivraisonActive}) → ${shouldBeActive ? 'Active' : 'Inactive'}`);

        if (shouldBeActive && commande.magasin) {
          // ✅ Inclure le commandeId pour l'envoyer au backend
          magasinsUniques.set(commande.magasin.id, {
            id: commande.magasin.id,
            name: commande.magasin.name, // ✅ Déjà transformé par simpleBackendService
            address: commande.magasin.address,
            phone: commande.magasin.phone,
            email: commande.magasin.email,
            status: commande.magasin.status,
            commandeId: commande.id, // Nécessaire pour validation backend
            // ✅ Stocker aussi 'nom' pour compatibilité avec le pattern (magasin as any).nom
            nom: commande.magasin.name
          } as any);
        }
      });

      const eligibleMagasinsList = Array.from(magasinsUniques.values());
      setEligibleMagasins(eligibleMagasinsList);
      console.log('✅ Magasins éligibles pour chauffeur:', eligibleMagasinsList);

    } catch (error) {
      console.error('❌ Erreur récupération magasins éligibles:', error);
      setEligibleMagasins([]);
    }
  };

  // Fonction pour récupérer les chauffeurs éligibles pour un magasin spécifique (admin ou magasin)
  const loadEligibleChauffeursForMagasin = async (magasinId?: string) => {
    // Pour magasin connecté, utiliser son storeId
    // Pour admin, utiliser le magasinId passé en paramètre
    const targetMagasinId = magasinId || (user?.role === 'magasin' ? user.storeId : null);

    if (!targetMagasinId) return;

    try {
      console.log('🔍 Récupération des commandes actives pour magasin:', targetMagasinId);

      // ✅ Utiliser simpleBackendService comme dans Deliveries.tsx
      const { simpleBackendService } = await import('../services/simple-backend.service');
      const allCommandes = await simpleBackendService.getCommandes();

      // Filtrer les commandes du magasin
      const commandesMagasin = allCommandes.filter(commande =>
        commande.magasin?.id === targetMagasinId
      );

      console.log('📊 Total commandes magasin trouvées:', commandesMagasin.length);

      // Filtrer les commandes actives et extraire les chauffeurs uniques avec commandeId
      const chauffeursUniques = new Map();

      commandesMagasin.forEach((commande) => {
        const isCommandeActive = commande.statuts?.commande !== 'En attente';
        const isLivraisonActive = commande.statuts?.livraison !== 'EN ATTENTE';
        const shouldBeActive = isCommandeActive && isLivraisonActive;

        console.log(`📦 Commande ${commande.numeroCommande}: commande=${commande.statuts?.commande} (${isCommandeActive}), livraison=${commande.statuts?.livraison} (${isLivraisonActive}) → ${shouldBeActive ? 'Active' : 'Inactive'}`);

        if (shouldBeActive && commande.chauffeurs && commande.chauffeurs.length > 0) {
          // Ajouter tous les chauffeurs de la commande
          commande.chauffeurs.forEach(chauffeur => {
            chauffeursUniques.set(chauffeur.id, {
              id: chauffeur.id,
              nom: chauffeur.nom,
              prenom: chauffeur.prenom,
              email: chauffeur.email,
              telephone: chauffeur.telephone,
              commandeId: commande.id // Nécessaire pour validation backend
            } as any);
          });
        }
      });

      const eligibleChauffeursList = Array.from(chauffeursUniques.values());

      // Si appelé avec un magasinId (admin), stocker dans eligibleChauffeursForMagasin
      // Sinon (magasin connecté), stocker dans eligibleChauffeurs
      if (magasinId) {
        setEligibleChauffeursForMagasin(eligibleChauffeursList);
        console.log('✅ Chauffeurs éligibles pour magasin (admin):', eligibleChauffeursList);
      } else {
        setEligibleChauffeurs(eligibleChauffeursList);
        console.log('✅ Chauffeurs éligibles pour magasin:', eligibleChauffeursList);
      }

    } catch (error) {
      console.error('❌ Erreur récupération chauffeurs éligibles:', error);
      if (magasinId) {
        setEligibleChauffeursForMagasin([]);
      } else {
        setEligibleChauffeurs([]);
      }
    }
  };

  // Fonction pour créer une conversation direction rapide (chauffeurs)
  const handleQuickConversation = async (type: 'DIRECTION') => {
    if (!user || user.role !== 'chauffeur') return;

    setIsCreatingConversation(true);

    try {
      // ✅ apiService.post retourne directement les données, pas {success, data}
      const conversation = await apiService.post('/messaging/conversations/user-direction', {
        userId: user.id,
        userRole: 'chauffeur'
      });

      console.log('✅ Conversation direction créée:', conversation);
      await loadConversations();

      // ✅ NE PAS sélectionner automatiquement pour éviter erreur 404 undefined

    } catch (error) {
      console.error('❌ Erreur création conversation direction:', error);
      alert(`Erreur: ${(error as Error).message}`);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Fonction pour créer une nouvelle conversation
  const handleCreateConversation = async () => {
    if (!newConversationType || !user) {
      alert('Veuillez sélectionner un type de conversation');
      return;
    }

    // Pas besoin de participant pour ces cas automatiques
    const isAutoDirection =
      (user.role === 'chauffeur' && newConversationType === 'PRIVATE') ||
      (user.role === 'magasin' && (newConversationType === 'PRIVATE' || newConversationType === 'MAGASIN_DIRECTION'));

    if (!isAutoDirection && !newConversationParticipant) {
      alert('Veuillez sélectionner un participant');
      return;
    }

    setIsCreatingConversation(true);

    try {
      let endpoint = '';
      let payload: any = {};

      switch (newConversationType) {
        case 'PRIVATE':
          // Conversation Direction ↔ Chauffeur/Magasin
          endpoint = '/messaging/conversations/user-direction';

          if (user.role === 'chauffeur') {
            // Chauffeur contacte direction
            payload = {
              userId: user.id,
              userRole: 'chauffeur'
            };
          } else if (user.role === 'magasin') {
            // Magasin contacte direction
            payload = {
              userId: user.storeId || user.id,
              userRole: 'magasin'
            };
          } else {
            // Admin/Direction contacte chauffeur
            payload = {
              userId: newConversationParticipant,
              userRole: 'chauffeur'
            };
          }
          break;

        case 'MAGASIN_DIRECTION':
          // Conversation Magasin ↔ Direction
          if (user.role === 'magasin') {
            // Magasin crée sa propre conversation direction
            endpoint = `/messaging/conversations/magasin-direction/${user.storeId || user.id}`;
            payload = {};
          } else {
            // Admin crée conversation pour un magasin
            endpoint = `/messaging/conversations/magasin-direction/${newConversationParticipant}`;
            payload = {};
          }
          break;

        case 'CHAUFFEUR_MAGASIN':
          // Conversation Chauffeur ↔ Magasin (selon conditions)
          endpoint = '/messaging/conversations/chauffeur-magasin';

          if (user.role === 'chauffeur') {
            // Chauffeur contacte magasin
            const selectedMagasinData = eligibleMagasins.find(m => m.id === newConversationParticipant);
            payload = {
              chauffeurId: user.id,
              magasinId: newConversationParticipant,
              commandeId: selectedMagasinData?.commandeId
            };
          } else if (user.role === 'magasin') {
            // Magasin contacte chauffeur
            const selectedChauffeurData = eligibleChauffeurs.find(c => c.id === newConversationParticipant);
            payload = {
              chauffeurId: newConversationParticipant,
              magasinId: user.storeId || user.id,
              commandeId: selectedChauffeurData?.commandeId
            };
          } else {
            // Admin crée conversation chauffeur-magasin avec double sélection
            payload = {
              magasinId: newConversationParticipant,
              chauffeurId: newConversationSecondParticipant
            };
          }
          break;

        default:
          throw new Error('Type de conversation non supporté');
      }

      console.log('🔥 Creating conversation:', { endpoint, payload });

      // ✅ apiService.post retourne directement les données, pas {success, data}
      const conversation = await apiService.post(endpoint, payload);

      console.log('✅ Conversation créée:', conversation);

      // Fermer le modal immédiatement
      setShowCreateConversationModal(false);
      setNewConversationType('');
      setNewConversationParticipant('');
      setNewConversationSecondParticipant('');
      setEligibleChauffeursForMagasin([]);

      // Recharger les conversations
      await loadConversations();

      // ✅ NE PAS sélectionner automatiquement pour éviter erreur 404 undefined
      // L'utilisateur peut cliquer sur la conversation dans la liste

    } catch (error) {
      console.error('❌ Erreur création conversation:', error);
      alert(`Erreur: ${(error as Error).message}`);
    } finally {
      setIsCreatingConversation(false);
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

      // DÉSACTIVÉ - Éviter les créations multiples avec un délai
      const timer = setTimeout(() => {
        // Désactivé temporairement pour éviter erreurs 500
        // createDefaultConversations();
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

    if (!user || !user.id) {
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
      // Vérifier d'abord si une conversation Direction existe déjà
      const existingDirectionConv = conversations.find(conv =>
        (conv.type === 'PRIVATE' || conv.type === 'MAGASIN_DIRECTION') &&
        (conv.name?.includes('My Truck Direction') || conv.name?.includes('Discussion avec My Truck Direction'))
      );

      if (existingDirectionConv) {
        console.log('✅ Conversation Direction déjà existante:', existingDirectionConv.id);
        return;
      }

      console.log('🔨 Création conversation par défaut avec Direction...');

      // ✅ Utiliser apiService comme les autres fonctions
      await apiService.post('/messaging/conversations/user-direction', {
        userId: user.id,
        userRole: user.role
      });

      console.log('✅ Conversation Direction créée avec succès');
      await loadConversations();

    } catch (error) {
      console.error('❌ Erreur lors de la création conversation par défaut:', error);
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
    if (conversation.type === 'PRIVATE' && conversation.participantIds?.length === 2) {
      // ✅ PRIORITÉ 1 : Utiliser chauffeurId et magasinId si présents (conversation chauffeur-magasin)
      if (conversation.chauffeurId && conversation.magasinId) {
        if (user?.role === 'admin') {
          // Admin voit les deux participants
          const magasin = allMagasins.find(m => m.id === conversation.magasinId);
          const chauffeur = allChauffeurs.find(c => c.id === conversation.chauffeurId);

          if (magasin && chauffeur) {
            const magasinName = (magasin as any).nom || magasin.name;
            return `Groupe MT - ${chauffeur.prenom} ${chauffeur.nom} ↔ ${magasinName}`.trim();
          }
          // Fallback au nom backend
          return conversation.name || 'Discussion chauffeur-magasin';
        } else if (user?.role === 'chauffeur') {
          // Chauffeur voit le nom du magasin
          const magasin = allMagasins.find(m => m.id === conversation.magasinId);
          if (magasin) {
            const magasinName = (magasin as any).nom || magasin.name;
            return `Discussion avec ${magasinName}`;
          }
          // Fallback au nom backend
          return conversation.name || 'Discussion directe';
        } else if (user?.role === 'magasin') {
          // Magasin voit le nom du chauffeur
          const chauffeur = allChauffeurs.find(c => c.id === conversation.chauffeurId);
          if (chauffeur) {
            return `Discussion avec ${chauffeur.prenom} ${chauffeur.nom}`.trim();
          }
          // Fallback au nom backend
          return conversation.name || 'Discussion directe';
        }
      }

      // ✅ PRIORITÉ 2 : Identifier selon participantIds (conversations direction)
      if (participantsLoaded) {
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
              return `Discussion avec ${chauffeur.prenom} ${chauffeur.nom}`.trim();
            } else {
              return 'Discussion avec My Truck Direction';
            }
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

          {/* ✅ Bouton création conversation - Disponible pour tous les rôles */}
          <div className="mt-3">
            <button
              onClick={() => setShowCreateConversationModal(true)}
              className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nouvelle conversation</span>
            </button>
          </div>

          {/* ✅ Contrôles Admin pour la gestion/suppression des conversations */}
          {user?.role === 'admin' && (
            <>
              <div className="mt-2 space-y-2">
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


      {/* ✅ Modal de création de conversation */}
      {showCreateConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Créer une nouvelle conversation</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de conversation
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={newConversationType}
                  onChange={(e) => {
                    setNewConversationType(e.target.value);
                    setNewConversationParticipant(''); // Reset participant when type changes
                    setNewConversationSecondParticipant(''); // Reset second participant
                    setEligibleChauffeursForMagasin([]); // Reset chauffeurs éligibles pour admin

                    // Charger automatiquement les magasins éligibles pour les chauffeurs
                    if (e.target.value === 'CHAUFFEUR_MAGASIN' && user?.role === 'chauffeur') {
                      loadEligibleMagasinsForChauffeur();
                    }

                    // Charger automatiquement les chauffeurs éligibles pour les magasins
                    if (e.target.value === 'CHAUFFEUR_MAGASIN' && user?.role === 'magasin') {
                      loadEligibleChauffeursForMagasin();
                    }
                  }}
                >
                  <option value="">Sélectionner un type</option>

                  {/* Options pour admin */}
                  {user?.role === 'admin' && (
                    <>
                      <option value="MAGASIN_DIRECTION">Discussion avec un magasin</option>
                      <option value="PRIVATE">Discussion privée avec un chauffeur</option>
                      <option value="CHAUFFEUR_MAGASIN">Discussion chauffeur ↔ magasin</option>
                    </>
                  )}

                  {/* Options pour chauffeur */}
                  {user?.role === 'chauffeur' && (
                    <>
                      <option value="PRIVATE">Discussion avec la Direction</option>
                      <option value="CHAUFFEUR_MAGASIN">Discussion avec un Magasin</option>
                    </>
                  )}

                  {/* Options pour magasin */}
                  {user?.role === 'magasin' && (
                    <>
                      <option value="MAGASIN_DIRECTION">Discussion avec la Direction</option>
                      <option value="CHAUFFEUR_MAGASIN">Discussion avec un Chauffeur</option>
                    </>
                  )}
                </select>
              </div>

              {/* Select participant - masqué pour chauffeur/magasin + direction (automatique) */}
              {!((user?.role === 'chauffeur' || user?.role === 'magasin') && newConversationType === 'PRIVATE') &&
               !(user?.role === 'magasin' && newConversationType === 'MAGASIN_DIRECTION') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participant
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={newConversationParticipant}
                    onChange={(e) => {
                      setNewConversationParticipant(e.target.value);

                      // Si admin sélectionne un magasin pour CHAUFFEUR_MAGASIN, charger les chauffeurs éligibles
                      if (user?.role === 'admin' && newConversationType === 'CHAUFFEUR_MAGASIN' && e.target.value) {
                        setNewConversationSecondParticipant(''); // Reset chauffeur
                        loadEligibleChauffeursForMagasin(e.target.value);
                      }
                    }}
                    disabled={!newConversationType}
                  >
                  <option value="">Sélectionner un participant</option>

                  {/* Options selon le type sélectionné */}
                  {newConversationType === 'MAGASIN_DIRECTION' && user?.role === 'admin' &&
                    allMagasins.map(magasin => (
                      <option key={magasin.id} value={magasin.id}>
                        {(magasin as any).nom || magasin.name} (Magasin)
                      </option>
                    ))
                  }

                  {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'chauffeur' &&
                    eligibleMagasins.map(magasin => (
                      <option key={magasin.id} value={magasin.id}>
                        {(magasin as any).nom || magasin.name} (Magasin avec commandes actives)
                      </option>
                    ))
                  }

                  {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'magasin' &&
                    eligibleChauffeurs.map(chauffeur => (
                      <option key={chauffeur.id} value={chauffeur.id}>
                        {chauffeur.prenom} {chauffeur.nom} (Chauffeur avec commandes actives)
                      </option>
                    ))
                  }

                  {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'admin' &&
                    allMagasins.map(magasin => (
                      <option key={magasin.id} value={magasin.id}>
                        {(magasin as any).nom || magasin.name} (Magasin)
                      </option>
                    ))
                  }

                  {newConversationType === 'PRIVATE' && user?.role === 'admin' &&
                    allChauffeurs.map(chauffeur => (
                      <option key={chauffeur.id} value={chauffeur.id}>
                        {chauffeur.prenom} {chauffeur.nom} (Chauffeur)
                      </option>
                    ))
                  }
                  </select>
                </div>
              )}

              {/* Second participant select - uniquement pour admin avec CHAUFFEUR_MAGASIN */}
              {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'admin' && newConversationParticipant && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chauffeur {eligibleChauffeursForMagasin.length > 0 && `(${eligibleChauffeursForMagasin.length} avec commandes actives)`}
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={newConversationSecondParticipant}
                    onChange={(e) => setNewConversationSecondParticipant(e.target.value)}
                  >
                    <option value="">
                      {eligibleChauffeursForMagasin.length === 0
                        ? 'Chargement des chauffeurs...'
                        : 'Sélectionner un chauffeur'}
                    </option>
                    {eligibleChauffeursForMagasin.map(chauffeur => (
                      <option key={chauffeur.id} value={chauffeur.id}>
                        {chauffeur.prenom} {chauffeur.nom} (Chauffeur avec commandes actives)
                      </option>
                    ))}
                  </select>

                  {eligibleChauffeursForMagasin.length === 0 && (
                    <p className="text-sm text-orange-600 mt-2">
                      ⚠️ Aucun chauffeur avec commande active pour ce magasin
                    </p>
                  )}
                </div>
              )}

              {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'chauffeur' && eligibleMagasins.length === 0 && (
                <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                  ⚠️ Aucun magasin disponible. Vous devez avoir des commandes actives (non "En attente") pour pouvoir contacter un magasin.
                </div>
              )}

              {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'chauffeur' && eligibleMagasins.length > 0 && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  ✅ {eligibleMagasins.length} magasin(s) disponible(s) basé(s) sur vos commandes actives.
                </div>
              )}

              {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'magasin' && eligibleChauffeurs.length === 0 && (
                <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                  ⚠️ Aucun chauffeur disponible. Vous devez avoir des commandes actives (non "En attente") pour pouvoir contacter un chauffeur.
                </div>
              )}

              {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'magasin' && eligibleChauffeurs.length > 0 && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  ✅ {eligibleChauffeurs.length} chauffeur(s) disponible(s) basé(s) sur vos commandes actives.
                </div>
              )}

              {newConversationType === 'CHAUFFEUR_MAGASIN' && user?.role === 'admin' && (
                <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  ℹ️ Cette conversation sera créée uniquement si il existe des commandes actives entre le chauffeur et le magasin sélectionné.
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateConversationModal(false);
                  setNewConversationType('');
                  setNewConversationParticipant('');
                  setNewConversationSecondParticipant('');
                  setEligibleChauffeursForMagasin([]);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateConversation}
                disabled={
                  isCreatingConversation ||
                  !newConversationType ||
                  (
                    // Participant requis sauf pour ces cas spéciaux :
                    !newConversationParticipant &&
                    !(
                      // Chauffeur/Magasin → Direction automatique
                      ((user?.role === 'chauffeur' || user?.role === 'magasin') && newConversationType === 'PRIVATE') ||
                      // Magasin → Direction automatique
                      (user?.role === 'magasin' && newConversationType === 'MAGASIN_DIRECTION')
                    )
                  ) ||
                  // Pour admin CHAUFFEUR_MAGASIN, les 2 participants sont requis
                  (user?.role === 'admin' && newConversationType === 'CHAUFFEUR_MAGASIN' &&
                   (!newConversationParticipant || !newConversationSecondParticipant))
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCreatingConversation ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Création...</span>
                  </>
                ) : (
                  <span>Créer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeMessaging;