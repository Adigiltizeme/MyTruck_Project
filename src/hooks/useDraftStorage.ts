import React, { useState, useEffect } from 'react';
import { DraftStorageService } from '../services/draftStorage';
import { CommandeMetier } from '../types/business.types';

export const useDraftStorage = () => {
    // Initialisation du service en dehors des effets
    const draftService = React.useMemo(() => new DraftStorageService(), []);

    const [draftData, setDraftData] = useState<Partial<CommandeMetier> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Effet unique pour charger les données initiales
    useEffect(() => {
        const loadInitialDraft = async () => {
            setLoading(true);
            try {
                const result = await draftService.loadDraft();
                if (result.success && result.data) {
                    setDraftData(result.data.data);
                }
            } catch (err) {
                console.error('Erreur lors du chargement du brouillon:', err);
                setError(err instanceof Error ? err : new Error('Erreur de chargement'));
            } finally {
                setLoading(false);
            }
        };

        loadInitialDraft();
    }, []);

    // Actions du service enveloppées dans des callbacks stables
    const saveDraft = async (data: Partial<CommandeMetier>) => {
        try {
            const result = await draftService.saveDraft(data);
            if (result.success) {
                setDraftData(data);
            }
            return result;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Erreur de sauvegarde'));
            throw err;
        }
    };

    const clearDraft = async () => {
        try {
            const result = await draftService.clearDraft();
            if (result.success) {
                setDraftData(null);
            }
            return result;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Erreur de suppression'));
            throw err;
        }
    };

    return {
        draftData,
        loading,
        error,
        saveDraft,
        clearDraft,
        hasDraft: Boolean(draftData)
    };
};