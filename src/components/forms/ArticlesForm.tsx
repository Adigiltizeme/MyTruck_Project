// import { useEffect, useState } from "react";
// import { CloudinaryService } from "../../services/cloudinary.service";
// import { ArticlesFormProps } from "../../types/form.types";
// import PhotoUploader from "../PhotoUploader";
// import FormInput from "./FormInput";
// import { XCircle } from "lucide-react";


// export const ArticlesForm: React.FC<ArticlesFormProps> = ({ data, errors, onChange, isEditing = true }) => {

//     const [existingPhotos, setExistingPhotos] = useState<Array<{ url: string; file?: File }>>([]);
//     const [photos, setPhotos] = useState<Array<{ url: string; file: File }>>([]);

//     // Initialiser les photos existantes
//     useEffect(() => {
//         if (data.articles?.photos && Array.isArray(data.articles.photos)) {
//             const initialPhotos = data.articles.photos
//                 .filter(photo => !photo.file) // Ne prendre que les photos existantes
//                 .map(photo => ({
//                     url: typeof photo === 'string' ? photo : photo.url,
//                     file: undefined
//                 }));
//             setExistingPhotos(initialPhotos);

//             // S'assurer d'avoir le bon format
//             const formattedPhotos = data.articles.photos.map(photo => {
//                 if (typeof photo === 'string') {
//                     return { url: photo, file: new File([], "") };
//                 } else if (photo && typeof photo === 'object' && 'url' in photo) {
//                     return { url: photo.url, file: photo.file || new File([], "") };
//                 }
//                 // Ignorer les formats non reconnus
//                 return null;
//             }).filter((photo): photo is { url: string; file: File } => photo !== null);

//             setPhotos(formattedPhotos);
//         }
//     }, [data.articles?.photos]);

//     const totalPhotos = photos.length;
//     const remainingPhotos = 5 - totalPhotos;

//     // Gérer les nouvelles photos uploadées
//     const handlePhotoUpload = async (uploadedPhotos: Array<{ url: string; file: File }>) => {
//         try {
//             const cloudinaryService = new CloudinaryService();

//             // Upload each photo to Cloudinary
//             const uploadPromises = uploadedPhotos.map(async photo => {
//                 const result = await cloudinaryService.uploadImage(photo.file);
//                 return {
//                     url: result.url,
//                     file: photo.file
//                 };
//             });

//             const uploadedCloudinaryPhotos = await Promise.all(uploadPromises);
//             const updatedPhotos = [...photos, ...uploadedCloudinaryPhotos];
//             setPhotos(updatedPhotos);

//             // Mise à jour du formulaire avec les URLs Cloudinary
//             onChange({
//                 target: {
//                     name: 'articles.photos',
//                     value: updatedPhotos.map(photo => ({
//                         url: photo.url
//                     }))
//                 }
//             });
//         } catch (error) {
//             console.error('Erreur lors de l\'upload des photos:', error);
//         }
//     };

//     const removePhoto = (index: number) => {
//         const updatedPhotos = photos.filter((_, i) => i !== index);
//         setPhotos(updatedPhotos);

//         onChange({
//             target: {
//                 name: 'articles.photos',
//                 value: updatedPhotos
//             }
//         });
//     };

//     return (
//         <div className="space-y-4 mb-6">
//             <div className="grid grid-cols-1 gap-4">
//                 <FormInput
//                     label="Nombre d'articles"
//                     name="articles.nombre"
//                     type="number"
//                     value={String(data.articles?.nombre || '')}
//                     min={0}
//                     onChange={onChange}
//                     error={errors.articles?.nombre}
//                     required
//                 />
//                 <div className="space-y-1">
//                     <label className="block text-sm font-bold text-gray-700">Détails des articles</label>
//                     <textarea
//                         name="articles.details"
//                         value={data.articles?.details || ''}
//                         onChange={(e) => onChange(e as any)}
//                         className="mt-1 block w-full rounded-md border border-gray-300"
//                         rows={4}
//                     />
//                 </div>
//                 {!isEditing && (
//                     <>
//                         {/* Zone d'upload avec aperçu des nouvelles photos */}
//                         <PhotoUploader
//                             onUpload={handlePhotoUpload}
//                             maxPhotos={remainingPhotos}
//                             existingPhotos={photos}
//                             MAX_SIZE={10 * 1024 * 1024}
//                         />

