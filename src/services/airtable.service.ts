// import { CRENEAUX_LIVRAISON, VEHICULES, } from "../components/constants/options";
// import { StatutCommande, StatutLivraison } from "../types/airtable.types";
// import { CommandeMetier } from "../types/business.types";
// import { FilterOptions, MetricData } from "../types/metrics";
// import { transformAirtableToCommande } from "../utils/transformer";
// import { CloudinaryService } from "./cloudinary.service";
// import { MetricsCalculator } from "./metrics.service";

// if (import.meta.env.VITE_DISABLE_AIRTABLE === 'true') {
//   console.warn('🚫 Airtable désactivé via VITE_DISABLE_AIRTABLE');
//   throw new Error('Service Airtable désactivé - Utilisez l\'API Backend');
// }

// interface MagasinMap {
//     id: string;
//     name: string;
//     address: string;
//     phone: string;
//     status: string;
// }

// interface PersonnelMap {
//     id: string;
//     nom: string;
//     prenom: string;
//     telephone: string;
//     role: string;
//     status: 'Actif' | 'Inactif';
//     email?: string;
//     // autres propriétés...
// }
// export class AirtableService {
//     private isOfflineMode(): boolean {
//         return localStorage.getItem('forceOfflineMode') === 'true';
//     }
//     private cache = new Map<string, { data: any; timestamp: number; }>();
//     private batchQueue = new Map<string, Promise<any>>();
//     private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
//     private baseUrl = 'https://api.airtable.com/v0';
//     private readonly FIELD_IDS = {
//         CRENEAU: 'fldzfVXSwN64ydsnr',
//         VEHICULE: 'fldh2RXJelY2MhvuB'
//     };

//     constructor(
//         private token: string,
//         private baseId = import.meta.env.VITE_AIRTABLE_BASE_ID as string,
//         private tables = {
//             commandes: import.meta.env.VITE_AIRTABLE_TABLE_COMMANDES_ID as string,
//             magasins: import.meta.env.VITE_AIRTABLE_TABLE_MAGASINS_ID as string,
//             personnel: import.meta.env.VITE_AIRTABLE_TABLE_PERSONNEL_ID as string
//         }
//     ) {
//         if (!token) throw new Error('Token Airtable requis');
//     }

//     async initialize() {
//         if (this.isOfflineMode()) {
//             console.log('[Mode hors ligne] Initialisation Airtable ignorée');
//             return; // Ne pas tenter d'initialisation en mode hors ligne
//         }

//         try {
//             // Vérification de la connexion
//             const testResponse = await this.fetchFromAirtable(this.tables.commandes, { maxRecords: 1 });
//             if (!testResponse.records) throw new Error('Erreur d\'initialisation Airtable');
//         } catch (error) {
//             console.error('Erreur d\'initialisation:', error);
//             throw error;
//         }
//     }

//     private async fetchFromAirtable(tableId: string, options: any = {}): Promise<any> {
//         // Vérifier d'abord si nous sommes en mode hors ligne
//         const url = `https://api.airtable.com/v0/${this.baseId}/${tableId}`;
//         if (this.isOfflineMode()) {
//             console.log(`[Mode hors ligne] Appel API bloqué: ${options.method || 'GET'} ${url}`);
//             throw new Error('Mode hors ligne actif - Appel API non autorisé');
//         }

//         try {
//             const response = await fetch(url, {
//                 ...options,
//                 headers: {
//                     'Authorization': `Bearer ${this.token}`,
//                     'Content-Type': 'application/json',
//                     ...options.headers
//                 }
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     throw new Error('Token Airtable invalide ou expiré');
//                 }
//                 const error = await response.json();
//                 throw new Error(`Erreur Airtable: ${error.error?.message || 'Erreur inconnue'}`);
//             }

//             return response.json();
//         } catch (error) {
//             console.error('Erreur Airtable:', error);
//             throw error;
//         }
//     }

//     async testConnection() {
//         try {
//             const response = await this.fetchFromAirtable(this.tables.commandes, {
//                 maxRecords: 1
//             });
//             console.log('Test de connexion réussi:', response);
//             return true;
//         } catch (error) {
//             console.error('Erreur de connexion:', error);
//             return false;
//         }
//     }

//     public getToken(): string {
//         return this.token;
//     }

//     private async getCachedData<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
//         const cached = this.cache.get(key);
//         if (cached && Date.now() - cached.timestamp < AirtableService.CACHE_DURATION) {
//             return cached.data;
//         }

//         const data = await fetchFn();
//         this.cache.set(key, { data, timestamp: Date.now() });
//         return data;
//     }

//     async getCommandes(): Promise<CommandeMetier[]> {
//         return this.getCachedData('commandes', async () => {
//             const [response, magasins, chauffeurs] = await Promise.all([
//                 this.fetchFromAirtable(this.tables.commandes),
//                 this.getMagasins(),
//                 this.getPersonnel()
//             ]);

