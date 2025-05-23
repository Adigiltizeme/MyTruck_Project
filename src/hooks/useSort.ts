import { useMemo, useState } from "react";
import { SortableFields, SortConfig, UseSortProps, UseSortReturn } from "../types/hooks.types";
import { getNestedPropertyValue } from "../helpers/getNestedValue";

interface ItemWithMagasin {
    magasin?: { name: string };
    chauffeur?: { nom: string };
}

export function useSort<T extends ItemWithMagasin>( items: T[], defaultKey: SortableFields): UseSortReturn {
    const [sortConfig, setSortConfig] = useState<SortConfig>(() => ({
        key: defaultKey,
        direction: 'desc'
    }));

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            const direction = sortConfig.direction === 'asc' ? 1 : -1;
            
            switch(sortConfig.key) {
                case 'dates':
                    const aDate = getNestedPropertyValue(a, 'dates.livraison');
                    const bDate = getNestedPropertyValue(b, 'dates.livraison');
                    return (new Date(aDate).getTime() - new Date(bDate).getTime()) * direction;
                case 'creneau':
                    const aCreneau = getNestedPropertyValue(a, 'livraison.creneau');
                    const bCreneau = getNestedPropertyValue(b, 'livraison.creneau');
                    return aCreneau.localeCompare(bCreneau) * direction;
                case 'statuts':
                    const aStatus = getNestedPropertyValue(a, 'statuts.livraison');
                    const bStatus = getNestedPropertyValue(b, 'statuts.livraison');
                    return (aStatus.localeCompare(bStatus)) * direction;
                case 'magasin':
                    return ((a.magasin?.name || '').localeCompare(b.magasin?.name || '')) * direction;
                case 'chauffeur':
                    const aName = a.chauffeur?.nom || '';
                    const bName = b.chauffeur?.nom || '';
                    return aName.localeCompare(bName) * direction;
                case 'tarifHT':
                    const aPrice = getNestedPropertyValue(a, 'financier.tarifHT');
                    const bPrice = getNestedPropertyValue(b, 'financier.tarifHT');
                    return (aPrice - bPrice) * direction;
                default:
                    return 0;
            }
        });
    }, [items, sortConfig]);

    return { sortConfig, setSortConfig, sortedItems };
}