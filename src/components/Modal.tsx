export const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
            <div className="flex min-h-screen items-center justify-center p-4">
            {/* <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div> */}
                <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-1 text-gray-400 hover:text-gray-600 text-xl"
                    >
                        ×
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
};