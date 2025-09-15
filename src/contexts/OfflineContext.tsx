// import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { DataService } from '../services/data.service';
// import { db } from '../services/offline-db.service';
// import { handleStorageError } from '../utils/error-handler';

// interface OfflineContextType {
//     isOnline: boolean;
//     dataService: DataService;
//     pendingChangesCount: number;
//     synchronize: () => Promise<boolean>;
//     lastSyncTime: Date | null;
//     isOfflineForced: boolean;
//     toggleOfflineMode: () => void;
//     isSynchronizing: boolean;
//     clearPendingChanges: () => Promise<void>;
// }

// const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

// function setModeInLocalStorage(forced: boolean) {
//     localStorage.setItem('forceOfflineMode', String(forced));
//     // Dispatch un événement personnalisé pour que tous les composants puissent réagir
//     window.dispatchEvent(new CustomEvent('offlinemodechange', { detail: { forced } }));
// }

// export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

//     const [isSynchronizing, setIsSynchronizing] = useState(false);
//     const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);

//     // Lire d'abord depuis localStorage
//     const storedOfflineMode = localStorage.getItem('forceOfflineMode') === 'true';
//     const [isOfflineForced, setIsOfflineForced] = useState(
//         localStorage.getItem('forceOfflineMode') === 'true'
//     );
//     const [isNetworkOnline, setIsNetworkOnline] = useState(navigator.onLine);
//     const [pendingChangesCount, setPendingChangesCount] = useState(0);
//     const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
//     const [dataService] = useState(() => new DataService(
//         import.meta.env.VITE_AIRTABLE_TOKEN,
//         true
//     ));

//     // L'application est considérée online seulement si le réseau est disponible ET le mode offline n'est pas forcé
//     const isOnline = isNetworkOnline && !isOfflineForced;

//     // useEffect(() => {
//     //     // Mettre à jour le dataService avec le nouvel état forcé
//     //     dataService.setForcedOfflineMode(isOfflineForced);
//     //     localStorage.setItem('forceOfflineMode', String(isOfflineForced));

//     //     // Notifier du changement de mode
//     //     if (isOfflineForced) {
//     //         import('../services/dev-data.service').then(module => {
//     //             module.initDevData();
//     //         });
//     //         console.log("Mode hors ligne forcé activé - aucun appel API ne sera effectué - données de démo chargées");
//     //     } else {
//     //         console.log("Mode normal - appels API activés si le réseau est disponible");
//     //     }
//     // }, [isOfflineForced, dataService]);
//     useEffect(() => {
//     // Le mode hors ligne est déjà défini dans le constructeur
//     console.log('Mode hors ligne forcé activé - aucun appel API ne sera effectué - données de démo chargées');
//   }, []); 

//     useEffect(() => {
//         // Gérer les événements de connexion
//         const handleOnline = () => setIsNetworkOnline(true);
//         const handleOffline = () => setIsNetworkOnline(false);

//         window.addEventListener('online', handleOnline);
//         window.addEventListener('offline', handleOffline);

//         // Si on n'est pas en mode forcé, démarrer la synchronisation périodique
//         if (!isOfflineForced) {
//             dataService.startSync(300000); // 5 minutes
//         }

//         // Reste du code useEffect...

//         return () => {
//             window.removeEventListener('online', handleOnline);
//             window.removeEventListener('offline', handleOffline);
//             // Reste du nettoyage...
//         };
//     }, [dataService, isOfflineForced]);

//     // Effet pour ne pas démarrer la synchro en mode forcé
//     useEffect(() => {
//         if (isOfflineForced && syncInterval) {
//             console.log("Mode hors ligne forcé: arrêt de la synchronisation automatique");
//             clearInterval(syncInterval);
//             setSyncInterval(null);
//         } else if (!isOfflineForced && !syncInterval) {
//             console.log("Mode normal: démarrage de la synchronisation automatique");
//             const interval = setInterval(() => {
//                 if (isNetworkOnline) {
//                     synchronize();
//                 }
//             }, 300000); // 5 minutes
//             setSyncInterval(interval);
//         }
//     }, [isOfflineForced, isNetworkOnline]);

//     const synchronize = async () => {
//         if (!isOnline) {
//             console.log("Synchronisation impossible: mode hors ligne");
//             return false;
//         }

//         try {
//             setIsSynchronizing(true);

//             const success = await dataService.synchronize();

//             if (success) {
//                 setLastSyncTime(new Date());
//                 // Recompter après la synchronisation
//                 const count = await db.pendingChanges.count();
//                 setPendingChangesCount(count);

//                 // Indiquer clairement le résultat
//                 console.log(`Synchronisation réussie. ${count} changements restants en attente.`);
//                 return true;
//             } else {
//                 console.log("Échec de la synchronisation");
//                 return false;
//             }
//         } catch (error) {
//             if (!handleStorageError(error)) {
//                 console.error("Erreur lors de la synchronisation:", error);
//             }
//             return false;
//         } finally {
//             setIsSynchronizing(false);
//         }
//     };

