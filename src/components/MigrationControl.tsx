// import React, { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { useOffline } from '../contexts/OfflineContext';
// import { DataSource } from '../services/data-service-adapter';
// import {
//     CloudIcon,
//     ServerIcon,
//     WifiIcon,
//     CheckCircleIcon,
//     ExclamationTriangleIcon,
//     ArrowPathIcon
// } from '@heroicons/react/24/outline';

// export const MigrationControl: React.FC = () => {
//     const {
//         currentDataSource,
//         switchToBackendApi,
//         switchToAirtable,
//         getDataSourceStatus,
//         synchronize,
//         isSynchronizing,
//         pendingChangesCount,
//         isOnline
//     } = useOffline();

//     const [status, setStatus] = useState(getDataSourceStatus());
//     const [isSwitching, setIsSwitching] = useState(false);
//     const [showDetails, setShowDetails] = useState(false);

//     // Mettre à jour le statut périodiquement
//     useEffect(() => {
//         const updateStatus = () => {
//             setStatus(getDataSourceStatus());
//         };

//         updateStatus();
//         const interval = setInterval(updateStatus, 5000);
//         return () => clearInterval(interval);
//     }, [getDataSourceStatus]);

//     const handleSwitchToApi = async () => {
//         setIsSwitching(true);
//         try {
//             const success = await switchToBackendApi();
//             if (success) {
//                 // Synchroniser les données
//                 await synchronize();
//             }
//         } catch (error) {
//             console.error('Erreur lors du basculement:', error);
//         } finally {
//             setIsSwitching(false);
//         }
//     };

//     const handleSwitchToAirtable = () => {
//         setIsSwitching(true);
//         switchToAirtable();
//         setTimeout(() => setIsSwitching(false), 1000);
//     };

//     const getSourceIcon = (source: DataSource) => {
//         switch (source) {
//             case DataSource.BACKEND_API:
//                 return <ServerIcon className="w-5 h-5" />;
//             case DataSource.AIRTABLE:
//                 return <CloudIcon className="w-5 h-5" />;
//             default:
//                 return <ArrowPathIcon className="w-5 h-5" />;
//         }
//     };

//     const getSourceName = (source: DataSource) => {
//         switch (source) {
//             case DataSource.BACKEND_API:
//                 return 'Backend API';
//             case DataSource.AIRTABLE:
//                 return 'Airtable';
//             case DataSource.AUTO:
//                 return 'Automatique';
//             default:
//                 return 'Inconnu';
//         }
//     };

//     const getStatusColor = () => {
//         if (!isOnline) return 'text-gray-500';
//         if (status.source === DataSource.BACKEND_API && status.apiAvailable) {
//             return 'text-green-600';
//         }
//         if (status.source === DataSource.AIRTABLE) {
//             return 'text-blue-600';
//         }
//         return 'text-yellow-600';
//     };

//     const getStatusBg = () => {
//         if (!isOnline) return 'bg-gray-50 border-gray-200';
//         if (status.source === DataSource.BACKEND_API && status.apiAvailable) {
//             return 'bg-green-50 border-green-200';
//         }
//         if (status.source === DataSource.AIRTABLE) {
//             return 'bg-blue-50 border-blue-200';
//         }
//         return 'bg-yellow-50 border-yellow-200';
//     };

//     return (
//         <motion.div
//             initial={{ opacity: 0, y: -10 }}
//             animate={{ opacity: 1, y: 0 }}
//             className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg ${getStatusBg()}`}
//         >
//             <div className="flex items-center gap-3">
//                 {/* Icône de statut réseau */}
//                 <div className="flex items-center gap-2">
//                     {isOnline ? (
//                         <WifiIcon className="w-4 h-4 text-green-500" />
//                     ) : (
//                         <WifiIcon className="w-4 h-4 text-red-500" />
//                     )}
//                 </div>

//                 {/* Source de données actuelle */}
//                 <div className={`flex items-center gap-2 ${getStatusColor()}`}>
//                     {getSourceIcon(status.source)}
//                     <span className="text-sm font-medium">
//                         {getSourceName(status.source)}
//                     </span>
//                 </div>

//                 {/* Indicateur d'état */}
//                 <div className="flex items-center gap-1">
//                     {status.apiAvailable && status.source === DataSource.BACKEND_API ? (
//                         <CheckCircleIcon className="w-4 h-4 text-green-500" />
//                     ) : status.source === DataSource.AIRTABLE ? (
//                         <CheckCircleIcon className="w-4 h-4 text-blue-500" />
//                     ) : (
//                         <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
//                     )}
//                 </div>

