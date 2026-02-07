import { useCallback } from 'react';
import { CommandeMetier } from '../types/business.types';
import { ValidationErrors } from '../types/validation.types';
import { ERROR_MESSAGES } from '../components/constants/errorMessages';
import { canBypassQuoteLimit } from '../utils/role-helpers';
import { VehicleValidationService } from '../services/vehicle-validation.service';

export const useFormValidation = (
    formData: Partial<CommandeMetier>,
    isCession: boolean = false,
    userRole?: string // 🆕 Rôle utilisateur pour bypass devis obligatoire
) => {
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

                // ✅ VALIDATION VÉHICULE ADAPTÉ selon dimensions articles
                if (formData.articles?.dimensions && formData.articles.dimensions.length > 0 && formData.livraison?.vehicule) {
                    const recommendedVehicle = VehicleValidationService.recommendVehicle(
                        formData.articles.dimensions,
                        formData.articles.canBeTilted || false
                    );

                    if (!recommendedVehicle) {
                        errors.livraison = {
                            ...errors.livraison,
                            vehicule: 'Aucun véhicule disponible ne peut transporter ces articles. Veuillez vérifier les dimensions.'
                        };
                    } else {
                        // Vérifier si le véhicule sélectionné peut transporter tous les articles
                        const vehiculeTypes: ('1M3' | '6M3' | '10M3' | '20M3')[] = ['1M3', '6M3', '10M3', '20M3'];
                        const selectedVehicleIndex = vehiculeTypes.indexOf(formData.livraison.vehicule as any);
                        const recommendedVehicleIndex = vehiculeTypes.indexOf(recommendedVehicle);

                        if (selectedVehicleIndex < recommendedVehicleIndex) {
                            errors.livraison = {
                                ...errors.livraison,
                                vehicule: `Véhicule ${recommendedVehicle} minimum requis pour ces articles (sélectionné: ${formData.livraison.vehicule})`
                            };
                        }
                    }
                }

                // ✅ VALIDATION NOMBRE D'ÉQUIPIERS REQUIS selon articles et conditions livraison
                if (formData.articles?.dimensions && formData.articles.dimensions.length > 0) {
                    // Extraire deliveryConditions depuis les détails de livraison
                    const deliveryConditions = typeof formData.livraison?.details === 'string'
                        ? JSON.parse(formData.livraison.details || '{}')
                        : (formData.livraison?.details || {});

                    // Ajouter totalItemCount depuis articles
                    deliveryConditions.totalItemCount = formData.articles.nombre || 0;

                    const validation = VehicleValidationService.validateCrewSize(
                        formData.livraison?.equipiers ?? 0,
                        formData.articles.dimensions,
                        deliveryConditions
                    );

                    // ✅ CAS SPÉCIAL: Devis obligatoire si ≥3 équipiers requis
                    if (validation.requiredCrewSize >= 3) {
                        if (!canBypassQuoteLimit(userRole)) {
                            errors.livraison = {
                                ...errors.livraison,
                                devis: `Devis obligatoire: ${validation.triggeredConditions.join(', ')}`
                            };
                        } else {
                            console.log(`✅ Admin bypass: Devis obligatoire ignoré (≥3 équipiers requis)`);
                        }
                    } else if (!validation.isValid && validation.requiredCrewSize > 0) {
                        // ✅ FIX: Bloquer uniquement si des équipiers SONT RÉELLEMENT REQUIS (requiredCrewSize > 0)
                        // Si requiredCrewSize === 0, alors 0 équipier sélectionné est valide
                        if (!canBypassQuoteLimit(userRole)) {
                            errors.livraison = {
                                ...errors.livraison,
                                equipiers: `${validation.requiredCrewSize} équipier(s) requis pour cette livraison. ${validation.triggeredConditions.join(', ')}`
                            };
                        } else {
                            console.log(`✅ Admin bypass: ${formData.livraison?.equipiers} équipiers autorisés (requis: ${validation.requiredCrewSize})`);
                        }
                    }
                }

                // ✅ Bloquer si >2 équipiers - SAUF si admin (bypass devis obligatoire)
                if ((formData.livraison?.equipiers ?? 0) > 2) {
                    if (!canBypassQuoteLimit(userRole)) {
                        errors.livraison = {
                            ...errors.livraison,
                            equipiers: ERROR_MESSAGES.equipiers.max
                        };
                    } else {
                        console.log(`✅ Admin bypass: ${formData.livraison?.equipiers} équipiers autorisés`);
                    }
                }

                // ✅ Bloquer si devis obligatoire (distance > 50km) - SAUF si admin
                if (formData.financier?.devisObligatoire === true) {
                    if (!canBypassQuoteLimit(userRole)) {
                        // Combiner avec message existant si déjà présent
                        const existingDevisError = errors.livraison?.devis;
                        const distanceMessage = 'Distance supérieure à 50km';

                        errors.livraison = {
                            ...errors.livraison,
                            devis: existingDevisError
                                ? `${existingDevisError} + ${distanceMessage}`
                                : `Devis obligatoire: ${distanceMessage}`
                        };
                    } else {
                        console.log('✅ Admin bypass: Devis obligatoire ignoré (distance >50km)');
                    }
                }

                break;

            case 4: // Récapitulatif
                // ✅ Validation manager uniquement si commande en création (pas d'ID)
                // En modification, le manager est déjà renseigné et ne doit pas être re-validé
                if (!formData.id && !formData.magasin?.manager) {
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