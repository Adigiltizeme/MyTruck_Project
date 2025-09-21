import { useEffect } from "react";
import { FormState } from "../types/form.types";
import { DraftStorageService } from "../services/draftStorage";
import { useAuth } from "../contexts/AuthContext";

export const useDraftManagement = (formState: FormState, draftService: DraftStorageService) => {
    const { user } = useAuth();

    useEffect(() => {
        // Ne sauvegarder que si l'utilisateur est un magasin avec un storeId valide
        if (user?.role === 'magasin' && user.storeId) {
            const saveTimeout = setTimeout(() => {
                draftService.saveDraft(formState.data, user.storeId);
            }, 2000);

            return () => clearTimeout(saveTimeout);
        }
    }, [formState.data, draftService, user?.role, user?.storeId]);
};