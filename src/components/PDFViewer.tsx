import React, { useState } from 'react';

interface PDFViewerProps {
    documentUrl: string;
    onClose: () => void;
    title?: string;
    loading?: boolean;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
    documentUrl,
    onClose,
    title = "Aperçu PDF",
    loading: externalLoading = false
}) => {
    const [iframeLoading, setIframeLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showPDFPreview, setShowPDFPreview] = useState<{
        tempUrl?: string;
        originalUrl: string;
        title: string;
        loading: boolean;
    } | null>(null);

    const [embedError, setEmbedError] = useState(false);
    const [embedLoaded, setEmbedLoaded] = useState(false);

    const handleIframeLoad = () => {
        setLoading(false);
    };

    const handleIframeError = () => {
        setLoading(false);
        setError(true);
    };

    const isLoading = externalLoading || iframeLoading;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-11/12 h-full max-w-4xl flex flex-col">
                {/* En-tête */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">📄 {title}</h2>
                    <div className="flex items-center space-x-2">
                        {/* Actions rapides */}
                        <a
                            href={documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            title="Ouvrir dans nouvel onglet"
                        >
                            🔗 Nouvel onglet
                        </a>
                        <a
                            href={documentUrl}
                            download
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            title="Télécharger"
                        >
                            📥 Télécharger
                        </a>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Loading externe (génération URL) */}
                {externalLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mr-3"></div>
                        <span>Préparation de l'aperçu...</span>
                    </div>
                )}

                {/* Aperçu PDF intégré */}
                {!externalLoading && !embedError && (
                    <div className="flex-1 relative">
                        {/* ✅ EMBED PDF (solution élégante) */}
                        <embed
                            src={documentUrl}
                            type="application/pdf"
                            className="w-full h-full border border-gray-300 rounded"
                            style={{ minHeight: '600px' }}
                            onLoad={() => setEmbedLoaded(true)}
                            onError={() => setEmbedError(true)}
                        />

                        {/* Loading overlay pour embed */}
                        {!embedLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mr-3"></div>
                                <span>Chargement du PDF...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Fallback si embed échoue */}
                {!externalLoading && embedError && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg mb-6">
                                <p className="font-semibold">Aperçu non disponible dans ce navigateur</p>
                                <p className="text-sm mt-1">Utilisez les boutons ci-dessus pour voir le PDF</p>
                            </div>

                            <a
                                href={documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg"
                            >
                                📄 Ouvrir le PDF
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};