import { toast } from 'react-toastify';
import { useNotifications } from '../contexts/NotificationContext';

// Singleton pour accéder aux notifications dans des fichiers non-React
let notificationContext: ReturnType<typeof useNotifications> | null = null;

export const setNotificationContext = (context: ReturnType<typeof useNotifications>) => {
    notificationContext = context;
};

export class NotificationService {
    private static recentNotifications = new Set<string>();
    private static readonly NOTIFICATION_TIMEOUT = 5000; // 5 secondes

    /**
     * Fonction interne pour éviter les notifications en double
     */
    private static preventDuplicateNotification(type: string, message: string): boolean {
        // Générer une clé unique pour cette notification
        const notificationKey = `${type}-${message}`;

        // Vérifier si cette notification a été récemment affichée
        if (this.recentNotifications.has(notificationKey)) {
            console.log(`Notification dupliquée supprimée: ${message}`);
            return false; // Ne pas afficher cette notification
        }

        // Ajouter à la liste des notifications récentes
        this.recentNotifications.add(notificationKey);

        // Supprimer après un délai pour permettre de futures notifications similaires
        setTimeout(() => {
            this.recentNotifications.delete(notificationKey);
        }, this.NOTIFICATION_TIMEOUT);

        return true; // Afficher cette notification
    }

    static success(message: string, link?: string, linkText?: string) {
        if (!this.preventDuplicateNotification('success', message)) return;

        if (notificationContext) {
            notificationContext.addNotification({
                message,
                type: 'success',
                link,
                linkText
            });
        } else {
            console.warn('Contexte de notification non initialisé, impossible d\'envoyer:', message);
        }
    }

    static error(message: string, link?: string, linkText?: string) {
        if (!this.preventDuplicateNotification('error', message)) return;

        if (notificationContext) {
            notificationContext.addNotification({
                message,
                type: 'error',
                link,
                linkText
            });
        } else {
            console.warn('Contexte de notification non initialisé, impossible d\'envoyer:', message);
        }
    }

    static warning(message: string, link?: string, linkText?: string) {
        if (!this.preventDuplicateNotification('warning', message)) return;

        if (notificationContext) {
            notificationContext.addNotification({
                message,
                type: 'warning',
                link,
                linkText
            });
        } else {
            console.warn('Contexte de notification non initialisé, impossible d\'envoyer:', message);
        }
    }

    static info(message: string, link?: string, linkText?: string) {
        if (!this.preventDuplicateNotification('info', message)) return;
        
        if (notificationContext) {
            notificationContext.addNotification({
                message,
                type: 'info',
                link,
                linkText
            });
        } else {
            console.warn('Contexte de notification non initialisé, impossible d\'envoyer:', message);
        }
    }
}