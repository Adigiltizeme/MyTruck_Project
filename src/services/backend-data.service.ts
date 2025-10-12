// import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
// import { StatutCommande, StatutLivraison } from '../types/commande.types';
// import { CloudinaryService } from './cloudinary.service';
// import { apiService } from './api.service'; // ✅ Utiliser api.service existant
// import { MapboxService } from './mapbox.service';
// import { v4 as uuidv4 } from 'uuid';
// import { AuthService, AuthUser } from './authService';
// import { handleStorageError } from '../utils/error-handler';
// import { FilterOptions, MetricData } from '../types/metrics';
// import { MetricsCalculator } from './metrics.service';

// export class BackendDataService {
//     private syncInProgress: boolean = false;
//     private isNetworkOnline: boolean;
//     private syncInterval: NodeJS.Timeout | null = null;

//     constructor() {
//         this.isNetworkOnline = navigator.onLine;
//         this.setupNetworkListeners();
//     }

//     private setupNetworkListeners() {
//         window.addEventListener('online', () => {
//             this.isNetworkOnline = true;
//             console.log('🌐 Connexion réseau rétablie');
//         });

//         window.addEventListener('offline', () => {
//             this.isNetworkOnline = false;
//             console.log('🚫 Connexion réseau perdue');
//         });
//     }

//     // ✅ GARDER LA MÊME INTERFACE mais utiliser Backend API
//     async getCommandes(filters: FilterOptions = { dateRange: 'all' as any }): Promise<CommandeMetier[]> {
//         try {
//             console.log('📋 Récupération des commandes depuis Backend API...');

//             // ✅ Utiliser api.service.ts existant
//             const response = await apiService.getCommandes(filters);
//             const commandes = response.data || response;

//             console.log(`✅ ${commandes.length} commandes récupérées`);
//             return commandes;
//         } catch (error) {
//             console.error('❌ Erreur récupération commandes:', error);
//             throw error;
//         }
//     }

//     async getCommande(id: string): Promise<CommandeMetier> {
//         try {
//             console.log(`📋 Récupération commande ${id} depuis Backend API...`);
//             const commande = await apiService.getCommande(id);
//             console.log('✅ Commande récupérée:', commande);
//             return commande;
//         } catch (error) {
//             console.error(`❌ Erreur récupération commande ${id}:`, error);
//             throw error;
//         }
//     }

//     async createCommande(commandeData: Partial<CommandeMetier>): Promise<CommandeMetier> {
//         try {
//             console.log('📋 Création commande via Backend API...');
//             const newCommande = await apiService.createCommande(commandeData);
//             console.log('✅ Commande créée:', newCommande);
//             return newCommande;
//         } catch (error) {
//             console.error('❌ Erreur création commande:', error);
//             throw error;
//         }
//     }

//     async updateCommande(id: string, updates: Partial<CommandeMetier>): Promise<CommandeMetier> {
//         try {
//             console.log(`📋 Mise à jour commande ${id} via Backend API...`);
//             const updatedCommande = await apiService.updateCommande(id, updates);
//             console.log('✅ Commande mise à jour:', updatedCommande);
//             return updatedCommande;
//         } catch (error) {
//             console.error(`❌ Erreur mise à jour commande ${id}:`, error);
//             throw error;
//         }
//     }

//     // ✅ EXACTEMENT LA MÊME LOGIQUE QUI MARCHAIT AVEC AIRTABLE
//     async addPhotosToCommande(
//         commandeId: string,
//         newPhotos: Array<{ url: string }>,
//         existingPhotos: Array<{ url: string }> = []
//     ): Promise<CommandeMetier> {
//         try {
//             console.log(`📸 Ajout ${newPhotos.length} photos à commande ${commandeId}...`);

//             // ✅ MÊME LOGIQUE: Fusionner existantes + nouvelles
//             const allPhotos = [...existingPhotos, ...newPhotos];

//             // ✅ MÊME STRUCTURE que celle qui marchait avec Airtable
//             // Récupérer la commande actuelle pour obtenir 'nombre'
//             const currentCommande = await this.getCommande(commandeId);
//             const updateData = {
//                 articles: {
//                     nombre: currentCommande.articles?.nombre ?? 1, // valeur par défaut si absent
//                     photos: allPhotos
//                 }
//             };

//             // ✅ SEULE DIFFÉRENCE: Backend au lieu d'Airtable
//             const updatedCommande = await apiService.updateCommande(commandeId, updateData);

