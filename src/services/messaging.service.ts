import { ApiService } from './api.service';

export interface Conversation {
  id: string;
  type: 'MAGASIN_DIRECTION' | 'COMMANDE_GROUP' | 'PRIVATE';
  name?: string;
  participantIds: string[];
  magasinId?: string;
  commandeId?: string;
  chauffeurId?: string;
  isActive: boolean;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  magasin?: {
    id: string;
    nom: string;
    email: string;
  };
  commande?: {
    id: string;
    numeroCommande: string;
    statutCommande: string;
    statutLivraison: string;
  };
  chauffeur?: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
  };
  _count?: {
    messages: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'MAGASIN' | 'DIRECTION' | 'CHAUFFEUR' | 'SYSTEM';
  content: string;
  messageType: 'TEXT' | 'DEVIS_REQUEST' | 'DEVIS_RESPONSE' | 'COMMANDE_UPDATE' | 'SYSTEM_NOTIFICATION';
  isRead: boolean;
  readBy: string[];
  contactId?: string;
  sentAt: string;
  readAt?: string;
  contact?: {
    id: string;
    raison: string;
    nomMagasin: string;
  };
}

export interface CreateConversationRequest {
  type: 'MAGASIN_DIRECTION' | 'COMMANDE_GROUP' | 'PRIVATE';
  name?: string;
  participantIds: string[];
  magasinId?: string;
  commandeId?: string;
  chauffeurId?: string;
}

export interface CreateMessageRequest {
  conversationId: string;
  senderId?: string;
  senderType?: 'MAGASIN' | 'DIRECTION' | 'CHAUFFEUR' | 'SYSTEM';
  content: string;
  messageType?: 'TEXT' | 'DEVIS_REQUEST' | 'DEVIS_RESPONSE' | 'COMMANDE_UPDATE' | 'SYSTEM_NOTIFICATION';
  contactId?: string;
}

export interface ConversationFilters {
  type?: 'MAGASIN_DIRECTION' | 'COMMANDE_GROUP' | 'PRIVATE';
  magasinId?: string;
  commandeId?: string;
  chauffeurId?: string;
  isActive?: boolean;
  participantId?: string;
}

export interface MessageFilters {
  conversationId?: string;
  senderType?: 'MAGASIN' | 'DIRECTION' | 'CHAUFFEUR' | 'SYSTEM';
  messageType?: 'TEXT' | 'DEVIS_REQUEST' | 'DEVIS_RESPONSE' | 'COMMANDE_UPDATE' | 'SYSTEM_NOTIFICATION';
  isRead?: boolean;
  search?: string;
  dateDebut?: string;
  dateFin?: string;
}

export class MessagingService {
  private apiService = new ApiService();

  // ==========================================
  // CONVERSATIONS
  // ==========================================

  async getConversations(filters?: ConversationFilters): Promise<{ success: boolean; data: Conversation[] }> {
    try {
      const queryParams = new URLSearchParams();

      if (filters?.type) queryParams.append('type', filters.type);
      if (filters?.magasinId) queryParams.append('magasinId', filters.magasinId);
      if (filters?.commandeId) queryParams.append('commandeId', filters.commandeId);
      if (filters?.chauffeurId) queryParams.append('chauffeurId', filters.chauffeurId);
      if (filters?.isActive !== undefined) {
        // Envoyer directement le booléen dans l'URL pour que le backend le reçoive correctement
        queryParams.append('isActive', filters.isActive ? 'true' : 'false');
      }
      if (filters?.participantId) queryParams.append('participantId', filters.participantId);

      const url = `/messaging/conversations?${queryParams.toString()}`;
      console.log('🔍 getConversations API call:', { url, filters });

      const response = await this.apiService.get(url) as Conversation[];
      console.log('📡 getConversations API response:', {
        success: true,
        dataLength: Array.isArray(response) ? response.length : 0,
        data: response,
        firstConversation: response[0] ? {
          id: response[0].id,
          type: response[0].type,
          name: response[0].name,
          magasinId: response[0].magasinId,
          magasin: response[0].magasin,
          hasMagasinData: !!response[0].magasin
        } : null
      });

      if (Array.isArray(response) && response.length === 0) {
        console.warn('⚠️ API returned empty array - investigating...');
        console.log('🔍 Request details:', { url, filters });
      }

      return { success: true, data: Array.isArray(response) ? response : [] };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des conversations:', error);
      return { success: false, data: [] };
    }
  }

  async getConversation(id: string): Promise<{ success: boolean; data: Conversation | null }> {
    try {
      const response = await this.apiService.get(`/messaging/conversations/${id}`) as Conversation;
      return { success: true, data: response || null };
    } catch (error) {
      console.error('Erreur lors de la récupération de la conversation:', error);
      return { success: false, data: null };
    }
  }

