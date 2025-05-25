import React, { useState, useEffect, useCallback, useRef } from 'react';
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

    // Référence pour éviter les rechargements multiples
    const loadingRef = useRef(false);
    // Référence pour suivre le magasin actuel
    const currentStoreIdRef = useRef<string | null>(null);

    const { user } = useAuth();

    // Clé spécifique au magasin pour le stockage local
    const getDraftKey = useCallback(() => {
        if (user?.role === 'magasin' && user.storeId) {
            return `commandeDraft_${user.storeId}`;
        }
        return 'commandeDraft'; // Clé par défaut pour admin ou utilisateurs sans magasin
    }, [user?.role, user?.storeId]);

    // Effet pour charger le brouillon - SEULEMENT quand le magasin change
    // useEffect(() => {
    //     const loadDraftForCurrentStore = async () => {
    //         // Éviter les appels multiples simultanés
    //         if (loadingRef.current) {
    //             console.log("Chargement déjà en cours, ignoré");
    //             return;
    //         }

    //         // Vérifier si c'est un utilisateur magasin avec un store ID
    //         if (user?.role !== 'magasin' || !user.storeId) {
    //             setHasDraft(false);
    //             setDraftData(null);
    //             setLoading(false);
    //             currentStoreIdRef.current = null;
    //             return;
    //         }

    //         // Vérifier si le magasin a changé
    //         if (currentStoreIdRef.current === user.storeId) {
    //             setLoading(false);
    //             return; // Pas de changement, pas besoin de recharger
    //         }

    //         try {
    //             loadingRef.current = true;
    //             setLoading(true);

    //             console.log(`Chargement UNIQUE du brouillon pour le magasin ${user.storeName} (${user.storeId})`);

    //             const result = await draftService.loadDraft(user.storeId);
    //             if (result.success && result.data) {
    //                 const draftData = result.data.data;

    //                 // S'assurer que les dimensions sont correctement définies
    //                 if (draftData.articles && !draftData.articles.dimensions) {
    //                     draftData.articles.dimensions = [];
    //                 }

    //                 console.log(`Brouillon unique trouvé pour ${user.storeName} avec ${draftData.articles?.dimensions?.length || 0} dimensions`);
    //                 setDraftData(draftData);
    //                 setHasDraft(true);
    //                 setDraftProposed(false); // Réinitialiser pour permettre une nouvelle proposition
    //             } else {
    //                 console.log(`Aucun brouillon pour ${user.storeName}`);
    //                 setHasDraft(false);
    //                 setDraftData(null);
    //                 setDraftProposed(false);
    //             }

    //             // Mettre à jour la référence du magasin actuel
    //             currentStoreIdRef.current = user.storeId;
    //         } catch (err) {
    //             console.error("Erreur chargement brouillon:", err);
    //             setError(err instanceof Error ? err : new Error('Erreur de chargement'));
    //             setHasDraft(false);
    //             setDraftData(null);
    //         } finally {
    //             setLoading(false);
    //             loadingRef.current = false;
    //         }
    //     };

    //     loadDraftForCurrentStore();
    // }, [user?.storeId]);
    // IMPORTANT: Réinitialiser complètement l'état quand on change de magasin
    useEffect(() => {
        // Si l'utilisateur change de magasin, réinitialiser immédiatement
        if (currentStoreIdRef.current && user?.storeId && currentStoreIdRef.current !== user.storeId) {
            console.log(`[SÉCURITÉ] Changement de magasin détecté: ${currentStoreIdRef.current} → ${user.storeId}`);

            // Réinitialisation complète de l'état
            setDraftData(null);
            setHasDraft(false);
            setDraftProposed(false);
            setError(null);
            loadingRef.current = false;
        }
    }, [user?.storeId]);

    // Effet pour charger le brouillon - strictement pour le magasin courant
    useEffect(() => {
        const loadDraftForCurrentStore = async () => {
            // Éviter les chargements multiples simultanés
            if (loadingRef.current) {
                console.log("[SÉCURITÉ] Chargement déjà en cours, ignoré");
                return;
            }

            // Vérifier si c'est un utilisateur magasin avec un store ID valide
            if (user?.role !== 'magasin' || !user.storeId) {
                console.log("[SÉCURITÉ] Utilisateur non-magasin ou sans storeId - pas de brouillon");
                setHasDraft(false);
                setDraftData(null);
                setLoading(false);
                setDraftProposed(false);
                currentStoreIdRef.current = null;
                return;
            }

            // SÉCURITÉ: Vérifier si le magasin a changé
            if (currentStoreIdRef.current === user.storeId) {
                setLoading(false);
                return; // Même magasin, pas besoin de recharger
            }

            try {
                loadingRef.current = true;
                setLoading(true);
                console.log(`[SÉCURITÉ] Chargement STRICTEMENT pour le magasin ${user.storeName} (${user.storeId})`);

                // IMPORTANT: Charger UNIQUEMENT pour ce magasin spécifique
                const result = await draftService.loadDraft(user.storeId);

                if (result.success && result.data) {
                    // DOUBLE VÉRIFICATION: S'assurer que le brouillon appartient bien au bon magasin
                    const draftStoreId = result.data.storeId;
                    if (draftStoreId !== user.storeId) {
                        console.error(`[SÉCURITÉ] VIOLATION: Brouillon du magasin ${draftStoreId} chargé pour ${user.storeId}`);
                        setHasDraft(false);
                        setDraftData(null);
                        setDraftProposed(false);
                        return;
                    }

                    const draftData = result.data.data;

                    // TRIPLE VÉRIFICATION: Vérifier l'ID magasin dans les données
                    if (draftData.magasin?.id && draftData.magasin.id !== user.storeId) {
                        console.error(`[SÉCURITÉ] VIOLATION: Données du magasin ${draftData.magasin.id} pour ${user.storeId}`);
                        setHasDraft(false);
                        setDraftData(null);
                        setDraftProposed(false);
                        return;
                    }

                    // S'assurer que les dimensions sont correctement définies
                    if (draftData.articles && !draftData.articles.dimensions) {
                        draftData.articles.dimensions = [];
                    }

                    console.log(`[SÉCURITÉ] Brouillon VALIDE pour ${user.storeName} avec ${draftData.articles?.dimensions?.length || 0} dimensions`);
                    setDraftData(draftData);
                    setHasDraft(true);
                    setDraftProposed(false);
                } else {
                    console.log(`[SÉCURITÉ] Aucun brouillon pour ${user.storeName}`);
                    setHasDraft(false);
                    setDraftData(null);
                    setDraftProposed(false);
                }

                // Mettre à jour la référence du magasin actuel
                currentStoreIdRef.current = user.storeId;
            } catch (err) {
                console.error("[SÉCURITÉ] Erreur chargement brouillon:", err);
                setError(err instanceof Error ? err : new Error('Erreur de chargement'));
                setHasDraft(false);
                setDraftData(null);
                setDraftProposed(false);
            } finally {
                setLoading(false);
                loadingRef.current = false;
            }
        };

        loadDraftForCurrentStore();
    }, [user?.storeId, draftService]); // UNIQUEMENT user?.storeId

    const saveDraft = useCallback(async (data: Partial<CommandeMetier>) => {
        if (user?.role !== 'magasin' || !user.storeId) {
            console.warn("[SÉCURITÉ] Tentative de sauvegarde sans contexte magasin valide");
            return { success: false, error: new Error("Contexte magasin invalide") };
        }

        // SÉCURITÉ: Vérifier que les données correspondent au bon magasin
        if (data.magasin?.id && data.magasin.id !== user.storeId) {
            console.error(`[SÉCURITÉ] VIOLATION: Tentative de sauvegarder des données du magasin ${data.magasin.id} pour ${user.storeId}`);
            return { success: false, error: new Error("Violation de sécurité magasin") };
        }

        console.log(`[SÉCURITÉ] Sauvegarde pour ${user.storeName} (${user.storeId}) avec dimensions:`, data.articles?.dimensions?.length || 0);

        const result = await draftService.saveDraft(data, user.storeId);

        if (result.success) {
            // Mettre à jour l'état local
            setDraftData(data);
            setHasDraft(true);
        }

        return result;
    }, [user?.storeId, user?.storeName, user?.role, draftService]);

    const clearDraft = useCallback(async () => {
        if (user?.role !== 'magasin' || !user.storeId) {
            return { success: false, error: new Error("Contexte magasin invalide") };
        }

        console.log(`[SÉCURITÉ] Suppression du brouillon pour ${user.storeName} (${user.storeId})`);

        const result = await draftService.clearDraft(user.storeId);

        if (result.success) {
            setDraftData(null);
            setHasDraft(false);
            setDraftProposed(false);
        }

        return result;
    }, [user?.storeId, user?.storeName, user?.role, draftService]);

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