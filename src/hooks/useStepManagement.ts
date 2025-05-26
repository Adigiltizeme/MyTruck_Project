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
    onSubmit?: (data: CommandeMetier) => Promise<void>
) => {

    const { validateStep, validateForm } = useFormValidation(formState.data);
    const { saveDraft } = useDraftStorage();

    const handleNext = useCallback(() => {

        console.log('🚀 [STEP] handleNext - Étape actuelle:', formState.step);
        console.log('🚀 [STEP] Données avant validation:', {
            vehicule: formState.data.livraison?.vehicule,
            equipiers: formState.data.livraison?.equipiers,
            dimensions: formState.data.articles?.dimensions?.length || 0
        });

        const errors = validateStep(formState.step);
        if (Object.keys(errors).length === 0) {
            if (formState.step === 2) { // Étape des articles
                console.log('🚀 [STEP] Sauvegarde explicite étape articles');
                // S'assurer que toutes les données sont bien dans l'état
                const dataToPreserve = {
                    ...formState.data,
                    articles: {
                        ...formState.data.articles,
                        dimensions: formState.data.articles?.dimensions || [],
                        nombre: formState.data.articles?.nombre || 0
                    },
                    livraison: {
                        ...formState.data.livraison,
                        vehicule: formState.data.livraison?.vehicule || '',
                        equipiers: formState.data.livraison?.equipiers || 0,
                        creneau: formState.data.livraison?.creneau || '',
                        reserve: formState.data.livraison?.reserve || false,
                        details: formState.data.livraison?.details || '{}'
                    }
                };

                console.log('🚀 [STEP] Données préservées:', {
                    vehicule: dataToPreserve.livraison.vehicule,
                    equipiers: dataToPreserve.livraison.equipiers
                });

                // Forcer la mise à jour de l'état avant la sauvegarde
                dispatch({
                    type: 'UPDATE_DATA',
                    payload: {
                        data: dataToPreserve
                    }
                });

                // Sauvegarder immédiatement
                setTimeout(() => {
                    saveDraft(dataToPreserve);
                }, 100);
            }

            // Passer à l'étape suivante
            dispatch({
                type: 'CHANGE_STEP',
                payload: {
                    step: formState.step + 1,
                    direction: 'right'
                }
            });

            console.log('🚀 [STEP] Navigation vers étape:', formState.step + 1);
        } else {
            console.log('🚀 [STEP] Erreurs de validation:', errors);
            dispatch({ type: 'SET_ERRORS', payload: errors });
        }
    }, [formState.step, formState.data, validateStep, saveDraft]);

    // N'afficher les erreurs que si une tentative de validation a eu lieu
    const displayErrors = formState.showErrors ? formState.errors.magasin?.manager : null;

    const handlePrev = useCallback(() => {
        console.log('🔙 [STEP] handlePrev - Retour de l\'étape:', formState.step);
        console.log('🔙 [STEP] Données actuelles:', {
            vehicule: formState.data.livraison?.vehicule,
            equipiers: formState.data.livraison?.equipiers
        });

        if (formState.step > 1) {
            // Sauvegarder avant de revenir en arrière
            const currentData = {
                ...formState.data,
                livraison: {
                    ...formState.data.livraison,
                    vehicule: formState.data.livraison?.vehicule || '',
                    equipiers: formState.data.livraison?.equipiers || 0,
                    creneau: formState.data.livraison?.creneau || '',
                    reserve: formState.data.livraison?.reserve || false,
                    details: formState.data.livraison?.details || '{}'
                }
            };

            console.log('🔙 [STEP] Sauvegarde avant retour:', currentData.livraison);
            saveDraft(currentData);

            dispatch({
                type: 'CHANGE_STEP',
                payload: {
                    step: formState.step - 1,
                    direction: 'left'
                }
            });

            console.log('🔙 [STEP] Navigation vers étape:', formState.step - 1);
        }
    }, [formState.step, formState.data, saveDraft]);

    const progress = useMemo(() => {
        const errors = validateStep(formState.step);
        const canProceed = Object.keys(errors).length === 0;

        return {
            percentage: ((formState.step - 1) / 3) * 100,
            isFirstStep: formState.step === 1,
            isLastStep: formState.step === 4,
            canProceed
        };
    }, [formState.step, validateStep]);

    // Définir les configurations des étapes
    const stepsConfig: Record<number, StepConfig> = {
        1: {
            title: 'Informations client',
            isValid: !Object.keys(validateForm().errors.client || {}).length,
            canProceed: !Object.keys(validateForm().errors.client || {}).length
        },
        2: {
            title: 'Articles',
            isValid: !Object.keys(validateForm().errors.articles || {}).length,
            canProceed: !Object.keys(validateForm().errors.articles || {}).length
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

    // Définir les transitions d'étapes
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
    }, []);

    return {
        stepsConfig,
        stepTransition,
        updateFormState,
        handleNext,
        handlePrev,
        progress,
        displayErrors
    };
};