  async createConversation(data: CreateConversationRequest): Promise<{ success: boolean; data: Conversation | null }> {
    try {
      const response = await this.apiService.post('/messaging/conversations', data) as Conversation;
      return { success: true, data: response || null };
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      return { success: false, data: null };
    }
  }

  async markConversationAsRead(conversationId: string): Promise<{ success: boolean }> {
    try {
      await this.apiService.put(`/messaging/conversations/${conversationId}/read`, {});
      return { success: true };
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      return { success: false };
    }
  }

  // ==========================================
  // MESSAGES
  // ==========================================

  async sendMessage(data: CreateMessageRequest): Promise<{ success: boolean; data: Message | null }> {
    try {
      const response = await this.apiService.post('/messaging/messages', data) as Message;
      return { success: true, data: response || null };
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      return { success: false, data: null };
    }
  }

  async getMessages(filters?: MessageFilters): Promise<{ success: boolean; data: Message[] }> {
    try {
      const queryParams = new URLSearchParams();

      if (filters?.conversationId) queryParams.append('conversationId', filters.conversationId);
      if (filters?.senderType) queryParams.append('senderType', filters.senderType);
      if (filters?.messageType) queryParams.append('messageType', filters.messageType);
      if (filters?.isRead !== undefined) {
        // Envoyer directement le booléen dans l'URL pour que le backend le reçoive correctement
        queryParams.append('isRead', filters.isRead ? 'true' : 'false');
      }
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.dateDebut) queryParams.append('dateDebut', filters.dateDebut);
      if (filters?.dateFin) queryParams.append('dateFin', filters.dateFin);

      const response = await this.apiService.get(`/messaging/messages?${queryParams.toString()}`) as Message[];
      return { success: true, data: Array.isArray(response) ? response : [] };
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return { success: false, data: [] };
    }
  }

  // ==========================================
  // CONVERSATIONS SPÉCIALISÉES
  // ==========================================

  async createMagasinDirectionConversation(magasinId: string): Promise<{ success: boolean; data: Conversation | null }> {
    try {
      const response = await this.apiService.post(`/messaging/conversations/magasin-direction/${magasinId}`, {}) as Conversation;
      return { success: true, data: response || null };
    } catch (error) {
      console.error('Erreur lors de la création de la conversation magasin-direction:', error);
      return { success: false, data: null };
    }
  }

  async createCommandeGroupConversation(commandeId: string, magasinId: string, chauffeurId: string): Promise<{ success: boolean; data: Conversation | null }> {
    try {
      const response = await this.apiService.post(`/messaging/conversations/commande-group/${commandeId}`, {
        magasinId,
        chauffeurId
      }) as Conversation;
      return { success: true, data: response || null };
    } catch (error) {
      console.error('Erreur lors de la création de la conversation de groupe:', error);
      return { success: false, data: null };
    }
  }

  async createDirectionChauffeurConversation(chauffeurId: string): Promise<{ success: boolean; data: Conversation | null }> {
    try {
      const response = await this.apiService.post(`/messaging/conversations/direction-chauffeur/${chauffeurId}`, {}) as Conversation;
      return { success: true, data: response || null };
    } catch (error) {
      console.error('Erreur lors de la création de la conversation direction-chauffeur:', error);
      return { success: false, data: null };
    }
  }

  // ==========================================
  // INTÉGRATION CONTACT
  // ==========================================

  async convertContactToMessage(contactId: string): Promise<{ success: boolean; data: { conversation: Conversation; initialMessage: Message } | null }> {
    try {
      const response = await this.apiService.post(`/messaging/contacts/${contactId}/convert`, {}) as { conversation: Conversation; initialMessage: Message };
      return { success: true, data: response || null };
    } catch (error) {
      console.error('Erreur lors de la conversion du contact:', error);
      return { success: false, data: null };
    }
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  async getConversationsForMagasin(magasinId: string): Promise<{ success: boolean; data: Conversation[] }> {
    try {
      const response = await this.apiService.get(`/messaging/conversations/for-magasin/${magasinId}`) as Conversation[];
      return { success: true, data: Array.isArray(response) ? response : [] };
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations du magasin:', error);
      return { success: false, data: [] };
    }
  }

  async getConversationForCommande(commandeId: string): Promise<{ success: boolean; data: Conversation | null }> {
    try {
      const response = await this.apiService.get(`/messaging/conversations/for-commande/${commandeId}`) as Conversation;
      return { success: true, data: response || null };
    } catch (error) {
      console.error('Erreur lors de la récupération de la conversation de commande:', error);
      return { success: false, data: null };
    }
  }

  async getConversationsForChauffeur(chauffeurId: string): Promise<{ success: boolean; data: Conversation[] }> {
    try {
      const response = await this.apiService.get(`/messaging/conversations/for-chauffeur/${chauffeurId}`) as Conversation[];
      return { success: true, data: Array.isArray(response) ? response : [] };
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations du chauffeur:', error);
      return { success: false, data: [] };
    }
  }
}