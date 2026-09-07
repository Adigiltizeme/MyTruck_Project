import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    paginatedItems: any[];
    data: any[];
}

// Largeur estimée d'un bouton de page (px) — chiffres à 1-3 digits + padding + gap
const BTN_WIDTH = 44;
// Largeur des boutons fixes : «, Préc., Suiv., », compteur = 5 × ~64px ≈ 320px
const FIXED_BTNS_WIDTH = 320;
const MIN_PAGE_BTNS = 3;
const MAX_PAGE_BTNS = 20;

function getSlice(current: number, total: number, windowSize: number): number[] {
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = start + windowSize - 1;
    if (end > total) {
        end = total;
        start = Math.max(1, end - windowSize + 1);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    paginatedItems,
    data,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [windowSize, setWindowSize] = useState(7);

    const measure = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const available = el.clientWidth - FIXED_BTNS_WIDTH;
        const count = Math.max(MIN_PAGE_BTNS, Math.min(MAX_PAGE_BTNS, Math.floor(available / BTN_WIDTH)));
        setWindowSize(count);
    }, []);

    useEffect(() => {
        measure();
        const observer = new ResizeObserver(measure);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [measure]);

    if (totalPages <= 1) {
        return (
            <div className="text-sm text-gray-500">
                {paginatedItems.length} / {data.length} commande(s)
            </div>
        );
    }

    const pages = getSlice(currentPage, totalPages, windowSize);
    const showStartEllipsis = pages[0] > 1;
    const showEndEllipsis = pages[pages.length - 1] < totalPages;

    return (
        <div ref={containerRef} className="flex flex-wrap gap-1 items-center w-full">
            {/* Première page */}
            <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="px-2 py-1.5 rounded border text-sm hover:bg-gray-100 disabled:opacity-40"
                aria-label="Première page"
            >
                «
            </button>

            {/* Page précédente */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1.5 rounded border text-sm hover:bg-gray-100 disabled:opacity-40"
            >
                Préc.
            </button>

            {/* Ellipsis de début + bouton vers le groupe précédent */}
            {showStartEllipsis && (
                <button
                    onClick={() => onPageChange(Math.max(1, pages[0] - windowSize))}
                    className="px-2 py-1.5 rounded border text-sm text-gray-500 hover:bg-gray-100"
                    title={`Groupe précédent (page ${Math.max(1, pages[0] - windowSize)})`}
                >
                    ‹ …
                </button>
            )}

            {/* Numéros de pages */}
            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-1.5 rounded border text-sm min-w-[36px] ${
                        currentPage === page
                            ? 'bg-red-600 text-white border-red-600 font-semibold'
                            : 'hover:bg-gray-100'
                    }`}
                >
                    {page}
                </button>
            ))}

            {/* Ellipsis de fin + bouton vers le groupe suivant */}
            {showEndEllipsis && (
                <button
                    onClick={() => onPageChange(Math.min(totalPages, pages[pages.length - 1] + windowSize))}
                    className="px-2 py-1.5 rounded border text-sm text-gray-500 hover:bg-gray-100"
                    title={`Groupe suivant (page ${Math.min(totalPages, pages[pages.length - 1] + 1)})`}
                >
                    … ›
                </button>
            )}

            {/* Page suivante */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1.5 rounded border text-sm hover:bg-gray-100 disabled:opacity-40"
            >
                Suiv.
            </button>

            {/* Dernière page */}
            <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1.5 rounded border text-sm hover:bg-gray-100 disabled:opacity-40"
                aria-label="Dernière page"
            >
                »
            </button>

            {/* Compteur */}
            <span className="text-sm text-gray-500 ml-1 whitespace-nowrap">
                {paginatedItems.length} / {data.length}
            </span>
        </div>
    );
};

export default Pagination;
