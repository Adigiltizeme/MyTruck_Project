import { useCallback } from 'react';
import { CommandeMetier } from '../types/business.types';
import { ValidationErrors } from '../types/validation.types';
import { ERROR_MESSAGES } from '../components/constants/errorMessages';

export const useFormValidation = (formData: Partial<CommandeMetier>, isCession: boolean = false) => {
    const validateStep = useCallback((step: number): ValidationErrors => {
        const errors: ValidationErrors = {};

        switch (step) {
            case 1: // Articles
                if (!formData.articles?.nombre || formData.articles.nombre <= 0) {
                    errors.articles = {
                        ...errors.articles,
                        nombre: ERROR_MESSAGES.articles
                    };
                }
                break;

            case 2: // Informations client OU Magasin de destination (pour cession)
                if (isCession) {
                    // Validation pour cession: seul le magasin de destination est requis
                    if (!formData.magasinDestination?.id) {
                        errors.magasinDestination = {
                            id: 'Le magasin de destination est requis'
                        };
                    }
                } else {
                    // Validation pour commande normale: informations client requises
                    if (!formData.client?.nom?.trim()) {
                        errors.client = {
                            ...errors.client,
                            nom: ERROR_MESSAGES.required
                        };
                    }

                    if (!formData.client?.telephone?.principal) {
                        errors.client = {
                            ...errors.client,
                            telephone: {
                                principal: ERROR_MESSAGES.required
                            }
                        };
                    }

                    if (!formData.client?.adresse?.ligne1?.trim()) {
                        errors.client = {
                            ...errors.client,
                            adresse: {
                                ...errors.client?.adresse,
                                ligne1: ERROR_MESSAGES.adresse.required
                            }
                        };
                    }

                    if (!formData.client?.adresse?.etage) {
                        errors.client = {
                            ...errors.client,
                            adresse: {
                                ...errors.client?.adresse,
                                etage: ERROR_MESSAGES.adresse.etage
                            }
                        };
                    }

                    if (!formData.client?.adresse?.interphone) {
                        errors.client = {
                            ...errors.client,
                            adresse: {
                                ...errors.client?.adresse,
                                interphone: ERROR_MESSAGES.adresse.interphone
                            }
                        };
                    }
                }
                break;

            case 3: // Livraison
                if (!formData.dates?.livraison) {
                    errors.dates = {
                        ...errors.dates,
                        livraison: ERROR_MESSAGES.required
                    };
                }
                
                if (!formData.livraison?.creneau) {
                    errors.livraison = {
                        ...errors.livraison,
                        creneau: ERROR_MESSAGES.required
                    };
                }

                if (!formData.livraison?.vehicule) {
                    errors.livraison = {
                        ...errors.livraison,
                        vehicule: ERROR_MESSAGES.required
                    };
                }

                if ((formData.livraison?.equipiers ?? 0) > 2) {
                    errors.livraison = {
                        ...errors.livraison,
                        equipiers: ERROR_MESSAGES.equipiers.max
                    };
                }

                // ✅ Bloquer si devis obligatoire (distance > 50km)
                if (formData.financier?.devisObligatoire === true) {
                    errors.livraison = {
                        ...errors.livraison,
                        devis: 'Un devis est obligatoire pour cette commande. Distance supérieure à 50km.'
                    };
                }

                break;

            case 4: // Récapitulatif
                if (!formData.magasin?.manager) {
                    errors.magasin = {
                        ...errors.magasin,
                        manager: ERROR_MESSAGES.required
                    };
                }

                break;
        }

        return errors;
    }, [formData]); // isCession retiré des dépendances car il ne change pas pendant le cycle de vie du hook

    const validateForm = useCallback(() => {
        const errors = {
            ...validateStep(1),
            ...validateStep(2),
            ...validateStep(3),
            ...validateStep(4)
        };

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }, [validateStep]);

    return { validateStep, validateForm };
};