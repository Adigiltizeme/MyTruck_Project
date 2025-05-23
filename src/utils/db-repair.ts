import { SafeDbService } from '../services/safe-db.service';
import { NotificationService } from '../services/notificationService';
import { db } from '../services/offline-db.service';

interface DBRepairResult {
    success: boolean;
    tables: {
        name: string;
        status: 'ok' | 'repaired' | 'failed';
        message?: string;
    }[];
}

/**
 * Système de réparation automatique de la base de données
 */
export class DbRepair {

    /**
     * Vérifie l'intégrité des bases de données et tente des réparations si nécessaire
     */
    static async checkAndRepair(): Promise<DBRepairResult> {
        console.log('[DbRepair] Démarrage de la vérification d\'intégrité...');

        const result: DBRepairResult = {
            success: true,
            tables: []
        };

        // Liste de toutes les tables à vérifier
        const tableNames = ['commandes', 'personnel', 'magasins', 'users', 'pendingChanges'];

        // Backup des paramètres critiques avant toute opération
        const userData = localStorage.getItem('user');
        const themePreference = localStorage.getItem('theme');

        for (const tableName of tableNames) {
            try {
                // 1. Vérifier si la table est accessible
                await this.testTableAccess(tableName);

                // Si nous arrivons ici, la table est accessible
                result.tables.push({
                    name: tableName,
                    status: 'ok'
                });
            } catch (error) {
                console.error(`[DbRepair] Problème détecté avec la table ${tableName}:`, error);

                try {
                    // Tentative de réparation
                    await this.repairTable(tableName);

                    // Vérification après réparation
                    await this.testTableAccess(tableName);

                    result.tables.push({
                        name: tableName,
                        status: 'repaired',
                        message: `Table réparée avec succès`
                    });

                    console.log(`[DbRepair] Table ${tableName} réparée avec succès`);
                } catch (repairError) {
                    console.error(`[DbRepair] Échec de la réparation pour ${tableName}:`, repairError);

                    result.tables.push({
                        name: tableName,
                        status: 'failed',
                        message: this.getErrorMessage(repairError)
                    });

                    result.success = false;
                }
            }
        }

        // Si des problèmes ont été détectés mais réparés
        const repairedTables = result.tables.filter(t => t.status === 'repaired');
        if (repairedTables.length > 0) {
            NotificationService.success(
                `${repairedTables.length} table(s) ont été réparées automatiquement`,
                undefined,
                'Voir les détails'
            );

            // Restaurer les données critiques qui pourraient avoir été perdues
            if (userData) localStorage.setItem('user', userData);
            if (themePreference) localStorage.setItem('theme', themePreference);
        }

        // Si des problèmes n'ont pas pu être réparés
        const failedTables = result.tables.filter(t => t.status === 'failed');
        if (failedTables.length > 0) {
            NotificationService.error(
                `${failedTables.length} table(s) n'ont pas pu être réparées automatiquement. Une réinitialisation peut être nécessaire.`,
                '/settings',
                'Aller aux paramètres'
            );
        }

        return result;
    }

    /**
     * Teste l'accès à une table spécifique
     */
    private static async testTableAccess(tableName: string): Promise<void> {
        try {
            // Utiliser SafeDbService au lieu d'accéder directement à db
            await SafeDbService.getPaginated(tableName, 0, 1);
        } catch (error) {
            // Propager l'erreur pour indiquer un problème d'accès
            throw error;
        }
    }

    /**
     * Tente de réparer une table spécifique
     */
    private static async repairTable(tableName: string): Promise<void> {
        // 1. Forcer une fermeture et réouverture de la connexion via SafeDbService
        await SafeDbService.closeConnection();
        await SafeDbService.openConnection();

        // 2. Si l'erreur persiste, essayer d'utiliser la version directe d'IndexedDB
        if (!(await this.isTableAccessible(tableName))) {
            await this.recreateTable(tableName);
        }
    }

