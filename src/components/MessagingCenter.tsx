import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../hooks/useMessaging';
import { Conversation, Message } from '../services/messaging.service';
import { ChatBubbleLeftIcon, PaperAirplaneIcon, UsersIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/solid';

interface MessagingCenterProps {
  initialConversationId?: string;
  magasinId?: string;
  commandeId?: string;
  chauffeurId?: string;
}

const MessagingCenter: React.FC<MessagingCenterProps> = ({
  initialConversationId,
  magasinId,
  commandeId,
  chauffeurId
}) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    selectedConversation,
    messages,
    isConnected,
    isLoading,
    error,
    selectConversation,
    sendMessage: sendMessageHook,
    onlineUsers,
    typingUsers,
    startTyping,
    stopTyping
  } = useMessaging({
    conversationId: initialConversationId,
    autoConnect: true
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      startTyping(selectedConversation.id);
      const timeout = setTimeout(() => {
        stopTyping(selectedConversation.id);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [newMessage, selectedConversation, startTyping, stopTyping]);

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      await sendMessageHook(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    selectConversation(conversation);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getTypingIndicator = () => {
    if (!selectedConversation) return null;

    const currentTyping = typingUsers[selectedConversation.id];
    if (!currentTyping || currentTyping.length === 0) return null;

    return (
      <div className="text-xs text-gray-500 italic p-2">
        {currentTyping.length === 1
          ? `${currentTyping[0]} est en train d'écrire...`
          : `${currentTyping.join(', ')} sont en train d'écrire...`
        }
      </div>
    );
  };

  const getSenderName = (message: Message) => {
    switch (message.senderType) {
      case 'MAGASIN':
        return selectedConversation?.magasin?.nom || 'Magasin';
      case 'DIRECTION':
        return 'My Truck Direction';
      case 'CHAUFFEUR':
        const chauffeur = selectedConversation?.chauffeur;
        return chauffeur ? `${chauffeur.prenom} ${chauffeur.nom}` : 'Chauffeur';
      case 'SYSTEM':
        return 'Système';
      default:
        return 'Utilisateur';
    }
  };

  const getMessageTypeLabel = (messageType: string) => {
    switch (messageType) {
      case 'DEVIS_REQUEST':
        return 'Demande de devis';
      case 'DEVIS_RESPONSE':
        return 'Réponse de devis';
      case 'COMMANDE_UPDATE':
        return 'Mise à jour commande';
      case 'SYSTEM_NOTIFICATION':
        return 'Notification système';
      default:
        return '';
    }
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.name) return conversation.name;

    switch (conversation.type) {
      case 'MAGASIN_DIRECTION':
        return `Discussion avec ${conversation.magasin?.nom || 'Direction'}`;
      case 'COMMANDE_GROUP':
        return `Commande ${conversation.commande?.numeroCommande || 'Inconnue'}`;
      case 'PRIVATE':
        return 'Discussion privée';
      default:
        return 'Conversation';
    }
  };

  const getConversationIcon = (conversation: Conversation) => {
    switch (conversation.type) {
      case 'COMMANDE_GROUP':
        return UsersIcon;
      case 'MAGASIN_DIRECTION':
      case 'PRIVATE':
      default:
        return ChatBubbleLeftIcon;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg h-[600px] flex">
      {/* Liste des conversations */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ChatBubbleLeftEllipsisIcon className="h-5 w-5 mr-2" />
            Messagerie
            {!isConnected && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Hors ligne
              </span>
            )}
            {isConnected && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                En ligne
              </span>
            )}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Aucune conversation</p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const Icon = getConversationIcon(conversation);
              const unreadCount = conversation._count?.messages || 0;

              return (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <Icon className="h-5 w-5 mr-3 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {getConversationName(conversation)}
                        </p>
                        {conversation.lastMessageAt && (
                          <p className="text-xs text-gray-500">
                            {format(new Date(conversation.lastMessageAt), 'dd/MM à HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Zone de conversation */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* En-tête de conversation */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {getConversationName(selectedConversation)}
              </h3>
              {selectedConversation.type === 'COMMANDE_GROUP' && selectedConversation.commande && (
                <p className="text-sm text-gray-600">
                  Statut: {selectedConversation.commande.statutLivraison}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Aucun message dans cette conversation</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  const messageTypeLabel = getMessageTypeLabel(message.messageType);

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-blue-500 text-white'
                          : message.senderType === 'SYSTEM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-200 text-gray-900'
                      }`}>
                        {!isOwn && (
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {getSenderName(message)}
                          </p>
                        )}

                        {messageTypeLabel && (
                          <p className="text-xs mb-1 opacity-75 font-medium">
                            📋 {messageTypeLabel}
                          </p>
                        )}

                        <p className="text-sm">{message.content}</p>

                        <p className={`text-xs mt-1 opacity-75 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {format(new Date(message.sentAt), 'HH:mm')}
                          {message.isRead && isOwn && (
                            <span className="ml-1">✓</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Indicateur de frappe */}
            {getTypingIndicator()}

            {/* Zone de saisie */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Tapez votre message..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <ChatBubbleLeftIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Sélectionnez une conversation</p>
              <p className="text-sm">Choisissez une conversation pour commencer à échanger</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingCenter;