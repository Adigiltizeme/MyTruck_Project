// src/services/database-manager.service.ts
import { DbMonitor, DbRepair } from '../utils/db-repair';
import { SafeDbService } from './safe-db.service';
import { OptimizedImageCache } from './optimized-image-cache.service';
import { NotificationService } from './notificationService';
import Dexie from 'dexie';

interface DatabaseHealth {
    status: 'good' | 'degraded' | 'critical';
    message: string;
    details: Record<string, any>;
}

/**
 * Service de gestion centralisée des bases de données IndexedDB
 */
export class DatabaseManager {
    private static isInitialized = false;
    private static maintenanceInterval: number | null = null;

    /**
     * Initialise le gestionnaire de base de données
     */
    static async initialize(): Promise<boolean> {
        if (this.isInitialized) return true;

        try {
            console.log('[DatabaseManager] Initialisation du gestionnaire de base de données...');

            // S'assurer que la connexion est ouverte
            await SafeDbService.openConnection();

            // Initialiser le cache d'images optimisé
            await OptimizedImageCache.init();

            // Configurer la maintenance programmée
            this.scheduleMaintenance();

            // Vérifier immédiatement l'état de santé
            const health = await this.checkHealth();
            if (health.status !== 'good') {
                console.warn(`[DatabaseManager] État de santé initial: ${health.status}`, health.message);

                // Si critique, lancer une réparation automatique
                if (health.status === 'critical') {
                    console.warn('[DatabaseManager] Lancement d\'une réparation automatique...');
                    await DbRepair.checkAndRepair();
                }
            }

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('[DatabaseManager] Erreur lors de l\'initialisation:', error);
            return false;
        }
    }

    /**
     * Programme une maintenance périodique des bases de données
     */
    private static scheduleMaintenance(): void {
        // Nettoyer toute intervalle existante
        if (this.maintenanceInterval !== null) {
            window.clearInterval(this.maintenanceInterval);
        }

        // Programmer la maintenance toutes les 24 heures
        this.maintenanceInterval = window.setInterval(async () => {
            console.log('[DatabaseManager] Exécution de la maintenance programmée...');

            try {
                // Nettoyer le cache d'images
                const imagesDeleted = await OptimizedImageCache.cleanupCache();
                console.log(`[DatabaseManager] Nettoyage du cache d'images: ${imagesDeleted} images supprimées`);

                // Vérifier la santé des bases de données
                const health = await this.checkHealth();
                console.log(`[DatabaseManager] État de santé: ${health.status}`);

                // Si l'état est dégradé ou critique, essayer une réparation
                if (health.status !== 'good') {
                    console.warn('[DatabaseManager] Problèmes détectés, lancement d\'une réparation...');
                    await DbRepair.checkAndRepair();
                }
            } catch (error) {
                console.error('[DatabaseManager] Erreur lors de la maintenance programmée:', error);
            }
        }, 24 * 60 * 60 * 1000); // 24 heures

        console.log('[DatabaseManager] Maintenance programmée configurée');
    }

    /**
     * Vérifie l'état de santé des bases de données
     */
    static async checkHealth(): Promise<DatabaseHealth> {
        return DbMonitor.analyzeDbHealth();
    }

    /**
     * Répare les bases de données
     */
    static async repair(): Promise<boolean> {
        try {
            const result = await DbRepair.checkAndRepair();
            return result.success;
        } catch (error) {
            console.error('[DatabaseManager] Erreur lors de la réparation:', error);
            return false;
        }
    }

