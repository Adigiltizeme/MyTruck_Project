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

interface DatesCommande {
    commande: Date;
    livraison: Date;
    misAJour: Date;
}

interface StatutsCommande {
    commande: 'En attente' | 'Confirmée' | 'Transmise' | 'Annulée' | 'Modifiée';
    livraison: 'LIVREE' | 'ENLEVEE' | 'EN COURS DE LIVRAISON' | 'ANNULEE' | 'EN ATTENTE' | 'CONFIRMEE' | 'ECHEC';
}

interface LivraisonInfo {
    creneau: string;
    vehicule: '3M3' | '6M3' | '10M3' | '20M3';
    chauffeurs: { // noms des chauffeurs
        nom: string;
    }[];
    equipiers: number;
    notes: string;
    reserve: boolean;
    commentaireEnlevement: string;
    commentaireLivraison: string;
    photosEnlevement: any[];
    photosLivraison: any[];
}

interface ArticlesInfo {
    nombre: number;
    details: string;
    photos: any[];
    categories: Array<'Divers' | 'Plantes/Arbres' | 'Mobilier' | 'Produits'>;
}

interface CommercialInfo {
    prenom: string;
    nomSignatureClient: string;
}

interface FinancierInfo {
    tarifHT: number;
}

interface RelationsInfo {
    factures: string[];      // IDs des factures liées
    magasins: string[];      // IDs des magasins
    users: string[];         // IDs des utilisateurs
    historique: string[];    // IDs de l'historique
    renseignements: string[]; // IDs des renseignements prestations
}

interface Store {
    id?: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    photo: string;
    status: 'Ouvert' | 'Fermé';
    manager: string;
}

export interface CommandeMetier {
    id?: string;
    numeroCommande: string;
    client: ClientInfo;
    dates: DatesCommande;
    statuts: StatutsCommande;
    livraison: LivraisonInfo;
    articles: ArticlesInfo;
    commercial: CommercialInfo;
    financier: FinancierInfo;
    relations: RelationsInfo;
    store: Store;
    
}

export function transformCommande(airtableData: any): CommandeMetier {
    const fields = airtableData.fields;

    try {
        return {
            id: airtableData.id,
            numeroCommande: fields['NUMERO DE COMMANDE'] || '',
            client: {
                nom: fields['NOM DU CLIENT'] || '',
                prenom: fields['PRENOM DU CLIENT'] || '',
                nomComplet: fields['NOM COMPLET DU CLIENT'] || '',
                telephone: {
                    principal: fields['TELEPHONE DU CLIENT'] || '',
                    secondaire: fields['TELEPHONE DU CLIENT 2'] || ''
                },
                adresse: {
                    type: fields['TYPE D\'ADRESSE'] || 'Domicile',
                    ligne1: fields['ADRESSE DE LIVRAISON'] || '',
                    batiment: fields['BÂTIMENT'] || '',
                    etage: fields['ETAGE'] || '',
                    ascenseur: fields['ASCENSEUR'] === 'Oui',
                    interphone: fields['INTERPHONE/CODE'] || ''
                }
            },
            dates: {
                commande: new Date(fields['DATE DE COMMANDE'] || Date.now()),
                livraison: new Date(fields['DATE DE LIVRAISON'] || Date.now()),
                misAJour: new Date(fields['DATE DE MISE A JOUR COMMANDE'] || Date.now())
            },
            statuts: {
                commande: Array.isArray(fields['STATUT DE LA COMMANDE'])
                    ? fields['STATUT DE LA COMMANDE'][0]
                    : 'En attente',
                livraison: Array.isArray(fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)'])
                    ? fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)'][0]
                    : 'EN ATTENTE'
            },
            livraison: {
                creneau: fields['CRENEAU DE LIVRAISON'] || '',
                vehicule: fields['CATEGORIE DE VEHICULE'] || '3M3',
                chauffeurs: Array.isArray(fields['CHAUFFEUR(S)'])
                    ? fields['CHAUFFEUR(S)'].map((nom: string) => ({ nom }))
                    : [],
                equipiers: Number(fields['OPTION EQUIPIER DE MANUTENTION (en plus du livreur)']) || 0,
                notes: fields['AUTRTES REMARQUES'] || '',
                reserve: fields['RESERVE TRANSPORT'] === 'OUI',
                commentaireEnlevement: fields['COMMENTAIRE MYTRUCK A L\'ENLEVEMENT'] || '',
                commentaireLivraison: fields['COMMENTAIRE MYTRUCK A LA LIVRAISON'] || '',
                photosEnlevement: fields['PHOTO COMMENTAIRE A L\'ENLEVEMENT'] || [],
                photosLivraison: fields['PHOTO COMMENTAIRE A LA LIVRAISON'] || [],

            },
            articles: {
                nombre: Number(fields['NOMBRE TOTAL D\'ARTICLES']) || 0,
                details: fields['DETAILS SUR LES ARTICLES'] || '',
                photos: fields['PHOTOS ARTICLES'] || [],
                categories: Array.isArray(fields['CATEGORIE DE L\'ARTICLE COMMANDE'])
                    ? fields['CATEGORIE DE L\'ARTICLE COMMANDE']
                    : []
            },
            commercial: {
                prenom: fields['PRENOM DU VENDEUR/INTERLOCUTEUR'] || '',
                nomSignatureClient: fields['NOM ET SIGNATURE DU CLIENT'] || ''
            },
            financier: {
                tarifHT: Number(fields['TARIF HT']) || 0,
            },
            relations: {
                factures: fields['Factures'] || [],
                magasins: fields['Magasins'] || [],
                users: fields['Users'] || [],
                historique: fields['Historique'] || [],
                renseignements: fields['Renseignements prestations (livraisons)'] || []
            },
            store: {
                id: fields['ID DU MAGASIN'] || '',
                name: fields['NOM DU MAGASIN'] || '',
                address: fields['ADRESSE DU MAGASIN'] || '',
                phone: fields['TÉLÉPHONE'] || '',
                email: fields['E-MAIL'] || '',
                photo: fields['PHOTO'] || '',
                status: fields['STATUT'] || 'Ouvert',
                manager: fields['INTERLOCUTEUR'] || ''
            }
        };
    } catch (error) {
        console.error('Erreur lors de la transformation:', error);
        if (error instanceof Error) {
            throw new Error(`Erreur de transformation: ${error.message}`);
        } else {
            throw new Error('Erreur de transformation inconnue');
        }
    }
}