//                         {/* Nouvelles photos */}
//                         {photos.length > 0 && (
//                             <div className="space-y-2">
//                                 {/* <label className="block text-sm font-bold text-gray-700">Nouvelles photos</label> */}
//                                 <div className="grid grid-cols-3 gap-4">
//                                     {photos.map((photo, index) => (
//                                         <div key={`new-${index}`} className="relative group">
//                                             <img
//                                                 src={photo.url}
//                                                 alt={`Photo ${index + 1}`}
//                                                 className="w-full h-32 object-cover rounded"
//                                             />
//                                             <button
//                                                 type="button"
//                                                 onClick={() => removePhoto(index)}
//                                                 className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
//                                             >
//                                                 <XCircle className="w-5 h-5" />
//                                             </button>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}
//                     </>
//                 )}
//             </div>
//         </div>
//     );
// };

import { useCallback, useEffect, useState } from "react";
import { CloudinaryService } from "../../services/cloudinary.service";
import { ArticlesFormProps } from "../../types/form.types";
import PhotoUploader from "../PhotoUploader";
import FormInput from "./FormInput";
import { XCircle } from "lucide-react";
import ArticleDimensionsForm, { ArticleDimension } from "./ArticleDimensionForm";
import VehicleSelector from "../VehicleSelector";
import { VehicleType } from "../../services/vehicle-validation.service";
import { CommandeMetier } from "../../types/business.types";

