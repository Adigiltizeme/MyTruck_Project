import React, { useState, useEffect, useCallback } from 'react';
import { DraftStorageService } from '../services/draftStorage';
import { CommandeMetier } from '../types/business.types';

export const useDraftStorage = () => {
    // Initialisation du service en dehors des effets
    const draftService = React.useMemo(() => new DraftStorageService(), []);

    const [draftData, setDraftData] = useState<Partial<CommandeMetier> | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [draftProposed, setDraftProposed] = useState(false);

    // Effet unique pour charger les données initiales
    useEffect(() => {
        const loadDraft = async () => {
            try {
                const result = await draftService.loadDraft();
                if (result.success && result.data) {
                    setDraftData(result.data.data);
                    setHasDraft(true);
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Erreur de chargement'));
            } finally {
                setLoading(false);
            }
        };

        loadDraft();
    }, []);

    const clearDraft = useCallback(async () => {
        console.log('Tentative de suppression du brouillon');
        try {
            const result = await draftService.clearDraft();
            if (result.success) {
                setDraftData(null);
                setHasDraft(false);
                console.log('Brouillon supprimé avec succès');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du brouillon:', error);
        }
    }, []);

    return {
        draftData,
        loading,
        error,
        hasDraft,
        draftProposed,
        setDraftProposed,
        saveDraft: async (data: Partial<CommandeMetier>) => draftService.saveDraft(data),
        clearDraft
    };
};