//             console.log('✅ Photos ajoutées avec succès');
//             return updatedCommande;

//         } catch (error) {
//             console.error('❌ Erreur ajout photos:', error);

//             // ✅ MÊME GESTION D'ERREUR qu'avant
//             // Si le Backend ne gère pas encore les photos, utiliser la logique locale
//             console.log('⚠️ Backend ne gère pas les photos, utilisation logique locale');

//             // Récupérer la commande actuelle
//             const currentCommande = await this.getCommande(commandeId);

//             // Mettre à jour localement
//             const updatedCommande = {
//                 ...currentCommande,
//                 articles: {
//                     ...currentCommande.articles,
//                     photos: [...existingPhotos, ...newPhotos]
//                 }
//             };

//             // TODO: Implémenter la sauvegarde Backend des photos plus tard
//             console.log('💾 Photos sauvées localement, sauvegarde Backend à implémenter');

//             return updatedCommande;
//         }
//     }

//     async deletePhotoFromCommande(
//         commandeId: string,
//         updatedPhotos: Array<{ url: string }>
//     ): Promise<CommandeMetier> {
//         try {
//             console.log(`🗑️ Suppression photos de commande ${commandeId}...`);

//             // ✅ MÊME STRUCTURE que celle qui marchait avec Airtable
//             // Récupérer la commande actuelle pour obtenir 'nombre'
//             const currentCommande = await this.getCommande(commandeId);
//             const updateData = {
//                 articles: {
//                     nombre: currentCommande.articles?.nombre ?? 1, // valeur par défaut si absent
//                     photos: updatedPhotos
//                 }
//             };

//             // ✅ SEULE DIFFÉRENCE: Backend au lieu d'Airtable
//             const updatedCommande = await apiService.updateCommande(commandeId, updateData);

//             console.log('✅ Photos supprimées avec succès');
//             return updatedCommande;

//         } catch (error) {
//             console.error('❌ Erreur suppression photos:', error);

//             // ✅ MÊME FALLBACK LOCAL qu'avant
//             const currentCommande = await this.getCommande(commandeId);

//             const updatedCommande = {
//                 ...currentCommande,
//                 articles: {
//                     ...currentCommande.articles,
//                     photos: updatedPhotos
//                 }
//             };

//             console.log('💾 Photos supprimées localement, sauvegarde Backend à implémenter');
//             return updatedCommande;
//         }
//     }

//     // ✅ PERSONNEL - Utiliser Backend API
//     async getPersonnel(): Promise<PersonnelInfo[]> {
//         try {
//             console.log('👥 Récupération personnel depuis Backend API...');
//             const personnel = await apiService.getPersonnel();
//             console.log(`✅ ${personnel.length} membres du personnel récupérés`);
//             return personnel;
//         } catch (error) {
//             console.error('❌ Erreur récupération personnel:', error);
//             throw error;
//         }
//     }

//     // ✅ MAGASINS - Utiliser Backend API
//     async getMagasins(): Promise<MagasinInfo[]> {
//         try {
//             console.log('🏪 Récupération magasins depuis Backend API...');
//             const magasins = await apiService.getMagasins();
//             console.log(`✅ ${magasins.length} magasins récupérés`);
//             return magasins;
//         } catch (error) {
//             console.error('❌ Erreur récupération magasins:', error);
//             throw error;
//         }
//     }

//     // ✅ MÉTRIQUES - Adapter les calculs pour Backend
//     async getMetrics(filters: FilterOptions = { dateRange: 'all' as any }): Promise<MetricData[]> {
//         try {
//             console.log('📊 Calcul métriques depuis Backend API...');
//             const commandes = await this.getCommandes(filters);

//             // ✅ Réutiliser MetricsCalculator existant
//             const metricsCalculator = new MetricsCalculator(filters);
//             const historiqueData = metricsCalculator.calculateHistorique(commandes);

//             // Adapter chaque item pour correspondre à MetricData
//             const metrics: MetricData[] = historiqueData.map((item: any) => ({
//                 historique: item.historique ?? [],
//                 statutsDistribution: item.statutsDistribution ?? [],
//                 commandes: item.commandes ?? [],
//                 chauffeurs: item.chauffeurs ?? [],
//                 totalLivraisons: item.totalLivraisons ?? 0,
//                 enCours: item.enCours ?? 0,
//                 enAttente: item.enAttente ?? 0,
//                 performance: item.performance ?? 0,
//                 chiffreAffaires: item.chiffreAffaires ?? 0,
//                 chauffeursActifs: item.chauffeursActifs ?? [],
//                 // Ajoutez ici d'autres propriétés requises par MetricData si nécessaire
//             }));

