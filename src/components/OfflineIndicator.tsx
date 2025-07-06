// import React from 'react';
// import { useOffline } from '../contexts/OfflineContext';
// import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';

// export const OfflineIndicator: React.FC = () => {
//     const { isOnline, isOfflineForced, pendingChangesCount, synchronize, lastSyncTime, isSynchronizing, clearPendingChanges } = useOffline();

//     // Déterminer le statut réel
//     const status = isOfflineForced
//         ? "Mode hors ligne forcé (développement)"
//         : isOnline
//             ? "Connecté"
//             : "Mode hors ligne (pas de connexion)";

//     // Format plus clair pour le temps écoulé
//     const formatLastSync = () => {
//         if (!lastSyncTime) return 'Jamais';

//         const now = new Date();
//         const diff = now.getTime() - lastSyncTime.getTime();
//         const minutes = Math.floor(diff / 60000);

//         if (minutes < 1) return 'À l\'instant';
//         if (minutes < 60) return `Il y a ${minutes} min`;

//         const hours = Math.floor(minutes / 60);
//         if (hours < 24) return `Il y a ${hours}h`;

//         return lastSyncTime.toLocaleDateString();
//     };

//     return (
//         <motion.div
//             className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg z-50 ${isOfflineForced
//                     ? 'bg-purple-100 text-purple-800'
//                     : isOnline
//                         ? pendingChangesCount > 0
//                             ? 'bg-yellow-50 text-yellow-700'
//                             : 'bg-green-50 text-green-700'
//                         : 'bg-red-50 text-red-700'
//                 }`}
//         >
//             <div className="flex items-center gap-2">
//                 <span className="font-medium">{status}</span>

//                 {pendingChangesCount > 0 && (
//                     <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
//                         {pendingChangesCount} en attente
//                     </span>
//                 )}

//                 {isOnline && !isOfflineForced && (
//                     <button
//                         onClick={synchronize}
//                         disabled={isSynchronizing}
//                         className={`ml-2 p-1 rounded ${isSynchronizing ? 'bg-gray-200' : 'bg-green-200 hover:bg-green-300'
//                             }`}
//                         title="Synchroniser maintenant"
//                     >
//                         <RefreshCw className={`w-4 h-4 ${isSynchronizing ? 'animate-spin' : ''}`} />
//                     </button>
//                 )}
//             </div>

//             <div className="flex justify-between items-center text-xs mt-1">
//                 <span>Dernière synchro: {formatLastSync()} </span>

//                 {isOfflineForced && (
//                     <span className="text-purple-600 font-semibold">
//                         Aucun appel API ne sera effectué
//                     </span>
//                 )}
//                 {isOfflineForced && pendingChangesCount > 0 && (
//                     <button
//                         onClick={() => clearPendingChanges()}
//                         className="px-2 py-1 mt-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
//                     >
//                         Purger {pendingChangesCount} changements
//                     </button>
//                 )}
//             </div>
//         </motion.div>
//     );
// };