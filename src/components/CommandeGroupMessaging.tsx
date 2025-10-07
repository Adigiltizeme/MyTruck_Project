import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessagingService, Conversation } from '../services/messaging.service';
import { Commande, StatutCommande, StatutLivraison } from '../types/commande.types';
import MessagingCenter from './MessagingCenter';
import { UsersIcon, ChatBubbleLeftRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface CommandeGroupMessagingProps {
  commande: Commande;
  chauffeurId?: string;
  onClose?: () => void;
}

interface ChauffeurInfo {
  id: string;
  nom: string;
  prenom: string;
  telephone?: string;
}

const CommandeGroupMessaging: React.FC<CommandeGroupMessagingProps> = ({
  commande,
  chauffeurId,
  onClose
}) => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chauffeurInfo, setChauffeurInfo] = useState<ChauffeurInfo | null>(null);

  const messagingService = new MessagingService();

  useEffect(() => {
    initializeConversation();
  }, [commande.id, chauffeurId]);

  const initializeConversation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier si une conversation existe déjà pour cette commande
      const existingResult = await messagingService.getConversationForCommande(commande.id);

      if (existingResult.success && existingResult.data) {
        setConversation(existingResult.data);
      } else if (canCreateGroupConversation()) {
        // Créer une nouvelle conversation de groupe
        await createGroupConversation();
      } else {
        setError('Impossible de créer une conversation de groupe pour cette commande');
      }
    } catch (err) {
      console.error('Erreur lors de l\'initialisation de la conversation:', err);
      setError('Erreur lors de l\'initialisation de la conversation');
    } finally {
      setLoading(false);
    }
  };

  const canCreateGroupConversation = (): boolean => {
    // Une conversation de groupe peut être créée si :
    // 1. La commande n'est pas en attente
    // 2. Un chauffeur est assigné
    // 3. Le statut de livraison permet la communication

    const commandeStatus = commande.fields['STATUT DE LA COMMANDE'] as StatutCommande;
    const livraisonStatus = commande.fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)'] as StatutLivraison;

    const allowedCommandeStatuses: StatutCommande[] = ['Confirmée'];
    const allowedLivraisonStatuses: StatutLivraison[] = [
      'CONFIRMEE',
      'ENLEVEE',
      'EN COURS DE LIVRAISON'
    ];

    return (
      allowedCommandeStatuses.includes(commandeStatus) &&
      allowedLivraisonStatuses.includes(livraisonStatus) &&
      !!chauffeurId
    );
  };

  const createGroupConversation = async () => {
    if (!chauffeurId || !user?.storeId) {
      throw new Error('Informations manquantes pour créer la conversation');
    }

    try {
      const result = await messagingService.createCommandeGroupConversation(
        commande.id,
        user.storeId,
        chauffeurId
      );

      if (result.success && result.data) {
        setConversation(result.data);
      } else {
        throw new Error('Échec de la création de la conversation');
      }
    } catch (error) {
      throw new Error(`Erreur lors de la création de la conversation de groupe: ${error}`);
    }
  };

  const getConversationTitle = (): string => {
    const numeroCommande = commande.fields['NUMERO DE COMMANDE'];
    const clientName = commande.fields['NOM COMPLET DU CLIENT'];
    return `Discussion - Commande ${numeroCommande} (${clientName})`;
  };

  const getStatusInfo = () => {
    const commandeStatus = commande.fields['STATUT DE LA COMMANDE'] as StatutCommande;
    const livraisonStatus = commande.fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)'] as StatutLivraison;

    return {
      commande: commandeStatus,
      livraison: livraisonStatus,
      canCommunicate: canCreateGroupConversation()
    };
  };

  const getStatusBadge = (status: StatutCommande | StatutLivraison, type: 'commande' | 'livraison') => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";

    if (type === 'commande') {
      const commandeColors = {
        'En attente': 'bg-yellow-100 text-yellow-800',
        'Confirmée': 'bg-green-100 text-green-800',
        'Annulée': 'bg-red-100 text-red-800',
        'Modifiée': 'bg-orange-100 text-orange-800'
      };
      return `${baseClasses} ${commandeColors[status as StatutCommande] || 'bg-gray-100 text-gray-800'}`;
    } else {
      const livraisonColors = {
        'EN ATTENTE': 'bg-yellow-100 text-yellow-800',
        'CONFIRMEE': 'bg-green-100 text-green-800',
        'ENLEVEE': 'bg-blue-100 text-blue-800',
        'EN COURS DE LIVRAISON': 'bg-purple-100 text-purple-800',
        'LIVREE': 'bg-green-100 text-green-800',
        'ANNULEE': 'bg-red-100 text-red-800',
        'ECHEC': 'bg-red-100 text-red-800'
      };
      return `${baseClasses} ${livraisonColors[status as StatutLivraison] || 'bg-gray-100 text-gray-800'}`;
    }
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
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
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

  if (!canCreateGroupConversation()) {
    const statusInfo = getStatusInfo();

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 mr-3" />
          <h3 className="text-lg font-medium text-yellow-800">
            Conversation de groupe non disponible
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-2">Statut de la commande</h4>
              <span className={getStatusBadge(statusInfo.commande, 'commande')}>
                {statusInfo.commande}
              </span>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-2">Statut de livraison</h4>
              <span className={getStatusBadge(statusInfo.livraison, 'livraison')}>
                {statusInfo.livraison}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-2">Conditions pour la messagerie de groupe:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li className={statusInfo.commande !== 'En attente' ? 'text-green-600' : 'text-red-600'}>
                Commande confirmée {statusInfo.commande !== 'En attente' ? '✓' : '✗'}
              </li>
              <li className={['CONFIRMEE', 'ENLEVEE', 'EN COURS DE LIVRAISON'].includes(statusInfo.livraison) ? 'text-green-600' : 'text-red-600'}>
                Livraison confirmée, enlevée ou en cours {['CONFIRMEE', 'ENLEVEE', 'EN COURS DE LIVRAISON'].includes(statusInfo.livraison) ? '✓' : '✗'}
              </li>
              <li className={chauffeurId ? 'text-green-600' : 'text-red-600'}>
                Chauffeur assigné {chauffeurId ? '✓' : '✗'}
              </li>
            </ul>
          </div>

          {onClose && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-600"
              >
                Retour
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec informations de la commande */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UsersIcon className="h-6 w-6 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getConversationTitle()}
              </h2>
              <p className="text-sm text-gray-600">
                Livraison: {commande.fields['DATE DE LIVRAISON']} •
                Créneau: {commande.fields['CRENEAU DE LIVRAISON']}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={getStatusBadge(getStatusInfo().commande, 'commande')}>
              {getStatusInfo().commande}
            </span>
            <span className={getStatusBadge(getStatusInfo().livraison, 'livraison')}>
              {getStatusInfo().livraison}
            </span>

            {onClose && (
              <button
                onClick={onClose}
                className="ml-4 px-3 py-2 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Centre de messagerie */}
      {conversation && (
        <MessagingCenter
          initialConversationId={conversation.id}
          commandeId={commande.id}
          magasinId={user?.storeId}
          chauffeurId={chauffeurId}
        />
      )}
    </div>
  );
};

export default CommandeGroupMessaging;