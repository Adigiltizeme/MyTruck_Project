interface ClientInfo {
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

// Interface pour le magasin
export interface MagasinInfo {
    id: string;
    name: string;
    address: string;
    phone: string;
    email?: string;
    photo?: string;
    status: string;
    manager?: string;
}

export interface FactureInfo {
    id: string;
    numeroFacture: string;
    dateFacture: string;
    dateEcheance: string;
    montantHT: number;
    statut: 'En attente' | 'Payée'
}

export interface DevisInfo {
    id: string;
    numeroDevis: string;
    dateDevis: string;
    dateEcheance: string;
    montantHT: number;
    statut: 'En attente' | 'Accepté' | 'Refusé'
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
    details: string;
    photos: Array<{
        url: string;
        file?: File;
    }>;
    newPhotos: Array<{
        url: string;
        file: File
    }>;
    categories: string[];
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
    livraison: {
        creneau: string;
        vehicule: string;
        equipiers: number;
        commentaireEnlevement?: string;
        commentaireLivraison?: string;
        photosEnlevement?: string[];
        photosLivraison?: string[];
        reserve: boolean;
        chauffeurs: PersonnelInfo[];
        remarques?: string;
    };
    articles: {
        nombre: number;
        details?: string;
        photos?: ArticlesType['photos'];
        newPhotos?: ArticlesType['newPhotos'];
        categories?: string[];
    };
    financier: {
        tarifHT: number;
        factures?: FactureInfo[];
        devis?: DevisInfo[];
    };
    magasin: MagasinInfo;
    chauffeurs: PersonnelInfo[];
    [key: string]: any;
}

export type CommandeMetierKey = keyof CommandeMetier;