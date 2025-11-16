import { CommandeMetier } from "./business.types";

export interface ValidationErrors {
    commande?: {
        numeroCommande?: string;
    }
    dates?: {
        commande?: string;
        livraison?: string;
        misAJour?: string;
    };
    client?: {
        nom?: string;
        prenom?: string;
        telephone?: {
            principal?: string;
        };
        adresse?: {
            ligne1?: string;
            etage?: string;
            interphone?: string;
        };
    };
    articles?: {
        nombre?: string;
    };
    livraison?: {
        creneau?: string;
        vehicule?: string;
        equipiers?: string;
        devis?: string;
    };
    magasin?: {
        id?: string;
        name?: string;
        address?: string;
        manager?: string;
    };
    magasinDestination?: {
        id?: string;
        name?: string;
        address?: string;
    };
    submit?: string;
    showErrors?: boolean;
}

export interface ValidationRules {
    required?: boolean;
    minLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationErrors;
}
