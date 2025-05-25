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
    const loadingInProgress = useRef(false);
    const lastLoadedStoreId = useRef<string | null>(null);

    const { user } = useAuth();

    const loadDraftForStore = useCallback(async (storeId: string) => {
        // Éviter les chargements multiples simultanés
        if (loadingInProgress.current) {
            console.log("[DRAFT] Chargement déjà en cours, ignoré");
            return;
        }

        // Éviter de recharger pour le même magasin
        if (lastLoadedStoreId.current === storeId) {
            console.log("[DRAFT] Déjà chargé pour ce magasin, ignoré");
            setLoading(false);
            return;
        }

        try {
            loadingInProgress.current = true;
            setLoading(true);

            console.log(`[DRAFT] Chargement UNIQUE pour le magasin ${storeId}`);

            const result = await draftService.loadDraft(storeId);

            if (result.success && result.data) {
                const draftData = result.data.data;

                // CORRECTION 2: Restaurer correctement le véhicule
                if (draftData.livraison?.vehicule) {
                    console.log(`[DRAFT] Véhicule restauré: ${draftData.livraison.vehicule}`);
                }

                // CORRECTION 3: Restaurer l'option "Articles couchés"
                if (draftData.livraison?.details) {
                    try {
                        const details = typeof draftData.livraison.details === 'string'
                            ? JSON.parse(draftData.livraison.details)
                            : draftData.livraison.details;

                        if (details.canBeTilted !== undefined) {
                            console.log(`[DRAFT] Option "Articles couchés" restaurée: ${details.canBeTilted}`);
                        }
                    } catch (e) {
                        console.warn("[DRAFT] Erreur parsing détails livraison:", e);
                    }
                }

                setDraftData(draftData);
                setHasDraft(true);
                setDraftProposed(false);
            } else {
                setHasDraft(false);
                setDraftData(null);
                setDraftProposed(false);
            }

            lastLoadedStoreId.current = storeId;

        } catch (err) {
            console.error("[DRAFT] Erreur chargement:", err);
            setError(err instanceof Error ? err : new Error('Erreur de chargement'));
            setHasDraft(false);
            setDraftData(null);
        } finally {
            setLoading(false);
            loadingInProgress.current = false;
        }
    }, [draftService]);

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
        if (user?.storeId && lastLoadedStoreId.current && lastLoadedStoreId.current !== user.storeId) {
            console.log(`[DRAFT] Changement de magasin détecté: ${lastLoadedStoreId.current} → ${user.storeId}`);

            // Réinitialisation complète
            setDraftData(null);
            setHasDraft(false);
            setDraftProposed(false);
            setError(null);
            loadingInProgress.current = false;
            lastLoadedStoreId.current = null;
        }
    }, [user?.storeId]);

    // Chargement initial du brouillon
    useEffect(() => {
        if (user?.role === 'magasin' && user.storeId) {
            loadDraftForStore(user.storeId);
        } else {
            setLoading(false);
            setHasDraft(false);
            setDraftData(null);
        }
    }, [user?.storeId, loadDraftForStore]);

    const saveDraft = useCallback(async (data: Partial<CommandeMetier>) => {
        if (user?.role !== 'magasin' || !user.storeId) {
            return { success: false, error: new Error("Contexte magasin invalide") };
        }

        // CORRECTION 2: Préserver le véhicule sélectionné
        const dataWithVehicle = {
            ...data,
            livraison: {
                ...data.livraison,
                vehicule: data.livraison?.vehicule || '',
                equipiers: data.livraison?.equipiers || 0,
                creneau: data.livraison?.creneau || '',
                // CORRECTION 3: Préserver les détails de livraison (incluant canBeTilted)
                details: data.livraison?.details || '{}',
                reserve: typeof data.livraison?.reserve === 'boolean' ? data.livraison.reserve : false
            }
        };

        console.log(`[DRAFT] Sauvegarde avec véhicule: ${dataWithVehicle.livraison.vehicule}`);
        console.log(`[DRAFT] Sauvegarde avec détails: ${dataWithVehicle.livraison.details}`);

        const result = await draftService.saveDraft(dataWithVehicle, user.storeId);

        if (result.success) {
            setDraftData(dataWithVehicle);
            setHasDraft(true);
        }

        return result;
    }, [user?.storeId, user?.role, draftService]);

    const clearDraft = useCallback(async () => {
        if (user?.role !== 'magasin' || !user.storeId) {
            return { success: false, error: new Error("Contexte magasin invalide") };
        }

        const result = await draftService.clearDraft(user.storeId);

        if (result.success) {
            setDraftData(null);
            setHasDraft(false);
            setDraftProposed(false);
            // Réinitialiser le cache de chargement
            lastLoadedStoreId.current = null;
        }

        return result;
    }, [user?.storeId, user?.role, draftService]);

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