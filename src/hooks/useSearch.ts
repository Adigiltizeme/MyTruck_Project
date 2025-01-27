import { useMemo, useState } from 'react';
import { UseSearchProps, UseSearchReturn } from '../types/hooks.types';
import { getNestedPropertyValue } from '../helpers/getNestedValue';
import { dateFormatter } from '../utils/formatters';


export function useSearch<T>({ items, searchKeys }: UseSearchProps<T>): UseSearchReturn<T> {
    const [search, setSearch] = useState("");

    const filteredItems = useMemo(() => {
        if (!search) return items;
        const searchLower = search.toLowerCase();
        const searchDate = dateFormatter.convertSearchDate(searchLower);

        return items.filter(item => {
            return searchKeys.some(key => {
                const value = getNestedPropertyValue(item, key.toString());
                if (!value) return false;

                // Gestion spéciale des tableaux (comme chauffeurs)
                if (Array.isArray(value)) {
                    return value.some(item =>
                        // Pour chaque chauffeur, vérifie tous ses champs
                        Object.values(item).some(field =>
                            String(field).toLowerCase().includes(searchLower)
                        )
                    );
                }

                // Gestion des dates
                if (key.toString().includes('date') ||
                    (typeof value === 'string' && !isNaN(Date.parse(value)))) {
                    try {
                        const itemDate = dateFormatter.forDisplay(value);
                        return itemDate.toLowerCase().includes(searchLower) ||
                            value.includes(searchDate);
                    } catch {
                        return false;
                    }
                }

                // Pour les objets imbriqués
                if (typeof value === 'object' && value !== null) {
                    return Object.values(value).some(v =>
                        String(v).toLowerCase().includes(searchLower)
                    );
                }

                // Pour les valeurs simples
                return String(value).toLowerCase().includes(searchLower);
            });
        });
    }, [items, search, searchKeys]);

    return { search, setSearch, filteredItems };
}