//             // Maps pour lookups rapides
//             const magasinsMap = new Map(magasins.map((m: MagasinMap) => [m.id, m]));
//             const chauffeursMap = new Map(chauffeurs.map((c: PersonnelMap) => [c.id, c]));

//             return response.records.map((record: any) => {
//                 try {
//                     const transformed = transformAirtableToCommande(record);
//                     // Enrichir avec les relations
//                     const magasinId = record.fields['Magasins']?.[0];
//                     const chauffeurIds = record.fields['CHAUFFEUR(S)'] || [];

//                     return {
//                         ...transformed,
//                         magasin: magasinId ? magasinsMap.get(magasinId) || null : null,
//                         chauffeurs: chauffeurIds
//                             .map((id: string) => chauffeursMap.get(id))
//                             .filter(Boolean)
//                     };
//                 } catch (error) {
//                     console.error(`Erreur de transformation pour la commande ${record.id}:`, error);
//                     return null;
//                 }
//             }).filter((cmd: CommandeMetier | null): cmd is CommandeMetier => cmd !== null);
//         });
//     }

//     async getMagasins() {
//         return this.getCachedData('magasins', async () => {
//             const response = await this.fetchFromAirtable(this.tables.magasins);
//             return response.records.map((record: { id: string; fields: { 'NOM DU MAGASIN': string; 'ADRESSE DU MAGASIN': string; 'TÉLÉPHONE': string; 'STATUT': string } }) => ({
//                 id: record.id,
//                 name: record.fields['NOM DU MAGASIN'] || 'N/A',
//                 address: record.fields['ADRESSE DU MAGASIN'] || 'N/A',
//                 phone: record.fields['TÉLÉPHONE'] || 'N/A',
//                 status: record.fields['STATUT'] || 'N/A'
//             }));
//         });
//     }

//     async getPersonnel() {
//         return this.getCachedData('personnel', async () => {

//             console.log('Fetching personnel...');

//             const response = await this.fetchFromAirtable(this.tables.personnel, {
//                 filterByFormula: "{RÔLE} = 'Chauffeur'"
//             });

//             interface PersonnelRecord {
//                 id: string;
//                 fields: {
//                     NOM: string;
//                     PRENOM: string;
//                     TELEPHONE: string;
//                     RÔLE: string;
//                     STATUT: string;
//                     'E-MAIL'?: string;
//                 };
//             }

//             interface Personnel {
//                 id: string;
//                 nom: string;
//                 prenom: string;
//                 telephone: string;
//                 role: string;
//                 status: string;
//                 email: string;
//             }

//             const chauffeurs = response.records.map((record: PersonnelRecord): Personnel => ({
//                 id: record.id,
//                 nom: record.fields['NOM'] || '',
//                 prenom: record.fields['PRENOM'] || '',
//                 telephone: record.fields['TELEPHONE'] || 'N/A',
//                 role: record.fields['RÔLE'] || 'N/A',
//                 email: record.fields['E-MAIL'] || 'N/A',
//                 status: record.fields['STATUT'] || 'N/A'
//             }));

//             console.log('Personnel fetched:', chauffeurs);
//             return chauffeurs;
//         });
//     }

//     async getMetrics(filters: FilterOptions): Promise<MetricData> {
//         const [commandes, personnel, magasins] = await Promise.all([
//             this.getCommandes(),
//             this.getPersonnel(),
//             this.getMagasins()
//         ]);
//         const calculateur = new MetricsCalculator({ dateRange: filters.dateRange });

//         const filteredCommandes = filters.store
//             ? commandes.filter(cmd => cmd.magasin?.name === filters.store)
//             : commandes;

//         const historique = calculateur.calculateHistorique(filteredCommandes);
//         const statutsDistribution = calculateur.calculateStatutsDistribution(filteredCommandes);

//         const chauffeursActifs = new Set(
//             filteredCommandes
//                 .filter(c => ['EN COURS DE LIVRAISON', 'CONFIRMEE', 'ENLEVEE']
//                     .includes(c.statuts.livraison))
//                 .flatMap(c => c.chauffeurs || [])
//         ).size;

//         return {
//             totalLivraisons: filteredCommandes.length,
//             enCours: filteredCommandes.filter(c => c.statuts.livraison === 'EN COURS DE LIVRAISON').length,
//             enAttente: filteredCommandes.filter(c => c.statuts.livraison === 'EN ATTENTE').length,
//             performance: statutsDistribution.termine,
//             chauffeursActifs,
//             chiffreAffaires: filteredCommandes.reduce((acc, c) => acc + (typeof c.financier?.tarifHT === 'number' ? c.financier?.tarifHT : 0), 0),
//             historique,
//             statutsDistribution,
//             commandes: filteredCommandes,
//             store: magasins.map((m: MagasinMap) => m.name || ''),
//             chauffeurs: personnel
//                 .filter((p: PersonnelMap) => p.role === 'Chauffeur')
//                 .map((c: PersonnelMap) => c.nom),
//         };
//     }

