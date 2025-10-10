// Types de base Airtable
export interface AirtableRecord<T> {
  id: string;
  fields: T;
}

// Types des champs Airtable
export interface AirtableMagasinFields {
  'NOM DU MAGASIN': string;
  'ADRESSE DU MAGASIN': string;
  'TÉLÉPHONE': string;
  'E-MAIL': string;
  'PHOTO'?: string[];
  'STATUT'?: 'Ouvert' | 'Fermé';
  'INTERLOCUTEUR'?: string;
}

export interface AirtablePersonnelFields {
  'NOM': string;
  'PRENOM': string;
  'TELEPHONE': string;
  'E-MAIL'?: string;
  'ROLE': 'Chauffeur' | 'Direction' | 'Section IT' | 'Dispatcher';
  'STATUT'?: 'Actif' | 'Inactif';
}

export interface AirtableCommandeFields {
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
  'OPTION EQUIPIER DE MANUTENTION': string;
  'CATEGORIE DE VEHICULE': CategorieVehicule;
  'CRENEAU DE LIVRAISON': string;
  'NOMBRE TOTAL D\'ARTICLES': number;
  'PHOTOS ARTICLES'?: string[];
  'DETAILS SUR LES ARTICLES'?: string;
  'AUTRES REMARQUES'?: string;
  'PRENOM DU VENDEUR/INTERLOCUTEUR'?: string;
  'STATUT DE LA COMMANDE': StatutCommande[];
  'STATUT DE LA LIVRAISON (ENCART MYTRUCK)': StatutLivraison[];
  'TARIF HT': number;
  'RESERVE TRANSPORT': 'NON' | 'OUI';
  'DATE DE MISE A JOUR COMMANDE': string;
  'Magasins'?: string[];
  'CHAUFFEUR(S)'?: string[];
  'COMMENTAIRE MYTRUCK A L\'ENLEVEMENT'?: string;
  'COMMENTAIRE MYTRUCK A LA LIVRAISON'?: string;
  'PHOTO COMMENTAIRE A L\'ENLEVEMENT'?: string[];
  'PHOTO COMMENTAIRE A LA LIVRAISON'?: string[];
}

// Types des réponses Airtable
export interface AirtableResponse<T> {
  records: AirtableRecord<T>[];
}

// Types métier transformés
export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  photo: string;
  status: 'Ouvert' | 'Fermé';
  manager: string;
}

export interface Personnel {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  role: 'Chauffeur' | 'Direction' | 'Section IT' | 'Dispatcher';
  status: 'Actif' | 'Inactif';
}

export type CategorieVehicule = '1M3' | '6M3' | '10M3' | '20M3';
export type StatutCommande = 'En attente' | 'Confirmée' | 'Annulée' | 'Modifiée';
export type StatutLivraison = 
  | 'EN ATTENTE' 
  | 'CONFIRMEE' 
  | 'ENLEVEE' 
  | 'EN COURS DE LIVRAISON' 
  | 'LIVREE' 
  | 'ANNULEE' 
  | 'ECHEC';

// Types utilitaires
export interface FetchOptions {
  filterByFormula?: string;
  sort?: Array<{
      field: string;
      direction: 'asc' | 'desc';
  }>;
  maxRecords?: number;
  view?: string;
}

// export interface PersonnelMap {
//   id: string;
//   nom: string;
//   prenom: string;
//   telephone: string;
//   email: string;
//   role: 'Chauffeur' | 'Direction' | 'Section IT' | 'Dispatcher';
//   status: 'Actif' | 'Inactif';
// }

export interface AirtableDelivery {
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
    'Magasins': string[];
    'CHAUFFEUR(S)': string[];
  };
}