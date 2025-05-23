import { NotificationService } from '../services/notificationService';

export function handleStorageError(error: any) {
    const isStorageError = error?.name === 'QuotaExceededError' ||
        error?.message?.includes('QuotaExceededError') ||
        error?.message?.includes('no space left on device') ||
        error?.message?.includes('DatabaseClosedError');

    if (isStorageError) {
        console.error('Erreur de stockage détectée:', error);
        NotificationService.error(
            'Problème de stockage détecté. Veuillez vider votre cache ou utiliser la fonction de nettoyage dans votre profil.'
        );

        return true;
    }

    return false;
}