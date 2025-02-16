import { CommandeMetier } from "./business.types";
import { ValidationErrors } from "./validation.types";

export interface FormState {
    data: Partial<CommandeMetier>;
    errors: ValidationErrors;
    step: number;
    direction: 'left' | 'right';
    isDirty: boolean;
    isSubmitting: boolean;
    isValid: boolean;
    showErrors: boolean;
    isEditing: boolean;
}

export type FormAction =
    | { type: 'UPDATE_DATA'; payload: { data: Partial<CommandeMetier>; isDirty?: boolean } }
    | { type: 'SET_ERRORS'; payload: ValidationErrors }
    | { type: 'CHANGE_STEP'; payload: { step: number; direction: 'left' | 'right' } }
    | { type: 'SUBMIT_START' }
    | { type: 'SUBMIT_END' }
    | { type: 'RESET' }
    | { type: 'SET_VALIDITY'; payload: boolean }
    | { type: 'SET_DIRTY'; payload: boolean }
    | { type: 'SET_STEP'; payload: number }
    | { type: 'SET_DIRECTION'; payload: 'left' | 'right' }
    | { type: 'SET_SUBMITTING'; payload: boolean };

export interface BaseFormProps {
    data: Partial<CommandeMetier>;
    errors: ValidationErrors;
    onChange: (e: { target: { name: string; value: any } }) => void;
    readOnly?: boolean;
    isEditing?: boolean;
}

export interface AddressSuggestion {
    properties: {
        id: string;
        label: string;
        name: string;
        housenumber: string;
        street: string;
        postcode: string;
        city: string;
    };
}

interface Photo {
    url: string;
    file?: File;
}

export interface ClientFormProps extends BaseFormProps {
    handleAddressSearch: (query: string) => Promise<void>;
    handleAddressSelect: (suggestion: any) => void;
    addressSuggestions: AddressSuggestion[];
}
export interface ArticlesFormProps extends BaseFormProps {
    data: {
        articles?: {
            nombre: number;
            details?: string;
            photos?: Array<{
                url: string;
                file?: File;
            }>;
            newPhotos?: Array<{
                url: string;
                file: File;
            }>;
        };
    };
    errors: any;
    onChange: (e: { target: { name: string; value: any } }) => void;
}
export interface LivraisonFormProps extends BaseFormProps {
    showErrors: boolean;
    maxEquipiers?: number;
}
export interface RecapitulatifFormProps extends BaseFormProps {
    showErrors: boolean;
}