//     async deleteCommande(id: string): Promise<void> {
//         try {
//             // Si l'ID est temporaire, on retourne simplement sans erreur
//             if (id.startsWith('temp_')) {
//                 console.log(`Suppression ignorée pour l'ID temporaire ${id}`);
//                 return;
//             }

//             const url = `https://api.airtable.com/v0/${this.baseId}/${this.tables.commandes}/${id}`;
//             const response = await fetch(url, {
//                 method: 'DELETE',
//                 headers: {
//                     'Authorization': `Bearer ${this.token}`,
//                     'Content-Type': 'application/json'
//                 }
//             });

//             if (!response.ok) {
//                 // Si c'est une erreur 404 pour un ID normal, on la considère comme réussie
//                 // (l'enregistrement n'existe plus, ce qui est le but de la suppression)
//                 if (response.status === 404) {
//                     console.log(`L'enregistrement ${id} n'existe pas (déjà supprimé?)`);
//                     return;
//                 }

//                 const error = await response.json();
//                 throw {
//                     status: response.status,
//                     message: `Erreur Airtable: ${error.error?.message || 'Erreur inconnue'}`
//                 };
//             }
//         } catch (error: any) {
//             if (error.status === 404) {
//                 console.log(`L'enregistrement ${id} n'existe pas (déjà supprimé?)`);
//                 return;
//             }
//             throw error;
//         }
//     }

//     private validateAttachmentFormat(attachment: any): boolean {
//         if (!attachment || typeof attachment !== 'object') {
//             console.error('Attachment invalide : format incorrect', attachment);
//             return false;
//         }

//         if (!attachment.url || typeof attachment.url !== 'string') {
//             console.error('Attachment invalide : URL manquante ou incorrecte', attachment);
//             return false;
//         }

//         // Vérifie le format data:image/
//         if (!attachment.url.startsWith('data:image/')) {
//             console.error('Attachment invalide : format d\'URL incorrect', attachment.url.slice(0, 20));
//             return false;
//         }

//         // Vérifie la présence des données base64
//         if (!attachment.url.includes('base64,')) {
//             console.error('Attachment invalide : données base64 manquantes');
//             return false;
//         }

//         return true;
//     }

//     private validateAttachments(attachments: any[]): boolean {
//         if (!Array.isArray(attachments)) {
//             console.error('Format des attachements invalide : doit être un tableau');
//             return false;
//         }

//         return attachments.every((attachment, index) => {
//             const isValid = this.validateAttachmentFormat(attachment);
//             if (!isValid) {
//                 console.error(`Attachment ${index} invalide`);
//             }
//             return isValid;
//         });
//     }

//     async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
//         try {
//             // Log de début pour suivre le flux
//             console.log('AirtableService.createCommande appelé avec:', {
//                 magasinId: commande.magasin?.id,
//                 numeroCommande: commande.numeroCommande || 'Non défini'
//             });
//             const cloudinaryService = new CloudinaryService();

//             // Upload des photos vers Cloudinary
//             const photosAttachments = await Promise.all(
//                 (commande.articles?.photos || []).map(async photo => {
//                     if (photo.file) {
//                         const uploadedImage = await cloudinaryService.uploadImage(photo.file);
//                         return {
//                             url: uploadedImage.url,
//                             filename: uploadedImage.filename
//                         };
//                     }
//                     return null;
//                 })
//             );

//             // Vérifier que les données sont valides
//             if (!commande.client?.nom) {
//                 console.error('Tentative de création d\'une commande sans nom client');
//             }

//             if (!commande.magasin?.id) {
//                 console.error('Tentative de création d\'une commande sans ID magasin');
//             }

//             // S'assurer que equipiers est une chaîne de caractères
//             const equipiers = commande.livraison?.equipiers?.toString() || '0';
//             // Générer un numéro de commande uniquement s'il n'en a pas déjà un
//             const numeroCommande = commande.numeroCommande || `CMD${Date.now()}`;

//             // UUID unique pour tracer cette demande de création
//             const requestId = Math.random().toString(36).substring(2, 12);
//             console.log(`[${requestId}] Début création commande dans Airtable`);

