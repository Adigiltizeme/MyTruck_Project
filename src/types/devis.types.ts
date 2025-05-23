/**
 * Interface pour les informations client d'un devis
 */
export interface DevisClientInfo {
    nom_entreprise: string;
    nom_contact: string;
    adresse_facturation: string;
    code_postal: string;
    ville: string;
    telephone: string;
    email: string;
}

/**
 * Interface pour les informations de livraison d'un devis
 */
export interface DevisLivraisonInfo {
    adresse: string;
    code_postal: string;
    ville: string;
    date_souhaitee: string;
    creneau_horaire: string;
}

/**
 * Interface pour les détails du lieu de livraison
 */
export interface DevisLieuLivraison {
    etage: string;
    ascenseur: boolean;
    dimensions_ascenseur?: string;
    marches_avant_ascenseur: boolean;
    nombre_marches?: number;
    stationnement_possible: boolean;
    restrictions_stationnement?: string;
    distance_stationnement?: string;
    acces_difficile: boolean;
    details_acces?: string;
}

/**
 * Interface pour les détails de la commande d'un devis
 */
export interface DevisCommandeDetails {
    type_produits: string[];
    quantite: number;
    poids_total?: number;
    dimensions?: string;
    materiel_manutention: boolean;
    conditions_particulieres?: string;
}

/**
 * Interface pour les options de livraison d'un devis
 */
export interface DevisOptionsLivraison {
    type_livraison: 'standard' | 'express';
    assurance: boolean;
    services_supplementaires?: string[];
}

/**
 * Interface pour un article de devis
 */
export interface DevisArticle {
    description: string;
    quantite: number;
    prix_unitaire: number;
    montant_ht: number;
}

/**
 * Interface complète pour un devis
 */
export interface DevisComplet {
    id: string;
    numero_devis: string;
    date_creation: string;
    date_validite: string;
    client: DevisClientInfo;
    livraison: DevisLivraisonInfo;
    lieu_livraison: DevisLieuLivraison;
    commande: DevisCommandeDetails;
    options_livraison: DevisOptionsLivraison;
    articles: DevisArticle[];
    remarques?: string;
    montant_ht: number;
    tva: number;
    montant_ttc: number;
    signature?: {
        nom: string;
        date: string;
    };
    statut: 'En attente' | 'Accepté' | 'Refusé';
    url_pdf?: string;
    commande_id?: string;
}

/**
 * Interface pour les données du formulaire de création de devis
 */
export interface DevisFormData {
    client: DevisClientInfo;
    livraison: DevisLivraisonInfo;
    lieu_livraison: DevisLieuLivraison;
    commande: DevisCommandeDetails;
    options_livraison: DevisOptionsLivraison;
    articles: DevisArticle[];
    remarques?: string;
    signature?: {
        nom: string;
        date: string;
    };
}