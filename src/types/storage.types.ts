import { CommandeMetier } from "./business.types";
import { DraftData, DraftStorageEvent, DraftStorageResult, SaveDraftOptions } from "./draft.types";

export interface IDraftStorage {
    saveDraft(data: Partial<CommandeMetier>, options?: SaveDraftOptions): Promise<DraftStorageResult>;
    loadDraft(id?: number): Promise<DraftStorageResult>;
    clearDraft(id?: number): Promise<DraftStorageResult>;
    listDrafts(): Promise<DraftData[]>;
    getDraftCount(): Promise<number>;
    cleanupOldDrafts(maxAge?: number): Promise<void>;
    subscribeToDraftChanges(callback: (event: DraftStorageEvent) => void): () => void;
}

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