//             // Préparation des champs en respectant les noms exacts d'Airtable
//             const fields: { [key: string]: any } = {
//                 'NUMERO DE COMMANDE': numeroCommande,
//                 'NOM DU CLIENT': commande.client?.nom,
//                 'PRENOM DU CLIENT': commande.client?.prenom,
//                 'TELEPHONE DU CLIENT': commande.client?.telephone?.principal,
//                 'TELEPHONE DU CLIENT 2': commande.client?.telephone?.secondaire,
//                 'ADRESSE DE LIVRAISON': commande.client?.adresse?.ligne1,
//                 'TYPE D\'ADRESSE': commande.client?.adresse?.type,
//                 'BÂTIMENT': commande.client?.adresse?.batiment,
//                 'INTERPHONE/CODE': commande.client?.adresse?.interphone || '',
//                 'ASCENSEUR': commande.client?.adresse?.ascenseur ? 'Oui' : 'Non',
//                 'ETAGE': commande.client?.adresse?.etage,
//                 'DATE DE LIVRAISON': commande.dates?.livraison || null,
//                 'CRENEAU DE LIVRAISON': commande.livraison?.creneau,
//                 'CATEGORIE DE VEHICULE': commande.livraison?.vehicule,
//                 'OPTION EQUIPIER DE MANUTENTION': equipiers, // Utilisation de la valeur convertie en chaîne
//                 'NOMBRE TOTAL D\'ARTICLES': commande.articles?.nombre?.toString(),
//                 'DETAILS SUR LES ARTICLES': commande.articles?.details,
//                 // 'PHOTOS ARTICLES': photosAttachments.length > 0 ? photosAttachments : undefined,
//                 'AUTRES REMARQUES': commande.livraison?.remarques,
//                 'RESERVE TRANSPORT': commande.livraison?.reserve ? 'OUI' : 'NON',
//                 'STATUT DE LA COMMANDE': 'En attente',
//                 'STATUT DE LA LIVRAISON (ENCART MYTRUCK)': 'EN ATTENTE',
//                 'PRENOM DU VENDEUR/INTERLOCUTEUR': commande.magasin?.manager,
//                 'Magasins': commande.magasin?.id ? [commande.magasin.id] : undefined,
//             };

//             console.log('Données envoyées à Airtable pour la création de commande:', {
//                 ...fields,
//                 'Magasin ID': commande.magasin?.id || 'Non spécifié'
//             });

//             // Traitement spécial pour les photos
//             if ((commande.articles?.photos?.length ?? 0) > 0) {
//                 fields['PHOTOS ARTICLES'] = (commande.articles?.photos ?? []).map(photo => {
//                     if (typeof photo === 'string') {
//                         return { url: photo };
//                     }
//                     return { url: photo.url };
//                 });
//             }

//             console.log('Données envoyées à Airtable:', {
//                 ...fields,
//                 'PHOTOS ARTICLES': photosAttachments.length
//                     ? `${photosAttachments.length} photos`
//                     : 'Aucune photo'
//             });

//             const response = await this.fetchFromAirtable(this.tables.commandes, {
//                 method: 'POST',
//                 body: JSON.stringify({
//                     fields,
//                     typecast: true
//                 }),
//                 // headers: {
//                 //     'Content-Type': 'application/json'
//                 // }
//             });

//             // Log final pour confirmer la création
//             console.log(`[${requestId}] Commande créée avec succès dans Airtable, ID: ${response.id}`);

//             return transformAirtableToCommande(response);
//         } catch (error) {
//             console.error('Erreur createCommande:', error);
//             throw error;
//         }
//     }

//     /**
//      * Crée un nouveau magasin dans Airtable
//      * @param magasinData Données du magasin à créer
//      * @returns Le magasin créé
//      */
//     async createMagasin(magasinData: {
//         id?: string;
//         name: string;
//         address: string;
//         phone: string;
//         email?: string;
//         status: string;
//     }): Promise<any> {
//         try {
//             // Vérifier si nous sommes en mode hors ligne
//             if (this.isOfflineMode()) {
//                 throw new Error('Mode hors ligne actif - Opération non disponible');
//             }

//             // Préparation des champs pour Airtable
//             const fields = {
//                 'NOM DU MAGASIN': magasinData.name,
//                 'ADRESSE DU MAGASIN': magasinData.address,
//                 'TÉLÉPHONE': magasinData.phone,
//                 'E-MAIL': magasinData.email || '',
//                 'STATUT': magasinData.status || 'Actif'
//             };

//             // Envoi de la requête à Airtable
//             const response = await this.fetchFromAirtable(this.tables.magasins, {
//                 method: 'POST',
//                 body: JSON.stringify({
//                     fields,
//                     typecast: true
//                 })
//             });

//             // Conversion au format attendu par l'application
//             return {
//                 id: response.id,
//                 name: response.fields['NOM DU MAGASIN'] || '',
//                 address: response.fields['ADRESSE DU MAGASIN'] || '',
//                 phone: response.fields['TÉLÉPHONE'] || '',
//                 email: response.fields['E-MAIL'] || '',
//                 status: response.fields['STATUT'] || 'Actif'
//             };
//         } catch (error) {
//             console.error('Erreur lors de la création du magasin:', error);
//             throw error;
//         }
//     }

//     /**
//      * Récupère un magasin par son ID
//      * @param id ID du magasin
//      * @returns Le magasin trouvé ou null
//      */
//     async getMagasinById(id: string): Promise<any | null> {
//         try {
//             // Vérifier si nous sommes en mode hors ligne
//             if (this.isOfflineMode()) {
//                 throw new Error('Mode hors ligne actif - Opération non disponible');
//             }

//             const response = await this.fetchFromAirtable(`${this.tables.magasins}/${id}`);