    /**
     * Vérifie si une table est accessible sans erreur
     */
    private static async isTableAccessible(tableName: string): Promise<boolean> {
        try {
            await SafeDbService.getPaginated(tableName, 0, 1);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Tente de recréer une table corrompue
     * Cette méthode est agressive et ne doit être utilisée qu'en dernier recours
     */
    private static async recreateTable(tableName: string): Promise<void> {
        // 1. Fermer toute connexion via SafeDbService
        await SafeDbService.closeConnection();

        // 2. Tenter de récupérer la structure de la table depuis le schéma
        const tableSchema = this.getTableSchema(tableName);
        if (!tableSchema) {
            throw new Error(`Impossible de déterminer le schéma pour ${tableName}`);
        }

        // 3. Connexion directe à IndexedDB
        const request = indexedDB.open('MyTruckDB', 3); // Utiliser la même version que dans offline-db.service.ts

        await new Promise<void>((resolve, reject) => {
            request.onerror = (event) => {
                reject(new Error(`Erreur lors de l'ouverture directe d'IndexedDB: ${request.error?.message}`));
            };

            request.onupgradeneeded = (event) => {
                const database = request.result;

                // Si la table existe, la supprimer d'abord
                if (database.objectStoreNames.contains(tableName)) {
                    database.deleteObjectStore(tableName);
                }

                // Recréer la table avec la bonne structure
                database.createObjectStore(tableName, tableSchema);
            };

            request.onsuccess = (event) => {
                const database = request.result;
                database.close();
                resolve();
            };
        });

        // 4. Réouvrir avec SafeDbService
        await SafeDbService.openConnection();
    }

    /**
     * Récupère le schéma d'une table à partir du nom
     */
    private static getTableSchema(tableName: string): { keyPath?: string; autoIncrement?: boolean } | null {
        // Schémas par défaut pour les tables connues
        const knownSchemas: Record<string, { keyPath?: string; autoIncrement?: boolean }> = {
            commandes: { keyPath: 'id' },
            personnel: { keyPath: 'id' },
            magasins: { keyPath: 'id' },
            users: { keyPath: 'id' },
            pendingChanges: { keyPath: 'id', autoIncrement: true }
        };

        return knownSchemas[tableName] || null;
    }

    /**
     * Extrait un message d'erreur lisible
     */
    private static getErrorMessage(error: any): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'string') {
            return error;
        }

        return 'Erreur inconnue';
    }

