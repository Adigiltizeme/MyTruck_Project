import { useReducer, useCallback, useState } from 'react';
import { formReducer, initialFormState } from '../reducers/formReducer';
import { AddressSuggestion } from '../types/form.types';
import { CommandeMetier } from '../types/business.types';
import { useFormValidation } from './useFormValidation';
import { useDraftStorage } from './useDraftStorage';
import { deepEqual } from '../utils/objectComparison';
import { formatPhoneNumber } from '../utils/formatters';
import { useStepManagement } from './useStepManagement';
import { form } from 'framer-motion/client';


export const useCommandeForm = (onSubmit: (data: CommandeMetier) => Promise<void>) => {
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
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
        setFormData(prev => ({
            ...prev,
            client: {
                ...prev.client,
                adresse: {
                    ...prev.client?.adresse,
                    [name.split('.').pop() || '']: value
                }
            }
        }));
    
        if (name === 'client.adresse.ligne1' && value.length > 3) {
            handleAddressSearch(value);
        }
    }, [state.data]);

    // Gestion de l'adresse avec autocomplétion
    const handleAddressSearch = async (query: string) => {
        try {
            const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            setAddressSuggestions(data.features || []);
        } catch (error) {
            console.error('Erreur recherche adresse:', error);
            setAddressSuggestions([]);
        }
    };
    
    const handleAddressSelect = (suggestion: any) => {
        setFormData(prev => ({
            ...prev,
            client: {
                ...prev.client,
                adresse: {
                    ...prev.client?.adresse,
                    ligne1: suggestion.properties.name + ' ' + suggestion.properties.housenumber + ' ' + suggestion.properties.street + ' ' + suggestion.properties.postcode + ' ' + suggestion.properties.city
                }
            }
        }));
        setAddressSuggestions([]);
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Ne soumettre que si on est à l'étape 3 ET qu'un submit a été explicitement demandé
        if (state.step === 3 && e.type === 'submit') {
            const errors = validateStep(state.step);
            if (Object.keys(errors).length === 0) {
                try {
                    dispatch({ type: 'SUBMIT_START' });
                    await onSubmit(state.data as CommandeMetier);
                    dispatch({ type: 'RESET' });
                } catch (error) {
                    console.error('Erreur lors de la soumission:', error);
                } finally {
                    dispatch({ type: 'SUBMIT_END' });
                }
            } else {
                dispatch({ type: 'SET_ERRORS', payload: errors });
            }
        }
    }, [state.step, onSubmit]);

    // // Gestion du brouillon

    // useEffect(() => {
    //     if (hasDraft && draftData && !draftProposed) {
    //         const hasContent = !deepEqual(draftData, initialFormState.data);

    //         if (hasContent) {
    //             const shouldRestore = window.confirm('Restaurer le brouillon ?');
    //             if (shouldRestore) {
    //                 dispatch({
    //                     type: 'UPDATE_DATA',
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
    // }, [hasDraft, draftData, draftProposed, clearDraft, initialFormState.data]);

    // // Ajouter la sauvegarde du brouillon uniquement si des modifications ont été faites
    // useEffect(() => {
    //     if (state.isDirty) {
    //         const hasChanges = !deepEqual(state.data, initialFormState.data);

    //         if (hasChanges) {
    //             const saveTimeout = setTimeout(() => {
    //                 saveDraft(state.data);
    //             }, 2000);
    //             return () => clearTimeout(saveTimeout);
    //         }
    //     }
    // }, [state.data, state.isDirty, saveDraft, initialFormState.data]);

    return {
        state,
        handleInputChange,
        handleSubmit,
        ...stepManagement,
        formData,
        addressSuggestions,
        handleAddressSearch,
        handleAddressSelect
    };
};