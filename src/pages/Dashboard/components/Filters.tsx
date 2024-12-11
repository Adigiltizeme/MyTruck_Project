import { useEffect, useState } from "react";
import { FilterOptions } from "../../../types/metrics";
import { AirtableService } from "../../../services/airtable.service";
import { CommandeMetier } from "../../../types/business.types";
import { Store } from "../../../types/delivery";

interface FiltersProps {
    onFilterChange: (filters: FilterOptions) => void;
}

const Filters: React.FC<FiltersProps> = ({ onFilterChange }) => {
    const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
        dateRange: 'day',
        store: ''
    });

    // Récupérer dynamiquement la liste des magasins depuis Airtable
    const [stores, setStores] = useState<Store[]>([]);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
                const commandes = await airtableService.getCommandes();
                
                // Extraire les magasins uniques
                const uniqueStores = Array.from(
                    new Set(commandes.map((cmd: CommandeMetier) => JSON.stringify({
                        id: cmd.store.id,
                        name: cmd.store.name
                    })))
                ).map(str => JSON.parse(str as string));
    
                setStores(uniqueStores);
            } catch (error) {
                console.error('Erreur lors du chargement des magasins:', error);
            }
        };
    
        fetchStores();
    }, []);

    const handleFilterChange = (change: Partial<FilterOptions>) => {
        const newFilters = {
            ...currentFilters,
            ...change
        };
        setCurrentFilters(newFilters);
        onFilterChange(newFilters);
    };

    return (
        <div className="bg-white p-4 rounded-lg mb-6 flex gap-4">
            <select
                value={currentFilters.dateRange}
                onChange={(e) => handleFilterChange({ dateRange: e.target.value as FilterOptions['dateRange'] })}
                className="border rounded px-3 py-2"
            >
                <option value="day">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
            </select>

            <select
                value={currentFilters.store}
                className="border rounded px-3 py-2"
                onChange={(e) => handleFilterChange({ store: e.target.value })}
            >
                <option value="">Tous les magasins</option>
                {stores.map(store => (
                    <option key={store.name} value={store.name}>
                        {store.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default Filters;