import { useEffect, useState } from "react";
import DatabaseDiagnostic from "../../components/DatabaseDiagnostic";
import EmergencyReset from "../../components/EmergencyReset";
import StorageCleanup from "../../components/StorageCleanup";
import { useAuth } from "../../contexts/AuthContext";
import DatabaseExplorer from "../../components/DatabaseExplorer";
import DatabaseHealthDashboard from "../../components/DatabaseHealthDashboard";
import { useOffline } from "../../contexts/OfflineContext";

export default function Settings() {
    const [preferences, setPreferences] = useState({
        enableNotifications: true,
        darkMode: false,
        language: 'fr'
    });

    const { user } = useAuth();
    const { isOnline } = useOffline();

    useEffect(() => {
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
            try {
                setPreferences(JSON.parse(savedPreferences));
            } catch (error) {
                console.error('Erreur lors du chargement des préférences:', error);
            }
        }
    }, []);

    const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;

        setPreferences(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));

        // Dans une version réelle, sauvegarderz ces préférences
        localStorage.setItem('userPreferences', JSON.stringify({
            ...preferences,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };
    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Paramètres</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Gérer les paramètres de l'application et effectuer des diagnostics.
            </p>
            {/* Section de préférences */}
            <div className="bg-white p-6 rounded-lg shadow mb-6 dark:bg-gray-800">
                <h2 className="text-lg font-medium mb-4">Préférences</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label htmlFor="enableNotifications" className="text-gray-700 dark:text-gray-400">
                            Activer les notifications
                        </label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input
                                id="enableNotifications"
                                name="enableNotifications"
                                type="checkbox"
                                checked={preferences.enableNotifications}
                                onChange={handlePreferenceChange}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            />
                            <label
                                htmlFor="enableNotifications"
                                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${preferences.enableNotifications ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                            ></label>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label htmlFor="darkMode" className="text-gray-700 dark:text-gray-400">
                            Mode sombre
                        </label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input
                                id="darkMode"
                                name="darkMode"
                                type="checkbox"
                                checked={preferences.darkMode}
                                onChange={handlePreferenceChange}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            />
                            <label
                                htmlFor="darkMode"
                                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${preferences.darkMode ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                            ></label>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="language" className="block text-gray-700 mb-2 dark:text-gray-400">
                            Langue
                        </label>
                        <select
                            id="language"
                            name="language"
                            value={preferences.language}
                            onChange={handlePreferenceChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                                    focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm
                                    dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="fr">Français</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">Gestion des données</h2>

                {user?.role === 'admin' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-medium mb-2">Actions administrateur</h3>
                            <div className="flex gap-4 flex-wrap">
                                <button
                                    onClick={() => window.open('/admin/magasins', '_blank')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Gérer les magasins
                                </button>
                                <button
                                    onClick={() => window.open('/admin/chauffeurs', '_blank')}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Gérer les chauffeurs
                                </button>
                                <button
                                    onClick={() => window.open('/admin/commandes', '_blank')}
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                    Vue globale commandes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-4">
                    <h3 className="font-medium mb-2">Informations système</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>Source de données : Backend API</p>
                        <p>Mode : {isOnline ? 'En ligne' : 'Hors ligne'}</p>
                        <p>Rôle actuel : {user?.role}</p>
                        {user?.storeName && <p>Magasin : {user.storeName}</p>}
                    </div>
                </div>
            </div>

            {/* Section de maintenance (admin uniquement) */}
            {user?.role === 'admin' && (
                <>
                    <DatabaseHealthDashboard />
                    <DatabaseExplorer />
                    <DatabaseDiagnostic />
                    <StorageCleanup />
                    <EmergencyReset />
                </>
            )}
        </div>
    );
}