//             console.log('✅ Métriques calculées:', metrics);
//             return metrics;
//         } catch (error) {
//             console.error('❌ Erreur calcul métriques:', error);
//             throw error;
//         }
//     }

//     // ✅ MÉTHODES DE STATUS pour compatibilité
//     getStatus() {
//         return {
//             source: 'backend_api',
//             apiAvailable: this.isNetworkOnline,
//             hasLocal: false // Plus de cache local
//         };
//     }

//     isOnline(): boolean {
//         return this.isNetworkOnline;
//     }

//     // ✅ MÉTHODES DE SYNCHRONISATION (pour compatibilité)
//     async synchronize(): Promise<void> {
//         console.log('🔄 Synchronisation avec Backend API (pas nécessaire)');
//         // Pas de sync nécessaire avec Backend API
//     }

//     async processPendingChanges(): Promise<boolean> {
//         console.log('🔄 Traitement changements en attente (pas nécessaire)');
//         return true; // Pas de changements en attente avec Backend API
//     }
// }

import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
import { StatutCommande, StatutLivraison } from '../types/commande.types';
import { apiService } from './api.service'; // ✅ Backend API au lieu d'Airtable
import { CloudinaryService } from './cloudinary.service';
import { MapboxService } from './mapbox.service';
import { v4 as uuidv4 } from 'uuid';
import { AuthService, AuthUser } from './authService';
import { handleStorageError } from '../utils/error-handler';
import { FilterOptions, MetricData } from '../types/metrics';
import { MetricsCalculator } from './metrics.service';
import { SafeDbService } from './safe-db.service';
import { DbMonitor } from '../utils/db-repair';
import { isAdminRole } from '../utils/role-helpers';

export class BackendDataService {
    private syncInProgress: boolean = false;
    private isNetworkOnline: boolean;
    private isOfflineForced: boolean;
    private syncInterval: NodeJS.Timeout | null = null;

    // Flag statique pour éviter les logs multiples
    private static offlineModeLogged: boolean = false;

    constructor(forcedOfflineMode = false) {
        this.isNetworkOnline = navigator.onLine;
        this.isOfflineForced = forcedOfflineMode || localStorage.getItem('forceOfflineMode') === 'true';
        this.setupNetworkListeners();

        // Écouter les changements du mode hors ligne
        window.addEventListener('offlinemodechange', (event: Event) => {
            const customEvent = event as CustomEvent;
            this.isOfflineForced = customEvent.detail.forced;
            console.log(`Mode hors ligne forcé mis à jour: ${this.isOfflineForced}`);
        });
    }

    public setForcedOfflineMode(forced: boolean): void {
        if (this.isOfflineForced !== forced || !BackendDataService.offlineModeLogged) {
            console.log(`Setting forced offline mode to: ${forced}`);
            BackendDataService.offlineModeLogged = true;
        }
        this.isOfflineForced = forced;
        if (forced) {
            this.stopSync();
        }
    }

    private get isOnline(): boolean {
        return this.isNetworkOnline && !this.isOfflineForced;
    }

