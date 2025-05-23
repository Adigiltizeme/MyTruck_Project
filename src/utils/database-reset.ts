import Dexie from 'dexie';
import { NotificationService } from '../services/notificationService';

export async function resetAllDatabases(): Promise<boolean> {
    try {
        // Liste de toutes les bases de données à supprimer
        const dbNames = ['MyTruckDB', 'MyTruckDrafts', 'ImageCache'];

        // Sauvegarder l'utilisateur connecté pour ne pas le perdre
        const savedUser = localStorage.getItem('user');

        // Supprimer les bases
        for (const dbName of dbNames) {
            await Dexie.delete(dbName);
            console.log(`Base de données ${dbName} supprimée avec succès`);
        }

        // Nettoyer le localStorage mais conserver l'utilisateur
        const themePreference = localStorage.getItem('theme');
        localStorage.clear();

        // Restaurer les paramètres essentiels
        if (savedUser) localStorage.setItem('user', savedUser);
        if (themePreference) localStorage.setItem('theme', themePreference);

        return true;
    } catch (error) {
        console.error('Erreur lors de la réinitialisation des bases de données:', error);
        NotificationService.error('Échec de la réinitialisation des bases de données');
        return false;
    }
}