import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gpsTrackingService } from '../services/gps-tracking.service';
import { AnimatePresence, motion } from 'framer-motion';

interface DriverTrackingToggleProps {
    commandeId?: string;
    statutLivraison?: string;
    isDeliveryActive: boolean;
}

export const DriverTrackingToggle: React.FC<DriverTrackingToggleProps> = ({
    commandeId,
    statutLivraison,
    isDeliveryActive
}) => {
    const { user } = useAuth();
    const token = localStorage.getItem('authToken');
    const [isTrackingActive, setIsTrackingActive] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [trackingError, setTrackingError] = useState<string | null>(null);

    // Identifiants chauffeur
    const chauffeurId = user?.role === 'chauffeur' && user?.driverId ? user.driverId : user?.id || '';
    const chauffeurName = user?.driverName || user?.name || user?.email?.split('@')[0] || 'Chauffeur';

    // ✅ Gérer le service GPS global (persiste même quand on change de page)
    useEffect(() => {
        if (!isDeliveryActive || !commandeId || !token) {
            // Arrêter le tracking si livraison terminée
            if (gpsTrackingService.isTracking()) {
                console.log('[DriverTrackingToggle] 🛑 Delivery finished - stopping GPS');
                gpsTrackingService.stop();
                setIsTrackingActive(false);
                localStorage.setItem(`autoTracking_${chauffeurId}`, 'false');
            }
            return;
        }

        // Vérifier si auto-tracking activé
        const autoTrackingEnabled = localStorage.getItem(`autoTracking_${chauffeurId}`);
        const shouldAutoStart = autoTrackingEnabled === 'true';

        if (shouldAutoStart && !gpsTrackingService.isTracking()) {
            console.log('[DriverTrackingToggle] 🚀 Auto-starting GPS tracking');
            gpsTrackingService.start({
                chauffeurId,
                chauffeurName,
                commandeId,
                statutLivraison: statutLivraison || 'EN COURS DE LIVRAISON',
                token,
            });
            setIsTrackingActive(true);
        } else if (gpsTrackingService.isTracking()) {
            // Synchroniser l'état UI si le service est déjà actif
            setIsTrackingActive(true);
        }
    }, [isDeliveryActive, commandeId, chauffeurId, chauffeurName, statutLivraison, token]);

    const handleToggleTracking = () => {
        if (isTrackingActive) {
            setShowConfirmDialog(true);
        } else {
            // ✅ Démarrer le service GPS global
            if (commandeId && token) {
                gpsTrackingService.start({
                    chauffeurId,
                    chauffeurName,
                    commandeId,
                    statutLivraison: statutLivraison || 'EN COURS DE LIVRAISON',
                    token,
                });
                setIsTrackingActive(true);
                localStorage.setItem(`autoTracking_${chauffeurId}`, 'true');
            } else {
                setTrackingError('Impossible de démarrer le GPS : informations manquantes');
            }
        }
    };

    const handleConfirmStop = () => {
        // ✅ Arrêter le service GPS global
        gpsTrackingService.stop();
        setIsTrackingActive(false);
        localStorage.setItem(`autoTracking_${chauffeurId}`, 'false');
        setShowConfirmDialog(false);
    };

    if (!isDeliveryActive) {
        return null;
    }

    return (
        <>
            <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isTrackingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                        }`}>
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                {isTrackingActive ? '📍 GPS Activé' : '📍 GPS Désactivé'}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {isTrackingActive
                                    ? 'Votre position est partagée en temps réel'
                                    : 'Activez le GPS pour partager votre position'}
                            </p>
                            {trackingError && (
                                <p className="text-xs text-red-600 mt-1">
                                    ⚠️ {trackingError}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleToggleTracking}
                        disabled={!isDeliveryActive}
                        className={`px-6 py-3 rounded-lg font-medium transition-all shadow-md ${
                            isTrackingActive
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isTrackingActive ? 'Arrêter le GPS' : 'Activer le GPS'}
                    </button>
                </div>

                {/* Informations supplémentaires */}
                <AnimatePresence>
                    {isTrackingActive && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-green-200"
                        >
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Mise à jour automatique toutes les 30 secondes</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span>Les magasins et la direction peuvent voir votre position</span>
                            </div>
                            {commandeId && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                    </svg>
                                    <span>Lié à la commande #{commandeId.slice(0, 8)}</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal de confirmation arrêt */}
            <AnimatePresence>
                {showConfirmDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setShowConfirmDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-lg p-6 max-w-md shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">Désactiver le GPS ?</h3>
                            </div>

                            <p className="text-gray-700 mb-6">
                                Êtes-vous sûr de vouloir désactiver le tracking GPS ? Les magasins et la direction
                                ne pourront plus suivre votre position en temps réel.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmDialog(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleConfirmStop}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Désactiver
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
