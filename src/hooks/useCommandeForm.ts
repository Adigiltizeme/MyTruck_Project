import { useReducer, useCallback, useState, useEffect } from 'react';
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


export const useCommandeForm = (onSubmit: (data: CommandeMetier) => Promise<void>) => {
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const [query, setQuery] = useState('');
    const [selectedAddress, setSelectedAddress] = useState('');
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

    const [state, dispatch] = useReducer(formReducer, initialFormState);
    const stepManagement = useStepManagement(state, dispatch, onSubmit);
    const { validateStep } = useFormValidation(state.data);

    // Gestion du brouillon
    useEffect(() => {
        if (hasDraft && draftData && !draftProposed) {
            const hasContent = !deepEqual(draftData, initialFormState.data);

            if (hasContent) {
                const shouldRestore = window.confirm('Un brouillon de commande existe. Voulez-vous le restaurer ?');
                if (shouldRestore) {
                    dispatch({
                        type: 'UPDATE_DATA',
                        payload: {
                            data: draftData,
                            isDirty: true
                        }
                    });
                } else {
                    clearDraft();
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
                    saveDraft(state.data);
                }, 2000);
                return () => clearTimeout(saveTimeout);
            }
        }
    }, [state.data, state.isDirty, saveDraft]);

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

        // Diviser le chemin du champ (ex: "client.nom" -> ["client", "nom"])
        const fieldPath = name.split('.');

        const updateState = (newData: Partial<CommandeMetier>) => {
            dispatch({
                type: 'UPDATE_DATA',
                payload: { data: newData }
            });
        };

        // Pour les numéros de téléphone, uniquement le formatage
        if (name.includes('telephone')) {
            const formattedValue = formatPhoneNumber(value);
            updateState({
                ...state.data,
                client: {
                    ...state.data.client,
                    nom: state.data.client?.nom || '',
                    prenom: state.data.client?.prenom || '',
                    nomComplet: state.data.client?.nomComplet || '',
                    adresse: state.data.client?.adresse || {
                        type: 'Domicile',
                        ligne1: '',
                        batiment: '',
                        interphone: '',
                        etage: '',
                        ascenseur: false
                    },
                    telephone: {
                        principal: state.data.client?.telephone?.principal || '',
                        secondaire: state.data.client?.telephone?.secondaire || '',
                        [fieldPath[2]]: formattedValue || ''
                    }
                }
            });
        } else if (name === 'magasin.manager') {
            // Gestion spécifique pour le manager
            updateState({
                ...state.data,
                magasin: {
                    ...state.data.magasin,
                    manager: value,
                    id: state.data.magasin?.id || '',
                    name: state.data.magasin?.name || '',
                    address: state.data.magasin?.address || '',
                    phone: state.data.magasin?.phone || '',
                    email: state.data.magasin?.email || '',
                    photo: state.data.magasin?.photo || '',
                    status: state.data.magasin?.status || ''
                }
            });
        } else {
            updateState({
                ...state.data,
                [fieldPath[0]]: fieldPath.length > 1 ? {
                    ...state.data[fieldPath[0]],
                    [fieldPath[1]]: fieldPath.length > 2 ? {
                        ...state.data[fieldPath[0]]?.[fieldPath[1]],
                        [fieldPath[2]]: value
                    } : value
                } : value
            });
        }

        if (name === 'client.adresse.ligne1') {
            setQuery(value);
            setSelectedAddress('');
        }

        if (name === 'livraison.equipiers') {
            const numValue = parseInt(value);
            const validation = validateEquipiers(numValue);
            if (!validation.isValid) {
                dispatch({
                    type: 'SET_ERRORS',
                    payload: {
                        livraison: {
                            equipiers: ERROR_MESSAGES.equipiers.max
                        }
                    }
                });
            } else {
                // Effacer l'erreur si la validation passe
                dispatch({
                    type: 'SET_ERRORS',
                    payload: {}
                });
            }
        }

        let processedValue = value;

        // Traitement spécial pour le nombre d'articles
        if (name === 'articles.nombre') {
            processedValue = (Number(value) || 0).toString();
        }

        setFormData(prev => ({
            ...prev,
            client: {
                ...prev.client,
                adresse: {
                    ...prev.client?.adresse,
                    [name.split('.').pop() || '']: value
                }
            },
            articles: {
                ...prev.articles,
                [name.split('.')[1]]: processedValue
            }
        }));


    }, [state.data]);

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
        setFormData(prev => ({
            ...prev,
            client: {
                ...prev.client,
                adresse: {
                    ...prev.client?.adresse,
                    ligne1: suggestion.properties.label
                }
            }
        }));
        setAddressSuggestions([]);
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Ne soumettre que si on est à l'étape 3 ET qu'un submit a été explicitement demandé
        if (state.step === 4) {
            const errors = validateStep(state.step);
            if (Object.keys(errors).length === 0) {
                try {
                    setIsSubmitting(true);
                    dispatch({ type: 'SUBMIT_START' });
                    await onSubmit(state.data as CommandeMetier);

                    // S'assurer que le brouillon est bien supprimé après soumission
                    try {
                        await clearDraft();
                        console.log('Brouillon supprimé avec succès');
                    } catch (clearError) {
                        console.error('Erreur lors de la suppression du brouillon:', clearError);
                    }

                    // Reset seulement après confirmation de la suppression du brouillon
                    dispatch({ type: 'RESET' });
                } catch (error) {
                    console.error('Erreur lors de la soumission:', error);
                } finally {
                    setIsSubmitting(false);
                    dispatch({ type: 'SUBMIT_END' });
                }
            } else {
                dispatch({ type: 'SET_ERRORS', payload: errors });
            }
        }
    }, [state.step, state.data, validateStep, onSubmit, clearDraft]);

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
        handleSubmit: state.isEditing ? handleSubmitModification : handleSubmit,
        isSubmitting,
        ...stepManagement,
        formData,
        addressSuggestions,
        handleAddressSearch,
        handleAddressSelect,

    };
};