
import { useCallback, useEffect, useRef, useState } from "react";
import { LivraisonFormProps } from "../../types/form.types";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { CRENEAUX_LIVRAISON, VEHICULES } from "../constants/options";
import { TarificationService, TypeVehicule } from "../../services/tarification.service";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { VehicleType, VehicleValidationService } from "../../services/vehicle-validation.service";
import { AlertTriangle, Info } from "lucide-react";
import { SlotsService } from "../../services/slots.service";
import { SlotAvailability } from "../../types/slots.types";
import { SlotsInfo } from "../SlotsInfo";
import ContactForm from "../ContactForm";

export const LivraisonForm: React.FC<LivraisonFormProps> = ({ data, errors, onChange, showErrors = false, isEditing = false, isCession = false, userRole }) => {
    const [selectedVehicleLong, setSelectedVehicleLong] = useState('');
    const [selectedVehicleShort, setSelectedVehicleShort] = useState(data.livraison?.vehicule || '');
    const [calculatingTarif, setCalculatingTarif] = useState(false);
    const [tarifDetails, setTarifDetails] = useState<{
        montantHT: number | 'devis';
        detail: {
            vehicule: number;
            distance: number | 'devis';
            equipiers: number | 'devis';
            majorationDimancheFerie?: number;
        }
    } | null>(null);
    const [vehicleRestrictions, setVehicleRestrictions] = useState<string[]>([]);
    const [showVehicleHelpModal, setShowVehicleHelpModal] = useState(false);
    const [restrictedVehicles, setRestrictedVehicles] = useState<VehicleType[]>([]);
    const [recommendedVehicle, setRecommendedVehicle] = useState<VehicleType | null>(null);
    const [recommendedCrew, setRecommendedCrew] = useState<number>(0);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [hasDimensionsData, setHasDimensionsData] = useState(false);
    const [deliveryInfo, setDeliveryInfo] = useState({
        hasElevator: false,
        hasStairs: false,
        stairCount: 0,
        parkingDistance: 0,
        needsAssembly: false,
        rueInaccessible: false,
        paletteComplete: false,
        isDuplex: false,
        deliveryToUpperFloor: false,
        estimatedHandlingTime: 0,
        hasLargeVoluminousItems: false,
        multipleLargeVoluminousItems: false,
        complexAccess: false,
    });
    const [availableSlots, setAvailableSlots] = useState<SlotAvailability[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [useDynamicSlots, setUseDynamicSlots] = useState(true);
    const [showContactForm, setShowContactForm] = useState(false);
    const [showTarifEstimation, setShowTarifEstimation] = useState(false); // 🆕 État pour afficher/masquer l'estimation

    const slotsService = new SlotsService();

    // Référence pour suivre si nous avons déjà tenté de récupérer l'adresse
    const adressMagasinRecuperee = useRef(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    // ✅ Refs pour fonctions stables (éviter boucles infinies dans useCallback)
    const onChangeRef = useRef(onChange);
    const getLatestStoreAddressRef = useRef<() => Promise<string>>();

    // Mettre à jour les refs à chaque rendu (évite re-création de updateTarif)
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // IMPORTANT: Stocker l'adresse du magasin dans un état local pour éviter qu'elle ne soit écrasée
    const [storeAddress, setStoreAddress] = useState<string>('');

    useEffect(() => {
        // Récupérer les dimensions des articles
        const articleDimensions = data.articles?.dimensions || [];
        const hasValidDimensions = articleDimensions.length > 0 &&
            articleDimensions.some(article =>
                article.nom && article.nom.trim() !== '' &&
                (article.longueur || article.largeur || article.hauteur || article.poids)
            );

        setHasDimensionsData(hasValidDimensions);

        if (!hasValidDimensions) {
            // Pas de données de dimensions, pas de validation
            setRestrictedVehicles([]);
            setRecommendedVehicle(null);
            setRecommendedCrew(0);
            setValidationErrors([]);
            setWarnings([]);
            return;
        }

        // Récupérer les informations de livraison
        let currentDeliveryInfo = { ...deliveryInfo };
        if (data.livraison?.details) {
            try {
                const livDetails = typeof data.livraison.details === 'string'
                    ? JSON.parse(data.livraison.details)
                    : data.livraison.details;

                if (livDetails) {
                    currentDeliveryInfo = {
                        hasElevator: data.client?.adresse?.ascenseur || false,
                        hasStairs: livDetails.hasStairs || false,
                        stairCount: livDetails.stairCount || 0,
                        parkingDistance: livDetails.parkingDistance || 0,
                        needsAssembly: livDetails.needsAssembly || false,
                        rueInaccessible: livDetails.rueInaccessible || false,
                        paletteComplete: livDetails.paletteComplete || false,
                        isDuplex: livDetails.isDuplex || false,
                        deliveryToUpperFloor: livDetails.deliveryToUpperFloor || false,
                        estimatedHandlingTime: livDetails.estimatedHandlingTime || 0,
                        hasLargeVoluminousItems: livDetails.hasLargeVoluminousItems || false,
                        multipleLargeVoluminousItems: livDetails.multipleLargeVoluminousItems || false,
                        complexAccess: livDetails.complexAccess || false
                    };
                    setDeliveryInfo(currentDeliveryInfo);
                }
            } catch (e) {
                console.warn("Impossible de parser les détails de livraison", e);
            }
        }

        // Valider les véhicules
        const availableVehicles = VehicleValidationService.getAvailableVehicleTypes();
        const restricted: VehicleType[] = [];

        // Déterminer si les articles peuvent être couchés
        let canBeTilted = false;
        if (data.articles?.canBeTilted) {
            if (typeof data.articles.canBeTilted === 'string') {
                try {
                    canBeTilted = JSON.parse(data.articles.canBeTilted).canBeTilted || false;
                } catch {
                    canBeTilted = false;
                }
            } else if (typeof data.articles.canBeTilted === 'object' && data.articles.canBeTilted !== null) {
                canBeTilted = (data.articles.canBeTilted as any).canBeTilted || false;
            } else if (typeof data.articles.canBeTilted === 'boolean') {
                canBeTilted = data.articles.canBeTilted;
            }
        }

        availableVehicles.forEach(vehicleType => {
            const canFitAll = articleDimensions.every(article => {
                return VehicleValidationService.canFitInVehicle(article, vehicleType, canBeTilted);
            });

            if (!canFitAll) {
                restricted.push(vehicleType);
            }
        });

        setRestrictedVehicles(restricted);

        // Recommander un véhicule
        const recommended = VehicleValidationService.recommendVehicle(articleDimensions, canBeTilted);
        setRecommendedVehicle(recommended);

        // 🔥 CORRECTION : Calculer les équipiers avec TOUTES les conditions de livraison
        // ✅ INCLURE LES "AUTRES ARTICLES"
        const quantityFromDimensions = articleDimensions.reduce((sum, article) => sum + (article.quantite || 1), 0);
        const autresArticlesCount = data.articles?.autresArticles || 0;
        const autresArticlesPoids = data.articles?.autresArticlesPoids || 0;
        const totalItemCount = quantityFromDimensions + autresArticlesCount;

        // ✅ Créer le tableau allArticles incluant les "autres articles"
        const allArticles = [...articleDimensions];
        if (autresArticlesCount > 0 && autresArticlesPoids > 0) {
            allArticles.push({
                nom: 'Autres articles',
                quantite: autresArticlesCount,
                poids: autresArticlesPoids,
                longueur: 0,
                largeur: 0,
                hauteur: 0
            } as any);
        }

        const deliveryConditions = {
            hasElevator: data.client?.adresse?.ascenseur || false,
            totalItemCount,
            rueInaccessible: currentDeliveryInfo?.rueInaccessible || false,
            paletteComplete: currentDeliveryInfo?.paletteComplete || false,
            parkingDistance: currentDeliveryInfo?.parkingDistance || 0,
            hasStairs: currentDeliveryInfo?.hasStairs || false,
            stairCount: currentDeliveryInfo?.stairCount || 0,
            needsAssembly: currentDeliveryInfo?.needsAssembly || false,
            floor: data.client?.adresse?.etage ? parseInt(data.client.adresse.etage) : 0,
            isDuplex: currentDeliveryInfo?.isDuplex || false,
            deliveryToUpperFloor: currentDeliveryInfo?.deliveryToUpperFloor || false,
            // 🆕 Ajouter les nouvelles conditions
            estimatedHandlingTime: currentDeliveryInfo?.estimatedHandlingTime || 0,
            hasLargeVoluminousItems: currentDeliveryInfo?.hasLargeVoluminousItems || false,
            multipleLargeVoluminousItems: currentDeliveryInfo?.multipleLargeVoluminousItems || false,
            complexAccess: currentDeliveryInfo?.complexAccess || false,
            autresArticlesTotalWeight: autresArticlesCount * autresArticlesPoids
        };

        const crew = VehicleValidationService.getRequiredCrewSize(allArticles, deliveryConditions);
        setRecommendedCrew(crew);

        // Vérifier si des équipiers supplémentaires sont nécessaires
        // ✅ Inclure les "autres articles" dans la détection d'articles lourds
        const autresArticlesPoidsUnitaire = data.articles?.autresArticlesPoids || 0;
        const hasHeavyItems = articleDimensions.some(article => (article.poids || 0) >= 30) || autresArticlesPoidsUnitaire >= 30;
        // ✅ totalItemCount déjà calculé ci-dessus (ligne 171)
        const floor = data.client?.adresse?.etage ? parseInt(data.client.adresse.etage) : 0;

        // Générer des avertissements
        const newWarnings: string[] = [];
        // Suggest an additional crew member if there are heavy items or stairs without elevator and not enough crew
        if ((hasHeavyItems || (currentDeliveryInfo.hasStairs && !currentDeliveryInfo.hasElevator)) && crew < 1) {
            newWarnings.push('Les conditions de livraison suggèrent l\'ajout d\'un équipier.');
        }
        if (hasHeavyItems) {
            newWarnings.push('Certains articles sont lourds (>30kg). Un équipier supplémentaire est recommandé.');
        }
        if (currentDeliveryInfo.hasStairs && !currentDeliveryInfo.hasElevator && crew < 1) {
            newWarnings.push('Livraison avec escaliers sans ascenseur. Un équipier est recommandé.');
        }
        setWarnings(newWarnings);

        // Validation des erreurs
        const errors: string[] = [];
        if (selectedVehicleShort && restricted.includes(selectedVehicleShort as VehicleType)) {
            errors.push(`Le véhicule sélectionné (${selectedVehicleShort}) ne peut pas transporter tous les articles.`);
        }
        if (!recommended) {
            errors.push('Aucun de nos véhicules ne peut transporter ces articles. Veuillez contacter le service client.');
        }
        setValidationErrors(errors);

    }, [data.articles?.dimensions, data.livraison?.details, data.client?.adresse, selectedVehicleShort]);

    // Synchroniser l'état local avec les données entrantes

    useEffect(() => {
        if (data.magasin?.address && data.magasin.address !== storeAddress) {
            console.log(`Mise à jour de l'adresse du magasin dans l'état local: ${data.magasin.address}`);
            setStoreAddress(data.magasin.address);
        }
    }, [data.magasin?.address]);

    // Réinitialiser le flag quand la commande change
    useEffect(() => {
        adressMagasinRecuperee.current = false;
    }, [data.id]); // Se réinitialise quand on change de commande

    // Effet DÉDIÉ uniquement à la récupération de l'adresse manquante du magasin
    useEffect(() => {
        // Si l'adresse du magasin est déjà présente ou si on a déjà tenté de la récupérer, ne rien faire
        if (data.magasin?.address || adressMagasinRecuperee.current) {
            return;
        }

        // Marquer qu'on a essayé de récupérer l'adresse
        adressMagasinRecuperee.current = true;

        if (user?.role === 'magasin' && user.storeAddress) {
            console.log('Récupération UNIQUE de l\'adresse du magasin:', user.storeAddress);

            // Mettre à jour sans déclencher d'effets en cascade
            onChange({
                target: {
                    name: 'magasin.address',
                    value: user.storeAddress
                }
            });
        }
    }, []); // Dépendances vides pour n'exécuter qu'une seule fois au montage

    // Fonction pour récupérer l'adresse du magasin de toutes les sources possibles
    const getLatestStoreAddress = useCallback(async () => {
        // Priorité 1: Les données du formulaire
        if (data.magasin?.address) {
            return data.magasin.address;
        }

        // Priorité 2: Le contexte utilisateur
        if (user?.role === 'magasin' && user.storeAddress) {
            return user.storeAddress;
        }

        // Priorité 3: Le localStorage (RoleSelector)
        try {
            const storedInfo = localStorage.getItem('currentStoreInfo');
            if (storedInfo) {
                const info = JSON.parse(storedInfo);
                if (info.address) {
                    return info.address;
                }
            }
        } catch (e) {
            console.error('🔴 Erreur localStorage currentStoreInfo:', e);
        }

        // 🔴 Priorité 4: API directe (comme MagasinManagement.tsx)
        if (user?.role === 'magasin' && user.storeId) {
            try {
                console.log('🔴 [ADRESSE-MANQUANTE] Récupération depuis API /magasins...');

                // Utiliser la même logique que MagasinManagement.tsx
                const apiService = (window as any).__apiService;
                if (apiService) {
                    const rawData = await apiService.get('/magasins');
                    const magasinData = rawData.data.find((m: any) => m.id === user.storeId);

                    if (magasinData?.adresse) {
                        console.log('🔴 [ADRESSE-MANQUANTE] Adresse trouvée:', magasinData.adresse);

                        // Mettre à jour le formulaire avec l'adresse trouvée
                        onChange({
                            target: {
                                name: 'magasin.address',
                                value: magasinData.adresse
                            }
                        });

                        return magasinData.adresse;
                    }
                }
            } catch (error) {
                console.error('🔴 [ADRESSE-MANQUANTE] Erreur API /magasins:', error);
            }
        }

        console.warn('🔴 [ADRESSE-MANQUANTE] Aucune adresse trouvée !');
        return '';
    }, [data.magasin?.address, user?.storeId, user?.storeAddress, onChange]);

    // Pour mettre à jour l'état local quand les données changent
    useEffect(() => {
        const loadAddress = async () => {
            const latestAddress = await getLatestStoreAddress();
            if (latestAddress && latestAddress !== storeAddress) {
                console.log(`🔴 Mise à jour de l'adresse du magasin: ${latestAddress}`);
                setStoreAddress(latestAddress);
            }
        };
        loadAddress();
    }, [data.magasin?.address, getLatestStoreAddress, storeAddress]);

    // Vérifier les restrictions de véhicule en fonction des dimensions des articles
    useEffect(() => {
        if (data.article?.dimensions && Array.isArray(data.article.dimensions)) {
            // Récupérer les informations sur les articles qui ont des dimensions
            const articlesWithDimensions: {
                longueur?: number;
                largeur?: number;
                hauteur?: number;
                poids?: number;
            }[] = data.article?.dimensions.filter((article: {
                longueur?: number;
                largeur?: number;
                hauteur?: number;
                poids?: number;
            }) =>
                article.longueur || article.largeur || article.hauteur || article.poids
            );

            if (articlesWithDimensions.length > 0) {
                // Déterminer les véhicules qui ne peuvent pas transporter ces articles
                const restrictedVehicles: string[] = [];

                // Vérifie si on a des informations sur la possibilité de coucher les articles
                let canBeTilted = false;
                if (data.articles?.canBeTilted) {
                    if (typeof data.articles.canBeTilted === 'string') {
                        try {
                            canBeTilted = JSON.parse(data.articles.canBeTilted).canBeTilted || false;
                        } catch {
                            canBeTilted = false;
                        }
                    } else if (typeof data.articles.canBeTilted === 'object' && data.articles.canBeTilted !== null) {
                        canBeTilted = (data.articles.canBeTilted as any).canBeTilted || false;
                    } else if (typeof data.articles.canBeTilted === 'boolean') {
                        canBeTilted = data.articles.canBeTilted;
                    }
                }

                // Vérifier pour chaque type de véhicule
                VehicleValidationService.getAvailableVehicleTypes().forEach(vehicleType => {
                    const canFitAll = articlesWithDimensions.every(article =>
                        VehicleValidationService.canFitInVehicle(article, vehicleType, canBeTilted)
                    );

                    if (!canFitAll) {
                        restrictedVehicles.push(vehicleType);
                    }
                });

                setVehicleRestrictions(restrictedVehicles);

                // Si le véhicule sélectionné est restreint, afficher un avertissement
                if (data.livraison?.vehicule && restrictedVehicles.includes(data.livraison.vehicule)) {
                    console.warn(`Le véhicule sélectionné (${data.livraison.vehicule}) ne peut pas transporter tous les articles.`);
                }
            }
        }
    }, [data.article?.dimensions, data.livraison?.details]);

    // ✅ DÉPLACÉ ICI: Déclarer updateTarif AVANT les useEffect qui l'utilisent
    // Calculer le tarif quand les données pertinentes changent
    // ✅ FIX: useCallback pour éviter stale closure et capturer les valeurs à jour
    const updateTarif = useCallback(async () => {
        // ✅ Pour une cession, vérifier l'adresse du magasin de destination
        const hasDestinationAddress = isCession
            ? (data.magasinDestination?.address || data.client?.adresse?.ligne1)
            : data.client?.adresse?.ligne1;

        if (!hasDestinationAddress || !data.livraison?.vehicule) {
            return;
        }

        try {
            setCalculatingTarif(true);
            const tarificationService = new TarificationService();

            // ✅ Utiliser directement storeAddress (déjà mis à jour par useEffect ligne 747)
            const addressToUse = storeAddress;

            // ✅ Pour une cession, utiliser l'adresse du magasin de destination
            const adresseLivraison = isCession
                ? (data.magasinDestination?.address || data.client?.adresse?.ligne1 || '')
                : data.client.adresse.ligne1;

            // Log de vérification
            console.log('💰 Calcul du tarif avec les paramètres:', {
                mode: isCession ? '🔄 CESSION' : '📦 COMMANDE',
                vehicule: data.livraison.vehicule,
                adresseMagasin: addressToUse,
                adresseLivraison: adresseLivraison,
                equipiers: data.livraison.equipiers || 0 // ✅ Valeur à jour capturée
            });

            const tarif = await tarificationService.calculerTarif({
                vehicule: data.livraison.vehicule as TypeVehicule,
                adresseMagasin: addressToUse,
                adresseLivraison: adresseLivraison,
                equipiers: data.livraison.equipiers || 0, // ✅ Valeur à jour utilisée
                userRole, // 🆕 Rôle utilisateur pour bypass devis obligatoire
                dateLivraison: data.dates?.livraison // 🆕 Date de livraison pour majoration dimanche/férié
            });

            setTarifDetails(tarif);

            // Mise à jour du formulaire avec le même format d'événement
            const tarifEvent = {
                target: {
                    name: 'financier.tarifHT',
                    value: tarif.montantHT === 'devis' ? 0 : tarif.montantHT
                }
            };
            onChangeRef.current(tarifEvent); // ✅ Utiliser ref pour éviter boucle

            const devisEvent = {
                target: {
                    name: 'financier.devisObligatoire',
                    value: tarif.montantHT === 'devis'
                }
            };
            onChangeRef.current(devisEvent); // ✅ Utiliser ref pour éviter boucle
        } catch (error) {
            console.error('Erreur calcul tarif:', error);
        } finally {
            setCalculatingTarif(false);
        }
    }, [
        data.livraison?.vehicule,
        data.livraison?.equipiers, // ✅ CRITIQUE: Dépendance ajoutée
        data.client?.adresse?.ligne1,
        data.magasinDestination?.address,
        storeAddress,
        isCession,
        userRole
        // ⚠️ onChange et getLatestStoreAddress RETIRÉS pour éviter boucle infinie
        // Ces fonctions sont stables et ne doivent pas déclencher de recalcul
    ]);

    // ✅ useEffect pour gérer le calcul du tarif automatique
    useEffect(() => {
        // ✅ Pour une cession, vérifier l'adresse du magasin de destination
        const hasDestinationAddress = isCession
            ? (data.magasinDestination?.address || data.client?.adresse?.ligne1)
            : data.client?.adresse?.ligne1;

        // Ne pas calculer s'il manque des informations essentielles
        if (!hasDestinationAddress || !data.livraison?.vehicule) {
            return;
        }

        const timeoutId = setTimeout(() => {
            updateTarif();
        }, 200); // ✅ Réduit de 500ms à 200ms pour recalcul plus rapide (majoration dimanche/férié)

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        // ⚠️ updateTarif RETIRÉ des dépendances pour éviter boucle infinie
        // La fonction utilise des refs qui sont toujours à jour
        data.livraison?.vehicule,
        data.livraison?.equipiers,
        data.client?.adresse?.ligne1,
        data.magasinDestination?.address,
        data.magasin?.address,
        storeAddress, // ✅ AJOUTÉ: Recalculer quand storeAddress se charge
        isCession
        // ❌ data.dates?.livraison RETIRÉ: Géré manuellement dans handleDateChange pour recalcul immédiat
    ]);

    // Effet pour initialiser le véhicule sélectionné
    useEffect(() => {
        if (data.livraison?.vehicule) {
            // Trouver le format long correspondant au format court stocké en BDD
            const longFormat = data.livraison && Object.entries(VEHICULES).find(
                ([_, shortFormat]) => shortFormat === data.livraison?.vehicule
            )?.[0];

            if (longFormat) {
                setSelectedVehicleLong(longFormat);
                setSelectedVehicleShort(data.livraison.vehicule);
            }
        }
    }, [data.livraison?.vehicule]); // Uniquement à l'initialisation

    // Effet pour gérer le changement de magasin
    useEffect(() => {
        const handleStoreChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const storeInfo = customEvent.detail;

            console.log('Événement de changement de magasin détecté:', storeInfo);

            // Force la mise à jour de l'adresse dans le formulaire
            onChange({
                target: {
                    name: 'magasin.address',
                    value: storeInfo.address
                }
            });

            // Forcer un recalcul du tarif après la mise à jour
            setTimeout(() => updateTarif(), 100);
        };

        window.addEventListener('storechange', handleStoreChange);
        return () => {
            window.removeEventListener('storechange', handleStoreChange);
        };
    }, [onChange, updateTarif]);

    // ✅ Admin peut sélectionner des dates passées, autres rôles non
    const minDate = (userRole === 'admin' || userRole === 'direction') ? undefined : new Date().toISOString().split('T')[0];

    const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = new Date(e.target.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ✅ Autoriser les dates passées UNIQUEMENT pour admin/direction
        if (userRole !== 'admin' && userRole !== 'direction' && selectedDate < today) {
            e.preventDefault();
            return;
        }

        const newDate = e.target.value;
        onChange(e);

        // ✅ Recalculer le tarif immédiatement avec la NOUVELLE date
        // Au lieu d'attendre que le state se mette à jour
        if (data.livraison?.vehicule && (data.client?.adresse?.ligne1 || data.magasinDestination?.address)) {

            setTimeout(async () => {
                try {
                    setCalculatingTarif(true);
                    const tarificationService = new TarificationService();

                    const addressToUse = storeAddress;
                    const adresseLivraison = isCession
                        ? (data.magasinDestination?.address || data.client?.adresse?.ligne1 || '')
                        : data.client.adresse.ligne1;

                    const tarif = await tarificationService.calculerTarif({
                        vehicule: data.livraison.vehicule as TypeVehicule,
                        adresseMagasin: addressToUse,
                        adresseLivraison: adresseLivraison,
                        equipiers: data.livraison.equipiers || 0,
                        userRole,
                        dateLivraison: newDate // ✅ Utiliser la NOUVELLE date directement
                    });

                    setTarifDetails(tarif);

                    const tarifEvent = {
                        target: {
                            name: 'financier.tarifHT',
                            value: tarif.montantHT === 'devis' ? 0 : tarif.montantHT
                        }
                    };
                    onChangeRef.current(tarifEvent);
                } catch (error) {
                    console.error('Erreur recalcul tarif après changement date:', error);
                } finally {
                    setCalculatingTarif(false);
                }
            }, 100);
        }
    };

    useEffect(() => {
        const loadAvailableSlots = async () => {
            if (!data.dates?.livraison || !useDynamicSlots) {
                console.log('📅 Pas de date ou mode statique, utilisation créneaux classiques');
                return;
            }

            setSlotsLoading(true);
            setSlotsError(null);

            try {
                const date = data.dates.livraison.split('T')[0];

                // 🏪 Récupérer le magasinId depuis les données (commande client OU cession)
                const magasinId = data.magasin?.id || data.magasinDestination?.id;
                console.log('🕐 Chargement créneaux dynamiques pour:', { date, magasinId });

                const availability = await slotsService.getAvailabilityForDate(date, magasinId);

                // Filtrer les créneaux disponibles uniquement
                const availableOnly = availability.filter(slot => slot.isAvailable);

                setAvailableSlots(availableOnly);
                console.log(`✅ ${availableOnly.length} créneaux disponibles chargés (magasin: ${magasinId || 'tous'})`);

                // Si aucun créneau dynamique disponible, passer en mode fallback
                if (availableOnly.length === 0) {
                    console.log('⚠️ Aucun créneau dynamique disponible, fallback vers statique');
                    setUseDynamicSlots(false);
                    setSlotsError('Aucun créneau disponible pour cette date');
                }

            } catch (error) {
                console.error('❌ Erreur chargement créneaux dynamiques:', error);

                let errorMessage = 'Erreur chargement créneaux';

                if (error instanceof Error) {
                    if (error.message.includes('Failed to fetch')) {
                        errorMessage = 'Connexion API indisponible';
                    } else if (error.message.includes('401')) {
                        errorMessage = 'Non autorisé';
                    } else if (error.message.includes('404')) {
                        errorMessage = 'Service créneaux non trouvé';
                    }
                }

                setSlotsError(errorMessage);
                setUseDynamicSlots(false);
                console.log('🔄 Basculement automatique vers créneaux statiques');

            } finally {
                setSlotsLoading(false);
            }
        };

        loadAvailableSlots();
    }, [data.dates?.livraison, useDynamicSlots, data.magasin?.id, data.magasinDestination?.id]);

    const toggleSlotsMode = () => {
        setUseDynamicSlots(!useDynamicSlots);
        setSlotsError(null);
        setAvailableSlots([]);
    };

    /**
     * ✅ Vérifie si un créneau est disponible avec délai de prévenance de 2h
     * Un créneau est indisponible si son heure de début est dans moins de 2h
     *
     * Exemple: Il est 15h00
     * - 16h-18h → Indisponible (début dans 1h < 2h)
     * - 17h-19h → Disponible (début dans 2h = 2h)
     * - 18h-20h → Disponible (début dans 3h > 2h)
     */
    const isCreneauPasse = useCallback((creneau: string) => {
        // Si la date de livraison est dans le futur (pas aujourd'hui), tous les créneaux sont disponibles
        if (data.dates?.livraison !== minDate) {
            return false;
        }

        // Pour aujourd'hui, vérifier le délai de prévenance de 2h
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinutes;

        // Extraire l'heure de DÉBUT du créneau (ex: "16h-18h" → 16)
        const [heureDebut] = creneau.split('-')[0].split('h');
        const heureDebutInt = parseInt(heureDebut);
        const heureDebutInMinutes = heureDebutInt * 60;

        // Calculer le délai en minutes entre maintenant et le début du créneau
        const delaiEnMinutes = heureDebutInMinutes - currentTimeInMinutes;

        // ✅ DÉLAI DE PRÉVENANCE: Le créneau est indisponible si début dans moins de 2h (120 minutes)
        return delaiEnMinutes < 120;
    }, [data.dates?.livraison, minDate]);

    const creneauxDisponibles = CRENEAUX_LIVRAISON.filter(creneau => !isCreneauPasse(creneau));

    // ========== GESTION DU VÉHICULE AVEC VALIDATION ==========
    const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const longFormat = e.target.value;
        setSelectedVehicleLong(longFormat);

        // Convertir en format court pour la BDD
        const shortFormat = VEHICULES[longFormat];
        setSelectedVehicleShort(shortFormat);

        onChange({
            target: {
                name: 'livraison.vehicule',
                value: shortFormat
            }
        });
    };

    // ========== VALIDATION DES ÉQUIPIERS ==========
    // ========== VALIDATION COMPLÈTE DES ÉQUIPIERS SELON CRITÈRES MYTRUCK ==========
    const validateCrewSize = (crewSize: number): { isRestricted: boolean, reasons: string[] } => {
        if (!hasDimensionsData) {
            return { isRestricted: false, reasons: [] };
        }

        const articleDimensions = data.articles?.dimensions || [];
        if (articleDimensions.length === 0) {
            return { isRestricted: false, reasons: [] };
        }

        console.log(' [LIVRAISON] VALIDATION ÉQUIPIERS - Nouvelle logique');

        // Préparer les conditions de livraison
        // ✅ INCLURE LES "AUTRES ARTICLES" dans le calcul du nombre total
        const quantityFromDimensions = articleDimensions.reduce((sum, article) => sum + (article.quantite || 1), 0);
        const autresArticlesCount = data.articles?.autresArticles || 0;
        const totalItemCount = quantityFromDimensions + autresArticlesCount;

        // Calculer l'étage effectif avec duplex/maison
        let effectiveFloor = parseInt(data.client?.adresse?.etage || '0');
        const isDuplex = deliveryInfo?.isDuplex || false;
        const deliveryToUpperFloor = deliveryInfo?.deliveryToUpperFloor || false;

        if (isDuplex && deliveryToUpperFloor) {
            effectiveFloor += 1;
            console.log(`🏠 Duplex/Maison détecté: ${effectiveFloor} étages effectifs`);
        }

        // ✅ Créer le tableau allArticles incluant les "autres articles"
        const autresArticlesPoids = data.articles?.autresArticlesPoids || 0;
        const allArticles = [...articleDimensions];
        if (autresArticlesCount > 0 && autresArticlesPoids > 0) {
            allArticles.push({
                nom: 'Autres articles',
                quantite: autresArticlesCount,
                poids: autresArticlesPoids,
                longueur: 0,
                largeur: 0,
                hauteur: 0
            } as any);
        }

        const deliveryConditions = {
            hasElevator: data.client?.adresse?.ascenseur || false,
            totalItemCount,
            rueInaccessible: deliveryInfo?.rueInaccessible || false,
            paletteComplete: deliveryInfo?.paletteComplete || false,
            parkingDistance: deliveryInfo?.parkingDistance || 0,
            hasStairs: deliveryInfo?.hasStairs || false,
            stairCount: deliveryInfo?.stairCount || 0,
            needsAssembly: deliveryInfo?.needsAssembly || false,
            floor: effectiveFloor, // ✅ Étage DÉJÀ calculé avec duplex
            // 🔧 CORRECTION : Désactiver le recalcul duplex dans le service
            isDuplex: false, // ✅ Déjà pris en compte dans effectiveFloor
            deliveryToUpperFloor: false, // ✅ Déjà pris en compte dans effectiveFloor
            autresArticlesTotalWeight: autresArticlesCount * autresArticlesPoids // ✅ Poids des "autres articles"
        };

        // ✅ UTILISER LA NOUVELLE MÉTHODE DE VALIDATION avec allArticles
        const validation = VehicleValidationService.validateCrewSize(
            crewSize,
            allArticles,
            deliveryConditions
        );

        console.log('📊 [LIVRAISON] Résultat validation:', validation);

        // 🔍 DÉBOGAGE DÉTAILLÉ si restriction
        if (!validation.isValid) {
            console.log('🚨 [LIVRAISON] RESTRICTION DÉTECTÉE:');
            console.log(`   - Sélectionné: ${crewSize} équipiers`);
            console.log(`   - Requis: ${validation.requiredCrewSize} équipiers`);
            console.log(`   - Manque: ${validation.deficiency} équipiers`);
            console.log('📋 Conditions déclenchées:', validation.triggeredConditions);
        }

        return {
            isRestricted: !validation.isValid,
            reasons: validation.isValid ? [] : [
                `⚠️ Équipiers insuffisants (${crewSize}/${validation.requiredCrewSize})`,
                ...validation.triggeredConditions.map(condition => `• ${condition}`),
                ...validation.recommendations.map(rec => `➜ ${rec}`)
            ]
        };
    };

    const isCrewSizeRestricted = (crewSize: number): boolean => {
        const validation = validateCrewSize(crewSize);
        return validation.isRestricted;
    };

    const getCrewValidationReasons = (crewSize: number): string[] => {
        const validation = validateCrewSize(crewSize);
        return validation.reasons;
    };

    const calculateRecommendedCrewSize = (): number => {
        if (!hasDimensionsData) return 0;

        const articleDimensions = data.articles?.dimensions || [];
        if (articleDimensions.length === 0) return 0;

        console.log('🎯 [LIVRAISON-FORM] CALCUL ÉQUIPIERS RECOMMANDÉS - Nouvelle logique');

        // ✅ INCLURE LES "AUTRES ARTICLES" dans le calcul du nombre total
        const quantityFromDimensions = articleDimensions.reduce((sum, article) => sum + (article.quantite || 1), 0);
        const autresArticlesCount = data.articles?.autresArticles || 0;
        const totalItemCount = quantityFromDimensions + autresArticlesCount;

        // ✅ Créer le tableau allArticles incluant les "autres articles"
        const autresArticlesPoids = data.articles?.autresArticlesPoids || 0;
        const allArticles = [...articleDimensions];
        if (autresArticlesCount > 0 && autresArticlesPoids > 0) {
            allArticles.push({
                nom: 'Autres articles',
                quantite: autresArticlesCount,
                poids: autresArticlesPoids,
                longueur: 0,
                largeur: 0,
                hauteur: 0
            } as any);
        }

        // Calculer l'étage effectif avec duplex/maison
        let effectiveFloor = parseInt(data.client?.adresse?.etage || '0');
        if (deliveryInfo?.isDuplex && deliveryInfo?.deliveryToUpperFloor) {
            effectiveFloor += 1;
        }

        const deliveryConditions = {
            hasElevator: data.client?.adresse?.ascenseur || false,
            totalItemCount,
            rueInaccessible: deliveryInfo?.rueInaccessible || false,
            paletteComplete: deliveryInfo?.paletteComplete || false,
            parkingDistance: deliveryInfo?.parkingDistance || 0,
            hasStairs: deliveryInfo?.hasStairs || false,
            stairCount: deliveryInfo?.stairCount || 0,
            needsAssembly: deliveryInfo?.needsAssembly || false,
            floor: effectiveFloor, // ✅ Étage DÉJÀ calculé avec duplex
            // 🔧 CORRECTION : Désactiver le recalcul duplex dans le service
            isDuplex: false, // ✅ Déjà pris en compte dans effectiveFloor
            deliveryToUpperFloor: false, // ✅ Déjà pris en compte dans effectiveFloor
            autresArticlesTotalWeight: autresArticlesCount * autresArticlesPoids // ✅ Poids des "autres articles"
        };

        // ✅ UTILISER LA NOUVELLE MÉTHODE avec allArticles
        const requiredCrew = VehicleValidationService.getRequiredCrewSize(
            allArticles,
            deliveryConditions
        );

        console.log(`👥 [LIVRAISON] Équipiers recommandés: ${requiredCrew}`);

        // 🔍 VÉRIFICATION : Comparer avec les conditions visibles
        if (requiredCrew !== (data.livraison?.equipiers || 0)) {
            console.log('⚠️ [LIVRAISON] DÉSYNCHRONISATION DÉTECTÉE:');
            console.log(`   - Calculé: ${requiredCrew} équipiers`);
            console.log(`   - Sélectionné: ${data.livraison?.equipiers || 0} équipiers`);
            console.log('📋 Conditions actives:', deliveryConditions);
        }

        return requiredCrew;
    };

    // 🆕 NOUVELLE FONCTION : Obtenir les détails complets de validation
    const getValidationSummary = () => {
        if (!hasDimensionsData) return null;

        const articleDimensions = data.articles?.dimensions || [];
        if (articleDimensions.length === 0) return null;

        // ✅ INCLURE LES "AUTRES ARTICLES" dans le calcul du nombre total
        const quantityFromDimensions = articleDimensions.reduce((sum, article) => sum + (article.quantite || 1), 0);
        const autresArticlesCount = data.articles?.autresArticles || 0;
        const totalItemCount = quantityFromDimensions + autresArticlesCount;

        // ✅ Créer le tableau allArticles incluant les "autres articles"
        const autresArticlesPoids = data.articles?.autresArticlesPoids || 0;
        const allArticles = [...articleDimensions];
        if (autresArticlesCount > 0 && autresArticlesPoids > 0) {
            allArticles.push({
                nom: 'Autres articles',
                quantite: autresArticlesCount,
                poids: autresArticlesPoids,
                longueur: 0,
                largeur: 0,
                hauteur: 0
            } as any);
        }

        let effectiveFloor = parseInt(data.client?.adresse?.etage || '0');
        if (deliveryInfo?.isDuplex && deliveryInfo?.deliveryToUpperFloor) {
            effectiveFloor += 1;
        }

        const deliveryConditions = {
            hasElevator: data.client?.adresse?.ascenseur || false,
            totalItemCount,
            rueInaccessible: deliveryInfo?.rueInaccessible || false,
            paletteComplete: deliveryInfo?.paletteComplete || false,
            parkingDistance: deliveryInfo?.parkingDistance || 0,
            hasStairs: deliveryInfo?.hasStairs || false,
            stairCount: deliveryInfo?.stairCount || 0,
            needsAssembly: deliveryInfo?.needsAssembly || false,
            floor: effectiveFloor, // ✅ Étage DÉJÀ calculé avec duplex
            // 🔧 CORRECTION : Désactiver le recalcul duplex dans le service
            isDuplex: false, // ✅ Déjà pris en compte dans effectiveFloor
            deliveryToUpperFloor: false, // ✅ Déjà pris en compte dans effectiveFloor
            autresArticlesTotalWeight: autresArticlesCount * autresArticlesPoids // ✅ Poids des "autres articles"
        };

        return VehicleValidationService.getValidationDetails(allArticles, deliveryConditions);
    };

    const getCrewSizeStatus = (crewSize: number): 'recommended' | 'compatible' | 'restricted' => {
        if (!hasDimensionsData) return 'compatible';

        const recommended = calculateRecommendedCrewSize();

        if (isCrewSizeRestricted(crewSize)) return 'restricted';
        if (crewSize === recommended) return 'recommended';
        return 'compatible';
    };

    // Vérifier si le véhicule sélectionné est restreint
    const isVehicleRestricted = () => {
        if (!hasDimensionsData || !selectedVehicleShort) return false;
        return restrictedVehicles.includes(selectedVehicleShort as VehicleType);
    };

    return (
        <div className="space-y-4 mb-6">
            <h3 className="text-lg font-medium">Informations de livraison</h3>

            {/* Avertissement si le véhicule sélectionné est restreint */}
            {isVehicleRestricted() && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Véhicule inadéquat</p>
                        <p className="text-sm">
                            Le véhicule sélectionné ({data.livraison?.vehicule}) ne peut pas transporter tous les articles
                            en raison de leurs dimensions. Veuillez sélectionner un véhicule plus grand ou vérifier si
                            les articles peuvent être couchés dans la section précédente.
                        </p>
                    </div>
                </div>
            )}

            {/* ========== AVERTISSEMENTS DE VALIDATION ========== */}
            {hasDimensionsData && validationErrors.length > 0 && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Problème de compatibilité</p>
                        <ul className="list-disc pl-5 mt-1">
                            {validationErrors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                        Date de livraison <span className="text-red-500">*</span>
                    </label>
                    <span className="ml-1 text-sm text-gray-500">
                        {ERROR_MESSAGES.frenchHoliday}
                    </span>
                    <input
                        type="date"
                        name="dates.livraison"
                        value={data.dates?.livraison?.split('T')[0] || ''}
                        onChange={handleDateChange}
                        min={minDate}
                        className="mt-1 block w-full rounded-md border border-gray-300"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">
                            Créneau de livraison <span className="text-red-500">*</span>
                        </label>

                        {/* 🔄 Bouton de basculement mode */}
                        <button
                            type="button"
                            onClick={toggleSlotsMode}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                            title={useDynamicSlots ? 'Passer aux créneaux classiques' : 'Passer aux créneaux dynamiques'}
                        >
                            {useDynamicSlots ? '📋 -> Classique' : '📊 -> Dynamique'}
                        </button>

                        {slotsLoading && (
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                Chargement des créneaux...
                            </div>
                        )}

                        {/* ⚠️ Message d'erreur */}
                        {slotsError && !slotsLoading && (
                            <div className="bg-orange-100 border border-orange-300 text-orange-700 px-3 py-2 rounded text-sm">
                                ⚠️ {slotsError}
                                {!useDynamicSlots && (
                                    <span className="ml-2">
                                        - <button
                                            type="button"
                                            onClick={toggleSlotsMode}
                                            className="underline hover:no-underline"
                                        >
                                            Réessayer mode dynamique
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* 📊 Info disponibilité */}
                        {useDynamicSlots && availableSlots.length > 0 && !slotsLoading && (
                            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800">
                                📊 {availableSlots.length} créneaux disponibles pour cette date
                            </div>
                        )}

                        {useDynamicSlots && availableSlots.length > 0 && !slotsLoading && (
                            <SlotsInfo availability={availableSlots} />
                        )}

                        {/* 🎛️ Sélecteur principal */}
                        <select
                            name="livraison.creneau"
                            value={data.livraison?.creneau || ''}
                            onChange={onChange}
                            className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.livraison?.creneau ? 'border-red-500' : 'border-gray-300'
                                }`}
                            required
                            disabled={slotsLoading}
                        >
                            <option value="">
                                {slotsLoading
                                    ? 'Chargement...'
                                    : 'Sélectionner un créneau'
                                }
                            </option>

                            {/* ✅ MODE DYNAMIQUE */}
                            {useDynamicSlots && availableSlots.length > 0 &&
                                availableSlots.map((slotAvailability) => (
                                    <option
                                        key={slotAvailability.slot.id}
                                        value={slotAvailability.slot.displayName}
                                    >
                                        {slotAvailability.slot.displayName}
                                        {slotAvailability.maxCapacity > 0 && (
                                            ` (${slotAvailability.bookingsCount}/${slotAvailability.maxCapacity})`
                                        )}
                                    </option>
                                ))
                            }

                            {/* 🔄 MODE FALLBACK STATIQUE */}
                            {(!useDynamicSlots || (useDynamicSlots && availableSlots.length === 0 && !slotsLoading)) &&
                                creneauxDisponibles.map(creneau => (
                                    <option key={creneau} value={creneau}>
                                        {creneau}
                                    </option>
                                ))
                            }
                        </select>

                        {/* ❌ Erreurs de validation */}
                        {errors.livraison?.creneau && (
                            <p className="text-red-500 text-sm mt-1">
                                {errors.livraison.creneau}
                            </p>
                        )}

                        {/* ⚠️ Avertissements spéciaux */}
                        {useDynamicSlots && availableSlots.length === 0 && !slotsLoading && !slotsError && (
                            <p className="text-orange-600 text-sm mt-1">
                                ⚠️ Tous les créneaux sont complets ou bloqués pour cette date.
                                Veuillez choisir une autre date ou
                                <button
                                    type="button"
                                    onClick={toggleSlotsMode}
                                    className="underline hover:no-underline ml-1"
                                >
                                    utiliser les créneaux classiques
                                </button>.
                            </p>
                        )}

                        {/* 📋 Mode classique actif */}
                        {!useDynamicSlots && (
                            <p className="text-gray-600 text-sm mt-1">
                                📋 Mode créneaux classiques actif
                            </p>
                        )}
                    </div>
                </div>

                {/* ========== SÉLECTION DE VÉHICULE AVEC VALIDATION ========== */}
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                        Type de véhicule <span className="text-red-500">*</span>
                        {hasDimensionsData && recommendedVehicle && (
                            <span className="ml-2 text-sm font-normal text-green-600">
                                ✅ Recommandé: {recommendedVehicle}
                            </span>
                        )}
                    </label>
                    <select
                        value={selectedVehicleLong}
                        onChange={handleVehicleChange}
                        className={`mt-1 block w-full rounded-md border px-3 py-2 ${hasDimensionsData && selectedVehicleShort && restrictedVehicles.includes(selectedVehicleShort as VehicleType)
                            ? 'border-red-500 bg-red-50'
                            : errors.livraison?.vehicule
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                        required
                    >
                        <option value="">Sélectionner un véhicule</option>
                        {Object.entries(VEHICULES).map(([longFormat, shortFormat]) => {
                            const isRestricted = hasDimensionsData && restrictedVehicles.includes(shortFormat as VehicleType);
                            const isRecommended = hasDimensionsData && recommendedVehicle === shortFormat;

                            return (
                                <option
                                    key={longFormat}
                                    value={longFormat}
                                    disabled={isRestricted}
                                    className={
                                        isRestricted
                                            ? 'text-red-500 bg-red-50'
                                            : isRecommended
                                                ? 'font-bold text-green-700 bg-green-50'
                                                : ''
                                    }
                                >
                                    {longFormat}
                                    {isRecommended ? ' ✅ (Recommandé)' : ''}
                                    {isRestricted ? ' ❌ (Incompatible)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    {errors.livraison?.vehicule && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.livraison.vehicule}
                        </p>
                    )}
                    {isVehicleRestricted() && (
                        <p className="text-red-500 text-sm mt-1">
                            ⚠️ Ce véhicule ne peut pas transporter tous vos articles selon leurs dimensions.
                        </p>
                    )}
                </div>

                {/* ========== SÉLECTION D'ÉQUIPIERS AVEC VALIDATION ========== */}
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                        Option équipier de manutention
                        {hasDimensionsData && recommendedCrew > 0 && (
                            <span className="ml-2 text-sm font-normal text-green-600">
                                ✅ Recommandé: {recommendedCrew} équipier{recommendedCrew > 1 ? 's' : ''}
                            </span>
                        )}
                    </label>

                    <span className="ml-1 text-sm text-gray-500" title={ERROR_MESSAGES.equipiers.contact}>
                        {ERROR_MESSAGES.equipiers.info}
                    </span>

                    <select
                        name="livraison.equipiers"
                        value={data.livraison?.equipiers || 0}
                        onChange={(e) => {
                            // ✅ Convertir string → number pour cohérence avec ArticlesForm
                            onChange({
                                target: {
                                    name: 'livraison.equipiers',
                                    value: parseInt(e.target.value, 10)
                                }
                            } as any);
                        }}
                        className={`mt-1 block w-full rounded-md border px-3 py-2 ${hasDimensionsData && isCrewSizeRestricted(data.livraison?.equipiers || 0)
                            ? 'border-red-500 bg-red-50'
                            : errors.livraison?.equipiers
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                    >
                        {[0, 1, 2, 3].map(crewSize => {
                            const status = getCrewSizeStatus(crewSize);
                            const isRecommended = status === 'recommended';
                            const isRestricted = status === 'restricted';

                            // 🆕 CALCUL DU COÛT DYNAMIQUE
                            const cost = crewSize === 3 ? 'Sur devis' : crewSize > 0 ? `+${crewSize * 22}€` : 'Inclus';

                            return (
                                <option
                                    key={crewSize}
                                    value={crewSize}
                                    disabled={isRestricted}
                                    className={
                                        isRestricted
                                            ? 'text-red-500 bg-red-50'
                                            : isRecommended
                                                ? 'font-bold text-green-700 bg-green-50'
                                                : ''
                                    }
                                >
                                    {crewSize === 0
                                        ? 'Aucun équipier'
                                        : crewSize === 3
                                            ? '3+ équipiers (sur devis)'
                                            : `${crewSize} équipier${crewSize > 1 ? 's' : ''}`
                                    } - {cost}
                                    {isRecommended ? ' ✅ (Recommandé)' : ''}
                                    {isRestricted ? ' ❌ (Insuffisant)' : ''}
                                </option>
                            );
                        })}
                    </select>

                    {(data.livraison?.equipiers || 0) >= 3 && (
                        <p className="text-sm text-orange-600 mt-1">
                            Plus de 2 équipiers nécessite un devis spécial. Le service commercial vous contactera.
                        </p>
                    )}

                    {/* Message d'erreur si choix insuffisant */}
                    {hasDimensionsData && isCrewSizeRestricted(data.livraison?.equipiers || 0) && (
                        <div className="text-sm text-red-600 mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="font-medium mb-2">⚠️ Configuration insuffisante :</div>
                            <ul className="list-none space-y-1 text-xs">
                                {getCrewValidationReasons(data.livraison?.equipiers || 0).map((reason, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="mr-2 text-red-500">•</span>
                                        <span>{reason}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-3 pt-2 border-t border-red-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const recommendedCrew = calculateRecommendedCrewSize();
                                        onChange({
                                            target: {
                                                name: 'livraison.equipiers',
                                                value: recommendedCrew
                                            }
                                        });
                                    }}
                                    className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                                >
                                    Appliquer la recommandation ({calculateRecommendedCrewSize()} équipier{calculateRecommendedCrewSize() > 1 ? 's' : ''})
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                        Autres remarques
                    </label>
                    <p className="text-sm text-gray-500">Précisions nécessaires au bon fonctionnement de la livraison</p>
                    <textarea
                        name="livraison.remarques"
                        value={data.livraison?.remarques || ''}
                        onChange={(e) => onChange(e as any)}
                        className={`mt-1 block w-full rounded-md border 'border-gray-300'}`}
                        rows={4}
                        placeholder="Informations complémentaires sur la livraison..."
                    />
                </div>
            </div>

            {/* ========== BOUTON AFFICHAGE/MASQUAGE TARIF ========== */}
            {tarifDetails && !calculatingTarif && (
                <div className="mb-6">
                    <button
                        type="button"
                        onClick={() => setShowTarifEstimation(!showTarifEstimation)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-green-100 hover:bg-green-200 border-2 border-green-300 rounded-lg transition-colors duration-200"
                    >
                        <div className="flex items-center">
                            <span className="text-lg font-semibold text-green-800">
                                {showTarifEstimation ? 'Masquer le tarif de livraison' : 'Voir le tarif de livraison'}
                            </span>
                        </div>
                        <svg
                            className={`w-6 h-6 text-green-700 transform transition-transform duration-200 ${showTarifEstimation ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* ========== AFFICHAGE DU TARIF ========== */}
                    {showTarifEstimation && (
                        <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-md">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <span className="text-3xl mr-3">💰</span>
                                    <div>
                                        <h4 className="text-xl font-bold text-green-800">Tarif de livraison "MY TRUCK"</h4>
                                        <p className="text-sm text-green-700">Tarif complet avec frais kilométriques</p>
                                    </div>
                                </div>
                                {tarifDetails.montantHT === 'devis' ? (
                                    <div className="text-3xl font-bold text-orange-600">DEVIS</div>
                                ) : (
                                    <div className="text-right">
                                        <div className="text-4xl font-bold text-green-700">{tarifDetails.montantHT}€</div>
                                        <div className="text-sm text-green-600 font-medium">HT</div>
                                    </div>
                                )}
                            </div>

                            {/* Détail du tarif */}
                            {tarifDetails.montantHT === 'devis' ? (
                                <div>
                                    <div className="mt-4 p-4 bg-orange-100 border border-orange-300 rounded-md">
                                        <p className="text-orange-800 font-semibold mb-2">Devis obligatoire pour cette livraison</p>
                                        {tarifDetails.detail.equipiers === 'devis' && (
                                            <p className="text-sm text-orange-700 mt-1">
                                                • Raison : Plus de 2 équipiers demandés
                                            </p>
                                        )}
                                        {tarifDetails.detail.distance === 'devis' && (
                                            <p className="text-sm text-orange-700 mt-1">
                                                • Raison : Distance supérieure à 50km
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-3 flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                                        <button
                                            type="button"
                                            onClick={() => setShowContactForm(true)}
                                            className="text-blue-600 hover:text-blue-800 font-medium underline"
                                        >
                                            Demandez votre devis ici
                                        </button>
                                        <span className="ml-2 text-gray-600 text-sm">
                                            ou contactez-nous au 06 22 15 62 60
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 pt-4 border-t border-green-200">
                                    <p className="text-sm font-medium text-green-800 mb-2">Détail du tarif :</p>
                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div className="flex justify-between bg-white bg-opacity-60 rounded px-3 py-2">
                                            <span className="text-gray-700">Véhicule {data.livraison?.vehicule} :</span>
                                            <span className="font-semibold text-green-700">{tarifDetails.detail.vehicule}€</span>
                                        </div>
                                        {typeof tarifDetails.detail.equipiers === 'number' && (
                                            <div className="flex justify-between bg-white bg-opacity-60 rounded px-3 py-2">
                                                <span className="text-gray-700">
                                                    {data.livraison?.equipiers === 0 ? 'Chauffeur seul' :
                                                        `Équipiers (+${data.livraison?.equipiers})`} :
                                                </span>
                                                <span className="font-semibold text-green-700">
                                                    {tarifDetails.detail.equipiers}€
                                                </span>
                                            </div>
                                        )}
                                        {typeof tarifDetails.detail.distance === 'number' && tarifDetails.detail.distance > 0 && (
                                            <div className="flex justify-between bg-white bg-opacity-60 rounded px-3 py-2">
                                                <span className="text-gray-700">Frais kilométriques :</span>
                                                <span className="font-semibold text-green-700">{tarifDetails.detail.distance}€</span>
                                            </div>
                                        )}
                                        {tarifDetails.detail.majorationDimancheFerie && tarifDetails.detail.majorationDimancheFerie > 0 && (
                                            <div className="flex justify-between bg-orange-50 border border-orange-200 rounded px-3 py-2">
                                                <span className="text-orange-700 flex items-center gap-2">
                                                    <span className="text-lg">📅</span>
                                                    Majoration Dimanche/Férié :
                                                </span>
                                                <span className="font-semibold text-orange-700">+{tarifDetails.detail.majorationDimancheFerie}€</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-green-300">
                                        <div className="flex justify-between items-center bg-white bg-opacity-80 rounded-lg px-4 py-3">
                                            <span className="text-lg font-bold text-green-800">Total HT :</span>
                                            <span className="text-2xl font-bold text-green-700">{tarifDetails.montantHT}€</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Calcul en cours */}
            {calculatingTarif && (
                <div className="mt-4 p-4 border-2 border-blue-300 bg-blue-50 rounded-lg flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-blue-700 font-medium">Calcul du tarif en cours...</p>
                </div>
            )}

            <div className="mt-6 py-4 bg-white flex-col">
                <p className="text-red-500 font-bold text-center px-4">
                    TOUTE ABSENCE LORS DE LA LIVRAISON VOUS ENGAGE
                </p>
                <p className="text-red-500 font-bold text-center px-4">
                    A REGLER LE RETOUR AINSI QUE LA NOUVELLE LIVRAISON
                </p>
            </div>

            {/* Formulaire de contact pour les devis */}
            <ContactForm
                isOpen={showContactForm}
                onClose={() => setShowContactForm(false)}
                reason="DEVIS"
                prefilledData={{
                    ...data,
                    magasin: {
                        id: user?.storeId || data.magasin?.id,
                        nom: user?.storeName || data.magasin?.name || (data.magasin as any)?.nom,
                        manager: user?.name || user?.storeName, // Nom du vendeur/manager
                    }
                }}
            />

            {/* Modal d'aide sur les véhicules */}
            {showVehicleHelpModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Capacités des véhicules</h3>

                        <div className="space-y-4">
                            <p>
                                Voici les capacités maximales de nos différents véhicules. Assurez-vous que vos
                                articles peuvent être transportés dans le véhicule sélectionné.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Véhicule</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Longueur (cm)</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Largeur (cm)</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hauteur (cm)</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poids max (kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {Object.entries(VEHICULES).map(([longFormat, shortFormat]) => {
                                            const capacity = VehicleValidationService.getVehicleCapacity(shortFormat as VehicleType);
                                            return (
                                                <tr key={shortFormat}>
                                                    <td className="px-4 py-2 whitespace-nowrap font-medium">{shortFormat}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{capacity.length}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{capacity.width}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{capacity.height}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{capacity.weight}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4">
                                <h4 className="font-medium">Notes importantes</h4>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Les dimensions indiquées sont les maximales pour chaque véhicule.</li>
                                    <li>Le poids maximum inclut tous les articles à transporter.</li>
                                    <li>Si vos articles dépassent ces dimensions, plusieurs véhicules peuvent être nécessaires.</li>
                                    <li>Pour les articles très volumineux ou très lourds, un devis spécifique peut être requis.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowVehicleHelpModal(false)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};