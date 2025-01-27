import { useEffect, useMemo, useState } from "react";
import { UsePaginationProps, UsePaginationReturn } from "../types/hooks.types";

export function usePagination<T>({ items, itemsPerPage }: UsePaginationProps<T>): UsePaginationReturn<T> {
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        // Reset to first page when items change
        setCurrentPage(1);
    }, [items]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    }, [items, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(items.length / itemsPerPage);

    return {
        currentPage,
        setCurrentPage,
        paginatedItems,
        totalPages
    };
}