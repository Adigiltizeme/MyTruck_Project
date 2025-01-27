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
                version: 1,
                stores: {
                    drafts: '++id,timestamp,status',
                    photos: '++id,draftId',
                    metadata: 'key'
                }
            };

            this.db = new Dexie(dbConfig.name);
            this.db.version(dbConfig.version).stores(dbConfig.stores);

            this.db.open().catch((error: Error) => {
                console.error('Erreur lors de l\'initialisation de la base de données:', error);
            });

        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la base de données:', error);
        }
    }

    async saveDraft(data: Partial<CommandeMetier>): Promise<DraftStorageResult> {
        try {
            const draftData: DraftData = {
                data,
                timestamp: Date.now(),
                lastModified: new Date().toISOString(),
                status: DraftStatus.PENDING,
                version: '1.0'
            };

            const id = await this.db.table('drafts').add(draftData);

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

    async loadDraft(): Promise<DraftStorageResult> {
        try {
            const draft = await this.db.table('drafts')
                .orderBy('timestamp')
                .last();

            if (!draft) {
                return {
                    success: false,
                    message: 'Aucun brouillon trouvé'
                };
            }

            return {
                success: true,
                data: draft
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                message: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }

    async clearDraft(): Promise<DraftStorageResult> {
        try {
            await this.db.table('drafts').clear();
            return {
                success: true,
                message: 'Brouillon(s) supprimé(s)'
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                message: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }
}