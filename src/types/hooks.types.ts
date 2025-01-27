export interface UseSearchProps<T> {
    items: T[];
    searchKeys: Array<keyof T | string>; // Permet les chaînes de chemin comme 'client.nomComplet'
}

export interface UseSearchReturn<T> {
    search: string;
    setSearch: (value: string) => void;
    filteredItems: T[];
}

export interface UseSortProps<T> {
    items: T[];
    defaultKey: keyof T;
}

export interface SortConfig {
    key: SortableFields;
    direction: 'asc' | 'desc';
}

export interface UseSortReturn {
    sortConfig: SortConfig;
    setSortConfig: (config: SortConfig) => void;
    sortedItems: any[];
}

export interface UseDateRangeProps<T> {
    items: T[];
    dateKey: string;
}

export interface DateRange {
    start: string | null;
    end: string | null;
    mode: 'range' | 'single';
    singleDate: string | null;
}

export type SortableFields = 'dates' | 'statuts' | 'magasin' | 'chauffeur' | 'numeroCommande';

export interface SortConfigCommandeMetier {
    key: SortableFields;
    direction: 'asc' | 'desc';
}

export interface UseDateRangeReturn<T> {
    dateRange: DateRange;
    setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
    filteredItems: T[];
}

export interface UsePaginationProps<T> {
    items: T[];
    itemsPerPage: number;
}

export interface UsePaginationReturn<T> {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    paginatedItems: T[];
    totalPages: number;
}