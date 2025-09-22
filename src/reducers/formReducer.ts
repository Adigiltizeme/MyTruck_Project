import { FormState, FormAction } from '../types/form.types';

export const initialFormState: FormState = {
    data: {
        numeroCommande: '',
        dates: {
            commande: new Date().toISOString(),
            livraison: '',
            misAJour: {
                commande: new Date().toISOString(),
                livraison: ''
            }
        },
        client: {
            nom: '',
            prenom: '',
            nomComplet: '',
            telephone: { principal: '', secondaire: '' },
            adresse: {
                type: 'Domicile',
                ligne1: '',
                batiment: '',
                etage: '',
                ascenseur: false,
                interphone: ''
            }
        },
        articles: {
            nombre: 0,
            details: '',
            photos: [],
            dimensions: []
        },
        livraison: {
            creneau: '',
            vehicule: '',
            equipiers: 0,
            reserve: false,
            remarques: '',
            chauffeurs: [],
            details: {} as import('../types/business.types').DeliveryDetails
        },
    },
    errors: {},
    step: 1,
    direction: 'right',
    isDirty: false,
    isSubmitting: false,
    isValid: false,
    showErrors: false,
    isEditing: false
};

export function formReducer(state: FormState, action: FormAction): FormState {
    switch (action.type) {
        case 'UPDATE_DATA':
            if (!action.payload.name) return state;

            // Log seulement si changement significatif de véhicule
            if (action.payload.name === 'livraison.vehicule' &&
                action.payload.value !== state.data.livraison?.vehicule &&
                action.payload.value !== '') {
                console.log("⚙️ [VEHICULE] Changement:", action.payload.value);
            }

            const fieldPath = action.payload.name.split('.');
            const newData = { ...state.data };
            let current = newData;

            // Navigation jusqu'au dernier nœud parent
            for (let i = 0; i < fieldPath.length - 1; i++) {
                if (!current[fieldPath[i]]) {
                    current[fieldPath[i]] = {};
                }
                // Important : créer une nouvelle référence pour forcer la mise à jour
                current[fieldPath[i]] = { ...current[fieldPath[i]] };
                current = current[fieldPath[i]];
            }

            // Mise à jour de la valeur finale
            current[fieldPath[fieldPath.length - 1]] = action.payload.value;

            // Gestion spéciale pour les tableaux comme les dimensions
            if (fieldPath[0] === 'articles' && fieldPath[1] === 'dimensions') {
                return {
                    ...state,
                    isDirty: true,
                    data: {
                        ...state.data,
                        articles: {
                            ...state.data.articles,
                            dimensions: action.payload.value,
                            nombre: state.data.articles?.nombre ?? 0
                        }
                    }
                };
            }

            if (fieldPath[0] === 'livraison' && fieldPath[1] === 'details') {
                return {
                    ...state,
                    isDirty: true,
                    data: {
                        ...state.data,
                        livraison: {
                            ...state.data.livraison,
                            details: action.payload.value as import('../types/business.types').DeliveryDetails,
                            // Assurez-vous que les autres champs sont préservés
                            vehicule: state.data.livraison?.vehicule || '',
                            equipiers: state.data.livraison?.equipiers || 0,
                            creneau: state.data.livraison?.creneau || '',
                            reserve: typeof state.data.livraison?.reserve === 'boolean'
                                ? state.data.livraison.reserve
                                : false
                        }
                    }
                };
            }

            return {
                ...state,
                data: newData,
                isDirty: true
            };
        case 'RESTORE_DRAFT':
            console.log("Reducer - Restauration du brouillon:", action.payload.data);
            // s'assurer que les dimensions sont correctement restaurées
            let restoredData = { ...action.payload.data };

            // S'assurer que les dimensions sont correctement restaurées
            if (restoredData.articles && !restoredData.articles.dimensions) {
                restoredData.articles.dimensions = [];
            }

            // Restaurer correctement les informations de livraison
            if (restoredData.livraison) {
                // Préserver le véhicule sélectionné en format court
                const vehicule = restoredData.livraison.vehicule || '';
                const equipiers = restoredData.livraison.equipiers || 0;
                const creneau = restoredData.livraison.creneau || '';
                const reserve = typeof restoredData.livraison.reserve === 'boolean'
                    ? restoredData.livraison.reserve
                    : false;

                // Restaurer les détails de livraison (incluant canBeTilted)
                let details = restoredData.livraison.details || '{}';
                if (typeof details === 'string') {
                    try {
                        details = JSON.parse(details);
                    } catch {
                        details = '' as string;
                    }
                }

                // Créer un objet LivraisonInfo complet avec tous les champs requis
                restoredData.livraison = {
                    creneau, // string requis
                    vehicule, // Format court attendu
                    equipiers, // number requis
                    reserve, // boolean requis
                    details: details as import('../types/business.types').DeliveryDetails,
                    remarques: restoredData.livraison.remarques || '',
                    chauffeurs: restoredData.livraison.chauffeurs || [],
                    commentaireEnlevement: restoredData.livraison.commentaireEnlevement,
                    commentaireLivraison: restoredData.livraison.commentaireLivraison,
                    photosEnlevement: restoredData.livraison.photosEnlevement,
                    photosLivraison: restoredData.livraison.photosLivraison
                };

                console.log(`[REDUCER] Véhicule restauré: ${vehicule}`);
                console.log(`[REDUCER] Équipiers restaurés: ${equipiers}`);
                console.log(`[REDUCER] Créneau restauré: ${creneau}`);
                console.log(`[REDUCER] Détails restaurés: ${details}`);
            }

            // S'assurer que toutes les propriétés financières sont préservées
            if (!restoredData.financier) {
                restoredData.financier = { tarifHT: 0 };
            }

            console.log("Données finales restaurées:", {
                vehicule: restoredData.livraison?.vehicule,
                dimensions: restoredData.articles?.dimensions?.length || 0,
                details: restoredData.livraison?.details
            });

            return {
                ...state,
                data: restoredData,
                isDirty: action.payload.isDirty,
                showErrors: false
            };
        case 'SET_ERRORS':
            return {
                ...state,
                errors: action.payload
            };
        case 'CHANGE_STEP':
            return {
                ...state,
                step: action.payload.step,
                direction: action.payload.direction
            };
        case 'SUBMIT_START':
            return {
                ...state,
                isSubmitting: true
            };
        case 'SUBMIT_END':
            return {
                ...state,
                isSubmitting: false
            };
        case 'RESET':
            return initialFormState;
        default:
            return state;
    }
}