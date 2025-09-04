import { ArticleDimension } from "../components/forms/ArticleDimensionForm";
import { VehicleType } from "../services/vehicle-validation.service";

export interface ClientInfo {
    nom: string;
    prenom: string;
    nomComplet: string;
    telephone: {
        principal: string;
        secondaire: string;
    };
    adresse: {
        type: 'Professionnelle' | 'Domicile';
        ligne1: string;
        batiment: string;
        etage: string;
        ascenseur: boolean;
        interphone: string;
    };
}

export interface ClientGDPR extends ClientInfo {
    id: string;
    consentGiven: boolean;
    consentDate?: string;
    dataRetentionUntil: string;
    lastActivityAt: string;
    pseudonymized: boolean;
    deletionRequested: boolean;
    _count?: {
        commandes: number;
    };
}

export interface ClientFilters {
    search?: string;
    typeAdresse?: 'Professionnelle' | 'Domicile';
    skip?: number;
    take?: number;
}

export interface ClientsResponse {
    data: ClientGDPR[];
    meta: {
        total: number;
        skip: number;
        take: number;
        hasMore: boolean;
    };
}

export interface MagasinInfo {
    id: string;
    name: string;
    address: string;
    phone: string;
    email?: string;
    photo?: string;
    status: string;
    manager?: string;
    categories?: string[];
}

export interface FactureInfo {
    id: string;
    numeroFacture: string;
    dateFacture: string;
    dateEcheance: string;
    magasin: MagasinInfo;
    client: ClientInfo;
    montantHT: number;
    statut: 'En attente' | 'Payée';
    url?: string;
    notes?: string;
    additionalItems?: Array<{ description: string, price: number, quantity: number }>;
}

export interface DevisInfo {
    id: string;
    numeroDevis: string;
    dateDevis: string;
    magasin: MagasinInfo;
    client: ClientInfo;
    dateEcheance: string;
    montantHT: number;
    montantTTC?: number;
    statut: 'En attente' | 'Accepté' | 'Refusé';
    url?: string;
    notes?: string;
    additionalServices?: Array<{ name: string, price: number }>;
}

export type ChauffeurStatus = 'Actif' | 'En route vers magasin' | 'En route vers client' | 'Inactif';

// Interface pour le personnel
export interface PersonnelInfo {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    role: 'Chauffeur' | 'Direction' | 'Section IT' | 'Dispatcher';
    email?: string;
    status: ChauffeurStatus;
    location?: {
        longitude?: number;
        latitude?: number;
    }
}

export interface FormattedDate {
    raw: string; // ISO string pour le stockage
    display: string; // Format d'affichage (dd/MM/yyyy)
}

export interface ArticlesType {
    nombre: number;
    details?: string;
    photos?: Array<{
        url: string;
        file?: File;
    }>;
    dimensions?: ArticleDimension[];
    newPhotos: Array<{
        url: string;
        file: File
    }>;
    categories: string[];
    canBeTilted?: boolean;
}

export interface LivraisonInfo {
    creneau: string;
    vehicule: string;  // Utiliser le type strict d'Airtable
    equipiers: number;
    commentaireEnlevement?: string;
    commentaireLivraison?: string;
    photosEnlevement?: string[];
    photosLivraison?: string[];
    reserve: boolean;
    chauffeurs?: PersonnelInfo[];
    remarques?: string;
    details?: DeliveryDetails;
}

export interface DeliveryDetails {
    // Conditions de base
    hasElevator: boolean;
    hasStairs: boolean;
    stairCount: number;
    parkingDistance: number;
    needsAssembly: boolean;
    rueInaccessible: boolean;
    paletteComplete: boolean;
    isDuplex: boolean;
    deliveryToUpperFloor: boolean;

    // Métadonnées
    createdAt?: string;
    updatedAt?: string;
}

export interface DeliveryValidationResult {
    requiredVehicle: VehicleType | null;
    requiredCrew: number;
    largestArticle: {
        longueur: number;
        largeur: number;
        hauteur: number;
        poids: number;
    } | null;
    heaviestArticle: number;
    totalWeight: number;
    totalItems: number;
    effectiveFloor: number;
    triggeredConditions: string[];
    needsQuote: boolean;
    estimatedCost?: {
        vehicleCost: number;
        crewCost: number | 'quote';
        distanceCost: number;
        totalHT: number | 'quote';
    };
}