//     // Fonction pour basculer le mode forcé
//     const toggleOfflineMode = useCallback(() => {
//         const newMode = !isOfflineForced;
//         setIsOfflineForced(newMode);
//         setModeInLocalStorage(newMode);

//         // Si on passe en mode online, tenter une synchronisation
//         if (!newMode && isNetworkOnline) {
//             console.log('Passage en mode online, tentative de synchronisation...');
//             setTimeout(() => {
//                 synchronize().catch(err => {
//                     console.error('Échec de la synchronisation après passage en mode online:', err);
//                 });
//             }, 1000);
//         }
//     }, [isOfflineForced, isNetworkOnline, synchronize]);

//     // Écoutez les changements du mode hors ligne (pour les autres onglets)
//     useEffect(() => {
//         const handleOfflineModeChange = (event: Event) => {
//             const customEvent = event as CustomEvent;
//             setIsOfflineForced(customEvent.detail.forced);
//         };

//         window.addEventListener('offlinemodechange', handleOfflineModeChange);

//         return () => {
//             window.removeEventListener('offlinemodechange', handleOfflineModeChange);
//         };
//     }, []);

//     const clearPendingChanges = async () => {
//         if (window.confirm(`Voulez-vous vraiment supprimer les ${pendingChangesCount} changements en attente ?`)) {
//             await db.pendingChanges.clear();
//             setPendingChangesCount(0);
//             console.log('[OfflineContext] Changements en attente purgés');
//         }
//     };

//     return (
//         <OfflineContext.Provider
//             value={{
//                 isOnline,
//                 dataService,
//                 pendingChangesCount,
//                 synchronize,
//                 lastSyncTime,
//                 isOfflineForced,
//                 toggleOfflineMode,
//                 isSynchronizing,
//                 clearPendingChanges
//             }}
//         >
//             {children}
//         </OfflineContext.Provider>
//     );
// };

// export const useOffline = () => {
//     const context = useContext(OfflineContext);
//     if (context === undefined) {
//         throw new Error('useOffline must be used within an OfflineProvider');
//     }
//     return context;
// };

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DataServiceAdapter, DataSource } from '../services/data-service-adapter';
import { db } from '../services/offline-db.service';
import { handleStorageError } from '../utils/error-handler';

interface OfflineContextType {
    isOnline: boolean;
    dataService: DataServiceAdapter;
    pendingChangesCount: number;
    synchronize: () => Promise<boolean>;
    lastSyncTime: Date | null;
    isOfflineForced: boolean;
    toggleOfflineMode: () => void;
    isSynchronizing: boolean;
    clearPendingChanges: () => Promise<void>;

