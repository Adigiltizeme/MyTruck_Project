import { useState, useEffect } from 'react';
import { AirtableService } from '../services/airtable.service';

export const useAirtable = () => {
  const [service, setService] = useState<AirtableService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAirtable = async () => {
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
  }, []);

  return { service, error, isInitialized };
};