    /**
     * Réinitialise complètement les bases de données
     */
    static async resetAllDatabases(): Promise<boolean> {
        try {
            // Sauvegarder l'utilisateur connecté
            const userData = localStorage.getItem('user');
            const themePreference = localStorage.getItem('theme');

            // 1. Fermer toutes les connexions
            await SafeDbService.closeConnection();

            // 2. Énumérer toutes les bases de données
            const databases = await window.indexedDB.databases();

            // 3. Supprimer chaque base de données
            for (const database of databases) {
                if (database.name) {
                    await new Promise<void>((resolve, reject) => {
                        const request = indexedDB.deleteDatabase(database.name!);

                        request.onsuccess = () => {
                            console.log(`Base de données ${database.name} supprimée avec succès`);
                            resolve();
                        };

                        request.onerror = () => {
                            console.error(`Erreur lors de la suppression de ${database.name}:`, request.error);
                            reject(request.error);
                        };

                        // En cas de blocage, continuer après un délai
                        request.onblocked = () => {
                            console.warn(`Suppression de ${database.name} bloquée par une connexion active. Attente...`);
                            setTimeout(resolve, 1000);
                        };
                    });
                }
            }

            // 4. Nettoyer le localStorage, mais préserver certaines valeurs
            const itemsToKeep = ['user', 'theme'];
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && !itemsToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            }

            // 5. Nettoyer le sessionStorage
            sessionStorage.clear();

            // 6. Restaurer les données sauvegardées
            if (userData) localStorage.setItem('user', userData);
            if (themePreference) localStorage.setItem('theme', themePreference);

            // 7. Réinitialiser le gestionnaire
            this.isInitialized = false;

            NotificationService.success(
                'Toutes les bases de données ont été réinitialisées. La page va être rechargée.',
                undefined,
                'Recharger maintenant'
            );

            // 8. Recharger la page après un court délai
            setTimeout(() => {
                window.location.reload();
            }, 3000);

            return true;
        } catch (error) {
            console.error('[DatabaseManager] Erreur lors de la réinitialisation complète:', error);

            NotificationService.error(
                'Une erreur est survenue lors de la réinitialisation des bases de données.',
                undefined,
                'Réessayer'
            );

            return false;
        }
    }

    /**
     * Exécute un nettoyage ciblé des objets temporaires
     */
    static async cleanupTempData(): Promise<{
        tempCommandes: number;
        oldChanges: number;
        oldDrafts: number;
    }> {
        const result = {
            tempCommandes: 0,
            oldChanges: 0,
            oldDrafts: 0
        };

        try {
            // 1. Nettoyer les commandes temporaires
            const tempCommandes = await SafeDbService.queryWhere('commandes', 'id', /^temp_/);

            // Filtrer les anciennes commandes temporaires (plus de 7 jours)
            const now = Date.now();
            const oldTempCommandes = tempCommandes.filter(cmd => {
                // Extraire le timestamp de l'ID ou utiliser la date de création
                const timestamp = (cmd as { id: string; dates: { commande: string } }).id.includes('_') ?
                    parseInt((cmd as { id: string }).id.split('_')[1]) :
                    new Date((cmd as { dates: { commande: string } }).dates.commande).getTime();

                // Garder celles plus vieilles que 7 jours
                return (now - timestamp) > (7 * 24 * 60 * 60 * 1000);
            });

            // Supprimer les commandes anciennes
            for (const cmd of oldTempCommandes) {
                await SafeDbService.delete('commandes', (cmd as { id: string }).id);
            }
            result.tempCommandes = oldTempCommandes.length;

            // 2. Nettoyer les anciens changements en attente
            const allChanges = await SafeDbService.getAll('pendingChanges');
            const oldChanges = allChanges.filter(change =>
                ((change as { entityId: string; retryCount: number }).entityId?.startsWith('temp_') &&
                    (change as { entityId: string; retryCount: number }).retryCount > 3) ||
                ((change as { timestamp: number }).timestamp && (now - (change as { timestamp: number }).timestamp) > (30 * 24 * 60 * 60 * 1000)) // 30 jours
            );

            for (const change of oldChanges) {
                await SafeDbService.delete('pendingChanges', (change as { id: string }).id);
            }
            result.oldChanges = oldChanges.length;

            // 3. Nettoyer les brouillons via Dexie
            // Pour les brouillons, utilisons directement Dexie car ils sont dans une autre base
            try {
                const Dexie = require('dexie');
                const draftsDb = new Dexie('MyTruckDrafts');
                draftsDb.version(1).stores({
                    drafts: '++id,timestamp,status,storeId'
                });

                interface Draft {
                    id: number;
                    timestamp: number;
                    status: string;
                    storeId: string;
                }

                const oldDrafts = await (draftsDb.table('drafts') as Dexie.Table<Draft, number>)
                    .where('timestamp')
                    .below(now - (14 * 24 * 60 * 60 * 1000)) // Plus de 14 jours
                    .toArray();

                await (draftsDb.table('drafts') as Dexie.Table<Draft, number>)
                    .bulkDelete(oldDrafts.map((draft: Draft) => draft.id));

                result.oldDrafts = oldDrafts.length;
            } catch (error) {
                console.warn('[DatabaseManager] Erreur lors du nettoyage des brouillons:', error);
            }

            console.log(`[DatabaseManager] Nettoyage terminé: ${result.tempCommandes} commandes temporaires, ${result.oldChanges} changements en attente, ${result.oldDrafts} brouillons`);
            return result;
        } catch (error) {
            console.error('[DatabaseManager] Erreur lors du nettoyage des données temporaires:', error);
            return result;
        }
    }
}