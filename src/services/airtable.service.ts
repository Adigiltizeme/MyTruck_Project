import { CRENEAUX_LIVRAISON, VEHICULES, } from "../components/constants/options";
import { CommandeMetier } from "../types/business.types";
import { FilterOptions, MetricData } from "../types/metrics";
import { transformAirtableToCommande } from "../utils/transformer";
import { CloudinaryService } from "./cloudinary.service";
import { MetricsCalculator } from "./metrics.service";

interface MagasinMap {
    id: string;
    name: string;
    address: string;
    phone: string;
    status: string;
}

interface PersonnelMap {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    role: string;
    status: 'Actif' | 'Inactif';
    email?: string;
    // autres propriétés...
}
export class AirtableService {
    private cache = new Map<string, { data: any; timestamp: number; }>();
    private batchQueue = new Map<string, Promise<any>>();
    private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private readonly FIELD_IDS = {
        CRENEAU: 'fldzfVXSwN64ydsnr',
        VEHICULE: 'fldh2RXJelY2MhvuB'
    };

    constructor(
        private token: string,
        private baseId = 'apprk0i4Hqqq3Cmg6',
        private tables = {
            commandes: 'tbl75HakJKQ2KWyGF',
            magasins: 'tblCzo9Nni2lKeDwf',
            personnel: 'tblxNeFK4ZEzhMN5q'
        }
    ) {
        if (!token) throw new Error('Token Airtable requis');
    }

    async initialize() {
        try {
            // Vérification de la connexion
            const testResponse = await this.fetchFromAirtable(this.tables.commandes, { maxRecords: 1 });
            if (!testResponse.records) throw new Error('Erreur d\'initialisation Airtable');
        } catch (error) {
            console.error('Erreur d\'initialisation:', error);
            throw error;
        }
    }

    private async fetchFromAirtable(tableId: string, options: any = {}) {
        try {
            const url = `https://api.airtable.com/v0/${this.baseId}/${tableId}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Token Airtable invalide ou expiré');
                }
                const error = await response.json();
                throw new Error(`Erreur Airtable: ${error.error?.message || 'Erreur inconnue'}`);
            }

            return response.json();
        } catch (error) {
            console.error('Erreur Airtable:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const response = await this.fetchFromAirtable(this.tables.commandes, {
                maxRecords: 1
            });
            console.log('Test de connexion réussi:', response);
            return true;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            return false;
        }
    }

    private async getCachedData<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < AirtableService.CACHE_DURATION) {
            return cached.data;
        }

        const data = await fetchFn();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    async getCommandes(): Promise<CommandeMetier[]> {
        return this.getCachedData('commandes', async () => {
            const [response, magasins, chauffeurs] = await Promise.all([
                this.fetchFromAirtable(this.tables.commandes),
                this.getMagasins(),
                this.getPersonnel()
            ]);

            // Maps pour lookups rapides
            const magasinsMap = new Map(magasins.map((m: MagasinMap) => [m.id, m]));
            const chauffeursMap = new Map(chauffeurs.map((c: PersonnelMap) => [c.id, c]));

            return response.records.map((record: any) => {
                try {
                    const transformed = transformAirtableToCommande(record);
                    // Enrichir avec les relations
                    const magasinId = record.fields['Magasins']?.[0];
                    const chauffeurIds = record.fields['CHAUFFEUR(S)'] || [];

                    return {
                        ...transformed,
                        magasin: magasinId ? magasinsMap.get(magasinId) || null : null,
                        chauffeurs: chauffeurIds
                            .map((id: string) => chauffeursMap.get(id))
                            .filter(Boolean)
                    };
                } catch (error) {
                    console.error(`Erreur de transformation pour la commande ${record.id}:`, error);
                    return null;
                }
            }).filter((cmd: CommandeMetier | null): cmd is CommandeMetier => cmd !== null);
        });
    }

    async getMagasins() {
        return this.getCachedData('magasins', async () => {
            const response = await this.fetchFromAirtable(this.tables.magasins);
            return response.records.map((record: { id: string; fields: { 'NOM DU MAGASIN': string; 'ADRESSE DU MAGASIN': string; 'TÉLÉPHONE': string; 'STATUT': string } }) => ({
                id: record.id,
                name: record.fields['NOM DU MAGASIN'] || 'N/A',
                address: record.fields['ADRESSE DU MAGASIN'] || 'N/A',
                phone: record.fields['TÉLÉPHONE'] || 'N/A',
                status: record.fields['STATUT'] || 'N/A'
            }));
        });
    }

    async getPersonnel() {
        return this.getCachedData('personnel', async () => {

            console.log('Fetching personnel...');

            const response = await this.fetchFromAirtable(this.tables.personnel, {
                filterByFormula: "{RÔLE} = 'Chauffeur'"
            });

            interface PersonnelRecord {
                id: string;
                fields: {
                    NOM: string;
                    PRENOM: string;
                    TELEPHONE: string;
                    RÔLE: string;
                    STATUT: string;
                    'E-MAIL'?: string;
                };
            }

            interface Personnel {
                id: string;
                nom: string;
                prenom: string;
                telephone: string;
                role: string;
                status: string;
                email: string;
            }

            const chauffeurs = response.records.map((record: PersonnelRecord): Personnel => ({
                id: record.id,
                nom: record.fields['NOM'] || '',
                prenom: record.fields['PRENOM'] || '',
                telephone: record.fields['TELEPHONE'] || 'N/A',
                role: record.fields['RÔLE'] || 'N/A',
                email: record.fields['E-MAIL'] || 'N/A',
                status: record.fields['STATUT'] || 'N/A'
            }));

            console.log('Personnel fetched:', chauffeurs);
            return chauffeurs;
        });
    }

    async getMetrics(filters: FilterOptions): Promise<MetricData> {
        const [commandes, personnel, magasins] = await Promise.all([
            this.getCommandes(),
            this.getPersonnel(),
            this.getMagasins()
        ]);
        const calculateur = new MetricsCalculator({ dateRange: filters.dateRange });

        const filteredCommandes = filters.store
            ? commandes.filter(cmd => cmd.magasin?.name === filters.store)
            : commandes;

        const historique = calculateur.calculateHistorique(filteredCommandes);
        const statutsDistribution = calculateur.calculateStatutsDistribution(filteredCommandes);

        const chauffeursActifs = new Set(
            filteredCommandes
                .filter(c => ['EN COURS DE LIVRAISON', 'CONFIRMEE', 'ENLEVEE']
                    .includes(c.statuts.livraison))
                .flatMap(c => c.chauffeurs || [])
        ).size;

        return {
            totalLivraisons: filteredCommandes.length,
            enCours: filteredCommandes.filter(c => c.statuts.livraison === 'EN COURS DE LIVRAISON').length,
            enAttente: filteredCommandes.filter(c => c.statuts.livraison === 'EN ATTENTE').length,
            performance: statutsDistribution.termine,
            chauffeursActifs,
            chiffreAffaires: filteredCommandes.reduce((acc, c) => acc + (typeof c.financier?.tarifHT === 'number' ? c.financier?.tarifHT : 0), 0),
            historique,
            statutsDistribution,
            commandes: filteredCommandes,
            store: magasins.map((m: MagasinMap) => m.name || ''),
            chauffeurs: personnel
                .filter((p: PersonnelMap) => p.role === 'Chauffeur')
                .map((c: PersonnelMap) => c.nom),
        };
    }

    async deleteCommande(id: string): Promise<void> {
        try {
            const url = `https://api.airtable.com/v0/${this.baseId}/${this.tables.commandes}/${id}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Erreur Airtable: ${error.error?.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            throw new Error('Failed to delete commande');
        }
    }

