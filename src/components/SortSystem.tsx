import { useState } from "react";

export const SortSystem = () => {
    const [sortConfig, setSortConfig] = useState({
        key: 'date',
        direction: 'desc'
    });

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">Trier par:</span>
            {['date', 'creneau', 'statut', 'magasin', 'chauffeur'].map(key => (
                <button
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-3 py-1 rounded-lg text-sm ${sortConfig.key === key ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                        }`}
                >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {sortConfig.key === key && (
                        <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};