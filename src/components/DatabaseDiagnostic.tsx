import React, { useState } from 'react';

const DatabaseDiagnostic: React.FC = () => {
    const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    const runDiagnostic = async () => {
        setIsRunning(true);
        let info = "** DIAGNOSTIC DES BASES DE DONNÉES **\n\n";

        try {
            // Diagnostiquer le localStorage
            info += "--- localStorage ---\n";
            info += `Nombre d'éléments: ${localStorage.length}\n`;
            info += `Taille estimée: ${new Blob([JSON.stringify(localStorage)]).size / 1024} Ko\n`;
            info += `Clés: ${Object.keys(localStorage).join(', ')}\n\n`;

            // Diagnostiquer les bases IndexedDB
            info += "--- IndexedDB ---\n";

            try {
                const databases = await window.indexedDB.databases();
                info += `Bases détectées: ${databases.length}\n`;

                for (const db of databases) {
                    info += `\nBase: ${db.name}, Version: ${db.version}\n`;

                    try {
                        // Tenter d'ouvrir la base pour examiner sa structure
                        const openRequest = indexedDB.open(db.name!);

                        await new Promise<void>((resolve, reject) => {
                            openRequest.onerror = (event) => {
                                info += `  Erreur d'ouverture: ${openRequest.error?.message}\n`;
                                resolve();
                                event.preventDefault(); // Empêche la propagation de l'erreur
                                reject(new Error("Erreur d'ouverture de la base de données"));
                            };

                            openRequest.onsuccess = () => {
                                const database = openRequest.result;
                                info += `  État: Ouvert correctement\n`;
                                info += `  Tables: ${Array.from(database.objectStoreNames).join(', ')}\n`;

                                // Fermer proprement
                                database.close();
                                resolve();
                            };

                            openRequest.onblocked = () => {
                                info += `  État: BLOQUÉ\n`;
                                resolve();
                            };
                        });
                    } catch (err) {
                        info += `  Exception: ${err instanceof Error ? err.message : 'Erreur inconnue'}\n`;
                    }
                }
            } catch (err) {
                info += `Erreur lors de l'énumération des bases: ${err instanceof Error ? err.message : 'Erreur inconnue'}\n`;
            }

            // Diagnostiquer la mémoire et l'espace disque (si disponible)
            info += "\n--- Mémoire et Espace Disque ---\n";

            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                info += `Quota: ${Math.round(estimate.quota! / (1024 * 1024))} Mo\n`;
                info += `Utilisé: ${Math.round(estimate.usage! / (1024 * 1024))} Mo (${Math.round((estimate.usage! / estimate.quota!) * 100)}%)\n`;
            } else {
                info += "Information sur le stockage non disponible\n";
            }

            setDiagnosticInfo(info);
        } catch (error) {
            setDiagnosticInfo(`Erreur lors du diagnostic: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        } finally {
            setIsRunning(false);
        }
    };

    const copyToClipboard = () => {
        if (diagnosticInfo) {
            navigator.clipboard.writeText(diagnosticInfo);
            alert("Diagnostic copié dans le presse-papier");
        }
    };

    const handleHideDiagnostic = () => {
        setDiagnosticInfo(null);
        setIsRunning(false);
    }

    return (
        <div className="mt-6 bg-white p-4 rounded-lg shadow dark:bg-gray-800">
            <h3 className="font-medium text-lg mb-2">Diagnostic des bases de données</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Exécutez un diagnostic pour obtenir des informations sur l'état de vos bases de données.
            </p>

            <button
                onClick={runDiagnostic}
                disabled={isRunning}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isRunning ? 'Diagnostic en cours...' : 'Exécuter le diagnostic'}
            </button>


            {diagnosticInfo && (
                <>
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded overflow-auto max-h-80">
                        <pre className="text-xs whitespace-pre-wrap">{diagnosticInfo}</pre>
                    </div>
                    <div className="text-sm text-gray-500 mt-2 flex justify-evenly">
                    <button
                        onClick={copyToClipboard}
                        className="mt-2 py-1 px-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 rounded"
                    >
                        Copier dans le presse-papier
                    </button>
                    {diagnosticInfo && (
                        <button
                            onClick={handleHideDiagnostic}
                            className="mt-2 py-1 px-2 text-sm bg-gray-200 hover:bg-gray-300  dark:bg-gray-700  dark:text-gray-400 dark:hover:bg-gray-600 rounded"
                        >
                            Masquer le diagnostic
                        </button>
                    )}
                    </div>
                </>
            )}
        </div>
    );
};

export default DatabaseDiagnostic;