export const ArticlesForm: React.FC<ArticlesFormProps | CommandeMetier> = ({ data, errors, onChange, isEditing = true }) => {
    const [existingPhotos, setExistingPhotos] = useState<Array<{ url: string; file?: File }>>([]);
    const [photos, setPhotos] = useState<Array<{ url: string; file: File }>>([]);
    const [articleDimensions, setArticleDimensions] = useState<ArticleDimension[]>([]);
    const [deliveryInfo, setDeliveryInfo] = useState({
        floor: data.client?.adresse?.etage || "0",
        hasElevator: data.client?.adresse?.ascenseur || false,
        hasStairs: false,
        stairCount: 0,
        parkingDistance: 0,
        needsAssembly: false
    });

    // Initialiser les photos existantes
    useEffect(() => {
        if (data.articles?.photos && Array.isArray(data.articles.photos)) {
            const initialPhotos: Array<{ url: string; file?: File }> = data.articles.photos
                .filter((photo: string | { url: string; file?: File }) => typeof photo === 'object' && !('file' in photo && photo.file)) // Ne prendre que les photos existantes
                .map((photo: string | { url: string; file?: File }) => ({
                    url: typeof photo === 'string' ? photo : photo.url,
                    file: undefined
                }));
            setExistingPhotos(initialPhotos);

            // S'assurer d'avoir le bon format
            const formattedPhotos = data.articles.photos.map((photo: string | { url: string; file?: File }) => {
                if (typeof photo === 'string') {
                    return { url: photo, file: new File([], "") };
                } else if (photo && typeof photo === 'object' && 'url' in photo) {
                    return { url: photo.url, file: photo.file || new File([], "") };
                }
                // Ignorer les formats non reconnus
                return null;
            }).filter((photo: { url: string; file: File } | null): photo is { url: string; file: File } => photo !== null);

            setPhotos(formattedPhotos);
        }
    }, [data.articles?.photos]);

    // Initialiser les dimensions des articles si elles existent
    useEffect(() => {
        console.log("Initialisation des dimensions d'articles:", data.articles?.dimensions);
        if (data.articles?.dimensions && Array.isArray(data.articles.dimensions) && data.articles.dimensions.length > 0) {
            setArticleDimensions(data.articles.dimensions);
        } else if (!isEditing) {
            // Créer un article par défaut seulement si on est en mode création
            setArticleDimensions([{
                id: `art-${Date.now()}`,
                nom: '',
                longueur: undefined,
                largeur: undefined,
                hauteur: undefined,
                poids: undefined,
                quantite: 1
            }]);
        }
    }, [data.articles?.dimensions, isEditing]);

    // Récupérer les informations de livraison si elles existent
    useEffect(() => {
        const newDeliveryInfo = {
            floor: data.client?.adresse?.etage || "0",
            hasElevator: data.client?.adresse?.ascenseur || false,
            hasStairs: false,
            stairCount: 0,
            parkingDistance: 0,
            needsAssembly: false,
            canBeTilted: false
        };

        if (data.livraison?.details) {
            try {
                const livDetails = typeof data.livraison.details === 'string'
                    ? JSON.parse(data.livraison.details)
                    : data.livraison.details;

                if (livDetails) {
                    if (livDetails.hasStairs !== undefined) newDeliveryInfo.hasStairs = livDetails.hasStairs;
                    if (livDetails.stairCount !== undefined) newDeliveryInfo.stairCount = livDetails.stairCount;
                    if (livDetails.parkingDistance !== undefined) newDeliveryInfo.parkingDistance = livDetails.parkingDistance;
                    if (livDetails.needsAssembly !== undefined) newDeliveryInfo.needsAssembly = livDetails.needsAssembly;
                    if (livDetails.canBeTilted !== undefined) newDeliveryInfo.canBeTilted = livDetails.canBeTilted;
                }
            } catch (e) {
                // Ignorer les erreurs de parsing JSON
                console.warn("Impossible de parser les détails de livraison", e);
            }
        }

        setDeliveryInfo(newDeliveryInfo);
    }, [data.client?.adresse, data.livraison?.details]);

    const totalPhotos = photos.length;
    const remainingPhotos = 5 - totalPhotos;

    // Gérer les nouvelles photos uploadées
    const handlePhotoUpload = async (uploadedPhotos: Array<{ url: string; file: File }>) => {
        try {
            const cloudinaryService = new CloudinaryService();

            // Upload each photo to Cloudinary
            const uploadPromises = uploadedPhotos.map(async photo => {
                const result = await cloudinaryService.uploadImage(photo.file);
                return {
                    url: result.url,
                    file: photo.file
                };
            });

            const uploadedCloudinaryPhotos = await Promise.all(uploadPromises);
            const updatedPhotos = [...photos, ...uploadedCloudinaryPhotos];
            setPhotos(updatedPhotos);

            // Mise à jour du formulaire avec les URLs Cloudinary
            onChange({
                target: {
                    name: 'articles.photos',
                    value: updatedPhotos.map(photo => ({
                        url: photo.url
                    }))
                }
            });
        } catch (error) {
            console.error('Erreur lors de l\'upload des photos:', error);
        }
    };

    const removePhoto = (index: number) => {
        const updatedPhotos = photos.filter((_, i) => i !== index);
        setPhotos(updatedPhotos);

        onChange({
            target: {
                name: 'articles.photos',
                value: updatedPhotos
            }
        });
    };

    // Gérer les changements de dimensions des articles
    const handleArticleDimensionsChange = useCallback((dimensions: ArticleDimension[]) => {
        // Éviter les mises à jour inutiles en comparant le contenu
        const currentDimensionsString = JSON.stringify(articleDimensions);
        const newDimensionsString = JSON.stringify(dimensions);

        if (currentDimensionsString !== newDimensionsString) {
            console.log("Dimensions modifiées:", dimensions);
            setArticleDimensions(dimensions);

            // Mise à jour du formulaire
            onChange({
                target: {
                    name: 'articles.dimensions',
                    value: dimensions
                }
            });

            // Mise à jour du nombre d'articles seulement si nécessaire
            const newTotalQuantity = dimensions.reduce((sum, article) => sum + article.quantite, 0);
            const currentQuantity = data.articles?.nombre || 0;

            if (newTotalQuantity !== currentQuantity) {
                onChange({
                    target: {
                        name: 'articles.nombre',
                        value: newTotalQuantity
                    }
                });
            }
        }
    }, [onChange, articleDimensions, data.articles?.nombre]);

    // Gérer la sélection du véhicule
    const handleVehicleSelect = (vehicleType: "" | VehicleType) => {
        if (vehicleType === "") {
            // Handle the case where no vehicle is selected
            onChange({
                target: {
                    name: 'livraison.vehicule',
                    value: null
                }
            });
        } else {
            onChange({
                target: {
                    name: 'livraison.vehicule',
                    value: vehicleType
                }
            });
        }
    };

    // Gérer la sélection des équipiers
    const handleCrewSelect = (crewSize: number) => {
        onChange({
            target: {
                name: 'livraison.equipiers',
                value: crewSize
            }
        });
    };

    // Gérer les changements d'informations de livraison supplémentaires
    const handleDeliveryInfoChange = (field: string, value: any) => {
        const updatedInfo = { ...deliveryInfo, [field]: value };
        setDeliveryInfo(updatedInfo);

        // Mise à jour du formulaire
        onChange({
            target: {
                name: 'livraison.details',
                value: JSON.stringify(updatedInfo)
            }
        });
    };

    return (
        <div className="space-y-6 mb-6">
            {/* <h3 className="text-xl font-semibold mb-4">Détails des articles</h3> */}

            {/* Formulaire de dimensions des articles */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <ArticleDimensionsForm
                    initialArticles={data.articles?.dimensions || articleDimensions}
                    onChange={handleArticleDimensionsChange}
                    readOnly={isEditing}
                />
            </div>

            {/* Questions supplémentaires pour la livraison */}
            {!isEditing && (
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <h4 className="text-lg font-medium mb-3">Informations supplémentaires de livraison</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center text-sm mb-1">
                                <input
                                    type="checkbox"
                                    checked={deliveryInfo.hasStairs}
                                    onChange={(e) => handleDeliveryInfoChange('hasStairs', e.target.checked)}
                                    className="mr-2 h-4 w-4"
                                />
                                Y a-t-il des marches ou escaliers avant l'ascenseur ?
                            </label>

                            {deliveryInfo.hasStairs && (
                                <div className="ml-6 mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre de marches
                                    </label>
                                    <input
                                        type="number"
                                        value={deliveryInfo.stairCount}
                                        onChange={(e) => handleDeliveryInfoChange('stairCount', parseInt(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        min="0"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Distance de stationnement à l'entrée (mètres)
                            </label>
                            <input
                                type="number"
                                value={deliveryInfo.parkingDistance}
                                onChange={(e) => handleDeliveryInfoChange('parkingDistance', parseInt(e.target.value))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                min="0"
                            />
                        </div>

                        <div>
                            <label className="flex items-center text-sm mb-1">
                                <input
                                    type="checkbox"
                                    checked={deliveryInfo.needsAssembly}
                                    onChange={(e) => handleDeliveryInfoChange('needsAssembly', e.target.checked)}
                                    className="mr-2 h-4 w-4"
                                />
                                Nécessite un montage ou une installation ?
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Sélection du véhicule et des équipiers */}
            {!isEditing && (
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <VehicleSelector
                        articles={articleDimensions}
                        onVehicleSelect={handleVehicleSelect}
                        onCrewSelect={handleCrewSelect}
                        initialVehicle={data.livraison?.vehicule as VehicleType}
                        initialCrew={data.livraison?.equipiers}
                        deliveryInfo={deliveryInfo}
                    />
                </div>
            )}

            {/* Nombre d'articles */}
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
                    readOnly={articleDimensions.length > 0}
                />

                {articleDimensions.length > 0 && (
                    <p className="text-sm text-gray-500 -mt-3">
                        (Calculé automatiquement à partir des articles saisis)
                    </p>
                )}

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

                {!isEditing && (
                    <>
                        {/* Zone d'upload avec aperçu des nouvelles photos */}
                        <PhotoUploader
                            onUpload={handlePhotoUpload}
                            maxPhotos={remainingPhotos}
                            existingPhotos={photos}
                            MAX_SIZE={10 * 1024 * 1024}
                        />

                        {/* Nouvelles photos */}
                        {photos.length > 0 && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-4">
                                    {photos.map((photo, index) => (
                                        <div key={`new-${index}`} className="relative group">
                                            <img
                                                src={photo.url}
                                                alt={`Photo ${index + 1}`}
                                                className="w-full h-32 object-cover rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};