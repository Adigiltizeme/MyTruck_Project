import { FormState, FormAction } from '../types/form.types';

export const initialFormState: FormState = {
    data: {
        numeroCommande: '',
        dates: {
            commande: new Date().toISOString(),
            livraison: '',
            misAJour: new Date().toISOString()
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
            chauffeurs: []
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

            return {
                ...state,
                data: newData,
                isDirty: true
            };
        case 'RESTORE_DRAFT':
            console.log("Reducer - Restauration du brouillon:", action.payload.data);
            // s'assurer que les dimensions sont correctement restaurées
            let restoredData = action.payload.data;

            // Si les dimensions ne sont pas définies dans les données restaurées, les initialiser
            if (restoredData.articles && !restoredData.articles.dimensions) {
                restoredData = {
                    ...restoredData,
                    articles: {
                        ...restoredData.articles,
                        dimensions: []
                    }
                };
            }

            return {
                ...state,
                data: restoredData,
                isDirty: action.payload.isDirty
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