import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudinaryService } from "../../services/cloudinary.service";
import { ArticlesFormProps } from "../../types/form.types";
import PhotoUploader from "../PhotoUploader";
import FormInput from "./FormInput";
import { XCircle, Info } from "lucide-react";
import ArticleDimensionsForm, { ArticleDimension } from "./ArticleDimensionForm";
import VehicleSelector from "../VehicleSelector";
import { VehicleType, VehicleValidationService } from "../../services/vehicle-validation.service";
import { CommandeMetier } from "../../types/business.types";
import { TarificationService } from "../../services/tarification.service";

export const ArticlesForm: React.FC<ArticlesFormProps | CommandeMetier> = ({ data, errors, onChange: onFormChange, isEditing = true, userRole }) => {
    const [existingPhotos, setExistingPhotos] = useState<Array<{ url: string; file?: File }>>([]);
    const [photos, setPhotos] = useState<Array<{ url: string; file: File }>>([]);
    const [articleDimensions, setArticleDimensions] = useState<ArticleDimension[]>([]);
    // ========== ÉTAT POUR CONTRÔLER L'AFFICHAGE DES VALIDATIONS ==========
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [estimationTarif, setEstimationTarif] = useState<{ montantHT: number | 'devis'; detail: any } | null>(null);
    const [showEstimation, setShowEstimation] = useState(false);

    const tarificationService = useMemo(() => new TarificationService(), []);

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
    const handleArticleDimensionsChange = useCallback((dimensions: ArticleDimension[], autresArticlesCount: number = 0, autresArticlesPoids: number = 0) => {
        if (!hasUserInteracted && dimensions.length > 0) {
            setHasUserInteracted(true);
        }

        const currentDimensionsString = JSON.stringify(articleDimensions);
        const newDimensionsString = JSON.stringify(dimensions);
        const currentAutresArticles = data.articles?.autresArticles || 0;
        const currentAutresArticlesPoids = data.articles?.autresArticlesPoids || 0;

        // Détecter si les dimensions ont été réinitialisées (tous les noms vides)
        const hasDimensionDetails = dimensions.some(article => article.nom && article.nom.trim() !== '');

        // Si dimensions réinitialisées (bouton "Retirer"), réinitialiser aussi véhicule/équipiers
        if (!hasDimensionDetails && articleDimensions.some(art => art.nom && art.nom.trim() !== '')) {
            console.log("🔄 [ARTICLES-FORM] Dimensions retirées → Réinitialisation véhicule/équipiers");
            onFormChange({
                target: {
                    name: 'livraison.vehicule',
                    value: null
                }
            });
            onFormChange({
                target: {
                    name: 'livraison.equipiers',
                    value: 0
                }
            });
        }

        // Gérer les changements de dimensions
        if (currentDimensionsString !== newDimensionsString) {
            console.log("📄 [ARTICLES-FORM] Dimensions modifiées:", dimensions.length);
            setArticleDimensions(dimensions);

            onFormChange({
                target: {
                    name: 'articles.dimensions',
                    value: dimensions
                }
            });
        }

        // Gérer les changements d'autres articles (toujours sauvegarder)
        if (autresArticlesCount !== currentAutresArticles) {
            console.log(`📦 [ARTICLES-FORM] Autres articles modifiés: ${currentAutresArticles} → ${autresArticlesCount}`);
            onFormChange({
                target: {
                    name: 'articles.autresArticles',
                    value: autresArticlesCount
                }
            });
        }

        // Gérer les changements du poids des autres articles
        if (autresArticlesPoids !== currentAutresArticlesPoids) {
            console.log(`⚖️ [ARTICLES-FORM] Poids autres articles modifié: ${currentAutresArticlesPoids} → ${autresArticlesPoids}`);
            onFormChange({
                target: {
                    name: 'articles.autresArticlesPoids',
                    value: autresArticlesPoids
                }
            });
        }

        // Recalculer le total (toujours, car soit dimensions soit autresArticles a changé)
        const quantityFromDimensions = dimensions.reduce((sum, article) => sum + article.quantite, 0);
        const newTotalQuantity = quantityFromDimensions + autresArticlesCount;
        const currentQuantity = data.articles?.nombre || 0;

        console.log(`📊 Calcul total articles: ${quantityFromDimensions} (dimensions) + ${autresArticlesCount} (autres) = ${newTotalQuantity}`);

        // Ne sauvegarder que s'il y a des données réelles (évite les sauvegardes à 0 au démarrage)
        if (newTotalQuantity !== currentQuantity && (newTotalQuantity > 0 || dimensions.length > 0 || currentQuantity > 0)) {
            onFormChange({
                target: {
                    name: 'articles.nombre',
                    value: newTotalQuantity
                }
            });
        }

        // ✅ RECALCULER ET SAUVEGARDER LES ÉQUIPIERS APRÈS CHANGEMENT DES ARTICLES
        if (hasDimensionDetails || autresArticlesCount > 0) {
            setTimeout(() => {
                // Recalculer ici directement pour éviter les dépendances circulaires
                console.log('🔄 Déclenchement recalcul équipiers suite changement articles');
            }, 150);
        }
    }, [onFormChange, articleDimensions, data.articles?.nombre, data.articles?.autresArticles, data.articles?.autresArticlesPoids, hasUserInteracted, data.livraison?.equipiers]);

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
        console.log('🔍 [ARTICLES] getCrewForSelector:', { crew, type: typeof crew });
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

        // ✅ INCLURE LES "AUTRES ARTICLES" dans le total
        const quantityFromDimensions = articleDimensions.reduce((sum, article) => sum + (article.quantite || 1), 0);
        const autresArticlesCount = data.articles?.autresArticles || 0;
        const totalItemCount = quantityFromDimensions + autresArticlesCount;

        console.log(`📊 Total articles pour calcul équipiers: ${quantityFromDimensions} (dimensionnés) + ${autresArticlesCount} (autres) = ${totalItemCount}`);

        // Calculer l'étage effectif avec duplex/maison
        let effectiveFloor = parseInt(data.client?.adresse?.etage || '0');
        if (localDeliveryInfo.isDuplex && localDeliveryInfo.deliveryToUpperFloor) {
            effectiveFloor += 1;
            console.log(`🏠 Duplex détecté: ${effectiveFloor} étages effectifs`);
        }

        // ✅ CALCULER LE POIDS TOTAL DES "AUTRES ARTICLES"
        const autresArticlesPoids = data.articles?.autresArticlesPoids || 0;
        const autresArticlesTotalWeight = autresArticlesCount * autresArticlesPoids;

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
            deliveryToUpperFloor: false, // ✅ Déjà pris en compte dans effectiveFloor
            autresArticlesTotalWeight // ✅ NOUVEAU : Poids total des "autres articles"
        };

        console.log('📋 Conditions préparées:', deliveryConditions);

        // ✅ INCLURE LES "AUTRES ARTICLES" COMME UN ARTICLE SUPPLÉMENTAIRE
        const allArticles = [...articleDimensions];
        if (autresArticlesCount > 0 && autresArticlesPoids > 0) {
            allArticles.push({
                id: 'autres-articles',
                nom: 'Autres articles',
                quantite: autresArticlesCount,
                poids: autresArticlesPoids,
                longueur: 0,
                largeur: 0,
                hauteur: 0
            });
        }

        // ✅ UTILISER LA MÉTHODE CORRIGÉE
        const requiredCrew = VehicleValidationService.getRequiredCrewSize(
            allArticles,
            deliveryConditions
        );

        console.log(`👥 [ARTICLES-FORM] Équipiers calculés: ${requiredCrew}`);

        // 🔥 DÉBOGAGE : Afficher détail des conditions
        if (requiredCrew > 0) {
            console.log('🔍 DÉBOGAGE - Conditions qui déclenchent des équipiers:');

            // Identifier l'article le plus lourd
            const heaviestWeight = Math.max(...articleDimensions.map(a => a.poids || 0));
            const weightFromDimensions = articleDimensions.reduce((sum, article) =>
                sum + ((article.poids || 0) * (article.quantite || 1)), 0
            );

            const totalWeight = weightFromDimensions + autresArticlesTotalWeight;

            console.log(`⚖️ Article le plus lourd individuel: ${heaviestWeight}kg`);
            console.log(`⚖️ Poids total: ${weightFromDimensions}kg (dimensionnés) + ${autresArticlesTotalWeight}kg (autres) = ${totalWeight}kg`);
            console.log(`📦 Nombre total articles: ${totalItemCount}`);

            if (heaviestWeight >= 30) console.log('✅ Article ≥30kg → +1 équipier');
            if (deliveryConditions.hasElevator && totalWeight > 300) console.log('✅ Charge >300kg avec ascenseur → +1 équipier');
            if (!deliveryConditions.hasElevator && totalWeight > 200) console.log('✅ Charge >200kg sans ascenseur → +1 équipier');
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

                    // ✅ SAUVEGARDER LE RÉSULTAT DANS data.livraison.equipiers
                    if (newCrewCount !== data.livraison?.equipiers) {
                        onFormChange({
                            target: {
                                name: 'livraison.equipiers',
                                value: newCrewCount
                            }
                        });
                    }
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

    // Calculer l'estimation de tarif quand le véhicule et les équipiers changent
    useEffect(() => {
        console.log('🔄 [ARTICLES-FORM] useEffect estimation déclenché:', {
            vehicule: data.livraison?.vehicule,
            equipiers: data.livraison?.equipiers,
            hasUserInteracted
        });

        if (data.livraison?.vehicule && data.livraison?.equipiers !== undefined && hasUserInteracted) {
            try {
                const estimation = tarificationService.calculerEstimationSansKm({
                    vehicule: data.livraison.vehicule,
                    equipiers: data.livraison.equipiers,
                    userRole // 🆕 Passer userRole pour bypass admin
                });
                setEstimationTarif(estimation);
                console.log('💰 [ARTICLES-FORM] Estimation calculée:', {
                    vehicule: data.livraison.vehicule,
                    equipiers: data.livraison.equipiers,
                    montantHT: estimation.montantHT,
                    detail: estimation.detail
                });
            } catch (error) {
                console.error('Erreur calcul estimation:', error);
                setEstimationTarif(null);
            }
        } else {
            setEstimationTarif(null);
        }
    }, [data.livraison?.vehicule, data.livraison?.equipiers, tarificationService, hasUserInteracted, userRole]);

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
                    initialAutresArticles={data.articles?.autresArticles || 0}
                    initialAutresArticlesPoids={data.articles?.autresArticlesPoids || 0}
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

            {/* Informations destination (Étage et Ascenseur) */}
            {hasUserInteracted && articleDimensions.length > 0 &&
                articleDimensions.some(art => art.nom && art.nom.trim() !== '') && (
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <h4 className="text-lg font-medium mb-4">📍 Informations de destination</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FormInput
                                    label="Étage de livraison"
                                    name="client.adresse.etage"
                                    type="number"
                                    value={data.client?.adresse?.etage || '0'}
                                    min={0}
                                    onChange={(e) => {
                                        setHasUserInteracted(true);
                                        onFormChange(e);
                                    }}
                                    placeholder="Ex: 3"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    0 = Rez-de-chaussée
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Ascenseur disponible
                                </label>
                                <div className="flex items-center h-10">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="client.adresse.ascenseur"
                                            checked={data.client?.adresse?.ascenseur || false}
                                            onChange={(e) => {
                                                setHasUserInteracted(true);
                                                onFormChange({
                                                    target: {
                                                        name: 'client.adresse.ascenseur',
                                                        value: e.target.checked
                                                    }
                                                });
                                            }}
                                            className="mr-2 h-5 w-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                        />
                                        <span className="text-sm text-gray-700">
                                            Oui, un ascenseur est disponible
                                        </span>
                                    </label>
                                </div>
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

                    {/* Montage nécessaire A CACHER POUR LE MOMENT */}
                    {/* <div>
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
                    </div> */}
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
            {hasUserInteracted && articleDimensions.length > 0 && (
                <>
                    {/* Message d'avertissement si dimensions non renseignées */}
                    {!articleDimensions.some(art => art.nom && art.nom.trim() !== '') && (
                        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4 flex items-start">
                            <Info className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium">Note importante</p>
                                <p>
                                    Sans dimensions détaillées, vous devez sélectionner manuellement le véhicule et le nombre d'équipiers.
                                    Si à la réception de la commande il s'avère qu'il faut un véhicule plus grand ou plus d'équipiers,
                                    My Truck se réserve le droit d'attribuer un autre véhicule ou des équipiers supplémentaires,
                                    ce qui pourra entraîner une augmentation du prix de la prestation.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <VehicleSelector
                            articles={(() => {
                                // ✅ INCLURE LES "AUTRES ARTICLES" POUR LE CALCUL DES ÉQUIPIERS
                                const allArticles = [...articleDimensions];
                                const autresArticlesCount = data.articles?.autresArticles || 0;
                                const autresArticlesPoids = data.articles?.autresArticlesPoids || 0;

                                if (autresArticlesCount > 0 && autresArticlesPoids > 0) {
                                    allArticles.push({
                                        id: 'autres-articles',
                                        nom: 'Autres articles',
                                        quantite: autresArticlesCount,
                                        poids: autresArticlesPoids,
                                        longueur: 0,
                                        largeur: 0,
                                        hauteur: 0
                                    });
                                }
                                return allArticles;
                            })()}
                            onVehicleSelect={handleVehicleSelect}
                            onCrewSelect={handleCrewSelect}
                            onDeliveryDetailsChange={handleDeliveryDetailsChange}
                            onCanBeTiltedChange={handleCanBeTiltedChange}
                            initialVehicle={getVehicleForSelector()}
                            initialCrew={getCrewForSelector()}
                            initialCanBeTilted={data.articles?.canBeTilted || false}
                            deliveryInfo={localDeliveryInfo}
                            isEditing={isEditing}
                            userRole={userRole}
                            autresArticlesCount={data.articles?.autresArticles || 0}
                            autresArticlesPoids={data.articles?.autresArticlesPoids || 0}
                        />
                    </div>
                </>
            )}

            {/* Nombre d'articles */}
            <div className="grid grid-cols-1 gap-4">
                <FormInput
                    label="Nombre total d'articles"
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

            {/* Bouton pour afficher/masquer l'estimation */}
            {estimationTarif && hasUserInteracted && articleDimensions.length > 0 &&
                articleDimensions.some(art => art.nom && art.nom.trim() !== '') && (
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={() => setShowEstimation(!showEstimation)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-green-100 hover:bg-green-200 border-2 border-green-300 rounded-lg transition-colors duration-200"
                        >
                            <div className="flex items-center">
                                <span className="text-lg font-semibold text-green-800">
                                    {showEstimation ? 'Masquer l\'estimation de prix' : 'Voir l\'estimation de prix'}
                                </span>
                            </div>
                            <svg
                                className={`w-6 h-6 text-green-700 transform transition-transform duration-200 ${showEstimation ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Estimation de tarif (sans frais kilométriques) */}
                        {showEstimation && (
                            <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-md">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <span className="text-3xl mr-3">💰</span>
                                        <div>
                                            <h4 className="text-xl font-bold text-green-800">Estimation de prix "MY TRUCK"</h4>
                                            <p className="text-sm text-green-700">Hors frais kilométriques</p>
                                        </div>
                                    </div>
                                    {estimationTarif.montantHT === 'devis' ? (
                                        <div className="text-3xl font-bold text-orange-600">DEVIS</div>
                                    ) : (
                                        <div className="text-right">
                                            <div className="text-4xl font-bold text-green-700">{estimationTarif.montantHT}€</div>
                                            <div className="text-sm text-green-600 font-medium">HT</div>
                                        </div>
                                    )}
                                </div>

                                {/* Détail de l'estimation */}
                                {estimationTarif.montantHT !== 'devis' && (
                                    <div className="mt-4 pt-4 border-t border-green-200">
                                        <p className="text-sm font-medium text-green-800 mb-2">Détail du tarif :</p>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex justify-between bg-white bg-opacity-60 rounded px-3 py-2">
                                                <span className="text-gray-700">Véhicule {data.livraison?.vehicule} :</span>
                                                <span className="font-semibold text-green-700">{estimationTarif.detail.vehicule}€</span>
                                            </div>
                                            <div className="flex justify-between bg-white bg-opacity-60 rounded px-3 py-2">
                                                <span className="text-gray-700">
                                                    {data.livraison?.equipiers === 0 ? 'Chauffeur seul' :
                                                        `Équipiers (+${data.livraison?.equipiers})`} :
                                                </span>
                                                <span className="font-semibold text-green-700">
                                                    {estimationTarif.detail.equipiers === 'devis' ? 'DEVIS' : `${estimationTarif.detail.equipiers}€`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Avertissement */}
                                <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-md flex items-start">
                                    <span className="text-orange-600 text-xl mr-2">⚠️</span>
                                    <div className="text-sm text-orange-800">
                                        <p className="font-semibold mb-1">Tarif approximatif</p>
                                        <p>
                                            Cette estimation ne comprend <strong>pas les frais kilométriques</strong>.
                                            Le tarif final sera calculé à l'étape suivante après la saisie de l'adresse de livraison.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
};