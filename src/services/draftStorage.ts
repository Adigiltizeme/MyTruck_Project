// import Dexie from 'dexie';
// import {
//     DraftStorageConfig,
//     DraftData,
//     DraftStatus,
//     DraftStorageResult,
//     DraftStorageEvent,
//     IDraftStorage,
//     SaveDraftOptions,
//     PhotoMetadata,
//     DatabaseConfig
// } from '../types/draft.types';
// import { CommandeMetier } from '../types/business.types';

import Dexie from "dexie";
import { CommandeMetier } from "../types/business.types";
import { DatabaseConfig, DraftData, DraftStatus, DraftStorageConfig, DraftStorageResult } from "../types/draft.types";

// export class DraftStorageService implements IDraftStorage {
//     private db!: Dexie;
//     private config: DraftStorageConfig;
//     private subscribers: Set<(event: DraftStorageEvent) => void>;
//     private autoSaveTimeout: NodeJS.Timeout | null = null;

//     constructor(config: Partial<DraftStorageConfig> = {}) {
//         this.config = {
//             maxDrafts: 5,
//             autoSaveInterval: 2000,
//             compressionQuality: 0.8,
//             ...config
//         };
//         this.subscribers = new Set();
//         this.initDatabase();
//     }

//     private initDatabase(): void {
//         try {
//             const dbConfig: DatabaseConfig = {
//                 name: 'MyTruckDrafts',
//                 version: 1,
//                 stores: {
//                     drafts: '++id,timestamp,status',
//                     photos: '++id,draftId',
//                     metadata: 'key'
//                 }
//             };

//             this.db = new Dexie(dbConfig.name);
//             this.db.version(dbConfig.version).stores(dbConfig.stores);

//             // Gestionnaire d'erreurs Dexie
//             this.db.open().catch((error: Error) => {
//                 this.emitEvent({
//                     type: 'error',
//                     timestamp: Date.now(),
//                     details: {
//                         action: 'database_error',
//                         status: DraftStatus.FAILED,
//                         error: error.message
//                     }
//                 });
//             });

//         } catch (error) {
//             console.error('Erreur lors de l\'initialisation de la base de données:', error);
//             this.emitEvent({
//                 type: 'error',
//                 timestamp: Date.now(),
//                 details: {
//                     action: 'init_database',
//                     status: DraftStatus.FAILED,
//                     error: error instanceof Error ? error.message : 'Erreur inconnue'
//                 }
//             });
//         }
//     }

//     private emitEvent(event: DraftStorageEvent): void {
//         this.subscribers.forEach(callback => {
//             try {
//                 callback(event);
//             } catch (error) {
//                 console.error('Erreur lors de l\'émission de l\'événement:', error);
//             }
//         });
//     }

//     async saveDraft(
//         data: Partial<CommandeMetier>,
//         options: SaveDraftOptions = {}
//     ): Promise<DraftStorageResult> {
//         try {
//             // Annuler la sauvegarde automatique précédente
//             if (this.autoSaveTimeout) {
//                 clearTimeout(this.autoSaveTimeout);
//             }

//             // Préparation des données
//             const draftData: DraftData = {
//                 data,
//                 timestamp: Date.now(),
//                 lastModified: new Date().toISOString(),
//                 status: DraftStatus.PENDING,
//                 version: '1.0'
//             };

//             // Traitement des photos si nécessaire
//             if (options.compress && data.articles?.photos) {
//                 const compressedPhotos = await this.compressPhotos(
//                     data.articles.photos.map(photo => ({
//                         url: photo.url,
//                         file: photo.file
//                     }))
//                 );
//                 draftData.data.articles = {
//                     ...data.articles,
//                     photos: compressedPhotos
//                 };
//             }

//             // Nettoyage des anciens brouillons si nécessaire
//             const count = await this.db.table('drafts').count();
//             if (count >= this.config.maxDrafts) {
//                 await this.cleanupOldDrafts();
//             }

//             // Sauvegarde
//             const id = await this.db.table('drafts').add(draftData);

//             // Mise à jour du statut
//             await this.db.table('drafts').update(id, { status: DraftStatus.SAVED });

//             this.emitEvent({
//                 type: 'save',
//                 timestamp: Date.now(),
//                 details: {
//                     action: 'save_draft',
//                     status: DraftStatus.SAVED,
//                     draftId: id as number
//                 }
//             });

//             return {
//                 success: true,
//                 data: { ...draftData, id: id as number }
//             };
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
//             this.emitEvent({
//                 type: 'error',
//                 timestamp: Date.now(),
//                 details: {
//                     action: 'save_draft',
//                     status: DraftStatus.FAILED,
//                     error: errorMessage
//                 }
//             });

