import { useEffect, useMemo, useState } from "react";
import { UsePaginationProps, UsePaginationReturn } from "../types/hooks.types";

export function usePagination<T>({ items, itemsPerPage }: UsePaginationProps<T>): UsePaginationReturn<T> {
    const [currentPage, setCurrentPage] = useState(1);

    // Calculate total pages
    const totalPages = Math.ceil(items.length / itemsPerPage);

    useEffect(() => {
        // Only reset if current page is beyond available pages
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    }, [items, currentPage, itemsPerPage]);

    return {
        currentPage,
        setCurrentPage,
        paginatedItems,
        totalPages
    };
}