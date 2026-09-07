import React, { useState } from 'react';
import { Eye, Trash2, X, Loader2 } from 'lucide-react';
import PhotoUploader from './PhotoUploader';

const COLORS = {
    purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        heading: 'text-purple-800',
        badge: 'bg-purple-200 text-purple-900',
        photoBorder: 'border-purple-200',
        subtext: 'text-purple-700',
        addBtn: 'bg-purple-600 hover:bg-purple-700',
    },
    green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        heading: 'text-green-800',
        badge: 'bg-green-200 text-green-900',
        photoBorder: 'border-green-300',
        subtext: 'text-green-700',
        addBtn: 'bg-green-600 hover:bg-green-700',
    },
} as const;

interface Photo {
    id?: string;
    url: string;
}

interface ProofPhotosSectionProps {
    title: string;
    photos: Photo[];
    color: 'purple' | 'green';
    canDelete?: boolean;
    onDelete?: (url: string) => void;
    deletingUrl?: string | null;
    loading?: boolean;
    canAdd?: boolean;
    onAdd?: (photos: Array<{ url: string; file: File }>) => Promise<void>;
    loadingAdd?: boolean;
    signature?: string | null;
    signatureLabel?: string;
    className?: string;
}

const ProofPhotosSection: React.FC<ProofPhotosSectionProps> = ({
    title,
    photos,
    color,
    canDelete = false,
    onDelete,
    deletingUrl = null,
    loading = false,
    canAdd = false,
    onAdd,
    loadingAdd = false,
    signature = null,
    signatureLabel = '✍️ Signature de réception',
    className = '',
}) => {
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [showUploader, setShowUploader] = useState(false);
    const c = COLORS[color];

    const hasContent = photos.length > 0 || !!signature;

    const handleAdd = async (uploaded: Array<{ url: string; file: File }>) => {
        if (onAdd) {
            await onAdd(uploaded);
            setShowUploader(false);
        }
    };

    return (
        <>
            <div className={`${c.bg} border ${c.border} rounded-xl p-4 ${className}`}>
                {/* En-tête */}
                <h4 className={`text-sm font-semibold ${c.heading} mb-3 flex items-center gap-2`}>
                    {title}
                    {photos.length > 0 && (
                        <span className={`${c.badge} text-xs px-2 py-0.5 rounded-full`}>
                            {photos.length}
                        </span>
                    )}
                </h4>

                {/* Photos + Signature côte à côte */}
                {hasContent && (
                    <div className="mb-4 flex gap-4 flex-wrap items-start">
                        {photos.length > 0 && (
                            <div className="flex-1 min-w-0">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {photos.map((photo, idx) => (
                                        <div key={photo.id || idx} className="relative group">
                                            <img
                                                src={photo.url}
                                                alt={`${idx + 1}`}
                                                className={`w-full h-28 object-cover rounded-lg border ${c.photoBorder} cursor-pointer hover:opacity-90 transition-opacity`}
                                                onClick={() => setViewerUrl(photo.url)}
                                            />
                                            {/* Boutons au survol */}
                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setViewerUrl(photo.url)}
                                                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                    title="Voir en grand"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </button>
                                                {canDelete && onDelete && (
                                                    <button
                                                        onClick={() => onDelete(photo.url)}
                                                        disabled={loading || deletingUrl === photo.url}
                                                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                                        title="Supprimer"
                                                    >
                                                        {deletingUrl === photo.url
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Trash2 className="w-3 h-3" />
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Signature (optionnelle, affichée à droite) */}
                        {signature && (
                            <div className="flex-shrink-0 w-44">
                                <p className={`text-sm ${c.subtext} mb-2`}>{signatureLabel}</p>
                                <div
                                    className={`border ${c.border} rounded bg-white p-1 cursor-pointer hover:opacity-90`}
                                    onClick={() => setViewerUrl(signature)}
                                >
                                    <img
                                        src={signature}
                                        alt="Signature"
                                        className="w-full h-28 object-contain"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bouton ajout de photos (optionnel) */}
                {canAdd && onAdd && (
                    <>
                        {!showUploader ? (
                            <button
                                onClick={() => setShowUploader(true)}
                                disabled={loading}
                                className={`px-4 py-2 ${c.addBtn} text-white rounded-lg text-sm disabled:opacity-50`}
                            >
                                📸 Ajouter des photos
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className={`text-sm ${c.subtext}`}>
                                        Ajoutez des photos — Envoi immédiat
                                    </p>
                                    <button
                                        onClick={() => setShowUploader(false)}
                                        className="text-sm text-gray-600 hover:text-gray-800"
                                    >
                                        ✕ Fermer
                                    </button>
                                </div>
                                <PhotoUploader onUpload={handleAdd} existingPhotos={[]} />
                                {loadingAdd && (
                                    <p className="text-sm text-blue-600">⏳ Envoi en cours...</p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* État vide */}
                {!hasContent && !canAdd && (
                    <p className={`text-sm ${c.subtext} italic`}>Aucune photo disponible</p>
                )}
            </div>

            {/* Visionneuse plein écran intégrée */}
            {viewerUrl && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setViewerUrl(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                        onClick={() => setViewerUrl(null)}
                        title="Fermer"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={viewerUrl}
                        alt="Aperçu"
                        className="max-w-full max-h-full object-contain rounded"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

export default ProofPhotosSection;
