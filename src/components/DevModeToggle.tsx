import React, { useState, useEffect } from 'react';
import { useOffline } from '../contexts/OfflineContext';

const DevModeToggle: React.FC = () => {
    const { isOfflineForced, toggleOfflineMode } = useOffline();

    useEffect(() => {
        // Mettre à jour le localStorage quand le state change
        localStorage.setItem('forceOfflineMode', String(isOfflineForced));

        // Recharger la page pour que le changement prenne effet
        if (isOfflineForced !== (localStorage.getItem('forceOfflineMode') === 'true')) {
            window.location.reload();
        }
    }, [isOfflineForced]);

    return (
        // <div className="fixed top-14 right-4 z-50 bg-white p-2 rounded-lg shadow-md flex items-center space-x-2">
        <div className="fixed top-4 left-1/2 z-50 bg-white p-2 rounded-lg shadow-md flex items-center space-x-2">
            <span className="text-sm font-medium">Mode développement:</span>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={isOfflineForced}
                    onChange={toggleOfflineMode}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-medium text-gray-900">
                    {isOfflineForced ? "Offline forcé" : "Online"}
                </span>
            </label>
        </div>
    );
};

export default DevModeToggle;