export interface CrewValidationResult {
    isValid: boolean;
    requiredCrewSize: number;
    selectedCrewSize: number;
    deficiency: number;
    triggeredConditions: string[];
    recommendations: string[];
    estimatedCost: number | 'quote';
    needsQuote: boolean;
}

export interface ValidatedArticle extends ArticleDimension {
    // Données de validation
    canFitInVehicles: VehicleType[];
    restrictedVehicles: VehicleType[];
    isHeaviest: boolean;
    isLargest: boolean;
    contributesToCrewRequirement: boolean;

    // Métadonnées
    volumeDimensional: number;
    totalWeightWithQuantity: number;
}

export enum DeliveryConditionType {
    HEAVY_INDIVIDUAL_ITEM = 'heavy_individual_item',
    TOTAL_WEIGHT_WITH_ELEVATOR = 'total_weight_with_elevator',
    TOTAL_WEIGHT_WITHOUT_ELEVATOR = 'total_weight_without_elevator',
    MANY_ITEMS = 'many_items',
    INACCESSIBLE_STREET = 'inaccessible_street',
    COMPLETE_PALETTE = 'complete_palette',
    LONG_CARRY_DISTANCE = 'long_carry_distance',
    HIGH_FLOOR_NO_ELEVATOR = 'high_floor_no_elevator',
    MANY_STAIRS = 'many_stairs',
    ASSEMBLY_REQUIRED = 'assembly_required',
    DUPLEX_UPPER_FLOOR = 'duplex_upper_floor'
}

export interface DeliveryCondition {
    type: DeliveryConditionType;
    isTriggered: boolean;
    description: string;
    value?: number | string;
    threshold?: number;
    impactOnCrew: number;
    priority: number;
}

// Interface pour la commande
export interface CommandeMetier {
    id: string;
    numeroCommande: string;
    dates: {
        commande: string;
        livraison: string;
        misAJour: string;
    };
    statuts: {
        commande: 'En attente' | 'Confirmée' | 'Transmise' | 'Annulée' | 'Modifiée';
        livraison: 'EN ATTENTE' | 'CONFIRMEE' | 'ENLEVEE' | 'EN COURS DE LIVRAISON' | 'LIVREE' | 'ANNULEE' | 'ECHEC';
    };
    client: ClientInfo;
    livraison: LivraisonInfo;
    articles: {
        nombre: number;
        details?: string;
        photos?: ArticlesType['photos'];
        newPhotos?: ArticlesType['newPhotos'];
        categories?: string[];
        dimensions?: ArticleDimension[];
        canBeTilted?: boolean; // Indique si la commande peut être inclinée
        validationResults?: DeliveryValidationResult;
        validatedArticles?: ValidatedArticle[];
    };
    financier: {
        tarifHT: number;
        factures?: FactureInfo[];
        devis?: DevisInfo[];
        devisObligatoire?: boolean;
        tarifDetails?: {
            vehicleCost: number;
            crewCost: number | 'quote';
            distanceCost: number;
            breakdown: string[];
        };
    };
    magasin: MagasinInfo;
    chauffeurs: PersonnelInfo[];
    [key: string]: any;
}

export interface DeliveryValidationProps {
    articles: ArticleDimension[];
    deliveryDetails: DeliveryDetails;
    clientInfo: {
        etage: string;
        ascenseur: boolean;
    };
    onValidationChange: (result: DeliveryValidationResult) => void;
    showDebugInfo?: boolean;
}

// 🆕 INTERFACE POUR LE SERVICE DE TARIFICATION ÉTENDU
export interface ExtendedTarificationParams {
    vehicule: VehicleType;
    adresseMagasin: string;
    adresseLivraison: string;
    equipiers: number;

    // Nouveaux paramètres
    articles: ArticleDimension[];
    deliveryDetails: DeliveryDetails;
    forceQuote?: boolean;
}

export interface ExtendedTarificationResult {
    montantHT: number | 'devis';
    detail: {
        vehicule: number;
        distance: number | 'devis';
        equipiers: number | 'devis';
        supplements?: number;
    };

    // Nouvelles informations
    validationResults: DeliveryValidationResult;
    recommendations: string[];
    warnings: string[];
    isOptimal: boolean;
    alternativeOptions?: {
        vehicule: VehicleType;
        equipiers: number;
        cost: number;
        description: string;
    }[];
}

export type CommandeMetierKey = keyof CommandeMetier;