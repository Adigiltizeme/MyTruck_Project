import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../hooks/useMessaging';
import { Conversation, Message } from '../services/messaging.service';

const RealTimeMessaging: React.FC = () => {
  const { user } = useAuth();

  // Debug de l'utilisateur au montage
  useEffect(() => {
    console.log('📱 RealTimeMessaging mounted with user:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email
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
    if (user && !isLoading) {
      createDefaultConversations();
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
    console.log('🏗️ createDefaultConversations called with user:', { hasUser: !!user, userId: user?.id });

    if (!user) {
      console.warn('❌ No user found, skipping default conversations');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      console.log('🔑 Token for API call:', { hasToken: !!token });

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
      } else {
        console.log('✅ Conversation Direction créée/récupérée avec succès');
        const data = await response.json();
        console.log('Response data:', data);

        // Pas besoin de recharger ici - le hook useMessaging le fait déjà
        console.log('✅ Conversation prête - pas de rechargement nécessaire');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création des conversations par défaut:', error);
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

  const getConversationTitle = (conversation: Conversation): string => {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'MAGASIN_DIRECTION') return 'Discussion avec My Truck Direction';
    if (conversation.type === 'COMMANDE_GROUP') return `Commande ${conversation.commandeId}`;
    return 'Conversation privée';
  };

  const getUnreadCount = (conversation: Conversation): number => {
    return conversation._count?.messages || 0;
  };

  const getCurrentTypingUsers = (conversationId: string): string[] => {
    return typingUsers[conversationId] || [];
  };

  return (
    <div className="h-screen flex bg-gray-50">
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
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversationId === conversation.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900 text-sm truncate">
                      {getConversationTitle(conversation)}
                    </h3>
                    {getUnreadCount(conversation) > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                        {getUnreadCount(conversation)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      {conversation.lastMessageAt && format(new Date(conversation.lastMessageAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                    {conversation.type === 'COMMANDE_GROUP' && conversation.commandeId && (
                      <div className="text-xs text-blue-600 mt-1">
                        Commande #{conversation.commandeId}
                        {conversation.commande && ` • ${conversation.commande.statutCommande}`}
                      </div>
                    )}
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
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {filteredConversations.find(c => c.id === selectedConversationId)?.name || 'Conversation'}
                  </h2>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>
                      {filteredConversations.find(c => c.id === selectedConversationId)?.participantIds.length} participant(s)
                    </span>
                    {onlineUsers.length > 0 && (
                      <span>• {onlineUsers.length} en ligne</span>
                    )}
                  </div>
                </div>
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
                        {message.senderType}
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