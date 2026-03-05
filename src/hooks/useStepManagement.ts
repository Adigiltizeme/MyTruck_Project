import { useCallback, useMemo } from 'react';
import { FormAction, FormState } from '../types/form.types';
import { CommandeMetier } from '../types/business.types';
import { useFormValidation } from './useFormValidation';
import { useDraftStorage } from './useDraftStorage';

interface StepConfig {
    title: string;
    isValid: boolean;
    canProceed: boolean;
}

interface StepTransition {
    initial: (direction: 'left' | 'right') => {
        x: number;
        opacity: number;
    };
    animate: {
        x: number;
        opacity: number;
    };
    exit: (direction: 'left' | 'right') => {
        x: number;
        opacity: number;
    };
    variants: {
        inputVariants: {
            error: {
                x: number[];
                transition: {
                    duration: number;
                };
            };
        };
    };
}

export const useStepManagement = (
    formState: FormState,
    dispatch: React.Dispatch<FormAction>,
    onSubmit?: (data: CommandeMetier) => Promise<void>,
    isCession: boolean = false,
    userRole?: string // 🆕 Rôle utilisateur pour bypass devis obligatoire
) => {

    const { validateStep, validateForm } = useFormValidation(formState.data, isCession, userRole);
    const { saveDraft } = useDraftStorage();

    const emitValidationEvent = useCallback((step: number) => {
        const event = new CustomEvent('form-validation-attempt', {
            detail: { step }
        });
        window.dispatchEvent(event);
    }, []);

    // const handleNext = useCallback(() => {

    //     console.log('🚀 [STEP] handleNext - Étape actuelle:', formState.step);
    //     console.log('🚀 [STEP] Données avant validation:', {
    //         vehicule: formState.data.livraison?.vehicule,
    //         equipiers: formState.data.livraison?.equipiers,
    //         dimensions: formState.data.articles?.dimensions?.length || 0
    //     });

    //     const errors = validateStep(formState.step);
    //     if (Object.keys(errors).length === 0) {
    //         if (formState.step === 2) { // Étape des articles
    //             console.log('🚀 [STEP] Sauvegarde explicite étape articles');
    //             // S'assurer que toutes les données sont bien dans l'état
    //             const dataToPreserve = {
    //                 ...formState.data,
    //                 articles: {
    //                     ...formState.data.articles,
    //                     dimensions: formState.data.articles?.dimensions || [],
    //                     nombre: formState.data.articles?.nombre || 0
    //                 },
    //                 livraison: {
    //                     ...formState.data.livraison,
    //                     vehicule: formState.data.livraison?.vehicule || '',
    //                     equipiers: formState.data.livraison?.equipiers || 0,
    //                     creneau: formState.data.livraison?.creneau || '',
    //                     reserve: formState.data.livraison?.reserve || false,
    //                     details: formState.data.livraison?.details || '{}'
    //                 }
    //             };

    //             console.log('🚀 [STEP] Données préservées:', {
    //                 vehicule: dataToPreserve.livraison.vehicule,
    //                 equipiers: dataToPreserve.livraison.equipiers
    //             });

    //             // Forcer la mise à jour de l'état avant la sauvegarde
    //             dispatch({
    //                 type: 'UPDATE_DATA',
    //                 payload: {
    //                     data: dataToPreserve
    //                 }
    //             });

    //             // Sauvegarder immédiatement
    //             setTimeout(() => {
    //                 saveDraft(dataToPreserve);
    //             }, 100);
    //         }

    //         // Passer à l'étape suivante
    //         dispatch({
    //             type: 'CHANGE_STEP',
    //             payload: {
    //                 step: formState.step + 1,
    //                 direction: 'right'
    //             }
    //         });

    //         console.log('🚀 [STEP] Navigation vers étape:', formState.step + 1);
    //     } else {
    //         console.log('🚀 [STEP] Erreurs de validation:', errors);
    //         dispatch({ type: 'SET_ERRORS', payload: errors });
    //     }
    // }, [formState.step, formState.data, validateStep, saveDraft]);

    // N'afficher les erreurs que si une tentative de validation a eu lieu
    const displayErrors = formState.showErrors ? formState.errors.magasin?.manager : null;

    // const handlePrev = useCallback(() => {
    //     console.log('🔙 [STEP] handlePrev - Retour de l\'étape:', formState.step);
    //     console.log('🔙 [STEP] Données actuelles:', {
    //         vehicule: formState.data.livraison?.vehicule,
    //         equipiers: formState.data.livraison?.equipiers
    //     });

    //     if (formState.step > 1) {
    //         // Sauvegarder avant de revenir en arrière
    //         const currentData = {
    //             ...formState.data,
    //             livraison: {
    //                 ...formState.data.livraison,
    //                 vehicule: formState.data.livraison?.vehicule || '',
    //                 equipiers: formState.data.livraison?.equipiers || 0,
    //                 creneau: formState.data.livraison?.creneau || '',
    //                 reserve: formState.data.livraison?.reserve || false,
    //                 details: formState.data.livraison?.details || '{}'
    //             }
    //         };

    //         console.log('🔙 [STEP] Sauvegarde avant retour:', currentData.livraison);
    //         saveDraft(currentData);

    //         dispatch({
    //             type: 'CHANGE_STEP',
    //             payload: {
    //                 step: formState.step - 1,
    //                 direction: 'left'
    //             }
    //         });

    //         console.log('🔙 [STEP] Navigation vers étape:', formState.step - 1);
    //     }
    // }, [formState.step, formState.data, saveDraft]);

    const handleNext = useCallback(() => {
        console.log('Étape actuelle avant passage à la suivante:', formState.step);
        console.log('Données avant passage à l\'étape suivante: ', formState.data);
        console.log('Dimensions des articles avant passage à l\'étape suivante: ', formState.data.articles?.dimensions);

        // ========== ÉMETTRE L'ÉVÉNEMENT DE VALIDATION ==========
        emitValidationEvent(formState.step);

        const errors = validateStep(formState.step);
        if (Object.keys(errors).length === 0) {
            if (formState.step === 1) { // Étape des articles
                // Assurez-vous que les dimensions des articles sont bien dans l'état global
                const articleDimensions = formState.data.articles?.dimensions || [];

                // Mettre à jour l'état global pour s'assurer que les dimensions sont sauvegardées
                dispatch({
                    type: 'UPDATE_DATA',
                    payload: {
                        data: {
                            articles: {
                                ...formState.data.articles,
                                nombre: formState.data.articles?.nombre || 0,
                                dimensions: articleDimensions,
                            },
                            livraison: {
                                ...(formState.data.livraison || {}),
                                equipiers: formState.data.livraison?.equipiers || 0,
                                vehicule: formState.data.livraison?.vehicule || '',
                                creneau: formState.data.livraison?.creneau ?? '',
                                reserve: typeof formState.data.livraison?.reserve === 'boolean' ? formState.data.livraison.reserve : false
                            }
                        }
                    }
                });

                // Sauvegarder immédiatement un brouillon
                setTimeout(() => {
                    saveDraft(formState.data);
                }, 0);
            }

            // Passer à l'étape suivante
            dispatch({
                type: 'CHANGE_STEP',
                payload: {
                    step: formState.step + 1,
                    direction: 'right'
                }
            });
        } else {
            // ========== VALIDATION CONTEXTUELLE POUR L'ÉTAPE ARTICLES ==========
            if (formState.step === 1) {
                // Filtrer les erreurs pour ne montrer que celles qui sont pertinentes
                const relevantErrors: any = {};

                // Si l'utilisateur n'a pas encore commencé à saisir de dimensions,
                // ne pas afficher d'erreurs liées aux dimensions
                const hasDimensions = formState.data.articles?.dimensions &&
                    formState.data.articles.dimensions.length > 0;

                const hasStartedDimensionInput = hasDimensions &&
                    formState.data.articles?.dimensions?.some(article =>
                        article.nom && article.nom.trim() !== ''
                    );

                // Si l'utilisateur a commencé la saisie, montrer toutes les erreurs
                // Sinon, ne montrer que les erreurs critiques (comme le nombre d'articles)
                if (hasStartedDimensionInput || formState.data.articles?.nombre) {
                    Object.assign(relevantErrors, errors);
                } else {
                    // Ne montrer que les erreurs de base
                    if (errors.articles?.nombre) {
                        relevantErrors.articles = { nombre: errors.articles.nombre };
                    }
                }

                // Afficher les erreurs filtrées
                dispatch({ type: 'SET_ERRORS', payload: relevantErrors });
            } else {
                // Pour les autres étapes, afficher toutes les erreurs
                dispatch({ type: 'SET_ERRORS', payload: errors });
            }
        }
    }, [formState.step, formState.data, validateStep, emitValidationEvent]);

    const handlePrev = useCallback(() => {
        console.log('Retour à l\'étape précédente depuis l\'étape:', formState.step);
        console.log('Données avant retour à l\'étape précédente: ', formState.data);
        console.log('Dimensions des articles avant retour à l\'étape précédente: ', formState.data.articles?.dimensions);

        if (formState.step > 1 || formState.step === 3) {
            saveDraft(formState.data); // Sauvegarder le brouillon avant de revenir en arrière
            dispatch({
                type: 'CHANGE_STEP',
                payload: { step: formState.step - 1, direction: 'left' }
            });
        }
    }, [formState.step, formState.data, saveDraft]);

    // const progress = useMemo(() => {
    //     const errors = validateStep(formState.step);
    //     const canProceed = Object.keys(errors).length === 0;

    //     return {
    //         percentage: ((formState.step - 1) / 3) * 100,
    //         isFirstStep: formState.step === 1,
    //         isLastStep: formState.step === 4,
    //         canProceed
    //     };
    // }, [formState.step, validateStep]);

    // Définir les configurations des étapes
    
    const progress = useMemo(() => {
        const errors = validateStep(formState.step);
        
        // ========== LOGIQUE DE VALIDATION CONTEXTUELLE POUR LE PROGRÈS ==========
        let canProceed = false;

        if (formState.step === 1) {
            // Pour l'étape articles, être plus permissif
            const hasBasicInfo = formState.data.articles?.nombre && formState.data.articles.nombre > 0;
            const hasDimensions = formState.data.articles?.dimensions &&
                                formState.data.articles.dimensions.length > 0;

            if (hasDimensions) {
                // Vérifier si l'utilisateur a renseigné des dimensions détaillées (avec nom)
                const hasDimensionDetails = formState.data.articles?.dimensions?.some(article =>
                    article.nom && article.nom.trim() !== ''
                );

                if (hasDimensionDetails) {
                    // ✅ AVEC DIMENSIONS DÉTAILLÉES : Système automatique calcule véhicule/équipiers
                    // → Vérifier seulement les erreurs de l'étape Articles (pas véhicule/équipiers)
                    canProceed = !Boolean(errors.articles?.nombre) && hasBasicInfo;
                } else {
                    // ⚠️ SANS DIMENSIONS DÉTAILLÉES : Sélection manuelle requise
                    // → Vérifier que véhicule et équipiers sont sélectionnés manuellement
                    const hasVehicle = formState.data.livraison?.vehicule;
                    const hasCrewSelected = typeof formState.data.livraison?.equipiers === 'number';
                    canProceed = !!hasBasicInfo && !!hasVehicle && hasCrewSelected && !Boolean(errors.articles?.nombre);
                }
            } else {
                // Si pas de dimensions du tout, juste vérifier le nombre d'articles
                canProceed = !!hasBasicInfo && !Boolean(errors.articles?.nombre);
            }
        } else {
            canProceed = Object.keys(errors).length === 0;
        }

        return {
            percentage: ((formState.step - 1) / 3) * 100,
            isFirstStep: formState.step === 1,
            isLastStep: formState.step === 4,
            canProceed
        };
    }, [formState.step, validateStep, formState.data]);

    // const stepsConfig: Record<number, StepConfig> = {
    //     1: {
    //         title: 'Informations client',
    //         isValid: !Object.keys(validateForm().errors.client || {}).length,
    //         canProceed: !Object.keys(validateForm().errors.client || {}).length
    //     },
    //     2: {
    //         title: 'Articles',
    //         isValid: !Object.keys(validateForm().errors.articles || {}).length,
    //         canProceed: !Object.keys(validateForm().errors.articles || {}).length
    //     },
    //     3: {
    //         title: 'Livraison',
    //         isValid: !Object.keys(validateForm().errors.livraison || {}).length,
    //         canProceed: !Object.keys(validateForm().errors.livraison || {}).length
    //     },
    //     4: {
    //         title: 'Récapitulatif',
    //         isValid: true,
    //         canProceed: true
    //     }
    // };

    // Définir les transitions d'étapes
    
    const stepsConfig: Record<number, StepConfig> = {
        1: {
            title: 'Articles',
            isValid: (() => {
                const hasBasicInfo = !!(formState.data.articles?.nombre && formState.data.articles.nombre > 0);
                const hasDimensions = !!(formState.data.articles?.dimensions &&
                                    formState.data.articles.dimensions.length > 0);

                if (hasDimensions) {
                    return !Object.keys(validateForm().errors.articles || {}).length;
                } else {
                    return hasBasicInfo;
                }
            })(),
            canProceed: (() => {
                const hasBasicInfo = !!(formState.data.articles?.nombre && formState.data.articles.nombre > 0);
                const hasDimensions = !!(formState.data.articles?.dimensions &&
                                    formState.data.articles.dimensions.length > 0);

                if (hasDimensions) {
                    return !Object.keys(validateForm().errors.articles || {}).length;
                } else {
                    return hasBasicInfo;
                }
            })()
        },
        2: {
            title: 'Informations client',
            isValid: !Object.keys(validateForm().errors.client || {}).length,
            canProceed: !Object.keys(validateForm().errors.client || {}).length
        },
        3: {
            title: 'Livraison',
            isValid: !Object.keys(validateForm().errors.livraison || {}).length,
            canProceed: !Object.keys(validateForm().errors.livraison || {}).length
        },
        4: {
            title: 'Récapitulatif',
            isValid: true,
            canProceed: true
        }
    };

    const stepTransition: StepTransition = {
        initial: (direction) => ({
            x: direction === 'right' ? 1000 : -1000,
            opacity: 0
        }),
        animate: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction === 'right' ? -1000 : 1000,
            opacity: 0
        }),
        variants: {
            inputVariants: {
                error: {
                    x: [-2, 2, -2, 2, 0],
                    transition: {
                        duration: 0.4
                    }
                }
            }
        }
    };

    // Créer un wrapper pour la fonction dispatch qui correspond au type attendu
    const updateFormState = useCallback((updates: Partial<FormState>) => {
        dispatch({
            type: 'UPDATE_DATA',
            payload: {
                data: updates.data || formState.data,
                isDirty: updates.isDirty || false
            }
        });
    }, [formState.data]);

    return {
        stepsConfig,
        stepTransition,
        updateFormState,
        handleNext,
        handlePrev,
        progress,
        displayErrors: formState.showErrors ? formState.errors.magasin?.manager : null
    };
};