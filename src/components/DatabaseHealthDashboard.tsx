import React, { useState, useEffect } from 'react';
import { DbMonitor, DbRepair } from '../utils/db-repair';

const DatabaseHealthDashboard: React.FC = () => {
    const [health, setHealth] = useState<{
        status: 'good' | 'degraded' | 'critical';
        message: string;
        details: {
            errorRate: number;
            lastErrors: Array<{ timestamp: number; operation: string; error?: string }>;
        };
    } | null>(null);

    const [isRepairing, setIsRepairing] = useState(false);
    const [repairResult, setRepairResult] = useState<any>(null);

    // Charger les données de santé
    useEffect(() => {
        const loadHealth = async () => {
            const healthData = await DbMonitor.analyzeDbHealth();
            setHealth(healthData);
        };

        loadHealth();

        // Actualiser toutes les 30 secondes
        const interval = setInterval(loadHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fonction pour lancer une réparation manuelle
    const handleRepair = async () => {
        if (isRepairing) return;

        setIsRepairing(true);
        setRepairResult(null);

        try {
            const result = await DbRepair.checkAndRepair();
            setRepairResult(result);

            // Recharger l'état de santé
            const healthData = await DbMonitor.analyzeDbHealth();
            setHealth(healthData);
        } catch (error) {
            console.error('Erreur lors de la réparation:', error);
            setRepairResult({
                success: false,
                message: error instanceof Error ? error.message : String(error)
            });
        } finally {
            setIsRepairing(false);
        }
    };

    // Obtenir la couleur selon le statut
    const getStatusColor = (status: 'good' | 'degraded' | 'critical') => {
        switch (status) {
            case 'good': return 'bg-green-100 text-green-800';
            case 'degraded': return 'bg-yellow-100 text-yellow-800';
            case 'critical': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Formatter un timestamp en date lisible
    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mt-6">
            <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
                État de santé des bases de données
            </h2>

            {health ? (
                <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${getStatusColor(health.status)}`}>
                        <div className="flex items-center">
                            <div className={`h-3 w-3 rounded-full ${health.status === 'good' ? 'bg-green-500' :
                                    health.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                                } mr-2`}></div>
                            <h3 className="font-medium">
                                Statut: {
                                    health.status === 'good' ? 'Bon' :
                                        health.status === 'degraded' ? 'Dégradé' : 'Critique'
                                }
                            </h3>
                        </div>
                        <p className="mt-1">{health.message}</p>

                        <div className="mt-2 text-sm">
                            Taux d'erreur: {(health.details.errorRate * 100).toFixed(1)}%
                        </div>
                    </div>

                    <div>
                        <h3 className="font-medium mb-2">Dernières erreurs</h3>
                        {health.details.lastErrors.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Opération</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Erreur</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {health.details.lastErrors.map((error, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {formatTimestamp(error.timestamp)}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                                                    {error.operation}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">
                                                    {error.error || 'Erreur non spécifiée'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune erreur récente.</p>
                        )}
                    </div>

                    <div className="pt-4 border-t dark:border-gray-700">
                        <button
                            onClick={handleRepair}
                            disabled={isRepairing}
                            className={`px-4 py-2 rounded-lg text-white ${isRepairing ? 'bg-gray-400' : (
                                    health.status === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                                        health.status === 'degraded' ? 'bg-yellow-600 hover:bg-yellow-700' :
                                            'bg-blue-600 hover:bg-blue-700'
                                )
                                }`}
                        >
                            {isRepairing ? 'Réparation en cours...' : 'Lancer une réparation'}
                        </button>

                        {repairResult && (
                            <div className={`mt-4 p-4 rounded-lg ${repairResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                <h4 className="font-medium">
                                    {repairResult.success ? 'Réparation réussie' : 'Échec de la réparation'}
                                </h4>

                                {repairResult.tables && (
                                    <div className="mt-2">
                                        <h5 className="font-medium text-sm">Détail des tables:</h5>
                                        <ul className="mt-1 space-y-1 text-sm">
                                            {repairResult.tables.map((table: any, index: number) => (
                                                <li key={index} className="flex items-center">
                                                    <span className={`inline-block h-2 w-2 rounded-full mr-2 ${table.status === 'ok' ? 'bg-green-500' :
                                                            table.status === 'repaired' ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}></span>
                                                    <span>
                                                        {table.name}: {
                                                            table.status === 'ok' ? 'OK' :
                                                                table.status === 'repaired' ? 'Réparée' : 'Échec'
                                                        }
                                                        {table.message && ` - ${table.message}`}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {repairResult.message && (
                                    <p className="mt-2 text-sm">{repairResult.message}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            )}
        </div>
    );
};

export default DatabaseHealthDashboard;