import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    paginatedItems: any[];
    data: any[];
}

function getWindowedPages(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, paginatedItems, data }) => {
    if (totalPages <= 1) {
        return (
            <div className="text-sm text-gray-500">
                {paginatedItems.length} / {data.length} commande(s)
            </div>
        );
    }

    const pages = getWindowedPages(currentPage, totalPages);

    return (
        <div className="flex flex-wrap gap-1 items-center">
            <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="px-2 py-1.5 rounded border text-sm hover:bg-gray-100 disabled:opacity-40"
                aria-label="Première page"
            >
                «
            </button>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1.5 rounded border text-sm hover:bg-gray-100 disabled:opacity-40"
            >
                Préc.
            </button>

            {pages.map((page, i) =>
                page === '...'
                    ? <span key={`e${i}`} className="px-1.5 py-1.5 text-gray-400 text-sm select-none">…</span>
                    : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={`px-3 py-1.5 rounded border text-sm ${
                                currentPage === page
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'hover:bg-gray-100'
                            }`}
                        >
                            {page}
                        </button>
                    )
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1.5 rounded border text-sm hover:bg-gray-100 disabled:opacity-40"
            >
                Suiv.
            </button>
            <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1.5 rounded border text-sm hover:bg-gray-100 disabled:opacity-40"
                aria-label="Dernière page"
            >
                »
            </button>

            <span className="text-sm text-gray-500 ml-1">
                {paginatedItems.length} / {data.length}
            </span>
        </div>
    );
};

export default Pagination;
