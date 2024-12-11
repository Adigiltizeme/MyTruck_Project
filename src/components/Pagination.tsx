interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    return (
        <div className="flex gap-2 items-center">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded border hover:bg-gray-100 disabled:opacity-50"
            >
                Précédent
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-2 rounded border ${currentPage === page
                            ? 'bg-red-600 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                >
                    {page}
                </button>
            ))}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded border hover:bg-gray-100 disabled:opacity-50"
            >
                Suivant
            </button>
        </div>
    );
};

export default Pagination;