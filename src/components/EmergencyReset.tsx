import React, { useState } from 'react';
import { DatabaseManager } from '../services/database-manager.service';

const EmergencyReset: React.FC = () => {
    const [status, setStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleManualReset = async () => {
        if (!confirm("ATTENTION: Cette opération va réinitialiser toutes les bases de données et supprimer toutes les données locales. Voulez-vous continuer?")) {
            return;
        }

        setIsLoading(true);
        setStatus("Début de la réinitialisation...");

        try {
            await DatabaseManager.resetAllDatabases();
            setStatus("Réinitialisation terminée. La page va se recharger...");
        } catch (error) {
            setStatus(`Erreur lors de la réinitialisation: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6 bg-white p-4 rounded-lg shadow dark:bg-gray-800">
            <h3 className="font-medium text-lg mb-2">Réinitialisation d'urgence alternative</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Utilisez cette méthode alternative si la réinitialisation standard échoue.
                Cette opération tentera de fermer et supprimer manuellement les bases de données corrompues.
            </p>

            <button
                onClick={handleManualReset}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-red-800 text-white rounded hover:bg-red-900 disabled:opacity-50"
            >
                {isLoading ? 'Réinitialisation en cours...' : 'Réinitialisation d\'urgence alternative'}
            </button>

            {status && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                    <p className="font-medium mb-1">État de la réinitialisation:</p>
                    <p className="whitespace-pre-line">{status}</p>
                </div>
            )}
        </div>
    );
};

export default EmergencyReset;