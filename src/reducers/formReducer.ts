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
        articles: { nombre: 0, details: '', photos: [] },
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
            return {
                ...state,
                data: {
                    ...state.data,
                    articles: {
                        ...state.data.articles,
                        ...action.payload.data.articles,
                        nombre: action.payload.data.articles?.nombre ?? state.data.articles?.nombre ?? 0,
                        photos: action.payload.data.articles?.photos || state.data.articles?.photos,
                        newPhotos: action.payload.data.articles?.newPhotos
                    }
                },
                isDirty: action.payload.isDirty ?? true
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