//             if (!response || !response.fields) {
//                 return null;
//             }

//             return {
//                 id: response.id,
//                 name: response.fields['NOM DU MAGASIN'] || '',
//                 address: response.fields['ADRESSE DU MAGASIN'] || '',
//                 phone: response.fields['TÉLÉPHONE'] || '',
//                 email: response.fields['E-MAIL'] || '',
//                 status: response.fields['STATUT'] || 'Actif'
//             };
//         } catch (error) {
//             console.error(`Erreur lors de la récupération du magasin ${id}:`, error);
//             return null;
//         }
//     }

//     /**
//      * Crée un nouveau membre du personnel dans Airtable
//      * @param personnelData Données du personnel à créer
//      * @returns Le personnel créé
//      */
//     async createPersonnel(personnelData: {
//         id?: string;
//         nom: string;
//         prenom: string;
//         telephone: string;
//         email?: string;
//         role: string;
//         status: string;
//     }): Promise<any> {
//         try {
//             // Vérifier si nous sommes en mode hors ligne
//             if (this.isOfflineMode()) {
//                 throw new Error('Mode hors ligne actif - Opération non disponible');
//             }

//             // Préparation des champs pour Airtable
//             const fields = {
//                 'NOM': personnelData.nom,
//                 'PRENOM': personnelData.prenom,
//                 'TELEPHONE': personnelData.telephone,
//                 'E-MAIL': personnelData.email || '',
//                 'RÔLE': personnelData.role || 'Chauffeur',
//                 'STATUT': personnelData.status || 'Actif'
//             };

//             // Envoi de la requête à Airtable
//             const response = await this.fetchFromAirtable(this.tables.personnel, {
//                 method: 'POST',
//                 body: JSON.stringify({
//                     fields,
//                     typecast: true
//                 })
//             });

//             // Conversion au format attendu par l'application
//             return {
//                 id: response.id,
//                 nom: response.fields['NOM'] || '',
//                 prenom: response.fields['PRENOM'] || '',
//                 telephone: response.fields['TELEPHONE'] || '',
//                 email: response.fields['E-MAIL'] || '',
//                 role: response.fields['RÔLE'] || 'Chauffeur',
//                 status: response.fields['STATUT'] || 'Actif'
//             };
//         } catch (error) {
//             console.error('Erreur lors de la création du personnel:', error);
//             throw error;
//         }
//     }

//     // Méthode utilitaire pour convertir un fichier en base64
//     private async convertFileToBase64(file: File): Promise<string> {
//         return new Promise((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onload = () => {
//                 resolve(reader.result as string);
//             };
//             reader.onerror = reject;
//             reader.readAsDataURL(file);
//         });
//     }

//     async getCreneaux() {
//         try {
//             const response = await this.fetchFromAirtable(this.tables.commandes, { fields: ['CRENEAU DE LIVRAISON', 'DISPONIBLE'] });
//             console.log('Créneaux response:', response);  // Debug

//             interface CreneauRecord {
//                 id: string;
//                 fields: {
//                     'CRENEAU DE LIVRAISON': string;
//                     'DISPONIBLE'?: boolean;
//                 };
//             }

//             interface Creneau {
//                 id: string;
//                 horaire: string;
//                 disponible: boolean;
//             }

//             return (response.records as CreneauRecord[]).map((record: CreneauRecord): Creneau => ({
//                 id: record.id,
//                 horaire: record.fields['CRENEAU DE LIVRAISON'],
//                 disponible: record.fields['DISPONIBLE'] ?? true
//             }));
//         } catch (error) {
//             console.error('Erreur getCreneaux:', error);
//             return [];
//         }
//     }

//     async getVehicules() {
//         try {
//             const response = await this.fetchFromAirtable(this.tables.commandes, { fields: ['CATEGORIE DE VEHICULE', 'CAPACITE', 'DIMENSIONS'] });
//             console.log('Véhicules response:', response);  // Debug

//             interface VehiculeRecord {
//                 id: string;
//                 fields: {
//                     'CATEGORIE DE VEHICULE': string;
//                     'CAPACITE': string;
//                     'DIMENSIONS': string;
//                 };
//             }

//             interface Vehicule {
//                 id: string;
//                 type: string;
//                 capacite: string;
//                 dimensions: string;
//             }

//             return (response.records as VehiculeRecord[]).map((record: VehiculeRecord): Vehicule => ({
//                 id: record.id,
//                 type: record.fields['CATEGORIE DE VEHICULE'],
//                 capacite: record.fields['CAPACITE'],
//                 dimensions: record.fields['DIMENSIONS']
//             }));
//         } catch (error) {
//             console.error('Erreur getVehicules:', error);
//             return [];
//         }
//     }

//     async getFieldOptions(field: string): Promise<string[]> {
//         // Retourner directement les constantes sans appel API
//         if (field === 'CRENEAU DE LIVRAISON') {
//             return CRENEAUX_LIVRAISON;
//         }
//         if (field === 'CATEGORIE DE VEHICULE') {
//             return Object.values(VEHICULES);
//         }
//         return [];
//     }

