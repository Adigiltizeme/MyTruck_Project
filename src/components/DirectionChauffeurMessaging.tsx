import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessagingService, Conversation } from '../services/messaging.service';
import MessagingCenter from './MessagingCenter';
import { UserIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface DirectionChauffeurMessagingProps {
  chauffeurId: string;
  chauffeurInfo?: {
    nom: string;
    prenom: string;
    telephone?: string;
    email?: string;
  };
  onClose?: () => void;
}

const DirectionChauffeurMessaging: React.FC<DirectionChauffeurMessagingProps> = ({
  chauffeurId,
  chauffeurInfo,
  onClose
}) => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagingService = new MessagingService();

  useEffect(() => {
    initializeConversation();
  }, [chauffeurId]);

  const initializeConversation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier si une conversation existe déjà avec ce chauffeur
      const existingConversations = await messagingService.getConversationsForChauffeur(chauffeurId);

      if (existingConversations.success && existingConversations.data.length > 0) {
        // Prendre la conversation privée avec la direction
        const directionConversation = existingConversations.data.find(conv =>
          conv.type === 'PRIVATE' &&
          conv.participantIds.includes('DIRECTION')
        );

        if (directionConversation) {
          setConversation(directionConversation);
        } else {
          // Créer une nouvelle conversation
          await createDirectionConversation();
        }
      } else {
        // Créer une nouvelle conversation
        await createDirectionConversation();
      }
    } catch (err) {
      console.error('Erreur lors de l\'initialisation de la conversation:', err);
      setError('Erreur lors de l\'initialisation de la conversation');
    } finally {
      setLoading(false);
    }
  };

  const createDirectionConversation = async () => {
    try {
      const result = await messagingService.createDirectionChauffeurConversation(chauffeurId);

      if (result.success && result.data) {
        setConversation(result.data);
      } else {
        throw new Error('Échec de la création de la conversation');
      }
    } catch (error) {
      throw new Error(`Erreur lors de la création de la conversation: ${error}`);
    }
  };

  const getConversationTitle = (): string => {
    if (chauffeurInfo) {
      return `Discussion avec ${chauffeurInfo.prenom} ${chauffeurInfo.nom}`;
    }
    return `Discussion avec le chauffeur`;
  };

  const isDirection = (): boolean => {
    return user?.role === 'admin';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            {onClose && (
              <div className="mt-4">
                <button
                  onClick={onClose}
                  className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200"
                >
                  Retour
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête de la conversation */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <UserIcon className="h-6 w-6 text-blue-500" />
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getConversationTitle()}
              </h2>
              <p className="text-sm text-gray-600">
                {isDirection() ? 'Conversation avec chauffeur' : 'Conversation avec My Truck Direction'}
                {chauffeurInfo?.telephone && (
                  <span className="ml-2">• {chauffeurInfo.telephone}</span>
                )}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Centre de messagerie */}
      {conversation && (
        <MessagingCenter
          initialConversationId={conversation.id}
          chauffeurId={chauffeurId}
        />
      )}
    </div>
  );
};

export default DirectionChauffeurMessaging;