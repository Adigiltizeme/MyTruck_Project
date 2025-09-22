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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudinaryService } from "../../services/cloudinary.service";
import { ArticlesFormProps } from "../../types/form.types";
import PhotoUploader from "../PhotoUploader";
import FormInput from "./FormInput";
import { XCircle } from "lucide-react";
import ArticleDimensionsForm, { ArticleDimension } from "./ArticleDimensionForm";
import VehicleSelector from "../VehicleSelector";
import { VehicleType, VehicleValidationService } from "../../services/vehicle-validation.service";
import { CommandeMetier } from "../../types/business.types";

export const ArticlesForm: React.FC<ArticlesFormProps | CommandeMetier> = ({ data, errors, onChange: onFormChange, isEditing = true }) => {
    const [existingPhotos, setExistingPhotos] = useState<Array<{ url: string; file?: File }>>([]);
    const [photos, setPhotos] = useState<Array<{ url: string; file: File }>>([]);
    const [articleDimensions, setArticleDimensions] = useState<ArticleDimension[]>([]);
    // ========== ÉTAT POUR CONTRÔLER L'AFFICHAGE DES VALIDATIONS ==========
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const deliveryInfo = useMemo(() => {
        const baseInfo = {
            floor: data.client?.adresse?.etage || "0",
            hasElevator: data.client?.adresse?.ascenseur || false,
            hasStairs: false,
            stairCount: 0,
            parkingDistance: 0,
            needsAssembly: false,
            rueInaccessible: false,
            paletteComplete: false,
            isDuplex: false,
            deliveryToUpperFloor: false
        };

        if (data.livraison?.details) {
            try {
                const livDetails = typeof data.livraison.details === 'string'
                    ? JSON.parse(data.livraison.details)
                    : data.livraison.details;

                if (livDetails) {
                    return {
                        ...baseInfo,
                        hasStairs: livDetails.hasStairs ?? baseInfo.hasStairs,
                        stairCount: livDetails.stairCount ?? baseInfo.stairCount,
                        parkingDistance: livDetails.parkingDistance ?? baseInfo.parkingDistance,
                        needsAssembly: livDetails.needsAssembly ?? baseInfo.needsAssembly,
                        rueInaccessible: livDetails.rueInaccessible ?? baseInfo.rueInaccessible,
                        paletteComplete: livDetails.paletteComplete ?? baseInfo.paletteComplete,
                        isDuplex: livDetails.isDuplex ?? baseInfo.isDuplex,
                        deliveryToUpperFloor: livDetails.deliveryToUpperFloor ?? baseInfo.deliveryToUpperFloor
                    };
                }
            } catch (e) {
                console.warn("Impossible de parser les détails de livraison", e);
            }
        }

        return baseInfo;
    }, [
        data.client?.adresse?.etage,
        data.client?.adresse?.ascenseur,
        data.livraison?.details
    ]);

    const [localDeliveryInfo, setLocalDeliveryInfo] = useState(deliveryInfo);

    const isUpdatingRef = useRef(false);

    useEffect(() => {
        if (deliveryInfo && JSON.stringify(deliveryInfo) !== JSON.stringify(localDeliveryInfo)) {
            setLocalDeliveryInfo(deliveryInfo);
        }
    }, [deliveryInfo]);

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

    useEffect(() => {
        console.log("[ARTICLES] État actuel des données véhicule:", {
            'data.livraison?.vehicule': data.livraison?.vehicule,
            'typeof': typeof data.livraison?.vehicule,
            'articleDimensions.length': articleDimensions.length
        });
    }, [data.livraison?.vehicule, articleDimensions]);

    // Récupérer les informations de livraison si elles existent
    useEffect(() => {
        const newDeliveryInfo = {
            floor: data.client?.adresse?.etage || "0",
            hasElevator: data.client?.adresse?.ascenseur || false,
            hasStairs: false,
            stairCount: 0,
            parkingDistance: 0,
            needsAssembly: false,
            rueInaccessible: false,
            paletteComplete: false,
            isDuplex: false,
            deliveryToUpperFloor: false
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
                    if (livDetails.rueInaccessible !== undefined) newDeliveryInfo.rueInaccessible = livDetails.rueInaccessible;
                    if (livDetails.paletteComplete !== undefined) newDeliveryInfo.paletteComplete = livDetails.paletteComplete;
                    if (livDetails.isDuplex !== undefined) newDeliveryInfo.isDuplex = livDetails.isDuplex;
                    if (livDetails.deliveryToUpperFloor !== undefined) newDeliveryInfo.deliveryToUpperFloor = livDetails.deliveryToUpperFloor;
                }
            } catch (e) {
                // Ignorer les erreurs de parsing JSON
                console.warn("Impossible de parser les détails de livraison", e);
            }
        }

        setLocalDeliveryInfo(newDeliveryInfo);
    }, [data.client?.adresse, data.livraison?.details, data.articles?.canBeTilted]);

    useEffect(() => {
        console.log('=== DEBUG ARTICLES FORM ===');
        console.log('data.articles?.canBeTilted:', data.articles?.canBeTilted);
        console.log('deliveryInfo.canBeTilted:');
        console.log('localDeliveryInfo.canBeTilted:');
    }, [data.articles?.canBeTilted]);

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
            onFormChange({
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

        onFormChange({
            target: {
                name: 'articles.photos',
                value: updatedPhotos
            }
        });
    };

    // Gérer les changements de dimensions des articles
    const handleArticleDimensionsChange = useCallback((dimensions: ArticleDimension[]) => {
        if (!hasUserInteracted && dimensions.length > 0) {
            setHasUserInteracted(true);
        }

        const currentDimensionsString = JSON.stringify(articleDimensions);
        const newDimensionsString = JSON.stringify(dimensions);

        if (currentDimensionsString !== newDimensionsString) {
            console.log("📄 [ARTICLES-FORM] Dimensions modifiées:", dimensions.length);
            setArticleDimensions(dimensions);

            onFormChange({
                target: {
                    name: 'articles.dimensions',
                    value: dimensions
                }
            });

            const newTotalQuantity = dimensions.reduce((sum, article) => sum + article.quantite, 0);
            const currentQuantity = data.articles?.nombre || 0;

            if (newTotalQuantity !== currentQuantity) {
                onFormChange({
                    target: {
                        name: 'articles.nombre',
                        value: newTotalQuantity
                    }
                });
            }
        }
    }, [onFormChange, articleDimensions, data.articles?.nombre, hasUserInteracted]);

    useEffect(() => {
        console.log("📄 [ARTICLES-FORM] Rendu avec données:", {
            'data.livraison?.vehicule': data.livraison?.vehicule,
            'data.livraison?.equipiers': data.livraison?.equipiers,
            'deliveryInfo': deliveryInfo,
            'articleDimensions.length': articleDimensions.length,
            'isEditing': isEditing
        });
    }, [data.livraison?.vehicule, data.livraison?.equipiers, deliveryInfo, isEditing]);

    // S'assurer que la valeur n'est jamais undefined
    const getVehicleForSelector = useCallback((): VehicleType | undefined => {
        const vehicle = data.livraison?.vehicule;
        const validVehicles: VehicleType[] = ['1M3', '6M3', '10M3', '20M3'];

        if (vehicle && validVehicles.includes(vehicle as VehicleType)) {
            return vehicle as VehicleType;
        }
        console.log("📄 [ARTICLES-FORM] Véhicule invalide ou vide:", vehicle);
        return undefined;
    }, [data.livraison?.vehicule]);

    const getCrewForSelector = useCallback((): number => {
        const crew = data.livraison?.equipiers;
        return typeof crew === 'number' ? crew : 0;
    }, [data.livraison?.equipiers]);

    const handleVehicleSelect = (vehicleType: "" | VehicleType) => {
        if (vehicleType === "") {
            onFormChange({
                target: {
                    name: 'livraison.vehicule',
                    value: null
                }
            });
        } else {
            onFormChange({
                target: {
                    name: 'livraison.vehicule',
                    value: vehicleType
                }
            });
        }
    };

    // Gérer la sélection des équipiers
    const handleCrewSelect = (crewSize: number) => {
        onFormChange({
            target: {
                name: 'livraison.equipiers',
                value: crewSize
            }
        });
    };

    const calculateRequiredCrew = (): number => {
        if (!articleDimensions || articleDimensions.length === 0) return 0;

        console.log('🎯 [ARTICLES-FORM] CALCUL ÉQUIPIERS - Version corrigée');
        console.log('📦 Articles:', articleDimensions.length);
        console.log('🏠 Conditions livraison:', localDeliveryInfo);

        const totalItemCount = articleDimensions.reduce((sum, article) => sum + (article.quantite || 1), 0);

        // Calculer l'étage effectif avec duplex/maison
        let effectiveFloor = parseInt(data.client?.adresse?.etage || '0');
        if (localDeliveryInfo.isDuplex && localDeliveryInfo.deliveryToUpperFloor) {
            effectiveFloor += 1;
            console.log(`🏠 Duplex détecté: ${effectiveFloor} étages effectifs`);
        }

        // 🔥 CORRECTION : Préparer TOUTES les conditions pour le calcul
        const deliveryConditions = {
            hasElevator: data.client?.adresse?.ascenseur || false,
            totalItemCount,
            rueInaccessible: localDeliveryInfo.rueInaccessible || false,
            paletteComplete: localDeliveryInfo.paletteComplete || false,
            parkingDistance: localDeliveryInfo.parkingDistance || 0,
            hasStairs: localDeliveryInfo.hasStairs || false,
            stairCount: localDeliveryInfo.stairCount || 0,
            needsAssembly: localDeliveryInfo.needsAssembly || false,
            floor: effectiveFloor, // ✅ Étage DÉJÀ calculé avec duplex
            // 🔧 CORRECTION : Désactiver le recalcul duplex dans le service
            isDuplex: false, // ✅ Déjà pris en compte dans effectiveFloor
            deliveryToUpperFloor: false // ✅ Déjà pris en compte dans effectiveFloor
        };

        console.log('📋 Conditions préparées:', deliveryConditions);

        // ✅ UTILISER LA MÉTHODE CORRIGÉE
        const requiredCrew = VehicleValidationService.getRequiredCrewSize(
            articleDimensions,
            deliveryConditions
        );

        console.log(`👥 [ARTICLES-FORM] Équipiers calculés: ${requiredCrew}`);

        // 🔥 DÉBOGAGE : Afficher détail des conditions
        if (requiredCrew > 1) {
            console.log('🔍 DÉBOGAGE - Conditions qui devraient ajouter des équipiers:');

            // Identifier l'article le plus lourd
            const heaviestWeight = Math.max(...articleDimensions.map(a => a.poids || 0));
            const totalWeight = articleDimensions.reduce((sum, article) =>
                sum + ((article.poids || 0) * (article.quantite || 1)), 0
            );

            console.log(`⚖️ Article le plus lourd: ${heaviestWeight}kg`);
            console.log(`⚖️ Poids total: ${totalWeight}kg`);

            if (heaviestWeight >= 30) console.log('✅ Article ≥30kg → +1 équipier');
            if (deliveryConditions.hasElevator && totalWeight > 300) console.log('✅ Charge >300kg avec ascenseur → +1 équipier');
            if (!deliveryConditions.hasElevator && totalWeight > 200) console.log('✅ Charge >200kg sans ascenseur → +1 équipier');
            if (totalItemCount > 20) console.log('✅ Plus de 20 articles → +1 équipier');
            if (deliveryConditions.rueInaccessible) console.log('✅ Rue inaccessible → +1 équipier');
            if (deliveryConditions.paletteComplete) console.log('✅ Palette complète → +1 équipier');
            if (deliveryConditions.parkingDistance > 50) console.log('✅ Distance >50m → +1 équipier');
            if (effectiveFloor > 2 && !deliveryConditions.hasElevator) console.log('✅ Étage élevé sans ascenseur → +1 équipier');
            if (deliveryConditions.hasStairs && deliveryConditions.stairCount > 20) console.log('✅ Nombreuses marches → +1 équipier');
            if (deliveryConditions.needsAssembly) console.log('✅ Montage nécessaire → +1 équipier');
        }

        return requiredCrew;
    };


    const handleDeliveryChange = useCallback((field: string, value: any) => {
        if (isUpdatingRef.current) return;

        isUpdatingRef.current = true;
        setHasUserInteracted(true);

        console.log(`🔄 [ARTICLES-FORM] Condition modifiée: ${field} = ${value}`);

        setLocalDeliveryInfo(prev => {
            const updated = { ...prev, [field]: value };

            console.log('🔄 Nouvelles conditions:', updated);

            // Mise à jour asynchrone pour éviter les conflits
            setTimeout(() => {
                onFormChange({
                    target: {
                        name: 'livraison.details',
                        value: JSON.stringify(updated)
                    }
                });
                isUpdatingRef.current = false;

                // 🔥 FORCER LE RECALCUL APRÈS CHAQUE MODIFICATION
                setTimeout(() => {
                    const newCrewCount = calculateRequiredCrew();
                    console.log(`🔄 Recalcul après modification: ${newCrewCount} équipiers`);
                }, 100);

            }, 0);

            return updated;
        });
    }, [onFormChange]);

    const handleDeliveryDetailsChange = useCallback((details: any) => {
        console.log("📄 [ARTICLES-FORM] Détails de livraison changés:", details);

        setLocalDeliveryInfo(details);

        onFormChange({
            target: {
                name: 'livraison.details',
                value: JSON.stringify(details)
            }
        });
    }, [onFormChange]);

    const shouldShowValidationWarning = () => {
        // Ne pas afficher d'avertissement si :
        // 1. L'utilisateur n'a pas encore interagi avec le formulaire
        // 2. On est en mode édition
        // 3. Aucune tentative de validation n'a été faite
        if (!hasUserInteracted || isEditing || !hasAttemptedValidation) {
            return false;
        }

        // Afficher seulement si l'utilisateur a commencé à saisir des dimensions
        // mais qu'elles sont incomplètes
        return hasUserInteracted && articleDimensions.some(
            article => article.nom && article.nom.trim() !== '' && // L'utilisateur a commencé à saisir
                !article.longueur && !article.largeur && !article.hauteur && !article.poids
        );
    };

    // Détecter les tentatives de navigation vers les étapes suivantes
    useEffect(() => {
        // Écouter les événements de validation du formulaire global
        const handleFormValidation = (event: CustomEvent) => {
            if (event.detail.step === 2) { // Étape articles
                setHasAttemptedValidation(true);
            }
        };

        window.addEventListener('form-validation-attempt', handleFormValidation as EventListener);
        return () => {
            window.removeEventListener('form-validation-attempt', handleFormValidation as EventListener);
        };
    }, []);

    const handleCanBeTiltedChange = useCallback((canBeTilted: boolean) => {
        console.log('📦 [ARTICLES] CanBeTilted changé:', canBeTilted);

        // Mettre à jour les données du formulaire
        onFormChange({
            target: {
                name: 'articles.canBeTilted',
                value: canBeTilted
            }
        });
    }, [onFormChange]);

    return (
        <div className="space-y-6 mb-6">
            {/* <h3 className="text-xl font-semibold mb-4">Détails des articles</h3> */}

            {/* Formulaire de dimensions des articles */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <ArticleDimensionsForm
                    initialArticles={data.articles?.dimensions || articleDimensions}
                    onChange={handleArticleDimensionsChange}
                    readOnly={false}
                    isEditing={isEditing}
                />
            </div>

            {/* ========== AVERTISSEMENT CONTEXTUEL (AMÉLIORATION) ========== */}
            {shouldShowValidationWarning() && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 flex items-start">
                    <div className="flex-shrink-0 mr-3">
                        <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium">Dimensions incomplètes</p>
                        <p className="text-sm mt-1">
                            Vous avez commencé à saisir des articles mais certaines dimensions sont manquantes.
                            Ces informations sont importantes pour choisir le bon véhicule de livraison.
                        </p>
                        <div className="mt-2">
                            <button
                                type="button"
                                className="text-sm underline hover:no-underline"
                                onClick={() => {
                                    // Faire défiler vers le formulaire de dimensions
                                    const dimensionsForm = document.querySelector('[data-testid="dimensions-form"]');
                                    if (dimensionsForm) {
                                        dimensionsForm.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                            >
                                Compléter les dimensions →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions supplémentaires pour la livraison */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <h4 className="text-lg font-medium mb-3">Conditions spéciales de livraison</h4>
                <p className="text-sm text-gray-600 mb-4">
                    Ces informations nous aident à déterminer le nombre d'équipiers nécessaires et à calculer un<br />tarif précis.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 🆕 TYPE DE LOGEMENT - NOUVEAU */}
                    <div className="col-span-2 border-t pt-4">
                        <h5 className="font-medium text-gray-800 mb-3">Type de logement</h5>

                        <div className="space-y-3">
                            <label className="flex items-center text-sm">
                                <input
                                    type="checkbox"
                                    checked={localDeliveryInfo.isDuplex || false}
                                    onChange={(e) => {
                                        handleDeliveryChange('isDuplex', e.target.checked)
                                        if (e.target.checked) {
                                            handleDeliveryChange('deliveryToUpperFloor', false)
                                        }
                                    }}
                                    className="mr-2 h-4 w-4"
                                />
                                <span className="font-medium">Appartement duplex ou maison avec étage(s)</span>
                            </label>
                            <p className="text-xs text-gray-500 ml-6">
                                Le lieu de livraison comporte plusieurs niveaux (duplex, maison à étages, etc.)
                            </p>

                            {/* 🆕 LIVRAISON À L'ÉTAGE - CONDITIONNEL */}
                            {localDeliveryInfo.isDuplex && (
                                <div className="ml-6 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
                                    <label className="flex items-center text-sm">
                                        <input
                                            type="checkbox"
                                            checked={localDeliveryInfo.deliveryToUpperFloor || false}
                                            onChange={(e) => handleDeliveryChange('deliveryToUpperFloor', e.target.checked)}
                                            className="mr-2 h-4 w-4"
                                        />
                                        <span className="font-medium">Livraison à l'étage supérieur</span>
                                    </label>
                                    <p className="text-xs text-gray-500 ml-6 mt-1">
                                        Les articles doivent être livrés à un étage autre que le rez-de-chaussée
                                    </p>
                                    {localDeliveryInfo.deliveryToUpperFloor && (
                                        <div className="mt-2 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                                            💡 <strong>Information :</strong> Cette option ajoute automatiquement +1 étage
                                            au calcul final pour déterminer<br />le nombre d'équipiers nécessaires.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rue inaccessible */}
                    <div className="col-span-2">
                        <label className="flex items-center text-sm mb-1">
                            <input
                                type="checkbox"
                                checked={localDeliveryInfo.rueInaccessible || false}
                                onChange={(e) => handleDeliveryChange('rueInaccessible', e.target.checked)}
                                className="mr-2 h-4 w-4"
                            />
                            <span className="font-medium">Rue inaccessible pour véhicule 4 roues</span>
                        </label>
                        <p className="text-xs text-gray-500 ml-6">
                            Le véhicule ne peut pas accéder directement devant l'adresse (rue piétonne, passage étroit, etc.)
                        </p>
                    </div>

                    {/* Palette complète */}
                    <div className="col-span-2">
                        <label className="flex items-center text-sm mb-1">
                            <input
                                type="checkbox"
                                checked={localDeliveryInfo.paletteComplete || false}
                                onChange={(e) => handleDeliveryChange('paletteComplete', e.target.checked)}
                                className="mr-2 h-4 w-4"
                            />
                            <span className="font-medium">Palette complète à dépalettiser et décharger</span>
                        </label>
                        <p className="text-xs text-gray-500 ml-6">
                            Nécessite déchargement complet d'une palette et manutention article par article
                        </p>
                    </div>

                    {/* Distance de portage */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Distance de portage (mètres)
                        </label>
                        <input
                            type="number"
                            value={localDeliveryInfo.parkingDistance || 0}
                            onChange={(e) => handleDeliveryChange('parkingDistance', parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            min="0"
                            placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Distance entre le stationnement du véhicule et l'entrée du bâtiment
                        </p>
                        {(localDeliveryInfo.parkingDistance || 0) >= 50 && (
                            <p className="text-xs text-orange-600 mt-1">
                                ⚠️ Distance importante - Équipiers supplémentaires recommandés
                            </p>
                        )}
                    </div>

                    {/* Escaliers */}
                    <div>
                        <label className="flex items-center text-sm mb-2">
                            <input
                                type="checkbox"
                                checked={localDeliveryInfo.hasStairs}
                                onChange={(e) => {
                                    handleDeliveryChange('hasStairs', e.target.checked);
                                    if (!e.target.checked) {
                                        handleDeliveryChange('stairCount', 0);
                                    }
                                }}
                                className="mr-2 h-4 w-4"
                            />
                            Y a-t-il des marches ou escaliers ?
                        </label>

                        {localDeliveryInfo.hasStairs && (
                            <div className="ml-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre total de marches
                                </label>
                                <input
                                    type="number"
                                    value={localDeliveryInfo.stairCount || 0}
                                    onChange={(e) => handleDeliveryChange('stairCount', parseInt(e.target.value) || 0)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    min="0"
                                    placeholder="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Incluant tous les escaliers jusqu'au point de livraison
                                </p>
                                {(localDeliveryInfo.stairCount || 0) > 20 && (
                                    <p className="text-xs text-orange-600 mt-1">
                                        ⚠️ Nombreuses marches - 2+ équipiers recommandés
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Montage nécessaire */}
                    <div>
                        <label className="flex items-center text-sm mb-1">
                            <input
                                type="checkbox"
                                checked={localDeliveryInfo.needsAssembly}
                                onChange={(e) => handleDeliveryChange('needsAssembly', e.target.checked)}
                                className="mr-2 h-4 w-4"
                            />
                            <span className="font-medium">Montage ou installation nécessaire</span>
                        </label>
                        <p className="text-xs text-gray-500 ml-6">
                            Assemblage de meubles, installation d'arbres, plantes, d'équipements, etc.
                        </p>
                    </div>
                </div>

                {/* Résumé automatique des conditions détectées */}
                {hasUserInteracted && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">Conditions de livraison détectées :</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
                            {/* Logement */}
                            {localDeliveryInfo.isDuplex && (
                                <div>• Duplex/Maison {localDeliveryInfo.deliveryToUpperFloor ? '(livraison étage)' : '(rez-de-chaussée)'}</div>
                            )}

                            {/* Conditions principales */}
                            {localDeliveryInfo.rueInaccessible && (
                                <div>• Rue inaccessible - portage nécessaire</div>
                            )}
                            {localDeliveryInfo.paletteComplete && (
                                <div>• Palette complète à dépalettiser</div>
                            )}
                            {(localDeliveryInfo.parkingDistance || 0) >= 50 && (
                                <div>• Distance portage importante ({localDeliveryInfo.parkingDistance}m)</div>
                            )}
                            {localDeliveryInfo.hasStairs && (localDeliveryInfo.stairCount || 0) >= 10 && (
                                <div>• Nombreuses marches ({localDeliveryInfo.stairCount})</div>
                            )}
                            {localDeliveryInfo.needsAssembly && (
                                <div>• Montage/installation requis</div>
                            )}

                            {/* Message par défaut */}
                            {(!localDeliveryInfo.isDuplex && !localDeliveryInfo.rueInaccessible &&
                                !localDeliveryInfo.paletteComplete && (localDeliveryInfo.parkingDistance || 0) <= 50 &&
                                (localDeliveryInfo.stairCount || 0) <= 10 && !localDeliveryInfo.needsAssembly) && (
                                    <div>• Conditions de livraison standard</div>
                                )}
                        </div>

                        {/* 🆕 CALCUL AUTOMATIQUE DES ÉQUIPIERS */}
                        {hasUserInteracted && articleDimensions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-300">
                                <p className="text-sm font-medium text-blue-800">
                                    📊 Estimation automatique : <span className="font-bold text-lg">{calculateRequiredCrew()}</span> équipier(s) requis
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Basé sur l'article le plus lourd et les conditions de livraison
                                </p>

                                {/* 🔥 DÉBOGAGE VISUEL */}
                                {calculateRequiredCrew() > 1 && (
                                    <div className="mt-2 text-xs text-blue-700">
                                        <p>🔍 Conditions détectées qui nécessitent des équipiers :</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {localDeliveryInfo.rueInaccessible && (
                                                <span className="px-2 py-1 bg-red-100 rounded text-red-700">Rue inaccessible</span>
                                            )}
                                            {localDeliveryInfo.paletteComplete && (
                                                <span className="px-2 py-1 bg-red-100 rounded text-red-700">Palette complète</span>
                                            )}
                                            {(localDeliveryInfo.parkingDistance || 0) > 50 && (
                                                <span className="px-2 py-1 bg-red-100 rounded text-red-700">Distance {localDeliveryInfo.parkingDistance}m</span>
                                            )}
                                            {localDeliveryInfo.needsAssembly && (
                                                <span className="px-2 py-1 bg-red-100 rounded text-red-700">Montage requis</span>
                                            )}
                                            {localDeliveryInfo.isDuplex && localDeliveryInfo.deliveryToUpperFloor && (
                                                <span className="px-2 py-1 bg-red-100 rounded text-red-700">Duplex étage</span>
                                            )}
                                            {localDeliveryInfo.hasStairs && (localDeliveryInfo.stairCount || 0) > 20 && (
                                                <span className="px-2 py-1 bg-red-100 rounded text-red-700">{localDeliveryInfo.stairCount} marches</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sélection du véhicule et des équipiers */}
            {hasUserInteracted && articleDimensions.length > 0 &&
                articleDimensions.some(art => art.nom && art.nom.trim() !== '') && (
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <VehicleSelector
                            articles={articleDimensions}
                            onVehicleSelect={handleVehicleSelect}
                            onCrewSelect={handleCrewSelect}
                            onDeliveryDetailsChange={handleDeliveryDetailsChange}
                            onCanBeTiltedChange={handleCanBeTiltedChange}
                            initialVehicle={getVehicleForSelector()}
                            initialCrew={getCrewForSelector()}
                            initialCanBeTilted={data.articles?.canBeTilted || false}
                            deliveryInfo={localDeliveryInfo}
                            isEditing={isEditing}
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
                    onChange={(e) => {
                        setHasUserInteracted(true);
                        onFormChange(e);
                    }}
                    error={errors.articles?.nombre}
                    required
                    disabled
                />

                <p className="text-sm text-gray-500 -mt-3">
                    (Calculé automatiquement à partir des quantités saisies dans les dimensions)
                </p>

                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">Détails des articles</label>
                    <textarea
                        name="articles.details"
                        value={data.articles?.details || ''}
                        onChange={(e) => {
                            setHasUserInteracted(true);
                            onFormChange(e as any);
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300"
                        rows={4}
                        placeholder="Décrivez vos articles (type, particularités, etc.)"
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