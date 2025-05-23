import { useState, useEffect } from 'react';
import { AirtableService } from '../services/airtable.service';
import { useOffline } from '../contexts/OfflineContext';

export const useAirtable = () => {
  const [service, setService] = useState<AirtableService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isOffline = localStorage.getItem('forceOfflineMode') === 'true';

  const { dataService } = useOffline();

  useEffect(() => {
    const initializeAirtable = async () => {
      // Ne pas initialiser si mode hors ligne
      if (isOffline) {
        console.log('Mode hors ligne détecté - Initialisation Airtable ignorée');
        setIsInitialized(false);
        return;
      }

      try {
        const token = import.meta.env.VITE_AIRTABLE_TOKEN;
        if (!token) {
          throw new Error('Token Airtable non trouvé dans les variables d\'environnement');
        }

        const airtableService = new AirtableService(token);
        await airtableService.initialize();
        setService(airtableService);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur d\'initialisation Airtable';
        setError(message);
        setIsInitialized(false);
      }
    };

    initializeAirtable();
  }, [isOffline]); // Ajout de isOffline comme dépendance

  return { service, error, isInitialized };
};