    private validateAttachmentFormat(attachment: any): boolean {
        if (!attachment || typeof attachment !== 'object') {
            console.error('Attachment invalide : format incorrect', attachment);
            return false;
        }

        if (!attachment.url || typeof attachment.url !== 'string') {
            console.error('Attachment invalide : URL manquante ou incorrecte', attachment);
            return false;
        }

        // Vérifie le format data:image/
        if (!attachment.url.startsWith('data:image/')) {
            console.error('Attachment invalide : format d\'URL incorrect', attachment.url.slice(0, 20));
            return false;
        }

        // Vérifie la présence des données base64
        if (!attachment.url.includes('base64,')) {
            console.error('Attachment invalide : données base64 manquantes');
            return false;
        }

        return true;
    }

    private validateAttachments(attachments: any[]): boolean {
        if (!Array.isArray(attachments)) {
            console.error('Format des attachements invalide : doit être un tableau');
            return false;
        }

        return attachments.every((attachment, index) => {
            const isValid = this.validateAttachmentFormat(attachment);
            if (!isValid) {
                console.error(`Attachment ${index} invalide`);
            }
            return isValid;
        });
    }

    async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        try {
            const cloudinaryService = new CloudinaryService();

            // Upload des photos vers Cloudinary
            const photosAttachments = await Promise.all(
                (commande.articles?.photos || []).map(async photo => {
                    if (photo.file) {
                        const uploadedImage = await cloudinaryService.uploadImage(photo.file);
                        return {
                            url: uploadedImage.url,
                            filename: uploadedImage.filename
                        };
                    }
                    return null;
                })
            );

            // S'assurer que equipiers est une chaîne de caractères
            const equipiers = commande.livraison?.equipiers?.toString() || '0';
            // Préparation des champs en respectant les noms exacts d'Airtable
            const fields = {
                'NUMERO DE COMMANDE': commande.numeroCommande || `CMD${Date.now()}`,
                'NOM DU CLIENT': commande.client?.nom,
                'PRENOM DU CLIENT': commande.client?.prenom,
                'TELEPHONE DU CLIENT': commande.client?.telephone?.principal,
                'TELEPHONE DU CLIENT 2': commande.client?.telephone?.secondaire,
                'ADRESSE DE LIVRAISON': commande.client?.adresse?.ligne1,
                'TYPE D\'ADRESSE': commande.client?.adresse?.type,
                'BÂTIMENT': commande.client?.adresse?.batiment,
                'INTERPHONE/CODE': commande.client?.adresse?.interphone,
                'ASCENSEUR': commande.client?.adresse?.ascenseur ? 'Oui' : 'Non',
                'ETAGE': commande.client?.adresse?.etage,
                'DATE DE LIVRAISON': commande.dates?.livraison || null,
                'CRENEAU DE LIVRAISON': commande.livraison?.creneau,
                'CATEGORIE DE VEHICULE': commande.livraison?.vehicule,
                'OPTION EQUIPIER DE MANUTENTION': equipiers, // Utilisation de la valeur convertie en chaîne
                'NOMBRE TOTAL D\'ARTICLES': commande.articles?.nombre?.toString(),
                'DETAILS SUR LES ARTICLES': commande.articles?.details,
                'PHOTOS ARTICLES': photosAttachments.length > 0 ? photosAttachments : undefined,
                'AUTRES REMARQUES': commande.livraison?.remarques,
                'RESERVE TRANSPORT': commande.livraison?.reserve ? 'OUI' : 'NON',
                'STATUT DE LA COMMANDE': 'En attente',
                'STATUT DE LA LIVRAISON (ENCART MYTRUCK)': 'EN ATTENTE',
                'PRENOM DU VENDEUR/INTERLOCUTEUR': commande.magasin?.manager,
            };

            console.log('Données envoyées à Airtable:', {
                ...fields,
                'PHOTOS ARTICLES': photosAttachments.length
                    ? `${photosAttachments.length} photos`
                    : 'Aucune photo'
            });

            const response = await this.fetchFromAirtable(this.tables.commandes, {
                method: 'POST',
                body: JSON.stringify({
                    fields,
                    typecast: true
                }),
                // headers: {
                //     'Content-Type': 'application/json'
                // }
            });

            return transformAirtableToCommande(response);
        } catch (error) {
            console.error('Erreur createCommande:', error);
            throw error;
        }
    }
    // Méthode utilitaire pour convertir un fichier en base64
    private async convertFileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async getCreneaux() {
        try {
            const response = await this.fetchFromAirtable(this.tables.commandes, { fields: ['CRENEAU DE LIVRAISON', 'DISPONIBLE'] });
            console.log('Créneaux response:', response);  // Debug

            interface CreneauRecord {
                id: string;
                fields: {
                    'CRENEAU DE LIVRAISON': string;
                    'DISPONIBLE'?: boolean;
                };
            }

            interface Creneau {
                id: string;
                horaire: string;
                disponible: boolean;
            }

            return (response.records as CreneauRecord[]).map((record: CreneauRecord): Creneau => ({
                id: record.id,
                horaire: record.fields['CRENEAU DE LIVRAISON'],
                disponible: record.fields['DISPONIBLE'] ?? true
            }));
        } catch (error) {
            console.error('Erreur getCreneaux:', error);
            return [];
        }
    }

    async getVehicules() {
        try {
            const response = await this.fetchFromAirtable(this.tables.commandes, { fields: ['CATEGORIE DE VEHICULE', 'CAPACITE', 'DIMENSIONS'] });
            console.log('Véhicules response:', response);  // Debug

            interface VehiculeRecord {
                id: string;
                fields: {
                    'CATEGORIE DE VEHICULE': string;
                    'CAPACITE': string;
                    'DIMENSIONS': string;
                };
            }

            interface Vehicule {
                id: string;
                type: string;
                capacite: string;
                dimensions: string;
            }

            return (response.records as VehiculeRecord[]).map((record: VehiculeRecord): Vehicule => ({
                id: record.id,
                type: record.fields['CATEGORIE DE VEHICULE'],
                capacite: record.fields['CAPACITE'],
                dimensions: record.fields['DIMENSIONS']
            }));
        } catch (error) {
            console.error('Erreur getVehicules:', error);
            return [];
        }
    }

    async getFieldOptions(field: string): Promise<string[]> {
        // Retourner directement les constantes sans appel API
        if (field === 'CRENEAU DE LIVRAISON') {
            return CRENEAUX_LIVRAISON;
        }
        if (field === 'CATEGORIE DE VEHICULE') {
            return Object.values(VEHICULES);
        }
        return [];
    }
}