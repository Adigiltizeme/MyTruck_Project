import React, { useEffect, useState } from 'react';
import { DbMonitor } from '../utils/db-repair';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Composant de surveillance des erreurs de base de données qui affiche des notifications
 * lorsque des problèmes sont détectés
 */
const DatabaseErrorMonitor: React.FC = () => {
    const [showNotification, setShowNotification] = useState(false);
    const [errorStatus, setErrorStatus] = useState<'degraded' | 'critical' | null>(null);
    const navigate = useNavigate();

    // Vérifier l'état de santé périodiquement
    useEffect(() => {
        let mounted = true;

        const checkHealth = async () => {
            if (!mounted) return;

            try {
                const health = await DbMonitor.analyzeDbHealth();

                if (health.status === 'critical') {
                    setErrorStatus('critical');
                    setShowNotification(true);
                } else if (health.status === 'degraded') {
                    setErrorStatus('degraded');
                    setShowNotification(true);
                } else {
                    setErrorStatus(null);
                    setShowNotification(false);
                }
            } catch (error) {
                console.error('Erreur lors de la vérification de l\'état de santé de la base de données:', error);
            }
        };

        // Vérifier immédiatement
        checkHealth();

        // Puis vérifier périodiquement
        const interval = setInterval(checkHealth, 60000); // Vérifier toutes les minutes

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    // Diriger vers la page des paramètres pour réparation
    const handleRepair = () => {
        setShowNotification(false);
        navigate('/settings');
    };

    // Ignorer la notification
    const handleDismiss = () => {
        setShowNotification(false);

        // Réafficher après 10 minutes si le problème persiste
        setTimeout(() => {
            if (errorStatus) {
                setShowNotification(true);
            }
        }, 10 * 60 * 1000);
    };

    if (!showNotification || !errorStatus) {
        return null;
    }

    return (
        <AnimatePresence>
            {showNotification && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className={`fixed bottom-16 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${errorStatus === 'critical'
                            ? 'bg-red-100 border-l-4 border-red-500 text-red-700'
                            : 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700'
                        }`}
                >
                    <div className="flex">
                        <div className="flex-shrink-0">
                            {errorStatus === 'critical' ? (
                                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9h2v4H9V9zm0-4h2v2H9V5z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div className="ml-3">
                            <h3 className="font-medium">
                                {errorStatus === 'critical'
                                    ? 'Problème critique de base de données'
                                    : 'Problème de base de données détecté'
                                }
                            </h3>
                            <div className="mt-1 text-sm">
                                {errorStatus === 'critical'
                                    ? 'Des erreurs graves ont été détectées dans la base de données. Une réparation est nécessaire pour continuer à utiliser l\'application correctement.'
                                    : 'Des problèmes légers ont été détectés dans la base de données. Une réparation est recommandée.'
                                }
                            </div>
                            <div className="mt-2 flex space-x-2">
                                <button
                                    onClick={handleRepair}
                                    className={`px-3 py-1 text-sm font-medium rounded-md ${errorStatus === 'critical'
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                        }`}
                                >
                                    Réparer maintenant
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="px-3 py-1 text-sm font-medium bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
                                >
                                    Ignorer
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DatabaseErrorMonitor;