//     async updateCommande(updatedData: Partial<CommandeMetier>): Promise<CommandeMetier> {
//         try {
//             // Si l'ID est temporaire, on refuse la mise à jour
//             if (updatedData.id && updatedData.id.startsWith('temp_')) {
//                 throw new Error(`Impossible de mettre à jour un enregistrement temporaire: ${updatedData.id}`);
//             }

//             const cloudinaryService = new CloudinaryService();

//             // Upload des photos vers Cloudinary
//             const photosAttachments = await Promise.all(
//                 (updatedData.articles?.photos || []).map(async photo => {
//                     if (photo.file) {
//                         const uploadedImage = await cloudinaryService.uploadImage(photo.file);
//                         return {
//                             url: uploadedImage.url,
//                             filename: uploadedImage.filename
//                         };
//                     }
//                     return null;
//                 })
//             );

//             // Récupérer d'abord les données existantes
//             let existingCommande;
//             if (updatedData.id) {
//                 existingCommande = await this.fetchFromAirtable(`${this.tables.commandes}/${updatedData.id}`);
//             }

//             // Vérifier si des commentaires ou photos ont été ajoutés et déterminer si on doit mettre à jour le champ réserve
//             let shouldUpdateReserve: boolean = false;

//             // Vérifier si des commentaires ou photos ont été ajoutés
//             if (updatedData.livraison) {
//                 // Vérifier le commentaire d'enlèvement (avec protection contre undefined)
//                 const hasNewCommentaireEnlevement = Boolean(
//                     updatedData.livraison.commentaireEnlevement &&
//                     (!existingCommande?.fields['COMMENTAIRE ENLÈVEMENT'] ||
//                         existingCommande.fields['COMMENTAIRE ENLÈVEMENT'] !== updatedData.livraison.commentaireEnlevement)
//                 );

//                 // Vérifier le commentaire de livraison (avec protection contre undefined)
//                 const hasNewCommentaireLivraison = Boolean(
//                     updatedData.livraison.commentaireLivraison &&
//                     (!existingCommande?.fields['COMMENTAIRE LIVRAISON'] ||
//                         existingCommande.fields['COMMENTAIRE LIVRAISON'] !== updatedData.livraison.commentaireLivraison)
//                 );

//                 // Vérifier les photos d'enlèvement (avec protection contre undefined)
//                 const hasNewPhotosEnlevement = Boolean(
//                     updatedData.livraison.photosEnlevement &&
//                     Array.isArray(updatedData.livraison.photosEnlevement) &&
//                     updatedData.livraison.photosEnlevement.length > 0
//                 );

//                 // Vérifier les photos de livraison (avec protection contre undefined)
//                 const hasNewPhotosLivraison = Boolean(
//                     updatedData.livraison.photosLivraison &&
//                     Array.isArray(updatedData.livraison.photosLivraison) &&
//                     updatedData.livraison.photosLivraison.length > 0
//                 );

//                 // Activer la réserve uniquement si des commentaires ou photos ont été ajoutés
//                 // Utilisation de Boolean() pour s'assurer que le résultat est bien un boolean
//                 shouldUpdateReserve = Boolean(
//                     hasNewCommentaireEnlevement ||
//                     hasNewCommentaireLivraison ||
//                     hasNewPhotosEnlevement ||
//                     hasNewPhotosLivraison
//                 );
//             }

//             const existingPhotos = existingCommande.fields['PHOTOS ARTICLES'] || [];

//             const nombreArticles = updatedData.articles?.nombre;

//             if (updatedData.financier?.tarifHT && typeof updatedData.financier.tarifHT !== 'number') {
//                 throw new Error('Le tarif HT doit être un nombre');
//             }
//             if (!updatedData.id) {
//                 throw new Error('ID de commande manquant');
//             }

//             // S'assurer que equipiers est une chaîne de caractères
//             const equipiers = updatedData.livraison?.equipiers?.toString() || '0';

