import React, { useEffect, useState } from 'react';
import { CloudinaryService } from '../services/cloudinary.service';
import { imageCache } from '../services/image-cache.service';
import { useOffline } from '../contexts/OfflineContext';

interface SecureImageProps {
    src: string;
    alt: string;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
}

export const SecureImage: React.FC<SecureImageProps> = ({
    src,
    alt,
    className = '',
    onLoad,
    onError
}) => {
    const [imgSrc, setImgSrc] = useState<string>('/placeholder-image.jpg');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { isOnline } = useOffline();

    useEffect(() => {
        if (!src) {
            setImgSrc('/placeholder-image.jpg');
            setLoading(false);
            setError(true);
            return;
        }

        const cloudinaryService = new CloudinaryService();

        const loadImage = async () => {
            try {
                setLoading(true);
                setError(false);

                // Si c'est déjà une URL Cloudinary, l'utiliser directement
                if (cloudinaryService.isCloudinaryUrl(src)) {
                    setImgSrc(src);
                    setLoading(false);
                    return;
                }

                // Sinon, chercher dans le cache
                const cachedUrl = await imageCache.getCloudinaryUrl(src);

                if (cloudinaryService.isCloudinaryUrl(cachedUrl)) {
                    // URL Cloudinary trouvée en cache
                    setImgSrc(cachedUrl);
                    setLoading(false);
                } else if (!isOnline) {
                    // Mode hors ligne, essayer de récupérer depuis le cache local
                    const blob = await imageCache.getImageBlob(src);
                    if (blob) {
                        const objectUrl = URL.createObjectURL(blob);
                        setImgSrc(objectUrl);
                        setLoading(false);
                        return;
                    }

                    // Pas de blob en cache, utiliser placeholder
                    setImgSrc('/public/placeholder-image.jpg');
                    setError(true);
                    setLoading(false);
                } else if (cloudinaryService.isAirtableUrl(src)) {
                    // URL Airtable, essayer de la migrer vers Cloudinary
                    try {
                        const result = await cloudinaryService.uploadFromUrl(src);

                        // Mettre en cache la nouvelle URL
                        await imageCache.cacheCloudinaryUrl(src, result.url);

                        // Mettre en cache le blob pour utilisation hors ligne
                        fetch(result.url)
                            .then(response => response.blob())
                            .then(blob => imageCache.cacheImageBlob(result.url, blob))
                            .catch(err => console.error('Erreur lors du cache du blob:', err));

                        setImgSrc(result.url);
                    } catch (uploadError) {
                        console.error('Erreur lors de la migration vers Cloudinary:', uploadError);

                        // En cas d'échec, utiliser l'URL originale
                        setImgSrc(src);
                    }
                } else {
                    // URL non-Airtable, l'utiliser directement
                    setImgSrc(src);
                }

                setLoading(false);
            } catch (err) {
                console.error('Erreur lors du chargement de l\'image:', err);
                setImgSrc('/placeholder-image.jpg');
                setError(true);
                setLoading(false);
                if (onError) onError();
            }
        };

        loadImage();

        // Nettoyage lors du démontage
        return () => {
            // Libérer les objectURLs si nécessaire
            if (imgSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imgSrc);
            }
        };
    }, [src, isOnline]);

    // Fonction de gestion d'erreur
    const handleError = () => {
        console.error(`Erreur de chargement de l'image: ${imgSrc}`);
        setImgSrc('/placeholder-image.jpg');
        setError(true);
        if (onError) onError();
    };

    return (
        <>
            {loading && <div className="animate-pulse bg-gray-300 h-full w-full rounded" />}

            <img
                src={imgSrc}
                alt={alt}
                className={`${className} ${loading ? 'hidden' : ''}`}
                onLoad={() => {
                    setLoading(false);
                    if (onLoad) onLoad();
                }}
                onError={handleError}
            />
        </>
    );
};