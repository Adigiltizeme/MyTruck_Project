import React, { useState, useEffect } from 'react';
import { XCircle, Upload, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoMetadata } from '../types/draft.types';
import { CloudinaryService } from '../services/cloudinary.service';

interface PhotoUploaderProps {
    onUpload: (photos: { url: string, file: File }[]) => void;
    maxPhotos?: number;
    existingPhotos?: { url: string, file: File }[];
    MAX_SIZE?: number;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
    onUpload,
    maxPhotos = 5,
    existingPhotos = [],
    MAX_SIZE = 10 * 1024 * 1024 // 10MB
}) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [photos, setPhotos] = useState(existingPhotos);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
    // const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // Fonction de validation du format des photos
    const validatePhotoFormat = (photo: { url: string, file: File }): boolean => {
        // Vérifie si l'URL est au format data:image
        if (!photo.url.startsWith('data:image/')) {
            throw new Error('Format d\'image invalide');
        }

        // Vérifie si les données base64 sont présentes
        if (!photo.url.includes('base64,')) {
            throw new Error('Données image corrompues');
        }

        return true;
    };

    // Fonction de conversion de fichier en base64
    const convertToBase64 = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    // Vérification du format
                    if (!reader.result.startsWith('data:image/')) {
                        reject(new Error('Format d\'image invalide'));
                        return;
                    }
                    resolve(reader.result);
                } else {
                    reject(new Error('Erreur de lecture du fichier'));
                }
            };
            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsDataURL(file);
        });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        try {
            setUploading(true);
            setError('');

            // Validation initiale
            if (photos.length + files.length > maxPhotos) {
                throw new Error(`Maximum ${maxPhotos} photos autorisées`);
            }
            // Validation du volume total
            if (photos.reduce((acc, photo) => acc + photo.file.size, 0) + Array.from(files).reduce((acc, file) => acc + file.size, 0) > 50 * 1024 * 1024) {
                throw new Error('Volume total des photos trop élevé');
            }


            const cloudinaryService = new CloudinaryService();

            // Traitement des fichiers
            const newPhotos = await Promise.all(
                Array.from(files).map(async (file) => {
                    // Validation du type
                    if (!ALLOWED_TYPES.includes(file.type)) {
                        throw new Error(`Type de fichier non supporté: ${file.type}`);
                    }

                    // Validation de la taille
                    if (file.size > MAX_SIZE) {
                        throw new Error(`Fichier trop volumineux: ${file.name}`);
                    }

                    try {
                        // Upload vers Cloudinary
                        const uploadResult = await cloudinaryService.uploadImage(file);
                        return { url: uploadResult.url, file: file };
                    } catch (error) {
                        console.error('Erreur upload:', error);
                        throw new Error(`Erreur d'upload pour ${file.name}`);
                    }
                })
            );

            setPhotos([...photos, ...newPhotos]);
            onUpload([...photos, ...newPhotos]);

        } catch (error) {
            setError(error instanceof Error ? error.message : 'Erreur lors du chargement');
            console.error('Erreur upload:', error);
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        setPhotos(newPhotos);
        onUpload(newPhotos);
    };

    // Clean up des URLs lors du démontage du composant
    useEffect(() => {
        return () => {
            photos.forEach(photo => {
                if (photo.url.startsWith('blob:')) {
                    URL.revokeObjectURL(photo.url);
                }
            });
        };
    }, []);

    const compressImage = async (file: File): Promise<{ url: string; file: File; metadata: PhotoMetadata }> => {
        // Création d'une image pour la compression
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Chargement de l'image
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });

        // Calcul des dimensions
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920; // Maximum dimension

        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = (height / width) * maxDimension;
                width = maxDimension;
            } else {
                width = (width / height) * maxDimension;
                height = maxDimension;
            }
        }

        // Configuration du canvas
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Conversion en blob
        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob(
                (blob) => resolve(blob!),
                file.type,
                0.8
            );
        });

        // Création du nouveau fichier
        const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
        });

        // Métadonnées
        const metadata: PhotoMetadata = {
            id: Math.random().toString(36).substr(2, 9),
            fileName: file.name,
            fileSize: compressedFile.size,
            mimeType: file.type,
            dimensions: { width, height },
            lastModified: Date.now(),
            compressed: true
        };

        return {
            url: URL.createObjectURL(compressedFile),
            file: compressedFile,
            metadata
        };
    };

    return (
        <div className="space-y-4">
            {/* Zone de dépôt/sélection */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-red-500 transition-colors">
                <label className="flex flex-col items-center cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="mt-2 text-sm text-gray-500">
                        {uploading ? 'Chargement...' : 'Cliquez ou déposez vos photos ici'}
                    </span>
                    <span className="mt-1 text-xs text-gray-400">
                        {`${photos.length}/${maxPhotos} photos - JPG/PNG jusqu'à 10MB`}
                    </span>
                    <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png"
                        onChange={handleUpload}
                        className="hidden"
                        disabled={uploading}
                    />
                </label>
            </div>

            {/* Message d'erreur */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg"
                    >
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Prévisualisation */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group"
                    >
                        <img
                            src={photo.url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default PhotoUploader;