//             // Préparation des champs en respectant les noms exacts d'Airtable
//             const fields: { [key: string]: any } = {
//                 'NUMERO DE COMMANDE': existingCommande.fields['NUMERO DE COMMANDE'] || updatedData.numeroCommande,
//                 'NOM DU CLIENT': updatedData.client?.nom,
//                 'PRENOM DU CLIENT': updatedData.client?.prenom,
//                 'TELEPHONE DU CLIENT': updatedData.client?.telephone?.principal,
//                 'TELEPHONE DU CLIENT 2': updatedData.client?.telephone?.secondaire,
//                 'ADRESSE DE LIVRAISON': updatedData.client?.adresse?.ligne1,
//                 'TYPE D\'ADRESSE': updatedData.client?.adresse?.type,
//                 'BÂTIMENT': updatedData.client?.adresse?.batiment,
//                 'INTERPHONE/CODE': updatedData.client?.adresse?.interphone || '',
//                 'ASCENSEUR': updatedData.client?.adresse?.ascenseur ? 'Oui' : 'Non',
//                 'ETAGE': updatedData.client?.adresse?.etage,
//                 ...(updatedData.dates?.livraison && {
//                     'DATE DE LIVRAISON': updatedData.dates.livraison
//                 }) || {},
//                 'CRENEAU DE LIVRAISON': updatedData.livraison?.creneau,
//                 'CATEGORIE DE VEHICULE': updatedData.livraison?.vehicule,
//                 'OPTION EQUIPIER DE MANUTENTION': equipiers, // Utilisation de la valeur convertie en chaîne
//                 'NOMBRE TOTAL D\'ARTICLES': typeof nombreArticles === 'number' ? nombreArticles : (nombreArticles ? parseInt(nombreArticles as string) : 0),
//                 'DETAILS SUR LES ARTICLES': updatedData.articles?.details,
//                 // 'PHOTOS ARTICLES': updatedData.articles?.photos?.map(photo => ({
//                 //     url: photo.url,
//                 //     filename: photo.file || 'photo'
//                 // })) || [],
//                 // 'PHOTOS ARTICLES': photosAttachments.length > 0 ? photosAttachments : undefined,
//                 'AUTRES REMARQUES': updatedData.livraison?.remarques,
//                 'RESERVE TRANSPORT': updatedData.livraison?.reserve ? 'OUI' : 'NON',
//                 // 'STATUT DE LA COMMANDE': [updatedData.statuts?.commande || 'En attente'],
//                 // 'STATUT DE LA LIVRAISON (ENCART MYTRUCK)': [updatedData.statuts?.livraison || 'EN ATTENTE'],
//                 'PRENOM DU VENDEUR/INTERLOCUTEUR': updatedData.magasin?.manager,
//                 'TARIF HT': updatedData.financier?.tarifHT || 0,
//                 ...(updatedData.chauffeurs && {
//                     'CHAUFFEUR(S)': updatedData.chauffeurs.map(c => c.id)
//                 }),
//                 ...(updatedData.statuts && {
//                     'STATUT DE LA COMMANDE': [updatedData.statuts.commande || 'En attente'],
//                     'STATUT DE LA LIVRAISON (ENCART MYTRUCK)': [updatedData.statuts.livraison || 'EN ATTENTE']
//                 })
//             };

//             // console.log('Données envoyées à Airtable:', {
//             //     ...fields,
//             //     'PHOTOS ARTICLES': photosAttachments.length > 0 ? `${photosAttachments.length} photos` : 'Aucune photo'
//             // });

//             // Ne pas inclure le champ PHOTOS ARTICLES dans la mise à jour
//             // sauf si on ajoute spécifiquement de nouvelles photos
//             if (updatedData.articles?.photos && updatedData.articles.photos.length > 0) {
//                 fields['PHOTOS ARTICLES'] = existingPhotos;
//             }
//             // Formatage des photos pour Airtable
//             if (updatedData.articles?.photos) {
//                 fields['PHOTOS ARTICLES'] = updatedData.articles.photos.map(photo => {
//                     if (typeof photo === 'string') {
//                         return { url: photo };
//                     }
//                     return { url: photo.url };
//                 });
//             }

//             // Ne mettre à jour le champ RESERVE TRANSPORT que si nécessaire
//             if (shouldUpdateReserve) {
//                 fields['RESERVE TRANSPORT'] = 'OUI';
//                 console.log('Réserve transport activée en raison de nouveaux commentaires ou photos');
//             } else if (existingCommande) {
//                 // Préserver la valeur existante
//                 fields['RESERVE TRANSPORT'] = existingCommande.fields['RESERVE TRANSPORT'] || 'NON';
//             } else {
//                 // Utiliser la valeur fournie ou la valeur par défaut
//                 fields['RESERVE TRANSPORT'] = updatedData.livraison?.reserve ? 'OUI' : 'NON';
//             }

//             const response = await this.fetchFromAirtable(
//                 `${this.tables.commandes}/${updatedData.id}`,
//                 {
//                     method: 'PATCH',
//                     body: JSON.stringify({
//                         fields,
//                         typecast: true
//                     }),
//                     headers: {
//                         'Content-Type': 'application/json'
//                     }
//                 }
//             );

//             return transformAirtableToCommande(response);
//         } catch (error) {
//             // Gestion spéciale pour les erreurs 404
//             if ((error as { status?: number }).status === 404 && updatedData.id) {
//                 console.error(`Enregistrement non trouvé pour mise à jour: ${updatedData.id}`);
//                 throw new Error(`Enregistrement non trouvé: ${updatedData.id}`);
//             }
//             console.error('Erreur updateCommande:', error);
//             throw error;
//         }
//     }

