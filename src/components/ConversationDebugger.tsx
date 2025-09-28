import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MagasinInfo, PersonnelInfo } from '../types/business.types';

interface Participant {
  id: string;
  name: string;
  type: 'MAGASIN' | 'CHAUFFEUR' | 'ADMIN';
  email?: string;
}

interface ConversationDebug {
  id: string;
  name?: string;
  type: string;
  participantIds: string[];
  magasinId?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    messages?: number;
  };
}

const ConversationDebugger: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationDebug[]>([]);
  const [allUsers, setAllUsers] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      // Récupérer toutes les conversations
      const convResponse = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations?isActive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (convResponse.ok) {
        const convData = await convResponse.json();
        setConversations(convData);
      }

      // Récupérer magasins et chauffeurs comme le reste de l'app
      try {
        const [magasinsResponse, chauffeursResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/magasins`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_API_URL}/chauffeurs`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const participants: Participant[] = [];

        if (magasinsResponse.ok) {
          const magasinsData = await magasinsResponse.json();
          const magasins = magasinsData.data || magasinsData;
          participants.push(...magasins.map((m: any) => ({
            id: m.id,
            name: m.nom || m.name, // Utiliser 'nom' du backend ou 'name' du frontend
            type: 'MAGASIN' as const,
            email: m.email
          })));
        }

        if (chauffeursResponse.ok) {
          const chauffeursData = await chauffeursResponse.json();
          const chauffeurs = chauffeursData.data || chauffeursData;
          participants.push(...chauffeurs.map((c: PersonnelInfo) => ({
            id: c.id,
            name: `${c.nom} ${c.prenom}`.trim(),
            type: 'CHAUFFEUR' as const,
            email: c.email
          })));
        }

        // Ajouter l'admin actuel si c'est un admin
        if (user.role === 'admin') {
          participants.push({
            id: user.id,
            name: `${user.name}`.trim(),
            type: 'ADMIN',
            email: user.email
          });
        }

        setAllUsers(participants);
      } catch (error) {
        console.warn('Error fetching participants:', error);
        setAllUsers([]);
      }

    } catch (error) {
      console.error('Erreur lors du fetch debug:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUserName = (userId: string) => {
    if (allUsers.length === 0) {
      // Mode simplifié sans données
      return userId === user?.id ? `${user.email} (${user.role}) - MOI` : `ID: ${userId}`;
    }
    const foundUser = allUsers.find(u => u.id === userId);
    if (foundUser) {
      return `${foundUser.name} (${foundUser.type}) - ${foundUser.email}`;
    }
    return userId === user?.id ? `${user.email} (${user.role}) - MOI` : `ID: ${userId}`;
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-lg max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          🔍 Debug Conversations
        </h3>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-600">
          <strong>User actuel:</strong> {user.email} ({user.role})
        </div>

        <div className="text-xs text-gray-600">
          <strong>Conversations ({conversations.length}):</strong>
        </div>

        {conversations.map((conv, index) => (
          <div key={conv.id} className="border border-gray-200 rounded p-2 text-xs">
            <div><strong>#{index + 1}</strong> - {conv.name || 'Sans nom'}</div>
            <div><strong>Type:</strong> {conv.type}</div>
            <div><strong>ID:</strong> {conv.id}</div>
            <div><strong>Participants:</strong></div>
            <ul className="ml-2 list-disc">
              {conv.participantIds?.map((pid: string, i: number) => (
                <li key={i}>{getUserName(pid)}</li>
              ))}
            </ul>
            <div><strong>Messages:</strong> {conv._count?.messages || 0}</div>
            <div><strong>Créé:</strong> {new Date(conv.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationDebugger;