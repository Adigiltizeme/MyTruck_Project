import { useReducer, useCallback, useState, useEffect, useRef } from 'react';
import { formReducer, initialFormState } from '../reducers/formReducer';
import { AddressSuggestion } from '../types/form.types';
import { CommandeMetier } from '../types/business.types';
import { useFormValidation } from './useFormValidation';
import { useDraftStorage } from './useDraftStorage';
import { deepEqual } from '../utils/objectComparison';
import { formatPhoneNumber } from '../utils/formatters';
import { useStepManagement } from './useStepManagement';
import { ERROR_MESSAGES } from '../components/constants/errorMessages';
import { CloudinaryService } from '../services/cloudinary.service';
import { useAuth } from '../contexts/AuthContext';
import { handleStorageError } from '../utils/error-handler';


export const useCommandeForm = (onSubmit: (data: CommandeMetier) => Promise<void>) => {
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const { draftData, hasDraft, saveDraft, clearDraft, draftProposed, setDraftProposed } = useDraftStorage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<CommandeMetier & { [key: string]: any }>>({
        client: {
            nom: '',
            prenom: '',
            nomComplet: '',
            adresse: {
                type: 'Domicile',
                ligne1: '',
                batiment: '',
                interphone: '',
                etage: '',
                ascenseur: false
            },
            telephone: {
                principal: '',
                secondaire: ''
            }
        }
    });
    const [errors, setErrors] = useState({}); // État pour les erreurs de validation

    const [state, dispatch] = useReducer(formReducer, initialFormState);
    const stepManagement = useStepManagement(state, dispatch, onSubmit);
    const { validateStep } = useFormValidation(state.data);

    const { user } = useAuth();

    const isSubmittingRef = useRef(false); // Référence persistante

    // Gestion du brouillon
    // useEffect(() => {
    //     if (hasDraft && draftData && !draftProposed) {
    //         console.log("Brouillon disponible:", draftData);

    //         // Vérifier si le brouillon appartient au magasin actuel
    //         if (user?.role === 'magasin' && user.storeId &&
    //             draftData.magasin && draftData.magasin.id) {

    //             // Extraire l'ID du magasin proprement (au cas où c'est un objet complet)
    //             const draftStoreId = typeof draftData.magasin.id === 'string' ?
    //                 draftData.magasin.id :
    //                 String(draftData.magasin.id);

    //             // Comparer uniquement les IDs
    //             if (draftStoreId !== user.storeId) {
    //                 console.log(`Brouillon ignoré: appartient au magasin ID ${draftData.magasin.name} ${draftStoreId} et non au magasin actuel ID ${user.storeName} ${user.storeId}`);
    //                 return;
    //             }
    //         }

    //         const hasContent = !deepEqual(draftData, initialFormState.data);

    //         if (hasContent) {
    //             const shouldRestore = window.confirm('Un brouillon de commande existe. Voulez-vous le restaurer ?');
    //             if (shouldRestore) {
    //                 dispatch({
    //                     type: 'RESTORE_DRAFT',
    //                     payload: {
    //                         data: draftData,
    //                         isDirty: true
    //                     }
    //                 });
    //             } else {
    //                 clearDraft();
    //             }
    //         }
    //         setDraftProposed(true);
    //     }
    // }, [hasDraft, draftData, draftProposed, clearDraft, user?.storeId]);

    // Simplifier la vérification pour faire confiance à draftStorage
    useEffect(() => {
        if (hasDraft && draftData && !draftProposed) {
            console.log("Traitement UNIQUE du brouillon disponible:", draftData);
            console.log('Dimensions dans le brouillon:', draftData.articles?.dimensions);

            // S'assurer que les dimensions existent
            if (draftData.articles && !draftData.articles.dimensions) {
                draftData.articles.dimensions = [];
            }

            const hasContent = !deepEqual(draftData, initialFormState.data);

            if (hasContent) {
                // Vérifier si la date de livraison est dans le passé
                const livraisonDate = draftData.dates?.livraison ? new Date(draftData.dates.livraison) : null;
                const isPastDate = livraisonDate && livraisonDate < new Date();

                // Marquer immédiatement comme proposé pour éviter les doubles alertes
                setDraftProposed(true);

                if (isPastDate) {
                    const dateFormatted = livraisonDate?.toLocaleDateString();
                    const shouldRestore = window.confirm(
                        `Un brouillon de commande existe mais sa date de livraison (${dateFormatted}) est passée. ` +
                        `Voulez-vous le restaurer et mettre à jour la date?`
                    );

                    if (shouldRestore) {
                        // Mettre à jour la date de livraison au lendemain
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);

                        // Créer une copie avec date mise à jour
                        const updatedDraft = {
                            ...draftData,
                            dates: {
                                ...(draftData.dates || {}),
                                livraison: tomorrow.toISOString().split('T')[0]
                            }
                        };

                        dispatch({
                            type: 'RESTORE_DRAFT',
                            payload: {
                                data: {
                                    ...updatedDraft,
                                    dates: {
                                        ...updatedDraft.dates,
                                        commande: updatedDraft.dates?.commande || '',
                                        misAJour: updatedDraft.dates?.misAJour || ''
                                    }
                                },
                                isDirty: true
                            }
                        });

                        // Informer l'utilisateur
                        alert(`La date de livraison a été mise à jour au ${tomorrow.toLocaleDateString()}`);
                    } else {
                        clearDraft();
                    }
                } else {
                    // Comportement normal pour les dates valides
                    const shouldRestore = window.confirm('Un brouillon de commande existe. Voulez-vous le restaurer ?');
                    if (shouldRestore) {
                        dispatch({
                            type: 'RESTORE_DRAFT',
                            payload: {
                                data: draftData,
                                isDirty: true
                            }
                        });
                    } else {
                        clearDraft();
                    }
                }
            }
            setDraftProposed(true);
        }
    }, [hasDraft, draftData, draftProposed, clearDraft]);

    // Sauvegarde automatique du brouillon
    useEffect(() => {
        if (state.isDirty) {
            const hasChanges = !deepEqual(state.data, initialFormState.data);

            if (hasChanges) {
                const saveTimeout = setTimeout(() => {
                    // Créer une copie des données actuelles
                    const dataToSave = {
                        ...state.data,
                        articles: {
                            ...(state.data.articles || {}),
                            dimensions: state.data.articles?.dimensions || [],
                            nombre: state.data.articles?.nombre || 0
                        },
                        livraison: {
                            ...(state.data.livraison || {}),
                            equipiers: state.data.livraison?.equipiers || 0,
                            vehicule: state.data.livraison?.vehicule || '',
                            creneau: state.data.livraison?.creneau ?? '', // Ensure creneau is always a string
                            reserve: typeof state.data.livraison?.reserve === 'boolean' ? state.data.livraison.reserve : false
                        }
                    };

                    // S'assurer que les données du magasin actuel sont incluses
                    if (user?.role === 'magasin' && user.storeId) {
                        dataToSave.magasin = {
                            ...(dataToSave.magasin || {}),
                            id: user.storeId,
                            name: user.storeName || '',
                            address: user.storeAddress || '',
                            phone: user.storePhone || '',
                            status: user.storeStatus || 'active'
                        };
                    }

                    console.log("Sauvegarde automatique du brouillon avec dimensions:", dataToSave.articles.dimensions?.length || 0);
                    saveDraft(dataToSave);
                }, 2000); // Augmenter le délai pour éviter les sauvegardes trop fréquentes

                return () => clearTimeout(saveTimeout);
            }
        }
    }, [state.data, state.isDirty, saveDraft, user?.role, user?.storeId, user?.storeName, user?.storeAddress]);

    // Initialiser les données du formulaire avec les infos magasin dès le début
    useEffect(() => {
        if (user?.role === 'magasin' && user.storeId) {
            // Mettre à jour uniquement la section magasin sans toucher au reste
            setFormData(prevFormData => ({
                ...prevFormData,
                magasin: {
                    ...(prevFormData.magasin || {}), // Préserver les champs existants
                    id: user.storeId,
                    name: user.storeName || '',
                    address: user.storeAddress || ''
                }
            }));

            // Également mettre à jour les données d'état du formulaire
            dispatch({
                type: 'UPDATE_DATA',
                payload: {
                    data: {
                        magasin: {
                            id: user.storeId,
                            name: user.storeName || '',
                            address: user.storeAddress || '',
                            phone: user.storePhone || '', // Add phone property
                            status: user.storeStatus || 'active' // Add status property with a default value
                        }
                    }
                }
            });

            console.log('Initialisation des données magasin dans useCommandeForm:', {
                id: user.storeId,
                name: user.storeName,
                address: user.storeAddress
            });
        }
    }, [user?.role, user?.storeId]);

    const validateEquipiers = (value: number) => {
        if (value > 2) {
            return {
                isValid: false,
                message: ERROR_MESSAGES.equipiers.max
            };
        }
        return { isValid: true, message: "" };
    };

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        console.log(`Mise à jour de ${name} avec la valeur:`, value);

        // Si les dimensions des articles sont mises à jour
        if (name === 'articles.dimensions') {
            console.log("Mise à jour des dimensions des articles:", value);
        }

        // Pour les numéros de téléphone, formatage spécial
        if (name.includes('telephone')) {
            const formattedValue = formatPhoneNumber(value);
            dispatch({
                type: 'UPDATE_DATA',
                payload: {
                    data: {
                        ...state.data,
                        [name]: formattedValue
                    },
                    name,
                    value: formattedValue
                }
            });
            return;
        }

        // Pour l'adresse, traitement spécial
        if (name === 'client.adresse.ligne1') {
            if (!value || value.trim() === '') {
                setAddressSuggestions([]);
            }
            if (value.length > 3) {
                handleAddressSearch(value);
            }
        }

        // Pour les équipiers, validation spéciale
        if (name === 'livraison.equipiers') {
            const numValue = parseInt(value);
            const validation = validateEquipiers(numValue);
            if (!validation.isValid) {
                dispatch({
                    type: 'SET_ERRORS',
                    payload: {
                        livraison: {
                            equipiers: validation.message
                        }
                    }
                });
            }
        }

        // Log pour les changements du magasin
        if (name.startsWith('magasin.')) {
            console.log(`Modification d'une propriété du magasin: ${name} = ${value}`);
        }

        // Dispatch de la mise à jour
        dispatch({
            type: 'UPDATE_DATA',
            payload: {
                data: {
                    ...state.data,
                    [name]: value
                },
                name,
                value
            }
        });
    }, []);

    // Gestion de l'adresse avec autocomplétion
    const handleAddressSearch = async (query: string) => {
        console.log('handleAddressSearch appelé avec:', query); // Debug

        if (!query || query.length < 3) {
            setAddressSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}`
            );
            const data = await response.json();
            console.log('Résultats API:', data); // Debug
            if (data && data.features) {
                setAddressSuggestions(data.features);
            } else {
                setAddressSuggestions([]);
            }
        } catch (error) {
            console.error('Erreur recherche adresse:', error);
            setAddressSuggestions([]);
        }
    };

    const handleAddressSelect = (suggestion: AddressSuggestion) => {
        console.log('Sélection adresse:', suggestion.properties.label);
        // Utiliser directement l'action UPDATE_DATA pour mettre à jour le champ d'adresse
        dispatch({
            type: 'UPDATE_DATA',
            payload: {
                data: {
                    ...state.data,
                    'client.adresse.ligne1': suggestion.properties.label
                },
                name: 'client.adresse.ligne1',
                value: suggestion.properties.label
            }
        });

        setAddressSuggestions([]); // Vider les suggestions après sélection
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Double protection avec state et ref
        if (isSubmitting || isSubmittingRef.current) {
            console.log('BLOCAGE: Soumission déjà en cours via useCommandeForm');
            return;
        }

        setIsSubmitting(true);
        isSubmittingRef.current = true;

        try {
            // Vérifier si la date de livraison est dans le passé
            const livraisonDate = state.data.dates?.livraison ?
                new Date(state.data.dates.livraison) : null;
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Ignorer l'heure

            const isPastDate = livraisonDate && livraisonDate < today;

            if (isPastDate) {
                alert('La date de livraison ne peut pas être dans le passé. Veuillez sélectionner une date future.');
                setIsSubmitting(false);
                return;
            }

            // Ne soumettre que si on est à l'étape 4 ET qu'un submit a été explicitement demandé
            if (state.step === 4) {
                const errors = validateStep(state.step);
                if (Object.keys(errors).length === 0) {
                    dispatch({ type: 'SUBMIT_START' });

                    // Si nous sommes en rôle magasin mais que le magasin n'est pas spécifié
                    if (user?.role === 'magasin' && (!state.data.magasin?.id || state.data.magasin.id === '')) {
                        console.warn('ID de magasin manquant lors de la soumission, correction...');

                        const updatedData = {
                            ...state.data,
                            magasin: {
                                ...(state.data.magasin || {}),
                                id: user.storeId || '',
                                name: user.storeName || '',
                                address: user.storeAddress || ''
                            }
                        };

                        console.log('Envoi de la commande avec données corrigées');
                        await onSubmit(updatedData as CommandeMetier);
                    } else {
                        console.log('Envoi de la commande avec données originales');
                        await onSubmit(state.data as CommandeMetier);
                    }

                    // S'assurer que le brouillon est bien supprimé après soumission
                    try {
                        await clearDraft();
                    } catch (clearError) {
                        console.error('Erreur lors de la suppression du brouillon:', clearError);
                    }

                    // Reset seulement après confirmation de la suppression du brouillon
                    dispatch({ type: 'RESET' });
                } else {
                    dispatch({ type: 'SET_ERRORS', payload: errors });
                }
            }
        } catch (error) {
            if (handleStorageError(error)) {
                // Afficher un message spécifique pour les erreurs de stockage
                setErrors('Espace de stockage insuffisant. Veuillez utiliser la fonction de nettoyage dans votre profil avant de continuer.');
            } else {
                // Gérer les autres erreurs
                setErrors('Une erreur est survenue lors de la création de la commande. Veuillez réessayer.');
                console.error('Erreur lors de la soumission:', error);
            }
        } finally {
            dispatch({ type: 'SUBMIT_END' });

            // Réinitialiser les drapeaux après un délai
            setTimeout(() => {
                setIsSubmitting(false);
                isSubmittingRef.current = false;
            }, 1000);
        }
    }, [state.step, state.data, validateStep, onSubmit, clearDraft, user, isSubmitting]);

    const handleSubmitModification = async () => {
        try {
            setLoading(true);
            const cloudinaryService = new CloudinaryService();

            // Gérer l'upload des nouvelles photos
            const uploadedNewPhotos = await Promise.all(
                (state.data.articles?.newPhotos || []).map(async photo => {
                    if (photo.file) {
                        const uploadedImage = await cloudinaryService.uploadImage(photo.file);
                        return {
                            url: uploadedImage.url,
                            filename: uploadedImage.filename
                        };
                    }
                    return null;
                })
            ).then(photos => photos.filter(photo => photo !== null));

            // Combiner avec les photos existantes
            const allPhotos = [
                ...(state.data.articles?.photos || []),
                ...uploadedNewPhotos
            ];

            // Mise à jour des données
            dispatch({
                type: 'UPDATE_DATA',
                payload: {
                    data: {
                        ...state.data,
                        articles: {
                            ...state.data.articles,
                            photos: allPhotos,
                            newPhotos: undefined,
                            nombre: state.data.articles?.nombre || 0
                        }
                    }
                }
            });

            // Soumission
            if (state.step === 4 && !Object.keys(validateStep(state.step)).length) {
                await onSubmit(state.data as CommandeMetier);
            }
        } catch (error) {
            console.error('Erreur lors de la modification:', error);
        } finally {
            setLoading(false);
        }
    };

    return {
        state,
        handleInputChange,
        handleSubmit,
        isSubmitting,
        ...stepManagement,
        formData,
        addressSuggestions,
        handleAddressSearch,
        handleAddressSelect,
        setAddressSuggestions
    };
};