//     async getDocument(commandeId: string, type: 'facture' | 'devis'): Promise<Blob> {
//         try {
//             const response = await this.fetchFromAirtable(`${this.tables.commandes}/${commandeId}/documents/${type}`, {
//                 responseType: 'blob',
//                 headers: {
//                     'Accept': 'application/pdf'
//                 }
//             });

//             if (!response.ok) {
//                 throw new Error(`Erreur lors de la récupération du document: ${response.statusText}`);
//             }

//             return await response.blob();
//         } catch (error) {
//             console.error('Erreur lors de la récupération du document:', error);
//             throw error;
//         }
//     }

//     async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
//         try {
//             const fields = {
//                 'TARIF HT': Number(tarif)
//             };

//             const result = await this.fetchFromAirtable(
//                 `${this.tables.commandes}/${commandeId}`,
//                 {
//                     method: 'PATCH',
//                     body: JSON.stringify({ fields })
//                 }
//             );

//             return transformAirtableToCommande(result);
//         } catch (error) {
//             console.error('Erreur lors de la mise à jour du tarif:', error);
//             throw error;
//         }
//     }

//     async updateChauffeurs(commandeId: string, chauffeurs: string[]): Promise<CommandeMetier> {
//         try {
//             const fields = {
//                 'CHAUFFEUR(S)': chauffeurs
//             };

//             const result = await this.fetchFromAirtable(
//                 `${this.tables.commandes}/${commandeId}`,
//                 {
//                     method: 'PATCH',
//                     body: JSON.stringify({ fields })
//                 }
//             );

//             return transformAirtableToCommande(result);
//         } catch (error) {
//             console.error('Erreur lors de la mise à jour des chauffeurs:', error);
//             throw error;
//         }
//     }

//     async updateCommandeStatus(commandeId: string, status: {
//         commande: StatutCommande;
//         livraison: StatutLivraison;
//     }): Promise<CommandeMetier> {
//         try {
//             const fields = {
//                 'STATUT DE LA COMMANDE': [status.commande],
//                 'STATUT DE LA LIVRAISON (ENCART MYTRUCK)': [status.livraison]
//             };

//             const response = await this.fetchFromAirtable(
//                 `${this.tables.commandes}/${commandeId}`,
//                 {
//                     method: 'PATCH',
//                     body: JSON.stringify({ fields }),
//                     headers: {
//                         'Content-Type': 'application/json'
//                     }
//                 }
//             );

//             return transformAirtableToCommande(response);
//         } catch (error) {
//             throw error;
//         }
//     }

//     async addPhotosToCommande(commandeId: string, newPhotos: Array<{ url: string }>, existingPhotos: Array<{ url: string }> = []): Promise<CommandeMetier> {
//         try {
//             const allPhotos = [...existingPhotos, ...newPhotos];

//             const fields = {
//                 'PHOTOS ARTICLES': allPhotos.map(photo => ({ url: photo.url })),
//             };

//             const response = await this.fetchFromAirtable(
//                 `${this.tables.commandes}/${commandeId}`,
//                 {
//                     method: 'PATCH',
//                     body: JSON.stringify({
//                         fields,
//                         typecast: true
//                     })
//                 }
//             );

//             return transformAirtableToCommande(response);
//         } catch (error) {
//             console.error('Erreur lors de l\'ajout des photos:', error);
//             throw error;
//         }
//     }

//     async deletePhotoFromCommande(commandeId: string, updatedPhotos: Array<{ url: string }>): Promise<CommandeMetier> {
//         try {
//             const fields = {
//                 'PHOTOS ARTICLES': updatedPhotos.map(photo => ({ url: photo.url })),
//             };

//             const response = await this.fetchFromAirtable(
//                 `${this.tables.commandes}/${commandeId}`,
//                 {
//                     method: 'PATCH',
//                     body: JSON.stringify({
//                         fields,
//                         typecast: true
//                     })
//                 }
//             );

//             return transformAirtableToCommande(response);
//         } catch (error) {
//             console.error('Erreur lors de la suppression de la photo:', error);
//             throw error;
//         }
//     }
// }

// Version sécurisée qui ne crash pas l'application
console.warn('🚫 Airtable désactivé via VITE_DISABLE_AIRTABLE - Redirection vers API Backend');

// Service de remplacement qui ne fait rien
export class AirtableService {
    static getInstance() {
        return {
            authenticate: () => {
                console.warn('⚠️ Tentative d\'authentification Airtable bloquée');
                return Promise.reject(new Error('Utilisez AuthContext avec Backend API'));
            },
            getRecords: () => {
                console.warn('⚠️ Tentative de lecture Airtable bloquée');
                return Promise.reject(new Error('Utilisez les services Backend API'));
            },
            createRecord: () => {
                console.warn('⚠️ Tentative de création Airtable bloquée');
                return Promise.reject(new Error('Utilisez les services Backend API'));
            },
            updateRecord: () => {
                console.warn('⚠️ Tentative de mise à jour Airtable bloquée');
                return Promise.reject(new Error('Utilisez les services Backend API'));
            },
        };
    }
}

export default AirtableService;