    public shouldMakeApiCall(operationName: string = 'opération'): boolean {
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

    public async startSync(intervalMs = 60000) {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.syncInterval = setInterval(() => {
            if (this.isOnline) {
                this.synchronize();
            }
        }, intervalMs);
    }

    public stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async synchronize(): Promise<boolean> {
        console.log('[BackendDataService] Synchronisation avec Backend API (automatique)');
        return true; // Pas de sync nécessaire avec Backend API
    }

    // // ✅ MÉTHODES IDENTIQUES À data.service.ts mais avec Backend API
    // public async getCommandes(): Promise<CommandeMetier[]> {
    //     try {
    //         if (this.shouldMakeApiCall('getCommandes')) {
    //             console.log('Récupération des commandes depuis Backend API');
    //             const response = await apiService.getCommandes();
    //             const commandes = response.data || response;
    //             return commandes;
    //         } else {
    //             console.log('Mode hors ligne: récupération des commandes depuis la BD locale');
    //             return []; // TODO: Implémenter cache local si nécessaire
    //         }
    //     } catch (error) {
    //         console.error('Erreur getCommandes:', error);
    //         return [];
    //     }
    // }

    // public async getCommande(id: string): Promise<CommandeMetier | null> {
    //     try {
    //         if (this.shouldMakeApiCall()) {
    //             return await apiService.getCommande(id);
    //         } else {
    //             return null; // TODO: Implémenter cache local si nécessaire
    //         }
    //     } catch (error) {
    //         console.error(`Erreur getCommande ${id}:`, error);
    //         return null;
    //     }
    // }

    // Méthodes d'accès aux données
    public async getCommandes(): Promise<CommandeMetier[]> {
        try {
            if (this.shouldMakeApiCall('getCommandes')) {
                console.log('Récupération des commandes depuis Backend API');
                const response = await apiService.getCommandes({ take: 1000 }); // Augmente la limite à 1000
                const commandes: CommandeMetier[] = Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];

                // Sauvegarde dans IndexedDB
                await SafeDbService.transaction('rw', 'commandes', async () => {
                    await SafeDbService.clear('commandes');
                    for (const commande of commandes) {
                        await SafeDbService.add('commandes', commande);
                    }
                });

                DbMonitor.recordDbOperation(true, 'getCommandes');
                return commandes;
            } else {
                console.log('Mode hors ligne: récupération des commandes depuis la BD locale');
                const localCommandes = await SafeDbService.getAll<CommandeMetier>('commandes');
                DbMonitor.recordDbOperation(true, 'getCommandes (local)');
                return localCommandes;
            }
        } catch (error) {
            console.error('Erreur getCommandes:', error);
            DbMonitor.recordDbOperation(false, 'getCommandes', error instanceof Error ? error.message : String(error));
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
                const response = await apiService.getCommandes({ take: 1000 }); // Augmente la limite à 1000
                const commandesRaw = response.data || response;
                const commandesArray: CommandeMetier[] = Array.isArray(commandesRaw) ? commandesRaw : (Array.isArray((commandesRaw as any)?.data) ? (commandesRaw as any).data : []);
                const commande = commandesArray.find((cmd: CommandeMetier) => cmd.id === id);

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

    // public async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
    //     try {
    //         const userString = localStorage.getItem('user');
    //         const user = userString ? JSON.parse(userString) : null;

    //         if (user?.role === 'magasin' && user.storeId) {
    //             if (!commande.magasin || !commande.magasin.id) {
    //                 console.log('Correction des données du magasin dans createCommande');
    //                 commande.magasin = {
    //                     ...commande.magasin,
    //                     id: user.storeId,
    //                     name: user.storeName || '',
    //                     address: user.storeAddress || '',
    //                     phone: commande.magasin?.phone || '',
    //                     status: commande.magasin?.status || ''
    //                 };
    //             }
    //         }

    //         if (!commande.financier) {
    //             commande.financier = { tarifHT: 0 };
    //         } else if (commande.financier.tarifHT === undefined) {
    //             commande.financier.tarifHT = 0;
    //         }

    //         console.log(`Tarif lors de la création: ${commande.financier.tarifHT}€`);

    //         if (this.shouldMakeApiCall()) {
    //             return await apiService.createCommande(commande);
    //         } else {
    //             const tempId = `temp_${uuidv4()}`;
    //             const tempCommande = {
    //                 ...commande,
    //                 id: tempId,
    //                 numeroCommande: commande.numeroCommande || `TEMP_${Date.now()}`,
    //                 statuts: {
    //                     commande: 'En attente',
    //                     livraison: 'EN ATTENTE'
    //                 }
    //             } as CommandeMetier;
    //             return tempCommande;
    //         }
    //     } catch (error) {
    //         console.error('Erreur createCommande:', error);
    //         throw error;
    //     }
    // }

    // public async updateCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
    //     try {
    //         if (this.shouldMakeApiCall()) {
    //             return await apiService.updateCommande(commande.id!, commande);
    //         } else {
    //             throw new Error('Mise à jour impossible hors ligne');
    //         }
    //     } catch (error) {
    //         console.error('Erreur updateCommande:', error);
    //         throw error;
    //     }
    // }

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
                const result = await apiService.createCommande(commande);
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
                const result = await apiService.updateCommande(commande.id!, commande);
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
    // Méthodes de gestion des photos EN LOCALE
    public async addPhotosToCommande(commandeId: string, newPhotos: Array<{ url: string }>, existingPhotos: Array<{ url: string }> = []): Promise<CommandeMetier> {
        try {
            console.log('📸 addPhotosToCommande appelé:', { commandeId, newPhotos, existingPhotos });

            if (this.shouldMakeApiCall()) {
                const allPhotos = [...existingPhotos, ...newPhotos];
                console.log('📸 Toutes les photos:', allPhotos);

                // ✅ SOLUTION: Utiliser endpoint spécifique photos si disponible
                // Sinon utiliser updateCommande avec structure correcte
                const updateData = {
                    id: commandeId,
                    articles: {
                        photos: allPhotos,
                        nombre: (await this.getCommande(commandeId))?.articles?.nombre ?? 1 // valeur par défaut si absent
                    }
                };

                console.log('📸 Données envoyées pour mise à jour:', updateData);

                const result = await apiService.updateCommande(commandeId, updateData);
                console.log('📸 Résultat mise à jour:', result);

                // ✅ FORCER refresh des données locales
                await this.invalidateCache();

                return result;
            } else {
                throw new Error('Ajout photos impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur addPhotosToCommande détaillée:', error);
            throw error;
        }
    }
    // Méthode pour supprimer des photos d'une commande EN LOCALE
    public async deletePhotoFromCommande(commandeId: string, updatedPhotos: Array<{ url: string }>): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // ✅ CORRIGER: Utiliser updateCommande au lieu d'un endpoint photos dédié
                const result = await this.updateCommande({
                    id: commandeId,
                    articles: {
                        photos: updatedPhotos,
                        nombre: (await this.getCommande(commandeId))?.articles?.nombre ?? 1 // valeur par défaut si absent
                    }
                });
                return result;
            } else {
                throw new Error('Suppression photos impossible hors ligne');
            }
        } catch (error) {
            console.error('Erreur deletePhotoFromCommande:', error);
            throw error;
        }
    }

