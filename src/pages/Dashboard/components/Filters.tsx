import React from 'react';
import { FilterOptions, PeriodType } from '../../../types/metrics';
import { UserRole } from '../../../types/dashboard.types';
import { useAuth } from '../../../contexts/AuthContext';
import { isAdminRole } from '../../../utils/role-helpers';

interface FiltersProps {
    onFilterChange: (filters: FilterOptions) => void;
    stores?: string[];
    currentFilters: FilterOptions;
    userRole: UserRole;
}

export const Filters: React.FC<FiltersProps> = ({
    onFilterChange,
    stores = [],
    currentFilters,
}) => {
    const { user } = useAuth();

    const handlePeriodChange = (period: PeriodType) => {
        onFilterChange({
            ...currentFilters,
            dateRange: period
        });
    };

    const handleStoreChange = (store: string) => {
        onFilterChange({
            ...currentFilters,
            store
        });
    };

    return (
        <div className="flex space-x-4">
            <select 
                value={currentFilters.dateRange}
                onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
                className="border rounded-lg px-3 py-2 bg-white"
            >
                <option value="day">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
            </select>
            
            {/* Sélecteur de magasin uniquement pour admin */}
            {user?.role === 'admin' && (
                <select
                    value={currentFilters.store}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white"
                >
                    <option value="">Tous les magasins</option>
                    {stores?.map((storeName) => (
                        <option key={storeName} value={storeName}>
                            {storeName}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
};

export default React.memo(Filters);