    /**
 * Répare les relations entre utilisateurs et magasins, en tenant compte des rôles
 */
    static async repairUserStoreRelations(): Promise<{ fixed: number; errors: number }> {
        console.log('Début de la réparation des relations utilisateur-magasin...');

        try {
            // Récupérer les tables
            const users = await db.users.toArray();
            const stores = await db.magasins.toArray();

            console.log(`Trouvé ${users.length} utilisateurs et ${stores.length} magasins`);

            // Variables pour les statistiques
            let fixed = 0;
            let errors = 0;

            // Parcourir tous les utilisateurs
            for (const user of users) {
                try {
                    // Traitement différent selon le rôle
                    if (user.role === 'magasin') {
                        // Pour les magasins, s'assurer que les informations sont complètes
                        if (user.storeId) {
                            const store = stores.find(s => s.id === user.storeId);

                            if (store) {
                                // Vérifier si une mise à jour est nécessaire
                                const needsUpdate =
                                    user.storeName !== store.name ||
                                    user.storeAddress !== store.address ||
                                    user.storePhone !== store.phone;

                                if (needsUpdate) {
                                    console.log(`Mise à jour de l'utilisateur magasin ${user.name} avec les infos du magasin ${store.name}`);

                                    // Mettre à jour les informations manquantes
                                    await db.users.put({
                                        ...user,
                                        storeName: store.name,
                                        storeAddress: store.address,
                                        storePhone: store.phone,
                                        storeStatus: store.status
                                    });

                                    fixed++;
                                }
                            } else {
                                console.warn(`Aucun magasin trouvé pour l'ID ${user.storeId}`);
                                errors++;
                            }
                        } else {
                            console.warn(`Utilisateur ${user.name} a le rôle 'magasin' mais pas de storeId`);
                            errors++;
                        }
                    } else {
                        // Pour les autres rôles, s'assurer que les champs magasin sont vides
                        if (user.storeName || user.storeAddress || user.storePhone) {
                            console.log(`Suppression des informations magasin pour l'utilisateur non-magasin ${user.name} (${user.role})`);

                            // Supprimer les informations de magasin
                            const updatedUser = { ...user, storeName: '', storeAddress: '', storePhone: '', storeStatus: '' };
                            await db.users.put(updatedUser);

                            fixed++;
                        }
                    }
                } catch (error) {
                    console.error(`Erreur lors de la mise à jour de l'utilisateur ${user.id}:`, error);
                    errors++;
                }
            }

            // Supprimer les indicateurs de problème
            localStorage.removeItem('db_issue_detected');
            localStorage.removeItem('storage_warning_shown');
            localStorage.removeItem('db_error_count');

            console.log(`${fixed} utilisateurs réparés avec succès, ${errors} erreurs`);
            return { fixed, errors };
        } catch (error) {
            console.error('Erreur lors de la réparation des relations utilisateur-magasin:', error);
            return { fixed: 0, errors: 1 };
        }
    }
}

/**
 * Surveillant de l'état des bases de données avec historique
 */
/**
 * Surveillant de l'état des bases de données avec historique
 */
export class DbMonitor {
    private static readonly ERROR_THRESHOLD = 5;
    private static readonly CHECK_INTERVAL = 60 * 1000; // 1 minute
    private static readonly HISTORY_SIZE = 50;

    // Static property to store operations
    private static operations: Array<{ timestamp: number; operation: string; success: boolean; error?: string }> = [];

    private static lastCheckTimestamp = 0;
    private static errorCount = 0;
    private static operationHistory: Array<{
        timestamp: number;
        operation: string;
        success: boolean;
        error?: string;
    }> = [];

    /**
     * Enregistre une opération de base de données et sa réussite
     */
    static recordDbOperation(success: boolean, operation: string, error?: string): void {
        const now = Date.now();

        // Enregistrer dans l'historique
        this.operationHistory.unshift({
            timestamp: now,
            operation,
            success,
            ...(error && { error })
        });

        // Limiter la taille de l'historique
        if (this.operationHistory.length > this.HISTORY_SIZE) {
            this.operationHistory = this.operationHistory.slice(0, this.HISTORY_SIZE);
        }

        // Limiter la fréquence des vérifications
        if (now - this.lastCheckTimestamp < this.CHECK_INTERVAL) {
            // Si opération échouée, incrémenter le compteur
            if (!success) {
                this.errorCount++;

                // Si trop d'erreurs, proposer une réparation
                if (this.errorCount >= this.ERROR_THRESHOLD) {
                    this.suggestRepair();
                    this.errorCount = 0;
                }
            }
            return;
        }

        // Réinitialiser le compteur et le timestamp pour une nouvelle période
        this.lastCheckTimestamp = now;
        this.errorCount = success ? 0 : 1;
    }

    /**
     * Suggère une réparation des bases de données
     */
    private static suggestRepair(): void {
        console.warn('Détection de problèmes potentiels avec les bases de données');

        // Si le service de notification est disponible, notifier l'utilisateur
        try {
            NotificationService.warning(
                'Des problèmes ont été détectés avec le stockage local. Envisagez d\'utiliser la fonction de réinitialisation dans les paramètres.',
                '/settings',
                'Accéder aux paramètres'
            );
        } catch (error) {
            console.error('Impossible de notifier l\'utilisateur:', error);
        }
    }

