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
                version: 3,
                stores: {
                    drafts: '++id,timestamp,status,storeId',
                    photos: '++id,draftId',
                    metadata: 'key'
                }
            };

            this.db = new Dexie(dbConfig.name);

            // Version actuelle avec isolation par magasin
            this.db.version(3).stores(dbConfig.stores).upgrade(async tx => {
                console.log("[MIGRATION] Nettoyage des brouillons lors de la migration vers v3");
                // Nettoyer tous les anciens brouillons lors de la migration
                await tx.table('drafts').clear();
            });

            // Migration des anciennes données si nécessaire
            this.db.version(2).stores({
                drafts: '++id,timestamp,status',
                photos: '++id,draftId',
                metadata: 'key'
            });

            // Versions précédentes pour compatibilité
            this.db.version(2).stores({
                drafts: '++id,timestamp,status,storeId',
                photos: '++id,draftId',
                metadata: 'key'
            });

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

            // ========== VALIDATION DE SÉCURITÉ STRICTE ==========
            if (!currentStoreId || currentStoreId === 'unknown_store') {
                console.error("[SÉCURITÉ] Tentative de sauvegarde sans storeId valide");
                return { success: false, error: new Error("StoreId invalide") };
            }

            // SÉCURITÉ: Vérifier que les données correspondent au bon magasin
            // Priorité à storeId fourni en paramètre (plus fiable)
            const finalStoreId = storeId || currentStoreId;

            if (data.magasin?.id && data.magasin.id !== finalStoreId) {
                // En production, être plus flexible et corriger automatiquement
                // En développement, être strict pour détecter les problèmes
                const isDevelopment = process.env.NODE_ENV === 'development' ||
                    window.location.hostname === 'localhost';

                if (!isDevelopment) {
                    console.warn(`[SÉCURITÉ] Correction automatique en production: ${data.magasin.id} → ${finalStoreId}`);
                    // Corriger automatiquement l'ID du magasin au lieu de rejeter
                } else {
                    console.warn(`[SÉCURITÉ] Correction automatique en dev: ${data.magasin.id} → ${finalStoreId}`);
                    // En dev aussi, corriger au lieu de rejeter maintenant que le hook ne fait plus la vérification
                }
            }

            // IMPORTANT: S'assurer que l'ID du magasin dans les données correspond au storeId externe
            // ET que les dimensions des articles sont préservées
            const dataWithCompleteInfo = {
                ...data,
                magasin: {
                    ...(data.magasin || {}),
                    id: finalStoreId,
                    name: (data.magasin && typeof data.magasin.name === 'string') ? data.magasin.name : '',
                    address: (data.magasin && typeof data.magasin.address === 'string') ? data.magasin.address : '',
                    phone: (data.magasin && typeof data.magasin.phone === 'string') ? data.magasin.phone : '',
                    email: (data.magasin && typeof data.magasin.email === 'string') ? data.magasin.email : '',
                    photo: (data.magasin && typeof data.magasin.photo === 'string') ? data.magasin.photo : '',
                    status: (data.magasin && typeof data.magasin.status === 'string') ? data.magasin.status : '',
                    manager: (data.magasin && typeof data.magasin.manager === 'string') ? data.magasin.manager : ''
                },
                articles: {
                    ...(data.articles || {}),
                    dimensions: data.articles?.dimensions || [],
                    nombre: typeof data.articles?.nombre === 'number' ? data.articles.nombre : 0 // Ensure nombre is always a number
                },
                livraison: {
                    ...(data.livraison || {}),
                    // Préserver les détails de livraison (incluant canBeTilted)
                    details: data.livraison?.details || {},
                    creneau: data.livraison?.creneau ?? '',
                    vehicule: data.livraison?.vehicule || '',
                    equipiers: typeof data.livraison?.equipiers === 'number' ? data.livraison.equipiers : 0,
                    reserve: typeof data.livraison?.reserve === 'boolean' ? data.livraison.reserve : false
                }
            };

            console.log(`Sauvegarde du brouillon pour le magasin ${finalStoreId},
                        en synchronisant magasin.id=${dataWithCompleteInfo.magasin.id},
                        avec ${dataWithCompleteInfo.articles.dimensions?.length} dimensions d'articles`);
            // console.log(`Sauvegarde brouillon - Véhicule: ${dataWithCompleteInfo.livraison.vehicule}, Détails: ${dataWithCompleteInfo.livraison.details}`);

            // Vérifier s'il existe déjà un brouillon pour ce magasin
            const existingDraft = await this.db.table('drafts')
                .where('storeId')
                .equals(finalStoreId)
                .first();

            console.log(` [SÉCURITÉ] Sauvegarde complète du brouillon pour le magasin ${finalStoreId}`);
            console.log(`- Dimensions: ${dataWithCompleteInfo.articles.dimensions?.length || 0}`);
            console.log(`- Véhicule: ${dataWithCompleteInfo.livraison?.vehicule || 'non défini'}`);
            console.log(`- Détails livraison: ${dataWithCompleteInfo.livraison?.details || 'non défini'}`);

            const draftData: DraftData = {
                data: dataWithCompleteInfo as Partial<CommandeMetier>,
                timestamp: Date.now(),
                lastModified: new Date().toISOString(),
                status: DraftStatus.PENDING,
                version: '1.0',
                storeId: finalStoreId
            };

            let id: number;

            if (existingDraft) {
                // DOUBLE VÉRIFICATION avant mise à jour
                if (existingDraft.storeId !== finalStoreId) {
                    console.error(`[SÉCURITÉ] VIOLATION: Tentative de mise à jour du brouillon ${existingDraft.storeId} pour ${finalStoreId}`);
                    return { success: false, error: new Error("Violation de sécurité lors de la mise à jour") };
                }

                // Mettre à jour le brouillon existant
                id = existingDraft.id;
                await this.db.table('drafts').update(id, draftData);
                console.log(`[SÉCURITÉ] Brouillon mis à jour pour ${finalStoreId}, ID: ${id}`);
            } else {
                // Créer un nouveau brouillon
                id = await this.db.table('drafts').add(draftData) as number;
                console.log(`[SÉCURITÉ] Nouveau brouillon créé pour ${finalStoreId}, ID: ${id}`);
            }

            return {
                success: true,
                data: { ...draftData, id: id as number }
            };
        } catch (error) {
            console.error("[SÉCURITÉ] Erreur lors de la sauvegarde:", error);
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
    // async loadDraft(storeId?: string): Promise<DraftStorageResult> {
    //     try {
    //         const isDevelopment = process.env.NODE_ENV === 'development' ||
    //             window.location.hostname === 'localhost';

    //         const currentStoreId = storeId || this.getCurrentStoreId();
    //         console.log(`Chargement du brouillon pour le magasin: ${currentStoreId}`);

    //         // Rechercher le brouillon approprié
    //         let draft = await this.db.table('drafts')
    //             .where('storeId')
    //             .equals(currentStoreId)
    //             .first();

    //         if (draft) {
    //             // Vérifier et corriger la date de livraison si elle est dans le passé
    //             const livraisonDate = draft.data?.dates?.livraison ?
    //                 new Date(draft.data.dates.livraison) : null;
    //             const today = new Date();
    //             today.setHours(0, 0, 0, 0);

    //             if (livraisonDate && livraisonDate < today) {
    //                 console.log(`Date de livraison dans le passé détectée: ${livraisonDate.toLocaleDateString()}`);

    //                 // Calculer une nouvelle date (lendemain)
    //                 const tomorrow = new Date();
    //                 tomorrow.setDate(tomorrow.getDate() + 1);

    //                 // Mettre à jour la date dans le brouillon
    //                 if (draft.data && draft.data.dates) {
    //                     draft.data.dates.livraison = tomorrow.toISOString().split('T')[0];
    //                     // Ne pas enregistrer automatiquement la modification
    //                     // L'utilisateur sera informé lors de la restauration
    //                 }
    //             }

    //             // TRÈS IMPORTANT: S'assurer que le magasin.id dans les données correspond au storeId externe
    //             if (draft.data && draft.data.magasin) {
    //                 if (draft.data.magasin.id !== currentStoreId) {
    //                     console.log(`Correction automatique: magasin.id dans les données 
    //                                 (${draft.data.magasin.id}) ne correspond pas au storeId externe 
    //                                 (${currentStoreId})`);

    //                     // Mettre à jour l'ID interne
    //                     draft.data.magasin.id = currentStoreId;

    //                     // Sauvegarder la correction
    //                     await this.db.table('drafts').update(draft.id, draft);
    //                 }
    //             }

    //             console.log(`Brouillon chargé pour le magasin ${currentStoreId} avec magasin.id synchronisé`);
    //             return {
    //                 success: true,
    //                 data: draft
    //             };
    //         }

    //         // Si nous sommes en développement et qu'aucun brouillon n'a été trouvé,
    //         // nous pouvons être plus permissifs
    //         if (isDevelopment) {
    //             // Prendre n'importe quel brouillon et l'adapter
    //             draft = await this.db.table('drafts')
    //                 .orderBy('timestamp')
    //                 .reverse()
    //                 .first();

    //             if (draft) {
    //                 console.log(`Mode développement: adaptation d'un brouillon existant au magasin ${currentStoreId}`);

    //                 // Mettre à jour le storeId externe
    //                 draft.storeId = currentStoreId;

    //                 // Mettre à jour le magasin.id interne
    //                 if (draft.data && draft.data.magasin) {
    //                     draft.data.magasin.id = currentStoreId;
    //                 } else if (draft.data) {
    //                     draft.data.magasin = { id: currentStoreId };
    //                 }

    //                 // Sauvegarder les modifications
    //                 await this.db.table('drafts').update(draft.id, draft);

    //                 return {
    //                     success: true,
    //                     data: draft
    //                 };
    //             }
    //         }

    //         return {
    //             success: false,
    //             message: 'Aucun brouillon trouvé'
    //         };
    //     } catch (error) {
    //         return {
    //             success: false,
    //             error: error as Error,
    //             message: error instanceof Error ? error.message : 'Erreur inconnue'
    //         };
    //     }
    // }
    async loadDraft(storeId: string): Promise<DraftStorageResult> {
        try {
            // ========== VALIDATION DE SÉCURITÉ STRICTE ==========
            if (!storeId || storeId === 'unknown_store') {
                console.error("[SÉCURITÉ] Tentative de chargement sans storeId valide");
                return { success: false, error: new Error("StoreId invalide") };
            }

            console.log(`[SÉCURITÉ] Chargement du brouillon pour le magasin: ${storeId}`);

            // DIAGNOSTIC : Lister TOUS les brouillons en base
            const allDrafts = await this.db.table('drafts').toArray();
            console.log(`[DIAGNOSTIC] ${allDrafts.length} brouillons en base:`, allDrafts.map(d => ({
                id: d.id,
                storeId: d.storeId,
                magasinId: d.data?.magasin?.id,
                timestamp: new Date(d.timestamp).toLocaleString()
            })));

            const draft = await this.db.table('drafts')
                .where('storeId')
                .equals(storeId) // STRICTEMENT égal au storeId demandé
                .first();


            if (draft) {
                // DOUBLE VÉRIFICATION de sécurité
                if (draft.storeId !== storeId) {
                    console.error(`[SÉCURITÉ] VIOLATION CRITIQUE: Brouillon ${draft.storeId} retourné pour ${storeId}`);
                    return {
                        success: false,
                        error: new Error("Violation de sécurité dans le chargement")
                    };
                }

                // TRIPLE VÉRIFICATION sur les données
                if (draft.data?.magasin?.id && draft.data.magasin.id !== storeId) {
                    console.error(`[SÉCURITÉ] VIOLATION CRITIQUE: Données magasin ${draft.data.magasin.id} pour ${storeId}`);
                    return {
                        success: false,
                        error: new Error("Violation de sécurité dans les données")
                    };
                }

                // Vérifier et corriger la date de livraison si elle est dans le passé
                const livraisonDate = draft.data?.dates?.livraison ?
                    new Date(draft.data.dates.livraison) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (livraisonDate && livraisonDate < today) {
                    console.log(`[CORRECTION] Date de livraison dans le passé détectée: ${livraisonDate.toLocaleDateString()}`);

                    // Calculer une nouvelle date (lendemain)
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    // Mettre à jour la date dans le brouillon
                    if (draft.data && draft.data.dates) {
                        draft.data.dates.livraison = tomorrow.toISOString().split('T')[0];

                        // Sauvegarder la correction
                        await this.db.table('drafts').update(draft.id, draft);
                        console.log(`[CORRECTION] Date de livraison mise à jour au ${tomorrow.toLocaleDateString()}`);
                    }
                }

                console.log(`[SÉCURITÉ] Brouillon chargé pour le magasin ${storeId} avec magasin.id synchronisé`);

                return {
                    success: true,
                    data: draft
                };
            } else {
                console.log(`[SÉCURITÉ] Aucun brouillon trouvé pour le magasin ${storeId}`);
                return {
                    success: true,
                    data: undefined
                };
            }
        } catch (error) {
            console.error(`[SÉCURITÉ] Erreur lors du chargement du brouillon pour ${storeId}:`, error);
            return {
                success: false,
                error: error as Error
            };
        }
    }

    async clearDraft(storeId?: string): Promise<DraftStorageResult> {
        try {
            if (storeId) {
                // ========== SUPPRESSION SÉCURISÉE PAR MAGASIN ==========
                console.log(`[SÉCURITÉ] Suppression du brouillon pour le magasin: ${storeId}`);

                // Trouver et supprimer le brouillon spécifique à ce magasin
                const draft = await this.db.table('drafts')
                    .where('storeId')
                    .equals(storeId)
                    .first();

                if (draft) {
                    // DOUBLE VÉRIFICATION avant suppression
                    if (draft.storeId !== storeId) {
                        console.error(`[SÉCURITÉ] VIOLATION: Tentative de suppression du brouillon ${draft.storeId} pour ${storeId}`);
                        return { success: false, error: new Error("Violation de sécurité lors de la suppression") };
                    }

                    await this.db.table('drafts').delete(draft.id);
                    console.log(`[SÉCURITÉ] Brouillon supprimé pour le magasin ${storeId}, ID: ${draft.id}`);
                } else {
                    console.log(`[SÉCURITÉ] Aucun brouillon à supprimer pour le magasin ${storeId}`);
                }
            } else {
                // ========== SUPPRESSION GLOBALE (NETTOYAGE FORCÉ) ==========
                console.log("[NETTOYAGE FORCÉ] Suppression de tous les brouillons");
                const allDrafts = await this.db.table('drafts').toArray();

                console.log(`[NETTOYAGE FORCÉ] ${allDrafts.length} brouillons trouvés pour suppression`);

                await this.db.table('drafts').clear();
                console.log("[NETTOYAGE FORCÉ] Tous les brouillons supprimés");
            }

            return {
                success: true,
                message: 'Brouillon(s) supprimé(s) avec succès'
            };
        } catch (error) {
            console.error('[ERREUR] Erreur clearDraft:', error);
            return {
                success: false,
                error: error as Error,
                message: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }

    // ========== FONCTION DE NETTOYAGE ET MAINTENANCE ==========
    async cleanupOrphanedDrafts(): Promise<DraftStorageResult> {
        try {
            console.log("[MAINTENANCE] Début du nettoyage des brouillons orphelins");

            const allDrafts = await this.db.table('drafts').toArray();
            let cleanedCount = 0;

            for (const draft of allDrafts) {
                // Supprimer les brouillons sans storeId valide
                if (!draft.storeId || draft.storeId === 'unknown_store') {
                    await this.db.table('drafts').delete(draft.id);
                    cleanedCount++;
                    console.log(`[MAINTENANCE] Brouillon orphelin supprimé, ID: ${draft.id}`);
                }

                // Supprimer les brouillons avec des données incohérentes
                if (draft.data?.magasin?.id && draft.data.magasin.id !== draft.storeId) {
                    await this.db.table('drafts').delete(draft.id);
                    cleanedCount++;
                    console.log(`[MAINTENANCE] Brouillon incohérent supprimé, ID: ${draft.id}`);
                }

                // Supprimer les brouillons trop anciens (plus de 30 jours)
                const isOld = (Date.now() - draft.timestamp) > (30 * 24 * 60 * 60 * 1000);
                if (isOld) {
                    await this.db.table('drafts').delete(draft.id);
                    cleanedCount++;
                    console.log(`[MAINTENANCE] Brouillon ancien supprimé, ID: ${draft.id}`);
                }
            }

            console.log(`[MAINTENANCE] Nettoyage terminé, ${cleanedCount} brouillons supprimés`);

            return {
                success: true,
                message: `${cleanedCount} brouillons nettoyés`
            };
        } catch (error) {
            console.error("[MAINTENANCE] Erreur lors du nettoyage:", error);
            return {
                success: false,
                error: error as Error
            };
        }
    }

    // ========== FONCTION DE DIAGNOSTIC ==========
    async getDiagnosticInfo(): Promise<{
        totalDrafts: number;
        draftsByStore: Record<string, number>;
        orphanedDrafts: number;
        inconsistentDrafts: number;
    }> {
        try {
            const allDrafts = await this.db.table('drafts').toArray();

            const diagnosticInfo = {
                totalDrafts: allDrafts.length,
                draftsByStore: {} as Record<string, number>,
                orphanedDrafts: 0,
                inconsistentDrafts: 0
            };

            for (const draft of allDrafts) {
                // Compter par magasin
                if (draft.storeId) {
                    diagnosticInfo.draftsByStore[draft.storeId] =
                        (diagnosticInfo.draftsByStore[draft.storeId] || 0) + 1;
                } else {
                    diagnosticInfo.orphanedDrafts++;
                }

                // Détecter les incohérences
                if (draft.data?.magasin?.id && draft.data.magasin.id !== draft.storeId) {
                    diagnosticInfo.inconsistentDrafts++;
                }
            }

            return diagnosticInfo;
        } catch (error) {
            console.error("[DIAGNOSTIC] Erreur:", error);
            return {
                totalDrafts: 0,
                draftsByStore: {},
                orphanedDrafts: 0,
                inconsistentDrafts: 0
            };
        }
    }

    /**
     * Récupère l'ID du magasin actuel depuis le localStorage
     */
    private getCurrentStoreId(): string {
        try {
            console.log("[DEBUG] getCurrentStoreId - Recherche dans localStorage...");

            // 1. Essayer d'abord depuis l'objet user
            const userString = localStorage.getItem('user');
            if (userString) {
                const user = JSON.parse(userString);
                console.log("[DEBUG] getCurrentStoreId - user trouvé:", { role: user.role, storeId: user.storeId });
                if (user.role === 'magasin' && user.storeId) {
                    console.log("[DEBUG] getCurrentStoreId - Retourne depuis user:", user.storeId);
                    return user.storeId;
                }
            }

            // 2. Essayer depuis le contexte du store
            const storeInfoString = localStorage.getItem('currentStoreInfo');
            if (storeInfoString) {
                const storeInfo = JSON.parse(storeInfoString);
                console.log("[DEBUG] getCurrentStoreId - currentStoreInfo trouvé:", storeInfo);
                if (storeInfo.id) {
                    console.log("[DEBUG] getCurrentStoreId - Retourne depuis currentStoreInfo:", storeInfo.id);
                    return storeInfo.id;
                }
            }

            // 3. Essayer le token JWT si disponible
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log("[DEBUG] getCurrentStoreId - payload JWT:", payload);
                    if (payload.storeId) {
                        console.log("[DEBUG] getCurrentStoreId - Retourne depuis JWT:", payload.storeId);
                        return payload.storeId;
                    }
                } catch (tokenError) {
                    console.warn("[SÉCURITÉ] Impossible de parser le token JWT");
                }
            }

            console.warn("[SÉCURITÉ] Aucun storeId valide trouvé dans localStorage");
            return 'unknown_store';
        } catch (error) {
            console.error('[SÉCURITÉ] Erreur lors de la récupération du storeId:', error);
            return 'unknown_store';
        }
    }
}