    private async invalidateCache(): Promise<void> {
        // Vider le cache local pour forcer refresh
        await SafeDbService.clear('commandes');
    }


    public async getPersonnel(): Promise<PersonnelInfo[]> {
        try {
            if (this.shouldMakeApiCall()) {
                return await apiService.getPersonnel();
            } else {
                return [];
            }
        } catch (error) {
            console.error('Erreur getPersonnel:', error);
            return [];
        }
    }

    public async deleteCommande(id: string): Promise<void> {
        try {
            if (this.shouldMakeApiCall()) {
                await apiService.deleteCommande(id);
            } else {
                throw new Error('Suppression impossible hors ligne');
            }
        } catch (error) {
            console.error('Erreur deleteCommande:', error);
            throw error;
        }
    }

    public async getMagasins(): Promise<MagasinInfo[]> {
        try {
            if (this.shouldMakeApiCall()) {
                return await apiService.getMagasins();
            } else {
                return [];
            }
        } catch (error) {
            console.error('Erreur getMagasins:', error);
            return [];
        }
    }

    public async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
        try {
            if (this.shouldMakeApiCall()) {
                // En ligne: mettre à jour via Airtable
                const result = await apiService.updateTarif(commandeId, tarif);

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

    // public async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
    //     return await this.updateCommande({
    //         id: commandeId,
    //         financier: { tarifHT: tarif }
    //     });
    // }

    public async getFieldOptions(field: string): Promise<string[]> {
        try {
            switch (field) {
                case 'CRENEAU DE LIVRAISON':
                    return [
                        "07h-09h", "08h-10h", "09h-11h", "10h-12h",
                        "11h-13h", "12h-14h", "13h-15h", "14h-16h",
                        "15h-17h", "16h-18h", "17h-19h", "18h-20h"
                    ];
                case 'CATEGORIE DE VEHICULE':
                    return ["1M3", "6M3", "10M3", "20M3"];
                default:
                    return [];
            }
        } catch (error) {
            console.error(`Erreur getFieldOptions pour ${field}:`, error);
            return [];
        }
    }

    async processPendingChanges(): Promise<boolean> {
        console.log('[BackendDataService] Traitement changements en attente (automatique avec Backend)');
        return true;
    }

    public async updateChauffeurs(commandeId: string, chauffeurs: string[]): Promise<CommandeMetier> {
        const allPersonnel = await this.getPersonnel();
        const selectedChauffeurs = allPersonnel.filter(p => chauffeurs.includes(p.id));
        return await this.updateCommande({
            id: commandeId,
            chauffeurs: selectedChauffeurs
        });
    }

    public async updateCommandeStatus(commandeId: string, status: {
        commande: StatutCommande;
        livraison: StatutLivraison;
    }): Promise<CommandeMetier> {
        return await this.updateCommande({
            id: commandeId,
            statuts: status
        });
    }

    public async calculateDistance(originAddress: string, destinationAddress: string): Promise<number> {
        try {
            const mapboxService = new MapboxService(import.meta.env.VITE_MAPBOX_TOKEN);
            return await mapboxService.calculateDistance(originAddress, destinationAddress);
        } catch (error) {
            console.error('Erreur lors du calcul de distance:', error);
            return 10;
        }
    }

    public async getCommandesForCurrentUser(): Promise<CommandeMetier[]> {
        try {
            const userString = localStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            const allCommandes = await this.getCommandes();

            if (user) {
                if (isAdminRole(user?.role)) {
                    return allCommandes;
                } else if (user.role === 'magasin' && user.storeId) {
                    return allCommandes.filter(cmd => cmd.magasin?.id === user.storeId);
                } else if (user.role === 'chauffeur' && user.driverId) {
                    return allCommandes.filter(cmd =>
                        cmd.chauffeurs?.some(chauffeur => chauffeur.id === user.driverId)
                    );
                }
            }
            return [];
        } catch (error) {
            console.error('Erreur lors de la récupération des commandes filtrées:', error);
            return [];
        }
    }

    async cleanupTempEntities(): Promise<void> {
        console.log('[BackendDataService] Nettoyage entités temporaires (pas nécessaire avec Backend)');
    }

    async cleanupFailedTransactions() {
        console.log('[BackendDataService] Nettoyage transactions échouées (pas nécessaire avec Backend)');
        return 0;
    }

    public async getMetrics(filters: FilterOptions): Promise<MetricData> {
        try {
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
                chauffeurs: personnel
                    .filter(p => p.role === 'Chauffeur' && typeof p.email === 'string')
                    .map(p => ({
                        ...p,
                        email: p.email as string,
                        status: (p.status === 'Actif' || p.status === 'Inactif') ? p.status : 'Inactif'
                    })),
                totalCommandes: commandes.length,
                magasins: magasins
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des métriques:', error);
            throw error;
        }
    }

    public async addFactureToCommande(commande: CommandeMetier, facture: {
        id: string;
        numeroFacture: string;
        dateFacture: string;
        dateEcheance: string;
        montantHT: number;
        statut: 'En attente' | 'Payée';
    }): Promise<CommandeMetier> {
        try {
            const updatedCommande = {
                ...commande,
                financier: {
                    ...commande.financier,
                    factures: [...(commande.financier.factures || []), {
                        ...facture,
                        magasin: commande.magasin || null,
                        client: commande.client || null
                    }],
                }
            };
            return await this.updateCommande(updatedCommande);
        } catch (error) {
            console.error('Erreur addFactureToCommande:', error);
            throw error;
        }
    }

    public async addDevisToCommande(commande: CommandeMetier, devis: {
        id: string;
        numeroDevis: string;
        dateDevis: string;
        dateEcheance: string;
        montantHT: number;
        statut: 'En attente' | 'Accepté' | 'Refusé';
    }): Promise<CommandeMetier> {
        try {
            const updatedCommande = {
                ...commande,
                financier: {
                    ...commande.financier,
                    devis: [...(commande.financier.devis || []), {
                        ...devis,
                        magasin: commande.magasin || null,
                        client: commande.client || null
                    }]
                }
            };
            return await this.updateCommande(updatedCommande);
        } catch (error) {
            console.error('Erreur addDevisToCommande:', error);
            throw error;
        }
    }

    // ✅ MIGRATION IMAGES - Adapter pour Backend + Airtable sync
    async migrateCommandeImages(commande: CommandeMetier): Promise<CommandeMetier> {
        if (!this.isOnline) return commande;

        try {
            const cloudinaryService = new CloudinaryService();
            let hasUpdates = false;

            if (commande.articles?.photos && commande.articles.photos.length > 0) {
                const updatedPhotos = await Promise.all(
                    commande.articles.photos.map(async (photo) => {
                        const photoUrl = typeof photo === 'string' ? photo : photo.url;

                        if (cloudinaryService.isAirtableUrl(photoUrl)) {
                            try {
                                const result = await cloudinaryService.uploadFromUrl(photoUrl);
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

            // ✅ Mise à jour Backend + sync vers Airtable
            if (hasUpdates && this.isOnline) {
                const updatedCommande = await this.updateCommande({
                    id: commande.id,
                    articles: {
                        nombre: commande.articles?.nombre || 0,
                        photos: commande.articles?.photos
                    }
                });

                // TODO: Déclencher sync Backend → Airtable via votre système
                // await this.triggerAirtableSync(commande.id);

                return updatedCommande;
            }
            return commande;
        } catch (error) {
            console.error('Erreur lors de la migration des images:', error);
            return commande;
        }
    }

    async migrateAllCommandeImages(): Promise<void> {
        if (!this.isOnline) return;

        try {
            const commandes = await this.getCommandes();
            const cloudinaryService = new CloudinaryService();

            const commandesWithAirtableImages = commandes.filter(commande =>
                commande.articles?.photos?.some(photo => {
                    const photoUrl = typeof photo === 'string' ? photo : photo.url;
                    return cloudinaryService.isAirtableUrl(photoUrl);
                })
            );

            if (commandesWithAirtableImages.length > 0) {
                console.log(`Migration de ${commandesWithAirtableImages.length} commandes avec images Airtable`);

                const batchSize = 5;
                for (let i = 0; i < commandesWithAirtableImages.length; i += batchSize) {
                    const batch = commandesWithAirtableImages.slice(i, i + batchSize);
                    await Promise.all(batch.map(commande => this.migrateCommandeImages(commande)));

                    if (i + batchSize < commandesWithAirtableImages.length) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la migration automatique des images:', error);
        }
    }

    public async syncImagesToAirtable(commandeId: string): Promise<void> {
        try {
            if (!this.shouldMakeApiCall()) return;

            const commande = await this.getCommande(commandeId);
            if (!commande?.articles?.photos) return;

            // TODO: Utiliser votre système de sync existant
            if (commande.articles.photos.length === 0) {
                console.log(`Aucune image à synchroniser pour la commande ${commandeId}`);
                return;
            }
            // Logique de synchronisation vers Airtable
            console.log(`🔄 Déclenchement sync images vers Airtable pour commande ${commandeId}`);

            // Appel à votre service de synchronisation
            // await yourSyncService.syncCommandeImages(commandeId, commande.articles.photos);

        } catch (error) {
            console.error('Erreur sync images vers Airtable:', error);
        }
    }

    public async syncImagesFromAirtable(commandeId: string): Promise<CommandeMetier | null> {
        try {
            if (!this.shouldMakeApiCall()) return null;

            // TODO: Récupérer depuis votre sync Airtable
            console.log(`🔄 Récupération images depuis Airtable pour commande ${commandeId}`);

            // const airtableImages = await yourSyncService.getAirtableImages(commandeId);
            // const updatedCommande = await this.updateCommande({
            //     id: commandeId,
            //     articles: { photos: airtableImages }
            // });

            return null; // TODO: Retourner la commande mise à jour
        } catch (error) {
            console.error('Erreur sync images depuis Airtable:', error);
            return null;
        }
    }

    private markGlobalMigrationComplete(): void {
        console.log('Migration marquée comme terminée');
    }

    // ✅ MÉTHODES DE TEST ET DIAGNOSTIC
    private async testAirtableConnection(): Promise<boolean> {
        try {
            await apiService.get('/health');
            return true;
        } catch (error) {
            return false;
        }
    }

    private extractPostalCode(address: string): string | null {
        const match = address.match(/\b\d{5}\b/);
        return match ? match[0] : null;
    }

    private estimateDistanceByPostalCode(origin: string, destination: string): number {
        const originDept = origin.substring(0, 2);
        const destDept = destination.substring(0, 2);

        if (originDept === destDept) {
            return 15;
        } else if (Math.abs(parseInt(originDept) - parseInt(destDept)) <= 1) {
            return 30;
        } else {
            return 45;
        }
    }

    // ✅ MÉTHODES DE STATUS POUR COMPATIBILITÉ
    getStatus() {
        return {
            source: 'backend_api',
            apiAvailable: this.isNetworkOnline,
            hasLocal: false
        };
    }
}