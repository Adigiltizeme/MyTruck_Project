import { useEffect } from "react";
import { FormState } from "../types/form.types";
import { DraftStorageService } from "../services/draftStorage";

export const useDraftManagement = (formState: FormState, draftService: DraftStorageService) => {
    useEffect(() => {
        const saveTimeout = setTimeout(() => {
            draftService.saveDraft(formState.data);
        }, 2000);
        
        return () => clearTimeout(saveTimeout);
    }, [formState.data, draftService]);
};