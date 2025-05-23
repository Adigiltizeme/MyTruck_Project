import React, { useState } from 'react';
import Dexie from 'dexie';
import { db } from '../services/offline-db.service';
import { NotificationService } from '../services/notificationService';
import { DbMonitor } from '../utils/db-repair';

const StorageCleanup: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleCleanup = async () => {
        if (!confirm("Cette opération va nettoyer les données temporaires et anciennes. Voulez-vous continuer?")) {
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            // 1. Nettoyer les vieilles commandes temporaires
            const tempCommandes = await db.commandes.where('id').startsWith('temp_').toArray();
            const now = Date.now();
            const oldTempCommandes = tempCommandes.filter(cmd => {
                const timestamp = cmd.id.includes('_') ?
                    parseInt(cmd.id.split('_')[1]) :
                    new Date(cmd.dates.commande).getTime();
                return (now - timestamp) > (7 * 24 * 60 * 60 * 1000); // Plus de 7 jours
            });

            if (oldTempCommandes.length > 0) {
                await Promise.all(oldTempCommandes.map(cmd => db.commandes.delete(cmd.id)));
            }

            // 2. Nettoyer les anciens changements en attente
            const pendingChanges = await db.pendingChanges.toArray();
            const oldChanges = pendingChanges.filter(change =>
                (change.timestamp && (now - change.timestamp) > (30 * 24 * 60 * 60 * 1000))
            );

            if (oldChanges.length > 0) {
                await Promise.all(oldChanges.map(change => db.pendingChanges.delete(change.id)));
            }

            // 3. Supprimer les anciens brouillons
            try {
                const db_drafts = new Dexie('MyTruckDrafts');
                db_drafts.version(1).stores({
                    drafts: '++id,timestamp,status,storeId'
                });

                const oldDrafts = await db_drafts.table('drafts')
                    .where('timestamp')
                    .below(now - (14 * 24 * 60 * 60 * 1000)) // Plus de 14 jours
                    .toArray();

                if (oldDrafts.length > 0) {
                    await Promise.all(oldDrafts.map(draft => db_drafts.table('drafts').delete(draft.id)));
                }
            } catch (error) {
                console.warn('Erreur lors du nettoyage des brouillons:', error);
            }

            setMessage(`Nettoyage réussi. ${oldTempCommandes.length} commandes temporaires, ${oldChanges.length} changements en attente ont été supprimés.`);
            NotificationService.success('Nettoyage terminé avec succès');
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
            setMessage('Une erreur est survenue lors du nettoyage.');
            NotificationService.error('Erreur lors du nettoyage');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmergencyReset = async () => {
        if (!confirm("ATTENTION: Cette opération va complètement réinitialiser toutes les bases de données. Cela résoudra les problèmes de corruption, mais supprimera toutes les données locales. Continuez ?")) {
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            // Sauvegarder uniquement les données d'authentification
            const userData = localStorage.getItem('user');

            // Lister toutes les bases de données IndexedDB
            const dbNames = await window.indexedDB.databases();

            // Supprimer chaque base de données
            for (const db of dbNames) {
                if (db.name) {
                    await new Promise<void>((resolve, reject) => {
                        const request = window.indexedDB.deleteDatabase(db.name!);
                        request.onsuccess = () => {
                            console.log(`Base de données ${db.name} supprimée avec succès`);
                            resolve();
                        };
                        request.onerror = (event) => {
                            console.error(`Erreur lors de la suppression de la base de données ${db.name}:`, event);
                            reject(new Error(`Impossible de supprimer la base de données ${db.name}`));
                        };
                    });
                }
            }

            // Vider le localStorage sauf user
            const keysToKeep = ['user'];
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });

            // Restaurer les données utilisateur
            if (userData) {
                localStorage.setItem('user', userData);
            }

            setMessage('Toutes les bases de données ont été réinitialisées. La page va se recharger.');
            
            DbMonitor.clearStorageWarning();

            NotificationService.success('Réinitialisation terminée avec succès.');
            
            // Recharger la page après un court délai
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Erreur lors de la réinitialisation des bases de données:', error);
            setMessage(`Erreur lors de la réinitialisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 mt-6 rounded-lg shadow dark:bg-gray-800">
            <h2 className="text-lg font-medium mb-4">Maintenance du stockage</h2>

            <div className="space-y-4">
                <div>
                    <button
                        onClick={handleCleanup}
                        disabled={isLoading}
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? 'Nettoyage en cours...' : 'Nettoyer les données temporaires'}
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                        Supprime les commandes temporaires et les changements en attente anciens
                    </p>
                </div>

                <div>
                    <button
                        onClick={handleEmergencyReset}
                        disabled={isLoading}
                        className="w-full py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                        {isLoading ? 'Réinitialisation en cours...' : 'Réinitialisation d\'urgence'}
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                        Réinitialise toutes les données locales (à utiliser uniquement en cas de problème)
                    </p>
                </div>

                {message && (
                    <div className={`p-3 mt-4 rounded ${message.includes('erreur') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StorageCleanup;