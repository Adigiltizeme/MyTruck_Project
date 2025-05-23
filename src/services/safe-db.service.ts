import { db } from './offline-db.service';
import { DbMonitor } from '../utils/db-repair';
import { UpdateSpec } from 'dexie';

/**
 * Service pour les opérations de base de données sécurisées
 */
export class SafeDbService {
    /**
     * Exécute une opération de base de données avec sécurité
     * @param operation La fonction d'opération à exécuter
     * @param fallback Valeur par défaut à retourner en cas d'échec
     * @param operationName Nom de l'opération pour le logging
     * @param retryCount Nombre de tentatives
     */
    static async safeOperation<T>(
        operation: () => Promise<T>,
        fallback: T,
        operationName: string = 'Database operation',
        retryCount: number = 2
    ): Promise<T> {
        let lastError: unknown = null;

        for (let attempt = 0; attempt < retryCount + 1; attempt++) {
            try {
                const result = await operation();
                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, operationName);
                return result;
            } catch (error) {
                lastError = error;

                // Enregistrer l'erreur
                DbMonitor.recordDbOperation(
                    false,
                    operationName,
                    error instanceof Error ? error.message : String(error)
                );

                // Si c'est la dernière tentative, on journalise l'erreur
                if (attempt === retryCount) {
                    console.error(`${operationName} a échoué après ${retryCount + 1} tentatives:`, error);
                } else {
                    // Attendre avant de réessayer (backoff exponentiel)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
                }
            }
        }

