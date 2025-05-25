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

        console.log('Étape actuelle avant passage à la suivante:', formState.step);
        console.log('Données avant passage à l\'étape suivante: ', formState.data);
        console.log('Dimensions des articles avant passage à l\'étape suivante: ', formState.data.articles?.dimensions);

        const errors = validateStep(formState.step);
        if (Object.keys(errors).length === 0) {
            if (formState.step === 2) { // Étape des articles
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
            // Afficher les erreurs
            dispatch({ type: 'SET_ERRORS', payload: errors });
        }
    }, [formState.step, formState.data, validateStep]);

    // N'afficher les erreurs que si une tentative de validation a eu lieu
    const displayErrors = formState.showErrors ? formState.errors.magasin?.manager : null;

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