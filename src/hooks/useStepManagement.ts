import { useCallback, useMemo, useState } from 'react';
import { FormAction, FormState } from '../types/form.types';
import { CommandeMetier } from '../types/business.types';
import { useFormValidation } from './useFormValidation';

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

    const { validateStep } = useFormValidation(formState.data);
    const { validateForm } = useFormValidation(formState.data);

    const handleNext = useCallback(() => {
        const errors = validateStep(formState.step);
        if (Object.keys(errors).length === 0) {
            dispatch({
                type: 'CHANGE_STEP',
                payload: { step: formState.step + 1, direction: 'right' }
            });
            dispatch({ type: 'SET_ERRORS', payload: {} }); // Réinitialiser les erreurs
        } else {
            dispatch({ type: 'SET_ERRORS', payload: errors });
        }
    }, [formState.step, validateStep]);

    // N'afficher les erreurs que si une tentative de validation a eu lieu
    const displayErrors = formState.showErrors ? formState.errors.magasin?.manager : null;

    const handlePrev = useCallback(() => {
        if (formState.step > 1) {
            dispatch({
                type: 'CHANGE_STEP',
                payload: { step: formState.step - 1, direction: 'left' }
            });
        }
    }, [formState.step]);

    const progress = useMemo(() => {
        const errors = validateStep(formState.step);
        const canProceed = Object.keys(errors).length === 0;

        return {
            percentage: ((formState.step - 1) / 2) * 100,
            isFirstStep: formState.step === 1,
            isLastStep: formState.step === 3,
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