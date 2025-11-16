import { MagasinInfo, PersonnelInfo } from "./business.types";

/**
 * Types d'articles qui peuvent être transférés
 */
export type ArticleType = 'Plantes' | 'Arbres' | 'Meubles' | 'Matériaux' | 'Autre';

/**
 * Interface représentant un article dans une cession
 */
export interface CessionArticle {
    id: string;
    nom: string;
    reference: string;
    type: ArticleType;
    quantite: number;
    prix_unitaire?: number;
    description?: string;
    photo?: string;
    dimensions?: {
        hauteur?: number;
        largeur?: number;
        profondeur?: number;
    };
    poids?: number;
}

/**
 * Statut d'une cession inter-magasins
 */
export type CessionStatus =
    | 'DEMANDE'
    | 'ACCEPTEE'
    | 'REFUSEE'
    | 'EN_PREPARATION'
    | 'EN_TRANSIT'
    | 'LIVREE'
    | 'ANNULEE';

/**
 * Interface représentant une cession inter-magasins, alignée avec la table Airtable
 */
export interface Cession {
    id: string;
    // NUMERO DE CESSION dans Airtable (fld9wudJxXAtLmSzp)
    numeroCession: string;
    reference: string; // Référence de la cession (ex: "CESSION-2023-001")
    date_demande: string;
    date_livraison_souhaitee: string;
    date_livraison_effective?: string;
    // MAGASIN DE CESSION dans Airtable (fldO9lE6vaQL9sh96)
    magasin_origine: MagasinInfo;
    magasin_destination: MagasinInfo;
    // ADRESSE DE LIVRAISON dans Airtable (fldBBoXnQKzHaeRYc)
    adresse_livraison: string;
    articles: CessionArticle[];
    statut: CessionStatus;
    chauffeurs?: PersonnelInfo[];
    commentaires?: string[];
    createdBy: string; // ID de l'utilisateur qui a créé la cession
    updatedBy?: string; // ID du dernier utilisateur à l'avoir modifiée
    motif?: string; // Motif de la cession (ex: "rupture de stock", "rééquilibrage")
    priorite?: 'Normale' | 'Urgente' | 'Planifiée';
}

/**
 * Interface pour le formulaire de création de cession
 */
export interface CessionFormData {
    magasin_origine_id: string;
    magasin_destination_id: string;
    adresse_livraison?: string;
    date_livraison_souhaitee: string;
    articles: Array<{
        nom: string;
        reference?: string;
        type?: ArticleType;
        quantite: number;
        description?: string;
        photo?: File | null | string;
        hauteur?: number;
        largeur?: number;
        longueur?: number;
        poids?: number;
    }>;
    motif?: string;
    priorite?: 'Normale' | 'Urgente' | 'Planifiée';
    remarques?: string;
    creneau?: string;
    vehicule?: string;
    equipiers?: number;
}