//             return {
//                 success: false,
//                 error: error as Error,
//                 message: errorMessage
//             };
//         }
//     }

//     async loadDraft(id?: number): Promise<DraftStorageResult> {
//         try {
//             let draft: DraftData | undefined;

//             if (id) {
//                 draft = await this.db.table('drafts').get(id);
//             } else {
//                 // Charger le brouillon le plus récent
//                 draft = await this.db.table('drafts')
//                     .orderBy('timestamp')
//                     .reverse()
//                     .first();
//             }

//             if (!draft) {
//                 return {
//                     success: false,
//                     message: 'Aucun brouillon trouvé'
//                 };
//             }

//             this.emitEvent({
//                 type: 'load',
//                 timestamp: Date.now(),
//                 details: {
//                     action: 'load_draft',
//                     status: draft.status,
//                     draftId: draft.id
//                 }
//             });

//             return {
//                 success: true,
//                 data: draft
//             };
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
//             return {
//                 success: false,
//                 error: error as Error,
//                 message: errorMessage
//             };
//         }
//     }

//     async clearDraft(id?: number): Promise<DraftStorageResult> {
//         try {
//             if (id) {
//                 await this.db.table('drafts').delete(id);
//             } else {
//                 await this.db.table('drafts').clear();
//             }

//             this.emitEvent({
//                 type: 'clear',
//                 timestamp: Date.now(),
//                 details: {
//                     action: 'clear_draft',
//                     status: DraftStatus.ACTIVE,
//                     draftId: id
//                 }
//             });

//             return {
//                 success: true,
//                 message: 'Brouillon(s) supprimé(s) avec succès'
//             };
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
//             return {
//                 success: false,
//                 error: error as Error,
//                 message: errorMessage
//             };
//         }
//     }

//     async listDrafts(): Promise<DraftData[]> {
//         return this.db.table('drafts')
//             .orderBy('timestamp')
//             .reverse()
//             .toArray();
//     }

//     async getDraftCount(): Promise<number> {
//         return this.db.table('drafts').count();
//     }

//     async cleanupOldDrafts(maxAge?: number): Promise<void> {
//         const cutoffTime = maxAge
//             ? Date.now() - maxAge
//             : Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 jours par défaut

//         await this.db.table('drafts')
//             .where('timestamp')
//             .below(cutoffTime)
//             .delete();
//     }

//     subscribeToDraftChanges(callback: (event: DraftStorageEvent) => void): () => void {
//         this.subscribers.add(callback);
//         return () => {
//             this.subscribers.delete(callback);
//         };
//     }

//     private async compressPhotos(photos: Array<{ url: string; file: File | undefined }>): Promise<Array<{ url: string; file: File; metadata: PhotoMetadata }>> {
//         const validPhotos = photos.filter((photo): photo is { url: string; file: File } => {
//             return photo.file !== undefined;
//         });
//         const compressImage = async (photo: { url: string; file: File }): Promise<{ url: string; file: File; metadata: PhotoMetadata }> => {
//             const file = photo.file;
//             // Création d'une image pour la compression
//             const img = new Image();
//             const canvas = document.createElement('canvas');
//             const ctx = canvas.getContext('2d')!;

//             // Chargement de l'image
//             await new Promise((resolve, reject) => {
//                 img.onload = resolve;
//                 img.onerror = reject;
//                 img.src = URL.createObjectURL(file);
//             });

//             // Calcul des dimensions
//             let width = img.width;
//             let height = img.height;
//             const maxDimension = 1920; // Maximum dimension

//             if (width > maxDimension || height > maxDimension) {
//                 if (width > height) {
//                     height = (height / width) * maxDimension;
//                     width = maxDimension;
//                 } else {
//                     width = (width / height) * maxDimension;
//                     height = maxDimension;
//                 }
//             }

//             // Configuration du canvas
//             canvas.width = width;
//             canvas.height = height;
//             ctx.drawImage(img, 0, 0, width, height);

//             // Conversion en blob
//             const blob = await new Promise<Blob>((resolve) => {
//                 canvas.toBlob(
//                     (blob) => resolve(blob!),
//                     file.type,
//                     this.config.compressionQuality
//                 );
//             });

//             // Création du nouveau fichier
//             const compressedFile = new File([blob], file.name, {
//                 type: file.type,
//                 lastModified: Date.now()
//             });

