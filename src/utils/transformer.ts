import { CommandeMetier } from "../types/business.types";
import { VEHICULES } from "../components/constants/options";

export function transformAirtableToCommande(record: any): CommandeMetier {
    try {

        if (!record || !record.id) {
            throw new Error('Réponse Airtable invalide');
        }
        const fields = record.fields || {};

        // Extraction des chauffeurs
        console.log('Raw chauffeurs data:', fields['CHAUFFEUR(S)']);

        // console.log('Raw delivery status:', {
        //     field: fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)'],
        //     rawFields: fields
        // });
        // console.log('Transformed status:', fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)'], '→',
        //     Array.isArray(fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)'])
        //         ? fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)']?.[0]
        //         : fields['STATUT DE LA LIVRAISON (ENCART MYTRUCK)'] || 'EN ATTENTE'
        // );
        // console.log('Raw date:', fields['DATE DE LIVRAISON']);

        const chauffeurs = Array.isArray(fields['CHAUFFEUR(S)'])
            ? fields['CHAUFFEUR(S)'].map((chauffeur: any) => ({
                id: chauffeur.id || '',
                nom: chauffeur.fields?.['NOM'] || 'N/A',
                prenom: chauffeur.fields?.['PRENOM'] || 'N/A',
                role: chauffeur.fields?.['RÔLE'] || 'N/A',
                telephone: chauffeur.fields?.['TELEPHONE'] || 'N/A',
                email: chauffeur.fields?.['E-MAIL'] || 'N/A',
                status: chauffeur.fields?.['STATUT'] || 'N/A',
                location: {
                    longitude: chauffeur.fields?.['LONGITUDE'] || 0,
                    latitude: chauffeur.fields?.['LATITUDE'] || 0,
                }
            }))
            : [];

        // Extraction du magasin
        const magasin = fields['Magasins']?.[0] ? {
            id: fields['Magasins'][0].id || '',
            name: fields['Magasins'][0].fields?.['NOM DU MAGASIN'] || 'Non spécifié',
            address: fields['Magasins'][0].fields?.['ADRESSE DU MAGASIN'] || 'Non spécifié',
            phone: fields['Magasins'][0].fields?.['TÉLÉPHONE'] || 'Non spécifié',
            status: fields['Magasins'][0].fields?.['STATUT'] || 'Non spécifié',
        } : {
            id: '', name: 'N/A', address: 'N/A', phone: 'N/A', status: 'N/A'
        };

        const photos = fields['PHOTOS ARTICLES'] ? fields['PHOTOS ARTICLES'].map((photo: any) => ({
            url: photo.url || photo, // Gère à la fois les objets photo et les URLs directes
            file: undefined // Les photos existantes n'ont pas de File associé
        })) : [];

        return {
            id: record.id || '',
            numeroCommande: fields['NUMERO DE COMMANDE'] || '',
            dates: {
                commande: fields['DATE DE COMMANDE']
                    ? new Date(fields['DATE DE COMMANDE']).toISOString()
                    : new Date().toISOString(),
                livraison: fields['DATE DE LIVRAISON']
                    ? new Date(fields['DATE DE LIVRAISON']).toISOString()
                    : new Date().toISOString(),
                misAJour: {
                    commande: fields['DATE DE MISE A JOUR COMMANDE']
                        ? new Date(fields['DATE DE MISE A JOUR COMMANDE']).toISOString()
                        : new Date().toISOString(),
                    livraison: fields['DATE DE MISE A JOUR LIVRAISON']
                        ? new Date(fields['DATE DE MISE A JOUR LIVRAISON']).toISOString()
                        : new Date().toISOString(),
                }
            },
            statuts: {
                commande: fields['STATUT DE LA COMMANDE']?.[0]?.trim() || 'En attente',
                livraison: fields["STATUT DE LA LIVRAISON (ENCART MYTRUCK)"]?.[0]?.trim() || 'EN ATTENTE'
            },
            client: {
                nom: fields['NOM DU CLIENT'] || 'N/A',
                prenom: fields['PRENOM DU CLIENT'] || 'Non spécifié',
                telephone: {
                    principal: fields['TELEPHONE DU CLIENT'] || 'N/A',
                    secondaire: fields['TELEPHONE DU CLIENT 2'] || '',
                },
                adresse: {
                    type: fields['TYPE D\'ADRESSE'] || 'N/A',
                    ligne1: fields['ADRESSE DE LIVRAISON'] || 'N/A',
                    batiment: fields['BÂTIMENT'] || '',
                    etage: fields['ETAGE'] || 'N/A',
                    ascenseur: fields['ASCENSEUR'] === 'Oui',
                    interphone: fields['INTERPHONE/CODE'] || 'N/A',
                },
                nomComplet: `${fields['PRENOM DU CLIENT'] || 'Non spécifié'} ${fields['NOM DU CLIENT'] || 'N/A'}`
            },
            livraison: {
                creneau: fields['CRENEAU DE LIVRAISON'] || 'N/A',
                vehicule: VEHICULES[record.fields['CATEGORIE DE VEHICULE'] as keyof typeof VEHICULES] || record.fields['CATEGORIE DE VEHICULE'],
                equipiers: Number(fields['OPTION EQUIPIER DE MANUTENTION']) || 0,
                commentaireEnlevement: fields['COMMENTAIRE MYTRUCK A L\'ENLEVEMENT'] || '',
                commentaireLivraison: fields['COMMENTAIRE MYTRUCK A LA LIVRAISON'] || '',
                reserve: fields['RESERVE TRANSPORT'] || 'NON',
                chauffeurs,
                photosEnlevement: fields['PHOTO COMMENTAIRE A L\'ENLEVEMENT'] || [],
                photosLivraison: fields['PHOTO COMMENTAIRE A LA LIVRAISON'] || [],
                remarques: fields['AUTRES REMARQUES'] || '',
            },
            articles: {
                nombre: Number(fields['NOMBRE TOTAL D\'ARTICLES']) || 0,
                details: fields['DETAILS SUR LES ARTICLES'] || '',
                photos: photos,
                newPhotos: [],
                categories: fields['CATEGORIE DE L\'ARTICLE COMMANDE'] || [],
            },
            financier: {
                tarifHT: Number(fields['TARIF HT']) || 0,
                factures: [],
                devis: [],
            },
            magasin,
            chauffeurs,
        };
    } catch (error) {
        console.error('Erreur de transformation:', error);
        throw error;
    }
}