        // Si toutes les tentatives échouent, retourner la valeur par défaut
        return fallback;
    }

    // Pour "assainir" les clés
    static sanitizeKey(key: any): string | number {
        // Si c'est déjà un type primitif valide, le retourner tel quel
        if (typeof key === 'string' || typeof key === 'number') {
            return key;
        }

        // Si c'est null ou undefined, convertir en chaîne
        if (key === null || key === undefined) {
            return 'null';
        }

        // Si c'est un objet, le convertir en chaîne JSON
        if (typeof key === 'object') {
            try {
                return JSON.stringify(key);
            } catch (e) {
                // Si la conversion échoue, générer un ID unique
                return `invalid-key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
        }

        // Par défaut, convertir en chaîne
        return String(key);
    }

    /**
     * Récupère un élément par son ID
     */
    static async getById<T>(tableName: string, id: string | number): Promise<T | null> {
        return this.safeOperation<T | null>(
            async () => await db.table(tableName).get(this.sanitizeKey(id)),
            null,
            `getById(${tableName}, ${id})`
        );
    }

    /**
     * Ajoute un élément dans une table
     */
    static async add<T>(tableName: string, item: T): Promise<string | number> {
        return this.safeOperation<string | number>(
            async () => await db.table(tableName).add(item) as string | number,
            -1,
            `add(${tableName})`
        );
    }

    /**
     * Met à jour un élément dans une table
     */
    static async update<T>(tableName: string, id: string | number, item: T): Promise<number> {
        return this.safeOperation<number>(
            async () => await db.table(tableName).update(id, item as UpdateSpec<any>),
            0,
            `update(${tableName}, ${id})`
        );
    }

    /**
     * Supprime un élément d'une table
     */
    static async delete(tableName: string, id: string | number): Promise<void> {
        return this.safeOperation<void>(
            async () => await db.table(tableName).delete(id),
            undefined,
            `delete(${tableName}, ${id})`
        );
    }

    /**
     * Récupère tous les éléments d'une table
     */
    static async getAll<T>(tableName: string): Promise<T[]> {
        return this.safeOperation<T[]>(
            async () => await db.table(tableName).toArray(),
            [],
            `getAll(${tableName})`
        );
    }

    /**
     * Récupère un nombre limité d'éléments avec pagination
     */
    static async getPaginated<T>(
        tableName: string,
        page: number = 0,
        pageSize: number = 50
    ): Promise<T[]> {
        const offset = page * pageSize;

        return this.safeOperation<T[]>(
            async () => await db.table(tableName)
                .offset(offset)
                .limit(pageSize)
                .toArray(),
            [],
            `getPaginated(${tableName}, ${page}, ${pageSize})`
        );
    }

    /**
     * Compte le nombre d'éléments dans une table
     */
    static async count(tableName: string): Promise<number> {
        return this.safeOperation<number>(
            async () => await db.table(tableName).count(),
            0,
            `count(${tableName})`
        );
    }

    /**
     * Vide une table
     */
    static async clear(tableName: string): Promise<void> {
        return this.safeOperation<void>(
            async () => await db.table(tableName).clear(),
            undefined,
            `clear(${tableName})`
        );
    }

    /**
     * Effectue une transaction sécurisée
     */
    static async transaction<T>(
        mode: 'r' | 'rw',
        tableNames: string | string[],
        callback: () => Promise<T>
    ): Promise<T> {
        const tables = Array.isArray(tableNames) ? tableNames : [tableNames];
        const operationName = `transaction(${tables.join(', ')})`;

        return this.safeOperation<T>(
            async () => {
                try {
                    return await db.transaction(mode, tables, callback);
                } catch (error) {
                    console.error(`Erreur lors de la transaction sur ${tables.join(', ')}:`, error);
                    throw error;
                }
            },
            null as any,
            operationName
        );
    }

    /**
     * Ferme la connexion à la base de données
     */
    static async closeConnection(): Promise<void> {
        return this.safeOperation<void>(
            async () => {
                if (db.isOpen()) {
                    db.close();
                }
            },
            undefined,
            'closeConnection()'
        );
    }

    /**
     * Ouvre la connexion à la base de données
     */
    static async openConnection(): Promise<void> {
        return this.safeOperation<void>(
            async () => {
                if (!db.isOpen()) {
                    await db.open();
                }
            },
            undefined,
            'openConnection()'
        );
    }

    /**
     * Interroge la base de données par un index
     */
    static async queryByIndex<T>(
        tableName: string,
        indexName: string,
        value: any
    ): Promise<T | null> {
        return this.safeOperation<T | null>(
            async () => {
                const result = await db.table(tableName)
                    .where(indexName)
                    .equals(value)
                    .first();
                return result;
            },
            null,
            `queryByIndex(${tableName}, ${indexName})`
        );
    }

    /**
     * Exécute une requête où une condition est satisfaite
     */
    static async queryWhere<T>(
        tableName: string,
        property: string,
        condition: any
    ): Promise<T[]> {
        return this.safeOperation<T[]>(
            async () => {
                const result = await db.table(tableName)
                    .where(property)
                    .equals(condition)
                    .toArray();
                return result;
            },
            [],
            `queryWhere(${tableName}, ${property})`
        );
    }

    /**
     * Met à jour ou ajoute un élément (upsert)
     */
    static async put<T>(tableName: string, item: T): Promise<number | string> {
        return this.safeOperation<number | string>(
            async () => await db.table(tableName).put(item) as string | number,
            -1,
            `put(${tableName})`
        );
    }

    /**
     * Effectue un ajout de plusieurs éléments en masse
     */
    static async bulkAdd<T>(tableName: string, items: T[]): Promise<void> {
        return this.safeOperation<void>(
            async () => {
                await db.table(tableName).bulkAdd(items);
            },
            undefined,
            `bulkAdd(${tableName}, ${items.length} items)`
        );
    }

    /**
     * Supprime des éléments en fonction d'une condition
     */
    static async deleteWhere(
        tableName: string,
        property: string,
        condition: any
    ): Promise<number> {
        return this.safeOperation<number>(
            async () => {
                return await db.table(tableName)
                    .where(property)
                    .equals(condition)
                    .delete();
            },
            0,
            `deleteWhere(${tableName}, ${property})`
        );
    }
}