//             // Métadonnées
//             const metadata: PhotoMetadata = {
//                 id: Math.random().toString(36).substr(2, 9),
//                 fileName: file.name,
//                 fileSize: compressedFile.size,
//                 mimeType: file.type,
//                 dimensions: { width, height },
//                 lastModified: Date.now(),
//                 compressed: true
//             };

//             return {
//                 url: URL.createObjectURL(compressedFile),
//                 file: compressedFile,
//                 metadata
//             };
//         };

//         return Promise.all(validPhotos.map(photo => compressImage(photo)));
//     }
// }

export class DraftStorageService {
    private db!: Dexie;
    private config: DraftStorageConfig;

    constructor(config: Partial<DraftStorageConfig> = {}) {
        this.config = {
            maxDrafts: 5,
            autoSaveInterval: 2000,
            compressionQuality: 0.8,
            ...config
        };
        this.initDatabase();
    }

    private initDatabase(): void {
        try {
            const dbConfig: DatabaseConfig = {
                name: 'MyTruckDrafts',
                version: 2,
                stores: {
                    drafts: '++id,timestamp,status,storeId',
                    photos: '++id,draftId',
                    metadata: 'key'
                }
            };

            this.db = new Dexie(dbConfig.name);
            this.db.version(dbConfig.version).stores(dbConfig.stores);

            // Migration des anciennes données si nécessaire
            this.db.version(1).stores({
                drafts: '++id,timestamp,status',
                photos: '++id,draftId',
                metadata: 'key'
            });

            this.db.open().catch((error: Error) => {
                console.error('Erreur lors de l\'initialisation de la base de données:', error);
            });

        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la base de données:', error);
        }
    }