    /**
     * Obtient l'historique des opérations
     */
    static getOperationHistory() {
        return [...this.operationHistory];
    }

    /**
     * Analyse la santé actuelle de la base de données
     */
    static async analyzeDbHealth(): Promise<{
        status: 'good' | 'degraded' | 'critical';
        message: string;
        details: {
            errorRate: number;
            lastErrors: Array<{
                timestamp: number;
                operation: string;
                error?: string;
            }>;
            tableCounts: Record<string, number>;
        };
    }> {
        // Calculer le taux d'erreur sur les 20 dernières opérations
        const recentOperations = this.operationHistory.slice(0, 20);
        const errorCount = recentOperations.filter(op => !op.success).length;
        const errorRate = recentOperations.length > 0 ? errorCount / recentOperations.length : 0;

        // Récupérer les 5 dernières erreurs
        const lastErrors = this.operationHistory
            .filter(op => !op.success)
            .slice(0, 5)
            .map(({ timestamp, operation, error }) => ({ timestamp, operation, error }));

        // Vérifier l'état de chaque table
        const tableNames = ['commandes', 'personnel', 'magasins', 'users', 'pendingChanges'];
        const tableCounts: Record<string, number> = {};

        for (const tableName of tableNames) {
            try {
                const count = await SafeDbService.count(tableName);
                tableCounts[tableName] = count;
            } catch (error) {
                console.error(`Erreur lors du comptage des éléments de ${tableName}:`, error);
                tableCounts[tableName] = -1; // -1 indique une erreur
            }
        }

        // Déterminer le statut global
        let status: 'good' | 'degraded' | 'critical';
        let message: string;

        // Vérifier si certaines tables sont inaccessibles
        const inaccessibleTables = Object.entries(tableCounts)
            .filter(([_, count]) => count === -1)
            .map(([name, _]) => name);

        if (inaccessibleTables.length > 0) {
            status = 'critical';
            message = `Tables inaccessibles: ${inaccessibleTables.join(', ')}. Une réparation est nécessaire.`;
        } else if (errorRate >= 0.3) {
            status = 'critical';
            message = "La base de données rencontre des problèmes critiques. Une réinitialisation peut être nécessaire.";
        } else if (errorRate >= 0.1) {
            status = 'degraded';
            message = "La base de données présente quelques dysfonctionnements. Surveillance recommandée.";
        } else {
            status = 'good';
            message = "La base de données fonctionne normalement.";
        }

        return {
            status,
            message,
            details: {
                errorRate,
                lastErrors,
                tableCounts
            }
        };
    }

    /**
     * Sauvegarde le journal des opérations dans le stockage local
     */
    private static saveOperationLog(): void {
        try {
            localStorage.setItem('db_operation_log', JSON.stringify(this.operations));
            console.log('Journal des opérations sauvegardé');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du journal des opérations:', error);
        }
    }

    /**
     * Supprimer explicitement l'avertissement
     */
    static clearStorageWarning(): void {
        try {
            // Supprimer le marqueur qui indique qu'un avertissement doit être affiché
            localStorage.removeItem('db_issue_detected');

            // Supprimer également d'autres indicateurs potentiels
            localStorage.removeItem('storage_warning_shown');
            localStorage.removeItem('db_error_count');

            console.log('Avertissements de stockage effacés');

            // Réinitialiser les compteurs d'erreurs
            this.errorCount = 0;
            this.lastCheckTimestamp = Date.now();

            // Nettoyage de l'historique des opérations
            this.operationHistory = this.operationHistory.filter(op => op.success);

            // Si la propriété existe, réinitialiser aussi operations
            if (this.operations) {
                this.operations = this.operations.filter(op => op.success);
                this.saveOperationLog();
            }
        } catch (error) {
            console.error('Erreur lors de la suppression des avertissements de stockage:', error);
        }
    }
}