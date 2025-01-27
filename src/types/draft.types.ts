import { CommandeMetier } from './business.types';

// Type pour les données du brouillon
export interface DraftData {
    id?: number;              // ID auto-incrémenté par IndexedDB
    data: Partial<CommandeMetier>; // Données partielles de la commande
    timestamp: number;        // Horodatage pour le tri et la gestion
    version?: string;         // Version optionnelle pour migrations futures
    lastModified: string;     // Date de dernière modification
    status: DraftStatus;      // Statut du brouillon
}

// Statuts possibles d'un brouillon
export enum DraftStatus {
    ACTIVE = 'active',        // Brouillon en cours d'édition
    PENDING = 'pending',      // En attente de sauvegarde
    SAVED = 'saved',          // Sauvegardé avec succès
    FAILED = 'failed'         // Échec de sauvegarde
}

// Configuration du stockage
export interface DraftStorageConfig {
    maxDrafts: number;        // Nombre maximum de brouillons à conserver
    autoSaveInterval: number; // Intervalle de sauvegarde automatique en ms
    compressionQuality?: number; // Qualité de compression des images (0-1)
}

// Résultat des opérations de stockage
export interface DraftStorageResult {
    success: boolean;
    message?: string;
    error?: Error;
    data?: DraftData;
}

// Hook personnalisé props et retour
export interface DraftStorageHookResult {
    draftData: Partial<CommandeMetier> | null;
    loading: boolean;
    error: Error | null;
    saveDraft: (data: Partial<CommandeMetier>) => Promise<DraftStorageResult>;
    clearDraft: () => Promise<DraftStorageResult>;
    restoreDraft: (id?: number) => Promise<DraftStorageResult>;
    hasDraft: boolean;
}

// Type pour les métadonnées des photos
export interface PhotoMetadata {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    dimensions: {
        width: number;
        height: number;
    };
    lastModified: number;
    compressed: boolean;
}

// Extension du type Photo existant
export interface EnhancedPhoto {
    url: string;
    file: File;
    metadata: PhotoMetadata;
}

// Type pour la migration des données
export interface DraftMigration {
    fromVersion: string;
    toVersion: string;
    migrate: (data: any) => Promise<Partial<CommandeMetier>>;
}

// Type pour les événements de stockage
export type DraftStorageEvent = {
    type: 'save' | 'load' | 'clear' | 'error';
    timestamp: number;
    details: {
        action: string;
        status: DraftStatus;
        draftId?: number;
        error?: string;
    };
}

// Type pour les options de sauvegarde
export interface SaveDraftOptions {
    compress?: boolean;
    immediate?: boolean;
    metadata?: Record<string, unknown>;
}

// Interface pour le stockage du brouillon
export interface IDraftStorage {
    saveDraft(data: Partial<CommandeMetier>, options?: SaveDraftOptions): Promise<DraftStorageResult>;
    loadDraft(id?: number): Promise<DraftStorageResult>;
    clearDraft(id?: number): Promise<DraftStorageResult>;
    listDrafts(): Promise<DraftData[]>;
    getDraftCount(): Promise<number>;
    cleanupOldDrafts(maxAge?: number): Promise<void>;
    subscribeToDraftChanges(callback: (event: DraftStorageEvent) => void): () => void;
}

// Configuration de la base de données IndexedDB
export interface DatabaseConfig {
    name: string;
    version: number;
    stores: {
        [key: string]: string | null;
    };
    migrations?: {
        [key: number]: (tx: any) => Promise<void>;
    };
}