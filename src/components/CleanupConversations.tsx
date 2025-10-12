import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../utils/role-helpers';

const CleanupConversations: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCleanup = async () => {
    if (!user || !isAdminRole(user.role)) {
      alert('Seuls les administrateurs peuvent effectuer cette action');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('authToken');

      // Premier nettoyage : duplicatas standards
      console.log('🧹 Phase 1: Nettoyage duplicatas...');
      const response1 = await fetch(`${import.meta.env.VITE_API_URL}/messaging/admin/cleanup-duplicate-conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      let result1 = { deleted: 0, message: 'Pas de duplicatas trouvés' };
      if (response1.ok) {
        result1 = await response1.json();
      }

      // Deuxième nettoyage : conversations admin invalides
      console.log('🧹 Phase 2: Suppression conversations admin invalides...');
      const response2 = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations?isActive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let deletedAdminConversations = 0;
      if (response2.ok) {
        const conversations = await response2.json();

        // Trouver toutes les conversations "Direction" pour les admins
        const adminDirectionConversations = conversations.filter((conv: any) =>
          (conv.name?.includes('My Truck Direction') || conv.name?.includes('Discussion avec My Truck Direction')) &&
          conv.participantIds?.some((pid: string) => pid === user.id)
        );

        // Supprimer ces conversations
        for (const conv of adminDirectionConversations) {
          try {
            const deleteResponse = await fetch(`${import.meta.env.VITE_API_URL}/messaging/conversations/${conv.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (deleteResponse.ok) {
              deletedAdminConversations++;
              console.log(`✅ Suppression conversation admin: ${conv.id}`);
            }
          } catch (deleteError) {
            console.warn(`⚠️ Erreur suppression ${conv.id}:`, deleteError);
          }
        }
      }

      const finalResult = {
        success: true,
        deleted: result1.deleted + deletedAdminConversations,
        message: `${result1.deleted} duplicatas + ${deletedAdminConversations} conversations admin supprimées`,
        phases: {
          phase1: result1,
          phase2: { deleted: deletedAdminConversations }
        }
      };

      setResult(finalResult);
      console.log('🧹 Cleanup final result:', finalResult);

      // Recharger la page pour mettre à jour la liste des conversations
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdminRole(user?.role)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50">
      <div className="flex flex-col space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">
          🧹 Nettoyage Admin
        </h3>

        <button
          onClick={handleCleanup}
          disabled={isLoading}
          className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Nettoyage...' : 'Nettoyer conversations dupliquées'}
        </button>

        {result && (
          <div className={`text-xs p-2 rounded ${
            result.success
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {result.success ? (
              <div>
                <div>✅ Nettoyage terminé</div>
                <div>🗑️ Supprimées: {result.deleted || 0}</div>
                <div>📄 Message: {result.message}</div>
              </div>
            ) : (
              <div>❌ Erreur: {result.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CleanupConversations;