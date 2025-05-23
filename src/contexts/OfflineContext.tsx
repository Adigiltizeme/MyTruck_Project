import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/data.service';
import { db } from '../services/offline-db.service';
import { handleStorageError } from '../utils/error-handler';

interface OfflineContextType {
    isOnline: boolean;
    dataService: DataService;
    pendingChangesCount: number;
    synchronize: () => Promise<boolean>;
    lastSyncTime: Date | null;
    isOfflineForced: boolean;
    toggleOfflineMode: () => void;
    isSynchronizing: boolean;
    clearPendingChanges: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

function setModeInLocalStorage(forced: boolean) {
    localStorage.setItem('forceOfflineMode', String(forced));
    // Dispatch un événement personnalisé pour que tous les composants puissent réagir
    window.dispatchEvent(new CustomEvent('offlinemodechange', { detail: { forced } }));
}

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [isSynchronizing, setIsSynchronizing] = useState(false);
    const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);

    // Lire d'abord depuis localStorage
    const storedOfflineMode = localStorage.getItem('forceOfflineMode') === 'true';
    const [isOfflineForced, setIsOfflineForced] = useState(
        localStorage.getItem('forceOfflineMode') === 'true'
    );
    const [isNetworkOnline, setIsNetworkOnline] = useState(navigator.onLine);
    const [pendingChangesCount, setPendingChangesCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [dataService] = useState(() => new DataService(
        import.meta.env.VITE_AIRTABLE_TOKEN,
        isOfflineForced
    ));

    // L'application est considérée online seulement si le réseau est disponible ET le mode offline n'est pas forcé
    const isOnline = isNetworkOnline && !isOfflineForced;

    useEffect(() => {
        // Mettre à jour le dataService avec le nouvel état forcé
        dataService.setForcedOfflineMode(isOfflineForced);
        localStorage.setItem('forceOfflineMode', String(isOfflineForced));

        // Notifier du changement de mode
        if (isOfflineForced) {
            import('../services/dev-data.service').then(module => {
                module.initDevData();
            });
            console.log("Mode hors ligne forcé activé - aucun appel API ne sera effectué - données de démo chargées");
        } else {
            console.log("Mode normal - appels API activés si le réseau est disponible");
        }
    }, [isOfflineForced, dataService]);

    useEffect(() => {
        // Gérer les événements de connexion
        const handleOnline = () => setIsNetworkOnline(true);
        const handleOffline = () => setIsNetworkOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Si on n'est pas en mode forcé, démarrer la synchronisation périodique
        if (!isOfflineForced) {
            dataService.startSync(300000); // 5 minutes
        }

        // Reste du code useEffect...

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            // Reste du nettoyage...
        };
    }, [dataService, isOfflineForced]);

    // Effet pour ne pas démarrer la synchro en mode forcé
    useEffect(() => {
        if (isOfflineForced && syncInterval) {
            console.log("Mode hors ligne forcé: arrêt de la synchronisation automatique");
            clearInterval(syncInterval);
            setSyncInterval(null);
        } else if (!isOfflineForced && !syncInterval) {
            console.log("Mode normal: démarrage de la synchronisation automatique");
            const interval = setInterval(() => {
                if (isNetworkOnline) {
                    synchronize();
                }
            }, 300000); // 5 minutes
            setSyncInterval(interval);
        }
    }, [isOfflineForced, isNetworkOnline]);

    const synchronize = async () => {
        if (!isOnline) {
            console.log("Synchronisation impossible: mode hors ligne");
            return false;
        }

        try {
            setIsSynchronizing(true);

            const success = await dataService.synchronize();

            if (success) {
                setLastSyncTime(new Date());
                // Recompter après la synchronisation
                const count = await db.pendingChanges.count();
                setPendingChangesCount(count);

                // Indiquer clairement le résultat
                console.log(`Synchronisation réussie. ${count} changements restants en attente.`);
                return true;
            } else {
                console.log("Échec de la synchronisation");
                return false;
            }
        } catch (error) {
            if (!handleStorageError(error)) {
                console.error("Erreur lors de la synchronisation:", error);
            }
            return false;
        } finally {
            setIsSynchronizing(false);
        }
    };

    // Fonction pour basculer le mode forcé
    const toggleOfflineMode = useCallback(() => {
        const newMode = !isOfflineForced;
        setIsOfflineForced(newMode);
        setModeInLocalStorage(newMode);

        // Si on passe en mode online, tenter une synchronisation
        if (!newMode && isNetworkOnline) {
            console.log('Passage en mode online, tentative de synchronisation...');
            setTimeout(() => {
                synchronize().catch(err => {
                    console.error('Échec de la synchronisation après passage en mode online:', err);
                });
            }, 1000);
        }
    }, [isOfflineForced, isNetworkOnline, synchronize]);

    // Écoutez les changements du mode hors ligne (pour les autres onglets)
    useEffect(() => {
        const handleOfflineModeChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            setIsOfflineForced(customEvent.detail.forced);
        };

        window.addEventListener('offlinemodechange', handleOfflineModeChange);

        return () => {
            window.removeEventListener('offlinemodechange', handleOfflineModeChange);
        };
    }, []);

    const clearPendingChanges = async () => {
        if (window.confirm(`Voulez-vous vraiment supprimer les ${pendingChangesCount} changements en attente ?`)) {
            await db.pendingChanges.clear();
            setPendingChangesCount(0);
            console.log('[OfflineContext] Changements en attente purgés');
        }
    };

    return (
        <OfflineContext.Provider
            value={{
                isOnline,
                dataService,
                pendingChangesCount,
                synchronize,
                lastSyncTime,
                isOfflineForced,
                toggleOfflineMode,
                isSynchronizing,
                clearPendingChanges
            }}
        >
            {children}
        </OfflineContext.Provider>
    );
};

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};
