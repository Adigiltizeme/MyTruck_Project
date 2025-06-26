import React, { useState, useEffect } from 'react';

export const DataSourceIndicator: React.FC = () => {
    const [dataSource, setDataSource] = useState<string>('unknown');
    const [isBackendAvailable, setIsBackendAvailable] = useState<boolean>(false);

    useEffect(() => {
        const checkDataSource = () => {
            const authMethod = localStorage.getItem('authMethod');
            const userSource = localStorage.getItem('userSource');

            setDataSource(authMethod || userSource || 'unknown');
        };

        const checkBackendHealth = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/v1/health');
                setIsBackendAvailable(response.ok);
            } catch {
                setIsBackendAvailable(false);
            }
        };

        checkDataSource();
        checkBackendHealth();

        // Écouter les changements
        const interval = setInterval(() => {
            checkDataSource();
            checkBackendHealth();
        }, 30000); // Vérifier toutes les 30s

        return () => clearInterval(interval);
    }, []);

    const getIndicatorColor = () => {
        if (dataSource === 'backend_api' && isBackendAvailable) return 'bg-green-500';
        if (dataSource === 'airtable') return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getIndicatorText = () => {
        if (dataSource === 'backend_api' && isBackendAvailable) return 'Backend API';
        if (dataSource === 'backend_api' && !isBackendAvailable) return 'Backend API (Hors ligne)';
        if (dataSource === 'airtable') return 'Airtable (Mode dégradé)';
        return 'Source inconnue';
    };

    return (
        <div className="flex items-center space-x-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${getIndicatorColor()}`}></div>
            <span className="text-gray-600">{getIndicatorText()}</span>
        </div>
    );
};

// ==========================================
// Commandes de debug améliorées
// ==========================================

// Exposer des commandes de debug spécifiques

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {

    (window as any).forceBackendAPI = () => {
        localStorage.setItem('preferredDataSource', 'backend_api');
        localStorage.setItem('userSource', 'backend');
        localStorage.setItem('authMethod', 'backend_api');
        console.log('🔒 FORCÉ: Backend API activé');
        window.location.reload();
    };

    (window as any).forceAirtable = () => {
        localStorage.setItem('preferredDataSource', 'airtable');
        localStorage.setItem('userSource', 'legacy');
        localStorage.setItem('authMethod', 'airtable');
        console.log('📊 FORCÉ: Airtable activé');
        window.location.reload();
    };

    (window as any).checkDataSource = () => {
        console.group('🔍 SOURCE DE DONNÉES ACTUELLE');
        console.log('Auth method:', localStorage.getItem('authMethod'));
        console.log('User source:', localStorage.getItem('userSource'));
        console.log('Preferred source:', localStorage.getItem('preferredDataSource'));
        console.groupEnd();
    };

    console.log('💡 Commandes debug disponibles:');
    console.log('  - window.forceBackendAPI()');
    console.log('  - window.forceAirtable()');
    console.log('  - window.checkDataSource()');
}