//                 {/* Changements en attente */}
//                 {pendingChangesCount > 0 && (
//                     <motion.div
//                         initial={{ scale: 0 }}
//                         animate={{ scale: 1 }}
//                         className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full"
//                     >
//                         {pendingChangesCount}
//                     </motion.div>
//                 )}

//                 {/* Bouton de détails */}
//                 <button
//                     onClick={() => setShowDetails(!showDetails)}
//                     className="text-gray-500 hover:text-gray-700 transition-colors"
//                 >
//                     <svg
//                         className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
//                         fill="none"
//                         stroke="currentColor"
//                         viewBox="0 0 24 24"
//                     >
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                     </svg>
//                 </button>
//             </div>

//             {/* Panneau de détails */}
//             <AnimatePresence>
//                 {showDetails && (
//                     <motion.div
//                         initial={{ opacity: 0, height: 0 }}
//                         animate={{ opacity: 1, height: 'auto' }}
//                         exit={{ opacity: 0, height: 0 }}
//                         className="mt-4 pt-4 border-t border-gray-200"
//                     >
//                         <div className="space-y-3">
//                             {/* Informations de statut */}
//                             <div className="text-xs space-y-1">
//                                 <div className="flex justify-between">
//                                     <span className="text-gray-600">Backend API:</span>
//                                     <span className={status.apiAvailable ? 'text-green-600' : 'text-red-600'}>
//                                         {status.apiAvailable ? 'Disponible' : 'Indisponible'}
//                                     </span>
//                                 </div>
//                                 <div className="flex justify-between">
//                                     <span className="text-gray-600">Données locales:</span>
//                                     <span className={status.hasLocal ? 'text-green-600' : 'text-red-600'}>
//                                         {status.hasLocal ? 'Disponibles' : 'Indisponibles'}
//                                     </span>
//                                 </div>
//                                 <div className="flex justify-between">
//                                     <span className="text-gray-600">En attente:</span>
//                                     <span className={pendingChangesCount > 0 ? 'text-yellow-600' : 'text-green-600'}>
//                                         {pendingChangesCount} changements
//                                     </span>
//                                 </div>
//                             </div>

//                             {/* Boutons de contrôle */}
//                             <div className="flex gap-2">
//                                 {/* Bouton pour basculer vers l'API */}
//                                 {status.source !== DataSource.BACKEND_API && status.apiAvailable && (
//                                     <button
//                                         onClick={handleSwitchToApi}
//                                         disabled={isSwitching || !isOnline}
//                                         className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                     >
//                                         {isSwitching ? (
//                                             <ArrowPathIcon className="w-3 h-3 animate-spin" />
//                                         ) : (
//                                             <ServerIcon className="w-3 h-3" />
//                                         )}
//                                         Utiliser API
//                                     </button>
//                                 )}

//                                 {/* Bouton pour basculer vers Airtable */}
//                                 {status.source !== DataSource.AIRTABLE && (
//                                     <button
//                                         onClick={handleSwitchToAirtable}
//                                         disabled={isSwitching}
//                                         className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                     >
//                                         {isSwitching ? (
//                                             <ArrowPathIcon className="w-3 h-3 animate-spin" />
//                                         ) : (
//                                             <CloudIcon className="w-3 h-3" />
//                                         )}
//                                         Utiliser Airtable
//                                     </button>
//                                 )}

//                                 {/* Bouton de synchronisation */}
//                                 <button
//                                     onClick={synchronize}
//                                     disabled={isSynchronizing || !isOnline}
//                                     className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                 >
//                                     <ArrowPathIcon className={`w-3 h-3 ${isSynchronizing ? 'animate-spin' : ''}`} />
//                                     Sync
//                                 </button>
//                             </div>

//                             {/* Messages d'aide */}
//                             <div className="text-xs text-gray-500">
//                                 {!isOnline && (
//                                     <p className="text-red-600">
//                                         ⚠️ Mode hors ligne - Utilisation des données locales
//                                     </p>
//                                 )}
//                                 {isOnline && status.source === DataSource.BACKEND_API && status.apiAvailable && (
//                                     <p className="text-green-600">
//                                         ✅ Connecté au nouveau backend
//                                     </p>
//                                 )}
//                                 {isOnline && status.source === DataSource.AIRTABLE && (
//                                     <p className="text-blue-600">
//                                         📊 Utilisation d'Airtable (mode hérité)
//                                     </p>
//                                 )}
//                                 {isOnline && !status.apiAvailable && (
//                                     <p className="text-yellow-600">
//                                         ⚠️ Backend indisponible - Fallback vers Airtable
//                                     </p>
//                                 )}
//                             </div>
//                         </div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </motion.div>
//     );
// };