    async saveDraft(data: Partial<CommandeMetier>, storeId?: string): Promise<DraftStorageResult> {
        try {
            const currentStoreId = storeId || this.getCurrentStoreId();

            // IMPORTANT: S'assurer que l'ID du magasin dans les données correspond au storeId externe
            // ET que les dimensions des articles sont préservées
            const dataWithSyncedMagasinId = {
                ...data,
                magasin: {
                    ...(data.magasin || {}),
                    id: currentStoreId // Synchroniser l'ID interne avec l'ID externe
                },
                articles: {
                    ...(data.articles || {}),
                    dimensions: data.articles?.dimensions || []
                }
            };

            console.log(`Sauvegarde du brouillon pour le magasin ${currentStoreId}, 
                        en synchronisant magasin.id=${dataWithSyncedMagasinId.magasin.id},
                        avec ${dataWithSyncedMagasinId.articles.dimensions?.length} dimensions d'articles`);

            // Vérifier s'il existe déjà un brouillon pour ce magasin
            const existingDraft = await this.db.table('drafts')
                .where('storeId')
                .equals(currentStoreId)
                .first();

            const draftData: DraftData = {
                data: {
                    ...dataWithSyncedMagasinId,
                    magasin: {
                        ...dataWithSyncedMagasinId.magasin,
                        name: dataWithSyncedMagasinId.magasin?.name || 'Default Name', // Ensure name is a valid string
                        address: dataWithSyncedMagasinId.magasin?.address || '', // Ensure address is a valid string
                        phone: dataWithSyncedMagasinId.magasin?.phone || '', // Ensure phone is a valid string
                        status: dataWithSyncedMagasinId.magasin?.status || '' // Ensure status is a valid string
                    },
                    articles: {
                        ...dataWithSyncedMagasinId.articles,
                        nombre: dataWithSyncedMagasinId.articles?.nombre || 0,
                        dimensions: dataWithSyncedMagasinId.articles?.dimensions || []
                    }
                }, // Utiliser les données avec ID synchronisé
                timestamp: Date.now(),
                lastModified: new Date().toISOString(),
                status: DraftStatus.PENDING,
                version: '1.0',
                storeId: currentStoreId
            };

            let id: number;

            if (existingDraft) {
                // Mettre à jour le brouillon existant
                id = existingDraft.id;
                await this.db.table('drafts').update(id, draftData);
            } else {
                // Créer un nouveau brouillon
                id = await this.db.table('drafts').add(draftData) as number;
            }

            return {
                success: true,
                data: { ...draftData, id: id as number }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                message: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }

    /**
 * Charge un brouillon pour le magasin spécifié.
 * Si storeId n'est pas fourni, utilise le magasin actuel.
 */
    async loadDraft(storeId?: string): Promise<DraftStorageResult> {
        try {
            const isDevelopment = process.env.NODE_ENV === 'development' ||
                window.location.hostname === 'localhost';

            const currentStoreId = storeId || this.getCurrentStoreId();
            console.log(`Chargement du brouillon pour le magasin: ${currentStoreId}`);

            // Rechercher le brouillon approprié
            let draft = await this.db.table('drafts')
                .where('storeId')
                .equals(currentStoreId)
                .first();

            if (draft) {
                // Vérifier et corriger la date de livraison si elle est dans le passé
                const livraisonDate = draft.data?.dates?.livraison ?
                    new Date(draft.data.dates.livraison) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (livraisonDate && livraisonDate < today) {
                    console.log(`Date de livraison dans le passé détectée: ${livraisonDate.toLocaleDateString()}`);

                    // Calculer une nouvelle date (lendemain)
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    // Mettre à jour la date dans le brouillon
                    if (draft.data && draft.data.dates) {
                        draft.data.dates.livraison = tomorrow.toISOString().split('T')[0];
                        // Ne pas enregistrer automatiquement la modification
                        // L'utilisateur sera informé lors de la restauration
                    }
                }
                
                // TRÈS IMPORTANT: S'assurer que le magasin.id dans les données correspond au storeId externe
                if (draft.data && draft.data.magasin) {
                    if (draft.data.magasin.id !== currentStoreId) {
                        console.log(`Correction automatique: magasin.id dans les données 
                                    (${draft.data.magasin.id}) ne correspond pas au storeId externe 
                                    (${currentStoreId})`);

                        // Mettre à jour l'ID interne
                        draft.data.magasin.id = currentStoreId;

                        // Sauvegarder la correction
                        await this.db.table('drafts').update(draft.id, draft);
                    }
                }

                console.log(`Brouillon chargé pour le magasin ${currentStoreId} avec magasin.id synchronisé`);
                return {
                    success: true,
                    data: draft
                };
            }

            // Si nous sommes en développement et qu'aucun brouillon n'a été trouvé,
            // nous pouvons être plus permissifs
            if (isDevelopment) {
                // Prendre n'importe quel brouillon et l'adapter
                draft = await this.db.table('drafts')
                    .orderBy('timestamp')
                    .reverse()
                    .first();

                if (draft) {
                    console.log(`Mode développement: adaptation d'un brouillon existant au magasin ${currentStoreId}`);

                    // Mettre à jour le storeId externe
                    draft.storeId = currentStoreId;

                    // Mettre à jour le magasin.id interne
                    if (draft.data && draft.data.magasin) {
                        draft.data.magasin.id = currentStoreId;
                    } else if (draft.data) {
                        draft.data.magasin = { id: currentStoreId };
                    }

                    // Sauvegarder les modifications
                    await this.db.table('drafts').update(draft.id, draft);

                    return {
                        success: true,
                        data: draft
                    };
                }
            }

            return {
                success: false,
                message: 'Aucun brouillon trouvé'
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                message: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }

    async clearDraft(storeId?: string): Promise<DraftStorageResult> {
        try {
            const currentStoreId = storeId || this.getCurrentStoreId();
            console.log(`Suppression du brouillon pour le magasin: ${currentStoreId}`);

            // Trouver et supprimer le brouillon spécifique à ce magasin
            const draft = await this.db.table('drafts')
                .where('storeId')
                .equals(currentStoreId)
                .first();

            if (draft) {
                await this.db.table('drafts').delete(draft.id);
                console.log(`Brouillon supprimé pour le magasin ${currentStoreId}`);
            } else {
                console.log(`Aucun brouillon à supprimer pour le magasin ${currentStoreId}`);
            }

            return {
                success: true,
                message: 'Brouillon supprimé avec succès'
            };
        } catch (error) {
            console.error('Erreur clearDraft:', error);
            return {
                success: false,
                error: error as Error,
                message: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }

    /**
     * Récupère l'ID du magasin actuel depuis le localStorage
     */
    private getCurrentStoreId(): string {
        try {
            const userString = localStorage.getItem('user');
            if (userString) {
                const user = JSON.parse(userString);
                if (user.role === 'magasin' && user.storeId) {
                    return user.storeId;
                }
            }

            // Si le localStorage n'a pas l'info, essayer le contexte du store
            const storeInfoString = localStorage.getItem('currentStoreInfo');
            if (storeInfoString) {
                const storeInfo = JSON.parse(storeInfoString);
                if (storeInfo.id) {
                    return storeInfo.id;
                }
            }

            return 'unknown_store'; // Valeur par défaut si aucun magasin n'est identifié
        } catch (error) {
            console.error('Erreur lors de la récupération du storeId:', error);
            return 'unknown_store';
        }
    }
}