    // Nouvelles méthodes pour la migration
    currentDataSource: DataSource;
    switchToBackendApi: () => Promise<boolean>;
    switchToAirtable: () => void;
    getDataSourceStatus: () => { source: DataSource; apiAvailable: boolean; hasLocal: boolean };
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

function setModeInLocalStorage(forced: boolean) {
    localStorage.setItem('forceOfflineMode', String(forced));
    window.dispatchEvent(new CustomEvent('offlinemodechange', { detail: { forced } }));
}

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSynchronizing, setIsSynchronizing] = useState(false);
    const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);

    // État du mode hors ligne
    const storedOfflineMode = localStorage.getItem('forceOfflineMode') === 'true';
    const [isOfflineForced, setIsOfflineForced] = useState(storedOfflineMode);
    const [isNetworkOnline, setIsNetworkOnline] = useState(navigator.onLine);
    const [pendingChangesCount, setPendingChangesCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    // État de la source de données
    const [currentDataSource, setCurrentDataSource] = useState<DataSource>(DataSource.BACKEND_API);

    // Initialiser l'adaptateur de données
    const [dataService] = useState(() => {
        return new DataServiceAdapter(); // ✅ Plus de token Airtable nécessaire
    });

    // L'application est online si le réseau est disponible ET le mode offline n'est pas forcé
    const isOnline = isNetworkOnline && !isOfflineForced;

    // Initialisation et surveillance du source de données
    useEffect(() => {
        const updateDataSourceStatus = () => {
            const status = dataService.getStatus();
            setCurrentDataSource(status.source);
        };

        updateDataSourceStatus();

        // Vérifier périodiquement l'état de l'API
        const statusInterval = setInterval(updateDataSourceStatus, 30000); // Toutes les 30s

        return () => clearInterval(statusInterval);
    }, [dataService]);

    useEffect(() => {
        // Gérer les événements de connexion réseau
        const handleOnline = () => setIsNetworkOnline(true);
        const handleOffline = () => setIsNetworkOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Démarrer la synchronisation périodique si pas en mode forcé
        if (!isOfflineForced) {
            startPeriodicSync();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            stopPeriodicSync();
        };
    }, [dataService, isOfflineForced]);

    // Compter les changements en attente périodiquement
    useEffect(() => {
        const countPendingChanges = async () => {
            try {
                const count = await db.pendingChanges.count();
                setPendingChangesCount(count);
            } catch (error) {
                console.warn('Erreur comptage changements en attente:', error);
            }
        };

        countPendingChanges();
        const countInterval = setInterval(countPendingChanges, 10000); // Toutes les 10s

        return () => clearInterval(countInterval);
    }, []);

    const startPeriodicSync = useCallback(() => {
        if (syncInterval) return; // Déjà démarré

        const interval = setInterval(() => {
            if (isNetworkOnline && !isOfflineForced) {
                synchronize();
            }
        }, 300000); // 5 minutes

        setSyncInterval(interval);
    }, [isNetworkOnline, isOfflineForced]);

    const stopPeriodicSync = useCallback(() => {
        if (syncInterval) {
            clearInterval(syncInterval);
            setSyncInterval(null);
        }
    }, [syncInterval]);

    const synchronize = useCallback(async () => {
        if (isSynchronizing) {
            console.log('🔄 Synchronisation déjà en cours, ignorée');
            return;
        }

        // ✅ PROTECTION TOTALE : Vérifier si une opération rapport est en cours
        if (typeof window !== 'undefined' && (window as any).rapportOperationInProgress) {
            console.log('🚫 Synchronisation bloquée - Opération rapport en cours');
            return;
        }

        setIsSynchronizing(true);
        try {
            console.log('🔄 Début synchronisation');
            await dataService.synchronize();
            console.log('✅ Synchronisation terminée');
        } catch (error) {
            console.error('❌ Erreur synchronisation:', error);
            // ✅ Attendre avant nouvelle tentative
            setTimeout(() => {
                console.log('⏰ Nouvelle tentative de sync dans 30s');
            }, 30000);
        } finally {
            setIsSynchronizing(false);
        }
    }, [dataService, isSynchronizing]);

    // Basculer le mode hors ligne forcé
    const toggleOfflineMode = useCallback(() => {
        const newMode = !isOfflineForced;
        setIsOfflineForced(newMode);
        setModeInLocalStorage(newMode);

        // Configurer l'adaptateur
        dataService.setForcedOfflineMode(newMode);

        if (newMode) {
            // Passage en mode hors ligne
            stopPeriodicSync();
            console.log('🔌 Mode hors ligne forcé activé');
        } else {
            // Passage en mode online
            startPeriodicSync();
            console.log('🌐 Mode online activé, tentative de synchronisation...');

            // Tenter une synchronisation immédiate
            if (isNetworkOnline) {
                setTimeout(() => {
                    synchronize().catch(err => {
                        console.error('Échec de la synchronisation après passage en mode online:', err);
                    });
                }, 1000);
            }
        }
    }, [isOfflineForced, isNetworkOnline, dataService, startPeriodicSync, stopPeriodicSync, synchronize]);

    // Écouter les changements du mode hors ligne (pour les autres onglets)
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

    const clearPendingChanges = useCallback(async () => {
        if (window.confirm(`Voulez-vous vraiment supprimer les ${pendingChangesCount} changements en attente ?`)) {
            await db.pendingChanges.clear();
            setPendingChangesCount(0);
            console.log('[OfflineContext] Changements en attente purgés');
        }
    }, [pendingChangesCount]);

    // =====================================
    // NOUVELLES MÉTHODES POUR LA MIGRATION
    // =====================================

    const switchToBackendApi = useCallback(async (): Promise<boolean> => {
        console.log('🔄 Tentative de basculement vers le backend API...');

        const success = await dataService.switchToBackendApi();

        if (success) {
            setCurrentDataSource(DataSource.BACKEND_API);
            console.log('✅ Basculé vers le backend API avec succès');

            // Synchroniser immédiatement pour récupérer les dernières données
            setTimeout(() => synchronize(), 1000);

            return true;
        } else {
            console.warn('❌ Échec du basculement vers le backend API');
            return false;
        }
    }, [dataService, synchronize]);

    const switchToAirtable = useCallback(() => {
        console.log('🔄 Basculement vers Airtable...');

        dataService.switchToAirtable();
        setCurrentDataSource(DataSource.AIRTABLE);

        console.log('✅ Basculé vers Airtable');
    }, [dataService]);

    const getDataSourceStatus = useCallback(() => {
        return dataService.getStatus();
    }, [dataService]);

    return (
        <OfflineContext.Provider
            value={{
                isOnline,
                dataService,
                pendingChangesCount,
                synchronize: dataService.synchronize,
                lastSyncTime,
                isOfflineForced,
                toggleOfflineMode,
                isSynchronizing,
                clearPendingChanges,

                // Nouvelles propriétés
                currentDataSource,
                switchToBackendApi,
                switchToAirtable,
                getDataSourceStatus,
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