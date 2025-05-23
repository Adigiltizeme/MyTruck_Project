import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
import { StatutCommande, StatutLivraison } from '../types/commande.types';
import { AirtableService } from './airtable.service';
import { CloudinaryService } from './cloudinary.service';
import { imageCache } from './image-cache.service';
import { MapboxService } from './mapbox.service';
import { db, PendingChange } from './offline-db.service';
import { v4 as uuidv4 } from 'uuid';
import { AuthService, AuthUser } from './authService';
import { UserAirtableService } from './userAirtableService';
import { handleStorageError } from '../utils/error-handler';
import { DbMonitor } from '../utils/db-repair';
import { SafeDbService } from './safe-db.service';
import { OptimizedImageCache } from './optimized-image-cache.service';

export class DataService {
    private airtableService: AirtableService;
    private userAirtableService: UserAirtableService;
    private syncInProgress: boolean = false;
    private isNetworkOnline: boolean;
    private isOfflineForced: boolean;
    private syncInterval: NodeJS.Timeout | null = null;
    private token: string;

    constructor(airtableToken: string, forcedOfflineMode = false) {
        this.airtableService = new AirtableService(airtableToken);
        this.userAirtableService = new UserAirtableService(airtableToken);
        this.isNetworkOnline = navigator.onLine;
        this.token = airtableToken;
        this.isOfflineForced = forcedOfflineMode || localStorage.getItem('forceOfflineMode') === 'true';
        this.setupNetworkListeners();
        this.setupNetworkListeners();
        // Écouter les changements du mode hors ligne
        window.addEventListener('offlinemodechange', (event: Event) => {
            const customEvent = event as CustomEvent;
            this.isOfflineForced = customEvent.detail.forced;
            console.log(`Mode hors ligne forcé mis à jour: ${this.isOfflineForced}`);
        });
    }

    public setForcedOfflineMode(forced: boolean): void {
        console.log(`Setting forced offline mode to: ${forced}`);
        this.isOfflineForced = forced;

        // Si on force le mode hors ligne, arrêter toute synchronisation en cours
        if (forced) {
            this.stopSync();
        }
    }

    private get isOnline(): boolean {
        return this.isNetworkOnline && !this.isOfflineForced;
    }

