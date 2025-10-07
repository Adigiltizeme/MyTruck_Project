export type StatutCommande = 'En attente' | 'Confirmée' | 'Annulée' | 'Modifiée';

export type StatutLivraison =
    | 'EN ATTENTE'
    | 'CONFIRMEE'
    | 'ENLEVEE'
    | 'EN COURS DE LIVRAISON'
    | 'LIVREE'
    | 'ANNULEE'
    | 'ECHEC';

export type CategorieVehicule =
    | '3M3'   // Utilitaire 150kg, 180x125x180cm
    | '6M3'   // Camionnette 300kg, 240x169x138cm
    | '10M3'  // Camionnette 1000kg, 308x207x176cm
    | '20M3'; // Avec hayon 1000kg, 420, 207, 230cm

export interface Commande {
    id: string;
    fields: {
        'NUMERO DE COMMANDE': string;
        'NOM DU CLIENT': string;
        'PRENOM DU CLIENT': string;
        'NOM COMPLET DU CLIENT': string;
        'ADRESSE DE LIVRAISON': string;
        'TYPE D\'ADRESSE': 'Professionnelle' | 'Domicile';
        'BÂTIMENT'?: string;
        'INTERPHONE'?: string;
        'ASCENSEUR': 'Oui' | 'Non';
        'ETAGE'?: string;
        'TELEPHONE DU CLIENT': string;
        'TELEPHONE DU CLIENT 2'?: string;
        'DATE DE COMMANDE': string;
        'DATE DE LIVRAISON': string;
        'OPTION EQUIPIER DE MANUTENTION': '0' | '1' | '2';
        'CATEGORIE DE VEHICULE': CategorieVehicule;
        'CRENEAU DE LIVRAISON': string; // '07h-09h' | '09h-11h' etc.
        'NOMBRE TOTAL D\'ARTICLES': number;
        'PHOTOS ARTICLES'?: string[];
        'DETAILS SUR LES ARTICLES'?: string;
        'AUTRES REMARQUES'?: string;
        'PRENOM DU VENDEUR/INTERLOCUTEUR'?: string;
        'STATUT DE LA COMMANDE': StatutCommande;
        'STATUT DE LA LIVRAISON (ENCART MYTRUCK)': StatutLivraison;
        'TARIF HT': number;
        'RESERVE TRANSPORT': 'NON' | 'OUI';
        'DATE DE MISE A JOUR COMMANDE': string;
    };
}