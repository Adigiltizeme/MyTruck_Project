import { useEffect } from "react";
import { FormState } from "../types/form.types";

export const useDraftManagement = (formState: FormState, draftService: any) => {
    useEffect(() => {
        const saveTimeout = setTimeout(() => {
            draftService.saveDraft(formState.data);
        }, 2000);
        
        return () => clearTimeout(saveTimeout);
    }, [formState.data, draftService]);
};