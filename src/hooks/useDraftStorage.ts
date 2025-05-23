import React, { useState, useEffect, useCallback } from 'react';
import { DraftStorageService } from '../services/draftStorage';
import { CommandeMetier } from '../types/business.types';
import { useAuth } from '../contexts/AuthContext';

export const useDraftStorage = () => {
    // Initialisation du service en dehors des effets
    const draftService = React.useMemo(() => new DraftStorageService(), []);

    const [draftData, setDraftData] = useState<Partial<CommandeMetier> | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [draftProposed, setDraftProposed] = useState(false);

    const { user } = useAuth();

    // Clé spécifique au magasin pour le stockage local
    const getDraftKey = useCallback(() => {
        if (user?.role === 'magasin' && user.storeId) {
            return `commandeDraft_${user.storeId}`;
        }
        return 'commandeDraft'; // Clé par défaut pour admin ou utilisateurs sans magasin
    }, [user?.role, user?.storeId]);

    // Effet unique pour charger les données initiales
    useEffect(() => {
        const loadDraft = async () => {
            try {
                // Ne charger le brouillon que si on est en mode magasin
                if (user?.role === 'magasin' && user.storeId) {
                    console.log(`Tentative de chargement du brouillon pour le magasin ${user.storeId}`);

                    const result = await draftService.loadDraft(user.storeId);
                    if (result.success && result.data) {
                        // Vérifier que les dimensions des articles sont préservées
                        const draftData = result.data.data;

                        // S'assurer que les dimensions sont correctement définies
                        if (draftData.articles && !draftData.articles.dimensions) {
                            draftData.articles.dimensions = [];
                        }

                        console.log(`Brouillon trouvé pour le magasin ${user.storeName} ${user.storeId} avec ${draftData.articles?.dimensions?.length || 0} dimensions d'articles`);
                        setDraftData(draftData);
                        setHasDraft(true);
                    } else {
                        console.log(`Aucun brouillon disponible pour le magasin ${user.storeName} ${user.storeId}`);
                        setHasDraft(false);
                        setDraftData(null);
                    }
                } else {
                    // Pas en mode magasin ou pas de storeId
                    setHasDraft(false);
                    setDraftData(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Erreur de chargement'));
            } finally {
                setLoading(false);
            }
        };

        loadDraft();
    }, [user?.role, user?.storeId]); // Recharger quand le magasin change

    const clearDraft = useCallback(async () => {
        console.log('Tentative de suppression du brouillon');
        try {
            const result = await draftService.clearDraft(user?.storeId);
            if (result.success) {
                setDraftData(null);
                setHasDraft(false);
                console.log('Brouillon supprimé avec succès');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du brouillon:', error);
        }
    }, [user?.storeId, draftService]);

    const saveDraft = useCallback(async (data: Partial<CommandeMetier>) => {
        console.log('Sauvegarde du brouillon avec dimensions:', data.articles?.dimensions);
        return await draftService.saveDraft(data, user?.storeId);
    }, [user?.storeId, draftService]);

    const updateDraftStoreInfo = (storeId: string, storeName: string, storeAddress: string) => {
        if (hasDraft && draftData) {
            const updatedDraft = {
                ...draftData,
                magasin: {
                    ...draftData.magasin,
                    id: storeId,
                    name: storeName,
                    address: storeAddress,
                    phone: draftData.magasin?.phone || '',
                    email: draftData.magasin?.email || '',
                    manager: draftData.magasin?.manager || '',
                    status: draftData.magasin?.status || 'Ouvert'
                }
            };

            saveDraft(updatedDraft);
            console.log(`Brouillon mis à jour pour le nouveau magasin: ${storeName} (${storeId})`);

            // Mettre à jour l'état local
            setDraftData(updatedDraft);
        }
    };

    return {
        draftData,
        loading,
        error,
        hasDraft,
        draftProposed,
        setDraftProposed,
        saveDraft: async (data: Partial<CommandeMetier>) => draftService.saveDraft(data),
        clearDraft,
        updateDraftStoreInfo
    };
};