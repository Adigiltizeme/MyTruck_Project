import { useState } from "react";
import { CloudinaryService } from "../../services/cloudinary.service";
import { ArticlesFormProps } from "../../types/form.types";
import PhotoUploader from "../PhotoUploader";
import FormInput from "./FormInput";
import { XCircle } from "lucide-react";


export const ArticlesForm: React.FC<ArticlesFormProps> = ({ data, errors, onChange, isEditing }) => {

    const [newPhotos, setNewPhotos] = useState<Array<{ url: string; file: File }>>([]);

    const remainingPhotos = 5 - (data.articles?.photos?.length || 0) - newPhotos.length;

    // Supprimer une photo existante
    const handleExistingPhotoDelete = (index: number) => {
        const updatedPhotos = [...(data.articles?.photos || [])];
        updatedPhotos.splice(index, 1);
        onChange({
            target: {
                name: 'articles.photos',
                value: updatedPhotos
            }
        });
    };

    // Gérer les nouvelles photos uploadées
    const handlePhotoUpload = (uploadedPhotos: Array<{ url: string; file: File }>) => {
        const updatedNewPhotos = [...newPhotos, ...uploadedPhotos];
        setNewPhotos(updatedNewPhotos);

        // Mettre à jour le formulaire avec les nouvelles photos
        onChange({
            target: {
                name: 'articles.newPhotos', // Utiliser un champ différent pour les nouvelles photos
                value: updatedNewPhotos
            }
        });
    };

    return (
        <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 gap-4">
                <FormInput
                    label="Nombre d'articles"
                    name="articles.nombre"
                    type="number"
                    value={String(data.articles?.nombre || '')}
                    min={0}
                    onChange={onChange}
                    error={errors.articles?.nombre}
                    required
                />
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">Détails des articles</label>
                    <textarea
                        name="articles.details"
                        value={data.articles?.details || ''}
                        onChange={(e) => onChange(e as any)}
                        className="mt-1 block w-full rounded-md border border-gray-300"
                        rows={4}
                    />
                </div>
                {/* Photos existantes uniquement */}
                {data.articles?.photos && data.articles.photos.length > 0 && (
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Photos existantes</label>
                        <div className="grid grid-cols-3 gap-4">
                            {data.articles.photos.map((photo, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={photo.url}
                                        alt={`Article ${index + 1}`}
                                        className="w-full h-32 object-cover rounded"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleExistingPhotoDelete(index)}
                                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Zone d'upload avec aperçu des nouvelles photos */}
                <PhotoUploader
                    onUpload={handlePhotoUpload}
                    maxPhotos={remainingPhotos}
                    existingPhotos={newPhotos} // Passer uniquement les nouvelles photos
                    MAX_SIZE={10 * 1024 * 1024}
                />
            </div>
        </div>
    );
};