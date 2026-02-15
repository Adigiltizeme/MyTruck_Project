import { MagasinInfo, PersonnelInfo } from '../types/business.types';

/**
 * Normalise les données d'un magasin pour utilisation uniforme
 */
export const normalizeMagasin = (magasin: MagasinInfo): {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    manager: string;
    status: string;
    categories: string[];
    enseigne: string;
} => {
    return {
        id: magasin.id,
        name: magasin.nom || magasin.name || '',
        address: magasin.adresse || magasin.address || '',
        enseigne: magasin.enseigne || 'Truffaut',
        phone: magasin.telephone || magasin.phone || '',
        email: magasin.email || '',
        manager: magasin.manager || '',
        status: magasin.status,
        categories: magasin.categories || []
    };
};

/**
 * Normalise les données d'un chauffeur pour utilisation uniforme
 */
export const normalizeChauffeur = (chauffeur: PersonnelInfo): {
    id: string;
    nom: string;
    prenom: string;
    fullName: string;
    telephone: string;
    email: string;
    status: string;
    role: string;
    location?: { latitude?: number; longitude?: number };
} => {
    return {
        id: chauffeur.id,
        nom: chauffeur.nom,
        prenom: chauffeur.prenom || '',
        fullName: `${chauffeur.prenom || ''} ${chauffeur.nom || ''}`.trim(),
        telephone: chauffeur.telephone || '',
        email: chauffeur.email || '',
        status: chauffeur.status,
        role: chauffeur.role,
        location: chauffeur.location
    };
};

/**
 * Obtient la valeur d'affichage d'un champ qui peut avoir différents noms
 */
export const getDisplayValue = (obj: any, ...fieldNames: string[]): string => {
    for (const field of fieldNames) {
        if (obj[field]) {
            return obj[field];
        }
    }
    return '';
};