    // Méthode explicite pour vérifier avant tout appel API
    public shouldMakeApiCall(operationName: string = 'opération'): boolean {
        // Toujours vérifier localStorage directement pour avoir la valeur la plus récente
        const forcedOffline = localStorage.getItem('forceOfflineMode') === 'true';

        if (forcedOffline) {
            console.log(`[Mode hors ligne forcé] ${operationName} - utilisation des données locales`);
            return false;
        }

        const canMakeApiCall = this.isOnline && !this.isOfflineForced;
        if (!canMakeApiCall) {
            console.log(`[Mode hors ligne] ${operationName} - utilisation des données locales`);
        }

        return canMakeApiCall;
    }

    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isNetworkOnline = true;
            this.synchronize();
        });

        window.addEventListener('offline', () => {
            this.isNetworkOnline = false;
        });
    }

    // Activation de la synchronisation périodique
    public async startSync(intervalMs = 60000) {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            if (this.isOnline) {
                this.synchronize();
            }
        }, intervalMs);

        await this.cleanupTempEntities();
    }

    public stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Synchronisation manuelle
    async synchronize(): Promise<boolean> {
        await this.cleanupFailedTransactions();

        if (!this.shouldMakeApiCall('synchronisation')) {
            return false;
        }

        console.log('[DataService] Début de la synchronisation');
        let syncSuccess = true;

        try {
            // 1. Vérifier d'abord si Airtable est accessible
            const testConnection = await this.testAirtableConnection();
            if (!testConnection) {
                console.error('[DataService] Airtable inaccessible, abandon de la synchronisation');
                return false;
            }

            // 2. Traiter les changements en attente
            syncSuccess = await this.processPendingChanges();

            // 3. Charger les dernières données
            await this.refreshLocalData();

            // 4. Mettre en cache les images
            await this.cacheImages();

            return syncSuccess;
        } catch (error) {
            console.error('Erreur de synchronisation:', error);
            DbMonitor.recordDbOperation(
                false,
                'synchronize',
                error instanceof Error ? error.message : String(error)
            );
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }

    private async testAirtableConnection(): Promise<boolean> {
        try {
            // Essayer de récupérer un élément simple, comme une liste des options
            const response = await this.airtableService.getFieldOptions('CRENEAU DE LIVRAISON');
            return Array.isArray(response) && response.length > 0;
        } catch (error) {
            console.error('[DataService] Test de connexion Airtable échoué:', error);
            return false;
        }
    }

    private async processPendingCommandeChange(change: PendingChange): Promise<void> {
        try {
            const data = change.data as Partial<CommandeMetier>;

            switch (change.action) {
                case 'create':
                    // Pour les créations, remplacer les numéros temporaires
                    // Pour les créations, vérifier si une commande similaire existe déjà
                    const existingCommandes = await this.airtableService.getCommandes();

                    // Vérifier si une commande similaire existe (même client, même date, etc.)
                    const possibleDuplicate = existingCommandes.find(cmd =>
                        cmd.client?.nom === data.client?.nom &&
                        cmd.client?.prenom === data.client?.prenom &&
                        cmd.client?.telephone?.principal === data.client?.telephone?.principal &&
                        cmd.dates?.livraison === data.dates?.livraison
                    );

                    if (possibleDuplicate) {
                        console.log(`Commande similaire détectée (${possibleDuplicate.id}). Conversion en mise à jour.`);

                        // Mise à jour au lieu de création
                        await this.airtableService.updateCommande({
                            ...data,
                            id: possibleDuplicate.id,
                            numeroCommande: possibleDuplicate.numeroCommande
                        });

                        return;
                    }

                    // Pour les créations, remplacer les numéros temporaires
                    if (data.numeroCommande?.startsWith('TEMP_')) {
                        console.log(`Remplacement du numéro temporaire ${data.numeroCommande}`);
                        data.numeroCommande = `CMD${Date.now()}`;
                    }
                    
                    await this.airtableService.createCommande(data);
                    break;

                case 'update':
                    // Vérifier si l'ID est temporaire (commence par 'temp_')
                    if (change.entityId.startsWith('temp_')) {
                        console.log(`Tentative de mise à jour d'un enregistrement temporaire (${change.entityId}). Conversion en création.`);

                        // Convertir la mise à jour en création
                        await this.airtableService.createCommande(data);
                    } else {
                        // Pour les mises à jour normales, préserver le numéro existant
                        if (data.id) {
                            const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', data.id);
                            if (existingCommande && existingCommande.numeroCommande) {
                                data.numeroCommande = existingCommande.numeroCommande;
                            }
                        }
                        await this.airtableService.updateCommande(data);
                    }
                    break;

                case 'delete':
                    // Vérifier si l'ID est temporaire
                    if (change.entityId.startsWith('temp_')) {
                        console.log(`Tentative de suppression d'un enregistrement temporaire (${change.entityId}). Suppression locale uniquement.`);

                        // Supprimer uniquement de la base locale
                        await SafeDbService.delete('commandes', change.entityId);
                    } else {
                        await this.airtableService.deleteCommande(change.entityId);
                    }
                    break;
            }
        } catch (error: any) {
            console.error(`Erreur lors du traitement de l'action ${change.action} pour la commande:`, error);

            // Si l'erreur est un 404 et que l'ID commence par 'temp_', on supprime simplement le changement en attente
            if (error.status === 404 && change.entityId.startsWith('temp_')) {
                console.log(`L'enregistrement temporaire ${change.entityId} n'existe pas sur le serveur. Suppression du changement en attente.`);
                return; // On laisse supprimer le changement en attente dans la boucle principale
            }

            throw error; // Propager l'erreur pour les autres cas
        }
    }

    private async processPendingPersonnelChange(change: any) {
        // À implémenter si vous avez des opérations de modification du personnel
        // await this.airtableService.updatePersonnel(change.data);
        // console.log(`Traitement de la modification du personnel: ${change.action}`);
        // // Exemple de traitement spécifique
        // if (change.action === 'update') {
        //     const personnelData = change.data as PersonnelInfo;
        //     await this.userAirtableService.updatePersonnel(personnelData);
        // } else if (change.action === 'delete') {
        //     await this.userAirtableService.deletePersonnel(change.entityId);
        // } else if (change.action === 'create') {
        //     await this.userAirtableService.createPersonnel(change.data);
        // }
        // // Enregistrer l'opération réussie
        // DbMonitor.recordDbOperation(true, 'updatePersonnel');
        // // Enregistrer l'opération échouée
        // DbMonitor.recordDbOperation(false, 'updatePersonnel', 'Erreur lors de la mise à jour du personnel');
        // // Traiter les changements de personnel en attente
        //  if (change.action === 'update') {
        //      const personnelData = change.data as PersonnelInfo;
        //      await this.userAirtableService.updatePersonnel(personnelData);
        //  } else if (change.action === 'delete') {
        //      await this.userAirtableService.deletePersonnel(change.entityId);
        //  } else if (change.action === 'create') {
        //      await this.userAirtableService.createPersonnel(change.data);
        //  }
        console.log('Personnel change processing not implemented yet');
    }

    private async processPendingMagasinChange(change: any) {
        // À implémenter si vous avez des opérations de modification des magasins
        console.log('Magasin change processing not implemented yet');
    }

    private async refreshLocalData(): Promise<boolean> {
        try {
            // Charger toutes les données
            const [commandes, personnel, magasins] = await Promise.all([
                this.airtableService.getCommandes(),
                this.airtableService.getPersonnel(),
                this.airtableService.getMagasins()
            ]);

            // Mettre à jour la base locale
            await SafeDbService.transaction('rw', ['commandes', 'personnel', 'magasins'], async () => {
                // Vider les tables
                await SafeDbService.clear('commandes');
                await SafeDbService.clear('personnel');
                await SafeDbService.clear('magasins');

                // Charger les nouvelles données
                for (const commande of commandes) {
                    await SafeDbService.add('commandes', commande);
                }
                for (const person of personnel) {
                    await SafeDbService.add('personnel', person);
                }
                for (const magasin of magasins) {
                    await SafeDbService.add('magasins', magasin);
                }
            });

            return true;
        } catch (error) {
            console.error('Erreur lors du rafraîchissement des données:', error);
            DbMonitor.recordDbOperation(
                false,
                'refreshLocalData',
                error instanceof Error ? error.message : String(error)
            );
            throw error;
        }
    }
    private async cacheImages(): Promise<void> {
        if (!('caches' in window)) {
            console.log('Cache API non disponible');
            return;
        }

        try {
            // Récupérer toutes les commandes pour extraire les URLs des photos
            const commandes = await SafeDbService.getAll<CommandeMetier>('commandes');

            // Extraire les URLs des photos
            const photoUrls = commandes
                .flatMap(cmd => cmd.articles?.photos || [])
                .map(photo => typeof photo === 'string' ? photo : photo.url)
                .filter(url => url && url.startsWith('http'));

            // Mettre en cache par lots
            const cache = await caches.open('my-truck-images');

            const batchSize = 5;
            for (let i = 0; i < photoUrls.length; i += batchSize) {
                const batch = photoUrls.slice(i, i + batchSize);
                await Promise.all(
                    batch.map(async url => {
                        try {
                            // Vérifier si l'image est déjà en cache
                            const cacheResponse = await cache.match(url);
                            if (!cacheResponse) {
                                const response = await fetch(url, { method: 'GET', mode: 'no-cors' });
                                if (response.ok) {
                                    await cache.put(url, response);
                                }
                            }
                        } catch (e) {
                            console.warn(`Impossible de mettre en cache l'image: ${url}`, e);
                        }
                    })
                );

                // Pause entre les lots
                if (i + batchSize < photoUrls.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            console.log(`${photoUrls.length} images mises en cache`);
        } catch (error) {
            console.error('Erreur lors de la mise en cache des images:', error);
            DbMonitor.recordDbOperation(
                false,
                'cacheImages',
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    // Méthodes d'accès aux données
    public async getCommandes(): Promise<CommandeMetier[]> {
        try {
            if (this.shouldMakeApiCall('getCommandes')) {
                console.log('Récupération des commandes depuis Airtable');
                // En ligne: récupérer depuis Airtable
                const commandes = await this.airtableService.getCommandes();

                // Sauvegarde dans IndexedDB via SafeDbService
                await SafeDbService.transaction('rw', 'commandes', async () => {
                    await SafeDbService.clear('commandes');
                    for (const commande of commandes) {
                        await SafeDbService.add('commandes', commande);
                    }
                });

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'getCommandes');

                return commandes;
            } else {
                console.log('Mode hors ligne: récupération des commandes depuis la BD locale');
                // Mode hors ligne - lire depuis IndexedDB via SafeDbService
                const localCommandes = await SafeDbService.getAll<CommandeMetier>('commandes');

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'getCommandes (local)');

                return localCommandes;
            }
        } catch (error) {
            console.error('Erreur getCommandes:', error);

            // Enregistrer l'opération échouée
            DbMonitor.recordDbOperation(false, 'getCommandes', error instanceof Error ? error.message : String(error));

            // Récupération en mode dégradé
            try {
                return await SafeDbService.getAll<CommandeMetier>('commandes');
            } catch (dbError) {
                console.error('Erreur lors de la récupération locale des commandes:', dbError);
                return [];
            }
        }
    }

    public async getCommande(id: string): Promise<CommandeMetier | null> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: récupérer depuis Airtable
                const commandes = await this.airtableService.getCommandes();
                const commande = commandes.find(cmd => cmd.id === id);

                // Mettre à jour la base locale
                if (commande) {
                    await SafeDbService.put('commandes', commande);
                }

                return commande || null;
            } else {
                // Hors ligne: utiliser les données locales
                return await SafeDbService.getById<CommandeMetier>('commandes', id);
            }
        } catch (error) {
            console.error(`Erreur getCommande ${id}:`, error);
            // Fallback vers les données locales
            return await SafeDbService.getById<CommandeMetier>('commandes', id);
        }
    }

    public async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        try {
            // Récupérer les informations utilisateur
            const userString = localStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;

            // Vérifier et compléter les informations du magasin si nécessaire
            if (user?.role === 'magasin' && user.storeId) {
                if (!commande.magasin || !commande.magasin.id) {
                    console.log('Correction des données du magasin dans createCommande');
                    commande.magasin = {
                        ...commande.magasin,
                        id: user.storeId,
                        name: user.storeName || '',
                        address: user.storeAddress || '',
                        phone: commande.magasin?.phone || '',
                        status: commande.magasin?.status || ''
                    };
                }
            }

            // Vérification critique de l'ID du magasin
            if (!commande.magasin?.id) {
                console.warn('ID de magasin manquant avant création - vérifiez la source des données');
            } else {
                console.log(`Création de commande avec magasin ID: ${commande.magasin.id}`);
            }

            // S'assurer que financier est correctement initialisé
            if (!commande.financier) {
                commande.financier = { tarifHT: 0 };
            } else if (commande.financier.tarifHT === undefined) {
                commande.financier.tarifHT = 0;
            }

            console.log(`Tarif lors de la création: ${commande.financier.tarifHT}€`);

            if (this.shouldMakeApiCall()) {
                // En ligne: créer via Airtable
                const result = await this.airtableService.createCommande(commande);
                // Mettre à jour la base locale via SafeDbService
                try {
                    await SafeDbService.add('commandes', result);
                } catch (dbError) {
                    // Intercepter spécifiquement les erreurs de stockage local
                    if (!handleStorageError(dbError)) {
                        console.warn('Erreur locale non critique lors de la sauvegarde de la commande:', dbError);
                    }
                }

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'createCommandes');

                return result;
            } else {
                // Hors ligne: stocker localement et ajouter aux changements en attente
                const tempId = `temp_${uuidv4()}`;
                const tempCommande = {
                    ...commande,
                    id: tempId,
                    numeroCommande: commande.numeroCommande || `TEMP_${Date.now()}`,
                    statuts: {
                        commande: 'En attente',
                        livraison: 'EN ATTENTE'
                    }
                } as CommandeMetier;

                try {
                    await SafeDbService.add('commandes', tempCommande);
                    await SafeDbService.add('pendingChanges', {
                        id: uuidv4(),
                        entityType: 'commande',
                        entityId: tempId,
                        action: 'create',
                        data: commande,
                        timestamp: Date.now()
                    });
                } catch (dbError) {
                    if (handleStorageError(dbError)) {
                        throw new Error('Espace de stockage insuffisant. Veuillez nettoyer votre espace de stockage dans les paramètres avant de continuer.');
                    }
                    throw dbError;
                }

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'createCommandes');

                return tempCommande;
            }
        } catch (error) {
            console.error('Erreur createCommande:', error);

            // Enregistrer l'opération échouée
            DbMonitor.recordDbOperation(false, 'createCommandes', error instanceof Error ? error.message : String(error));

            // Création en mode dégradé
            try {
                const tempId = `temp_${uuidv4()}`;
                const tempCommande = {
                    ...commande,
                    id: tempId,
                    numeroCommande: commande.numeroCommande || `TEMP_${Date.now()}`,
                    statuts: {
                        commande: 'En attente',
                        livraison: 'EN ATTENTE'
                    }
                } as CommandeMetier;

                await SafeDbService.add('commandes', tempCommande);
                return tempCommande;
            } catch (dbError) {
                console.error('Erreur lors de la création locale de la commande:', dbError);
                throw dbError; // Propager l'erreur
            }
        }
    }

    public async updateCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable
                const result = await this.airtableService.updateCommande(commande);
                // Mettre à jour la base locale
                try {
                    await SafeDbService.update('commandes', commande.id!, result);
                } catch (dbError) {
                    // Intercepter spécifiquement les erreurs de stockage local
                    if (!handleStorageError(dbError)) {
                        console.warn('Erreur locale non critique lors de la mise à jour de la commande:', dbError);
                    }
                }

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'updateCommandes');

                return result;
            } else {
                // Hors ligne: mettre à jour localement et ajouter aux changements en attente
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commande.id!);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    ...commande
                };

                try {
                    await SafeDbService.update('commandes', commande.id!, updatedCommande);
                    await SafeDbService.add('pendingChanges', {
                        id: uuidv4(),
                        entityType: 'commande',
                        entityId: commande.id!,
                        action: 'update',
                        data: commande,
                        timestamp: Date.now()
                    });
                } catch (dbError) {
                    if (handleStorageError(dbError)) {
                        throw new Error('Espace de stockage insuffisant. Veuillez nettoyer votre espace de stockage dans les paramètres avant de continuer.');
                    }
                    throw dbError;
                }

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'updateCommandes');

                return updatedCommande;
            }
        } catch (error) {
            console.error('Erreur updateCommande:', error);

            // Enregistrer l'opération échouée
            DbMonitor.recordDbOperation(false, 'updateCommandes');

            // Mise à jour en mode dégradé
            try {
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commande.id!);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    ...commande
                };

                await SafeDbService.update('commandes', commande.id!, updatedCommande);
                return updatedCommande;
            } catch (dbError) {
                console.error('Erreur lors de la mise à jour locale de la commande:', dbError);
                throw dbError; // Propager l'erreur
            }
        }
    }

    public async addPhotosToCommande(commandeId: string, newPhotos: Array<{ url: string }>, existingPhotos: Array<{ url: string }> = []): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable
                return await this.airtableService.addPhotosToCommande(commandeId, newPhotos, existingPhotos);
            } else {
                // Hors ligne: mettre à jour localement et ajouter aux changements en attente
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commandeId);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    articles: {
                        ...existingCommande.articles,
                        photos: [...existingPhotos, ...newPhotos]
                    }
                };

                await SafeDbService.update('commandes', commandeId, updatedCommande);
                await SafeDbService.add('pendingChanges', {
                    id: uuidv4(),
                    entityType: 'commande',
                    entityId: commandeId,
                    action: 'update',
                    data: {
                        id: commandeId,
                        articles: {
                            nombre: existingCommande.articles.nombre,
                            photos: [...existingPhotos, ...newPhotos],
                        }
                    },
                    timestamp: Date.now()
                });

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'addPhotosToCommande');

                return updatedCommande;
            }
        } catch (error) {
            console.error('Erreur addPhotosToCommande:', error);

            // Enregistrer l'opération échouée
            DbMonitor.recordDbOperation(false, 'addPhotosToCommande');

            try {
                // Mise à jour en mode dégradé
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commandeId);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    articles: {
                        ...existingCommande.articles,
                        photos: [...existingPhotos, ...newPhotos]
                    }
                };

                await SafeDbService.update('commandes', commandeId, updatedCommande);
                return updatedCommande;
            }
            catch (dbError) {
                console.error('Erreur lors de la mise à jour locale de la commande:', dbError);
                throw dbError; // Propager l'erreur
            }
        }
    }

    public async deletePhotoFromCommande(commandeId: string, updatedPhotos: Array<{ url: string }>): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable
                return await this.airtableService.deletePhotoFromCommande(commandeId, updatedPhotos);
            } else {
                // Hors ligne: mettre à jour localement et ajouter aux changements en attente
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commandeId);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    articles: {
                        ...existingCommande.articles,
                        nombre: existingCommande.articles.nombre,
                        photos: updatedPhotos
                    }
                };

                await SafeDbService.update('commandes', commandeId, updatedCommande);
                await SafeDbService.add('pendingChanges', {
                    id: uuidv4(),
                    entityType: 'commande',
                    entityId: commandeId,
                    action: 'update',
                    data: {
                        id: commandeId,
                        articles: {
                            nombre: existingCommande.articles.nombre,
                            photos: updatedPhotos
                        }
                    },
                    timestamp: Date.now()
                });

                return updatedCommande;
            }
        } catch (error) {
            console.error('Erreur deletePhotoFromCommande:', error);
            DbMonitor.recordDbOperation(false, 'deletePhotoFromCommande', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    public async getPersonnel(): Promise<PersonnelInfo[]> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: récupérer depuis Airtable
                const personnel = await this.airtableService.getPersonnel();

                // Mettre à jour la base locale
                await SafeDbService.transaction('rw', 'personnel', async () => {
                    await SafeDbService.clear('personnel');
                    for (const person of personnel) {
                        await SafeDbService.add('personnel', person);
                    }
                });

                return personnel;
            } else {
                // Hors ligne: utiliser les données locales
                return await SafeDbService.getAll<PersonnelInfo>('personnel');
            }
        } catch (error) {
            console.error('Erreur getPersonnel:', error);
            DbMonitor.recordDbOperation(false, 'getPersonnel', error instanceof Error ? error.message : String(error));
            // Fallback vers les données locales
            return await SafeDbService.getAll<PersonnelInfo>('personnel');
        }
    }

    public async deleteCommande(id: string): Promise<void> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: supprimer via Airtable
                await this.airtableService.deleteCommande(id);
                try {
                    // Supprimer de la base locale
                    await SafeDbService.delete('commandes', id);
                } catch (dbError) {
                    // Intercepter spécifiquement les erreurs de stockage local
                    if (!handleStorageError(dbError)) {
                        console.warn('Erreur locale non critique lors de la suppression de la commande:', dbError);
                    }
                }

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'deleteCommandes');
            } else {
                try {
                    // Hors ligne: marquer pour suppression
                    await SafeDbService.delete('commandes', id);
                    await SafeDbService.add('pendingChanges', {
                        id: uuidv4(),
                        entityType: 'commande',
                        entityId: id,
                        action: 'delete',
                        data: {},
                        timestamp: Date.now()
                    });
                } catch (dbError) {
                    if (handleStorageError(dbError)) {
                        throw new Error('Espace de stockage insuffisant. Veuillez nettoyer votre espace de stockage dans les paramètres avant de continuer.');
                    }
                    throw dbError;
                }

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'deleteCommandes (local)');
            }
        } catch (error) {
            console.error('Erreur deleteCommande:', error);

            // Enregistrer l'opération échouée
            DbMonitor.recordDbOperation(false, 'deleteCommandes');

            try {
                // Supprimer de la base locale
                await SafeDbService.delete('commandes', id);
            }
            catch (dbError) {
                // Intercepter spécifiquement les erreurs de stockage local
                if (!handleStorageError(dbError)) {
                    console.warn('Erreur locale non critique lors de la suppression de la commande:', dbError);
                }
            }
            throw error; // Propager l'erreur
        }
    }

    public async getMagasins(): Promise<MagasinInfo[]> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: récupérer depuis Airtable
                const magasins = await this.airtableService.getMagasins();

                // Mettre à jour la base locale
                await SafeDbService.transaction('rw', 'magasins', async () => {
                    await SafeDbService.clear('magasins');
                    for (const magasin of magasins) {
                        await SafeDbService.add('magasins', magasin);
                    }
                });

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'getMagasins');

                return magasins;
            } else {
                // Hors ligne: utiliser les données locales
                const magasins = await SafeDbService.getAll<MagasinInfo>('magasins');

                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'getMagasins (local)');

                return magasins;
            }
        } catch (error) {
            console.error('Erreur getMagasins:', error);
            // Enregistrer l'opération échouée
            DbMonitor.recordDbOperation(false, 'getMagasins');

            try {
                // Fallback vers les données locales
                return await SafeDbService.getAll<MagasinInfo>('magasins');
            }
            catch (dbError) {
                console.error('Erreur lors de la récupération locale des magasins:', dbError);
                return [];
            }
        }
    }

    public async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable
                const result = await this.airtableService.updateTarif(commandeId, tarif);

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, result);

                return result;
            } else {
                // Hors ligne: mettre à jour localement et ajouter aux changements en attente
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commandeId);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    financier: {
                        ...existingCommande.financier,
                        tarifHT: tarif
                    }
                };

                await SafeDbService.update('commandes', commandeId, updatedCommande);
                await SafeDbService.add('pendingChanges', {
                    id: uuidv4(),
                    entityType: 'commande',
                    entityId: commandeId,
                    action: 'update',
                    data: {
                        id: commandeId,
                        financier: {
                            tarifHT: tarif
                        }
                    },
                    timestamp: Date.now()
                });

                return updatedCommande;
            }
        } catch (error) {
            console.error('Erreur updateTarif:', error);
            DbMonitor.recordDbOperation(false, 'updateTarif', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    public async getFieldOptions(field: string): Promise<string[]> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: récupérer depuis Airtable
                return await this.airtableService.getFieldOptions(field);
            } else {
                // Hors ligne: utiliser des valeurs par défaut ou stockées localement
                switch (field) {
                    case 'CRENEAU DE LIVRAISON':
                        return [
                            "07h-09h", "08h-10h", "09h-11h", "10h-12h",
                            "11h-13h", "12h-14h", "13h-15h", "14h-16h",
                            "15h-17h", "16h-18h", "17h-19h", "18h-20h"
                        ];
                    case 'CATEGORIE DE VEHICULE':
                        return ["3M3", "6M3", "10M3", "20M3"];
                    default:
                        console.warn(`Options pour le champ ${field} non disponibles hors ligne`);
                        return [];
                }
            }
        } catch (error) {
            console.error(`Erreur getFieldOptions pour ${field}:`, error);
            DbMonitor.recordDbOperation(false, 'getFieldOptions', error instanceof Error ? error.message : String(error));

            // Valeurs par défaut en cas d'erreur
            switch (field) {
                case 'CRENEAU DE LIVRAISON':
                    return [
                        "07h-09h", "08h-10h", "09h-11h", "10h-12h",
                        "11h-13h", "12h-14h", "13h-15h", "14h-16h",
                        "15h-17h", "16h-18h", "17h-19h", "18h-20h"
                    ];
                case 'CATEGORIE DE VEHICULE':
                    return ["3M3", "6M3", "10M3", "20M3"];
                default:
                    return [];
            }
        }
    }

    async processPendingChanges(): Promise<boolean> {
        if (!this.shouldMakeApiCall('synchronisation')) {
            return false;
        }

        console.log('[DataService] Traitement des changements en attente');
        let success = true;

        try {
            // Récupérer les changements en attente
            const pendingChanges = await SafeDbService.getAll<PendingChange>('pendingChanges');

            // Si aucun changement en attente, terminer immédiatement
            if (pendingChanges.length === 0) {
                console.log('[DataService] Aucun changement en attente à traiter');
                return true;
            }

            console.log(`[DataService] ${pendingChanges.length} changements en attente à traiter`);

            // Trier par timestamp pour traiter dans l'ordre
            pendingChanges.sort((a, b) => a.timestamp - b.timestamp);

            for (const change of pendingChanges) {
                try {
                    if (change.entityType === 'commande') {
                        await this.processPendingCommandeChange(change);
                    }
                    else if (change.entityType === 'personnel') {
                        await this.processPendingPersonnelChange(change);
                    }
                    else if (change.entityType === 'magasin') {
                        await this.processPendingMagasinChange(change);
                    }
                    else if (change.entityType === 'user') {
                        // Traitement des changements utilisateurs
                        if (change.action === 'create') {
                            const userData = change.data;
                            await AuthService.signup(userData);
                        }
                        else if (change.action === 'update') {
                            await AuthService.updateUserInfo(change.entityId, change.data);
                        }
                        else if (change.action === 'delete') {
                            // Gestion de la suppression d'un utilisateur
                            try {
                                // Supprimer l'utilisateur dans Airtable via AuthService
                                await AuthService.deleteUser(change.entityId);
                                console.log(`Utilisateur ${change.entityId} supprimé avec succès`);
                            } catch (error) {
                                console.error(`Erreur lors de la suppression de l'utilisateur ${change.entityId}:`, error);
                                // Si l'utilisateur était déjà supprimé, on continue
                                if (error instanceof Error && error.message.includes('not found')) {
                                    console.log(`L'utilisateur ${change.entityId} était déjà supprimé`);
                                } else {
                                    throw error; // Propager d'autres erreurs
                                }
                            }
                        }
                    }

                    // Supprimer le changement traité
                    await SafeDbService.delete('pendingChanges', change.id);
                } catch (error: any) {
                    success = false;
                    console.error(`Erreur synchronisation ${change.entityType} ${change.action}:`, error);
                    DbMonitor.recordDbOperation(
                        false,
                        `processPendingChange(${change.entityType}, ${change.action})`,
                        error instanceof Error ? error.message : String(error)
                    );

                    // Si l'erreur est critique, mais pas une 404, on peut marquer le changement comme problématique
                    if (error.status !== 404) {
                        // Mise à jour avec les nouveaux champs
                        const updateData: Partial<PendingChange> = {
                            error: error.message || 'Erreur inconnue',
                            retryCount: (change.retryCount || 0) + 1
                        };

                        await SafeDbService.update('pendingChanges', change.id, updateData);
                    } else {
                        // Pour les 404, on supprime simplement le changement
                        await SafeDbService.delete('pendingChanges', change.id);
                    }
                }
            }

            return success;
        } catch (error) {
            console.error('[DataService] Erreur lors du traitement des changements en attente:', error);
            DbMonitor.recordDbOperation(
                false,
                'processPendingChanges',
                error instanceof Error ? error.message : String(error)
            );
            return false;
        }
    }

    public async updateChauffeurs(commandeId: string, chauffeurs: string[]): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable
                const result = await this.airtableService.updateChauffeurs(commandeId, chauffeurs);

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, result);

                return result;
            } else {
                // Hors ligne: mettre à jour localement et ajouter aux changements en attente
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commandeId);
                if (!existingCommande) throw new Error('Commande non trouvée');

                // Récupérer les infos complètes des chauffeurs
                const allPersonnel = await SafeDbService.getAll<PersonnelInfo>('personnel');
                const selectedChauffeurs = allPersonnel.filter(p => chauffeurs.includes(p.id));

                const updatedCommande = {
                    ...existingCommande,
                    chauffeurs: selectedChauffeurs
                };

                await SafeDbService.update('commandes', commandeId, updatedCommande);
                await SafeDbService.add('pendingChanges', {
                    id: uuidv4(),
                    entityType: 'commande',
                    entityId: commandeId,
                    action: 'update',
                    data: {
                        id: commandeId,
                        chauffeurs: chauffeurs // Juste les IDs
                    },
                    timestamp: Date.now()
                });

                return updatedCommande;
            }
        } catch (error) {
            console.error('Erreur updateChauffeurs:', error);
            DbMonitor.recordDbOperation(false, 'updateChauffeurs', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    public async updateCommandeStatus(commandeId: string, status: {
        commande: StatutCommande;
        livraison: StatutLivraison;
    }): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable
                const result = await this.airtableService.updateCommandeStatus(commandeId, status);

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, result);

                return result;
            } else {
                // Hors ligne: mettre à jour localement et ajouter aux changements en attente
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commandeId);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    statuts: status
                };

                await SafeDbService.update('commandes', commandeId, updatedCommande);
                await SafeDbService.add('pendingChanges', {
                    id: uuidv4(),
                    entityType: 'commande',
                    entityId: commandeId,
                    action: 'update',
                    data: {
                        id: commandeId,
                        statuts: status
                    },
                    timestamp: Date.now()
                });

                return updatedCommande;
            }
        } catch (error) {
            console.error('Erreur updateCommandeStatus:', error);
            DbMonitor.recordDbOperation(false, 'updateCommandeStatus', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    /**
 * Ajoute une facture à une commande
 * @param commande La commande à laquelle ajouter la facture
 * @param facture Les informations de la facture
 * @returns La commande mise à jour
 */
    public async addFactureToCommande(commande: CommandeMetier, facture: {
        id: string;
        numeroFacture: string;
        dateFacture: string;
        dateEcheance: string;
        montantHT: number;
        statut: 'En attente' | 'Payée';
    }): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable
                const result = await this.airtableService.updateCommande({
                    ...commande,
                    financier: {
                        ...commande.financier,
                        factures: [...(commande.financier.factures || []), {
                            ...facture,
                            magasin: commande.magasin || null,
                            client: commande.client || null
                        }],
                    }
                });

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commande.id, result);

                return result;
            } else {
                // Hors ligne: mettre à jour localement et ajouter aux changements en attente
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commande.id);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    financier: {
                        ...existingCommande.financier,
                        factures: [...(existingCommande.financier?.factures || []), {
                            ...facture,
                            magasin: existingCommande.magasin || null,
                            client: existingCommande.client || null
                        }]
                    }
                };

                await SafeDbService.update('commandes', commande.id, updatedCommande);
                await SafeDbService.add('pendingChanges', {
                    id: uuidv4(),
                    entityType: 'commande',
                    entityId: commande.id,
                    action: 'update',
                    data: {
                        id: commande.id,
                        financier: {
                            factures: updatedCommande.financier.factures
                        }
                    },
                    timestamp: Date.now()
                });

                return updatedCommande;
            }
        } catch (error) {
            console.error('Erreur addFactureToCommande:', error);
            DbMonitor.recordDbOperation(false, 'addFactureToCommande', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    /**
 * Ajoute un devis à une commande
 * @param commande La commande à laquelle ajouter le devis
 * @param devis Les informations du devis
 * @returns La commande mise à jour
 */
    public async addDevisToCommande(commande: CommandeMetier, devis: {
        id: string;
        numeroDevis: string;
        dateDevis: string;
        dateEcheance: string;
        montantHT: number;
        statut: 'En attente' | 'Accepté' | 'Refusé';
    }): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable (hypothétique méthode)
                const result = await this.airtableService.updateCommande({
                    ...commande,
                    financier: {
                        ...commande.financier,
                        devis: [...(commande.financier.devis || []), {
                            ...devis,
                            magasin: commande.magasin || null,
                            client: commande.client || null
                        }],
                        ...devis
                    }
                });

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commande.id, result);

                return result;
            } else {
                // Hors ligne: mettre à jour localement et ajouter aux changements en attente
                const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commande.id);
                if (!existingCommande) throw new Error('Commande non trouvée');

                const updatedCommande = {
                    ...existingCommande,
                    financier: {
                        ...existingCommande.financier,
                        devis: [...(existingCommande.financier?.devis || []), {
                            ...devis,
                            magasin: existingCommande.magasin || null,
                            client: existingCommande.client || null
                        }]
                    }
                };

                await SafeDbService.update('commandes', commande.id, updatedCommande);
                await SafeDbService.add('pendingChanges', {
                    id: uuidv4(),
                    entityType: 'commande',
                    entityId: commande.id,
                    action: 'update',
                    data: {
                        id: commande.id,
                        financier: {
                            devis: updatedCommande.financier.devis
                        }
                    },
                    timestamp: Date.now()
                });

                return updatedCommande;
            }
        } catch (error) {
            console.error('Erreur addDevisToCommande:', error);
            DbMonitor.recordDbOperation(false, 'addDevisToCommande', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    // Calcule la distance entre deux adresses avec gestion du mode hors ligne
    public async calculateDistance(originAddress: string, destinationAddress: string): Promise<number> {
        try {
            // Toujours essayer d'utiliser Mapbox, même en mode hors ligne forcé
            const mapboxService = new MapboxService(import.meta.env.VITE_MAPBOX_TOKEN);
            return await mapboxService.calculateDistance(originAddress, destinationAddress);
        } catch (error) {
            console.error('Erreur lors du calcul de distance:', error);

            // Simulation de distance en cas d'échec
            // Vérifier si les adresses contiennent des villes avec forfait Paris
            const villes = ['Ivry', 'Arcueil', 'Boulogne', 'Batignolles', 'Paris'];
            const estZoneParis = villes.some(ville =>
                originAddress.toLowerCase().includes(ville.toLowerCase()) ||
                destinationAddress.toLowerCase().includes(ville.toLowerCase())
            );

            if (estZoneParis) {
                return 5; // Distance courte pour les magasins parisiens
            }

            // Pour les autres cas, simuler une distance en fonction des codes postaux
            const originPostal = this.extractPostalCode(originAddress);
            const destPostal = this.extractPostalCode(destinationAddress);

            if (originPostal && destPostal) {
                // Estimation basée sur les codes postaux
                return this.estimateDistanceByPostalCode(originPostal, destPostal);
            }

            // Valeur par défaut générique
            return 10;
        }
    }

    // Méthodes utilitaires auxiliaires (à ajouter)
    private extractPostalCode(address: string): string | null {
        const match = address.match(/\b\d{5}\b/);
        return match ? match[0] : null;
    }

    private estimateDistanceByPostalCode(origin: string, destination: string): number {
        // Estimation simple basée sur les deux premiers chiffres (département)
        const originDept = origin.substring(0, 2);
        const destDept = destination.substring(0, 2);

        if (originDept === destDept) {
            // Même département
            return 15;
        } else if (Math.abs(parseInt(originDept) - parseInt(destDept)) <= 1) {
            // Départements adjacents
            return 30;
        } else {
            // Départements éloignés
            return 45;
        }
    }

    /**
 * Vérifie et migre les images Airtable vers Cloudinary pour une commande
 */
    async migrateCommandeImages(commande: CommandeMetier): Promise<CommandeMetier> {
        // Ne faire la migration que si on est en ligne
        if (!this.isOnline) {
            return commande;
        }

        try {
            const cloudinaryService = new CloudinaryService();
            let hasUpdates = false;

            // Traiter les photos des articles
            if (commande.articles?.photos && commande.articles.photos.length > 0) {
                const updatedPhotos = await Promise.all(
                    commande.articles.photos.map(async (photo) => {
                        const photoUrl = typeof photo === 'string' ? photo : photo.url;

                        // Vérifier si c'est une URL Airtable qui n'a pas encore été migrée
                        if (cloudinaryService.isAirtableUrl(photoUrl)) {
                            // Vérifier si cette image a déjà été migrée
                            const cachedUrl = await this.getCachedCloudinaryUrl(photoUrl);
                            if (cachedUrl) {
                                return { url: cachedUrl };
                            }

                            try {
                                // Migrer vers Cloudinary
                                const result = await cloudinaryService.uploadFromUrl(photoUrl);

                                // Marquer comme migrée
                                await this.trackMigratedImage(photoUrl, result.url);

                                hasUpdates = true;
                                return { url: result.url };
                            } catch (error) {
                                console.error(`Erreur de migration: ${photoUrl}`, error);
                                return photo;
                            }
                        }

                        return photo;
                    })
                );

                commande.articles.photos = updatedPhotos;
            }

            // Si des mises à jour ont été effectuées, sauvegarder la commande
            if (hasUpdates && this.isOnline) {
                // Mettre à jour dans Airtable
                await this.airtableService.updateCommande({
                    id: commande.id,
                    articles: {
                        nombre: commande.articles?.nombre || 0,
                        photos: commande.articles?.photos
                    }
                });

                // Mettre à jour dans IndexedDB
                await SafeDbService.update('commandes', commande.id, commande);
            }

            return commande;
        } catch (error) {
            console.error('Erreur lors de la migration des images:', error);
            DbMonitor.recordDbOperation(false, 'migrateCommandeImages', error instanceof Error ? error.message : String(error));
            return commande;
        }
    }

    private async getCachedCloudinaryUrl(originalUrl: string): Promise<string | null> {
        try {
            // Utiliser la méthode OptimizedImageCache.getCloudinaryUrl
            return await OptimizedImageCache.getCloudinaryUrl(originalUrl);
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'URL Cloudinary en cache:', error);
            return null;
        }
    }

    private async trackMigratedImage(originalUrl: string, cloudinaryUrl: string): Promise<void> {
        try {
            // Utiliser la méthode OptimizedImageCache.storeCloudinaryUrl
            await OptimizedImageCache.storeCloudinaryUrl(originalUrl, cloudinaryUrl);
        } catch (error) {
            console.error('Erreur lors du suivi de l\'image migrée:', error);
        }
    }

    /**
     * Procéder à la migration automatique des images pour toutes les commandes
     */
    async migrateAllCommandeImages(): Promise<void> {
        if (!this.isOnline) return;

        try {
            // Vérifier si une migration est nécessaire
            const shouldMigrate = await this.shouldRunGlobalMigration();
            if (!shouldMigrate) {
                console.log('Migration des images ignorée - pas nécessaire actuellement');
                return;
            }

            console.log('Migration automatique des images pour toutes les commandes...');

            // Récupérer toutes les commandes
            const commandes = await this.getCommandes();

            // Compter les commandes avec des images Airtable
            const cloudinaryService = new CloudinaryService();
            let commandesWithAirtableImages = 0;
            let totalAirtableImages = 0;

            // Analyser chaque commande
            for (const commande of commandes) {
                let hasAirtableImages = false;

                // Vérifier les photos des articles
                if (commande.articles?.photos && commande.articles.photos.length > 0) {
                    for (const photo of commande.articles.photos) {
                        const photoUrl = typeof photo === 'string' ? photo : photo.url;
                        if (cloudinaryService.isAirtableUrl(photoUrl)) {
                            hasAirtableImages = true;
                            totalAirtableImages++;
                        }
                    }
                }

                if (hasAirtableImages) {
                    commandesWithAirtableImages++;
                }
            }

            console.log(`Trouvé ${commandesWithAirtableImages} commandes avec un total de ${totalAirtableImages} images Airtable`);

            // Lancer la migration
            if (totalAirtableImages > 0) {
                console.log('Début de la migration...');

                // Migrer par lots de 5 pour éviter de surcharger l'API
                const batchSize = 5;
                for (let i = 0; i < commandes.length; i += batchSize) {
                    const batch = commandes.slice(i, i + batchSize);

                    await Promise.all(batch.map(async commande => {
                        try {
                            await this.migrateCommandeImages(commande);
                        } catch (error) {
                            console.error(`Erreur lors de la migration des images de la commande ${commande.id}:`, error);
                        }
                    }));

                    // Attendre un peu entre les lots
                    if (i + batchSize < commandes.length) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }

                console.log('Migration terminée');
                // Une fois la migration terminée, marquer comme complète
                this.markGlobalMigrationComplete();
            }
        } catch (error) {
            console.error('Erreur lors de la migration automatique des images:', error);
            DbMonitor.recordDbOperation(false, 'migrateAllCommandeImages', error instanceof Error ? error.message : String(error));
        }
    }

    private async shouldRunGlobalMigration(): Promise<boolean> {
        // Vérifier la date de dernière migration
        const lastMigration = localStorage.getItem('lastImageMigration');
        if (lastMigration) {
            const lastMigrationDate = new Date(parseInt(lastMigration));
            const now = new Date();
            const daysSinceLastMigration = (now.getTime() - lastMigrationDate.getTime()) / (1000 * 60 * 60 * 24);

            // Si la dernière migration date de moins de 24h, ne pas la refaire
            if (daysSinceLastMigration < 1) {
                console.log('Migration globale déjà effectuée récemment, ignorée');
                return false;
            }
        }

        // Vérifier la présence d'URLs Airtable dans l'ensemble du cache d'images
        try {
            // Utiliser OptimizedImageCache pour cette vérification
            return await OptimizedImageCache.hasAirtableUrls();
        } catch (error) {
            console.error('Erreur lors de la vérification des images à migrer:', error);
            return false;
        }
    }

    private markGlobalMigrationComplete(): void {
        localStorage.setItem('lastImageMigration', Date.now().toString());
        console.log('Migration globale marquée comme terminée');
    }

    /**
 * Récupère les commandes filtrées selon le rôle de l'utilisateur
 */
    public async getCommandesForCurrentUser(): Promise<CommandeMetier[]> {
        try {
            // Récupérer l'utilisateur actuel
            const userString = localStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;

            // Récupérer toutes les commandes
            const allCommandes = await this.getCommandes();

            // Filtrer selon le rôle
            if (user) {
                if (user.role === 'admin') {
                    // Admin voit tout
                    return allCommandes;
                } else if (user.role === 'magasin' && user.storeId) {
                    // Magasin ne voit que ses commandes
                    return allCommandes.filter(cmd => cmd.magasin?.id === user.storeId);
                } else if (user.role === 'chauffeur' && user.driverId) {
                    // Chauffeur ne voit que ses livraisons
                    return allCommandes.filter(cmd =>
                        cmd.chauffeurs?.some(chauffeur => chauffeur.id === user.driverId)
                    );
                }
            }

            // Par défaut, ne retourner aucune commande
            console.warn('Utilisateur sans rôle valide, aucune commande affichée');
            return [];
        } catch (error) {
            console.error('Erreur lors de la récupération des commandes filtrées:', error);
            DbMonitor.recordDbOperation(false, 'getCommandesForCurrentUser', error instanceof Error ? error.message : String(error));
            return [];
        }
    }

    async cleanupTempEntities(): Promise<void> {
        console.log('[DataService] Nettoyage des entités temporaires');

        try {
            // 1. Récupérer toutes les commandes avec des ID temporaires
            const tempCommandes = await SafeDbService.queryWhere<CommandeMetier>('commandes', 'id', /^temp_/);

            if (tempCommandes.length > 0) {
                console.log(`[DataService] ${tempCommandes.length} commandes temporaires trouvées`);

                // Vérifier si certaines sont anciennes (plus de 7 jours)
                const now = Date.now();
                const oldTempCommandes = tempCommandes.filter(cmd => {
                    // Extraire le timestamp de l'ID ou utiliser la date de création
                    const timestamp = cmd.id.includes('_') ?
                        parseInt(cmd.id.split('_')[1]) :
                        new Date(cmd.dates.commande).getTime();

                    // Garder celles plus vieilles que 7 jours
                    return (now - timestamp) > (7 * 24 * 60 * 60 * 1000);
                });

                if (oldTempCommandes.length > 0) {
                    console.log(`[DataService] Suppression de ${oldTempCommandes.length} commandes temporaires anciennes`);
                    for (const cmd of oldTempCommandes) {
                        await SafeDbService.delete('commandes', cmd.id);
                    }
                }
            }

            // 2. Nettoyer les changements en attente obsolètes
            const pendingChanges = await SafeDbService.getAll<PendingChange>('pendingChanges');
            const obsoleteChanges = pendingChanges.filter(change =>
                (change.entityId && change.entityId.startsWith('temp_') && change.retryCount && change.retryCount > 3) ||
                (change.timestamp && (Date.now() - change.timestamp) > (30 * 24 * 60 * 60 * 1000)) // 30 jours
            );

            if (obsoleteChanges.length > 0) {
                console.log(`[DataService] Suppression de ${obsoleteChanges.length} changements en attente obsolètes`);
                for (const change of obsoleteChanges) {
                    await SafeDbService.delete('pendingChanges', change.id);
                }
            }
        } catch (error) {
            console.error('[DataService] Erreur lors du nettoyage des entités temporaires:', error);
            DbMonitor.recordDbOperation(false, 'cleanupTempEntities', error instanceof Error ? error.message : String(error));
        }
    }

    async cleanupFailedTransactions() {
        try {
            console.log('Nettoyage des transactions échouées...');

            // Récupérer les changements en attente
            const pendingChanges = await SafeDbService.getAll<PendingChange>('pendingChanges');

            // Identifier les changements qui ont échoué
            const failedChanges = pendingChanges.filter((change: PendingChange) =>
                (change.retryCount && change.retryCount > 3) ||
                (change.error && typeof change.error === 'string' && change.error.includes('IDBKeyRange'))
            );

            console.log(`${failedChanges.length} changements en échec identifiés`);

            // Supprimer ces changements
            for (const change of failedChanges) {
                await SafeDbService.delete('pendingChanges', change.id);
            }

            return failedChanges.length;
        } catch (error) {
            console.error('Erreur lors du nettoyage des transactions échouées:', error);
            return 0;
        }
    }
}