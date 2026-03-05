import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VehicleType, VehicleValidationService } from '../services/vehicle-validation.service';
import { canBypassQuoteLimit } from '../utils/role-helpers';
import { useAuth } from '../contexts/AuthContext';

interface ArticleDimensions {
  longueur?: number;
  largeur?: number;
  hauteur?: number;
  poids?: number;
  quantite?: number;
}

interface VehicleSelectorProps {
  articles: ArticleDimensions[];
  onVehicleSelect: (vehicleType: VehicleType | '') => void;
  onCrewSelect: (crewSize: number) => void;
  onDeliveryDetailsChange?: (details: any) => void;
  initialVehicle?: VehicleType;
  initialCrew?: number;
  initialCanBeTilted?: boolean;
  onCanBeTiltedChange?: (canBeTilted: boolean) => void;
  deliveryInfo?: {
    floor?: string | number;
    hasElevator?: boolean;
    hasStairs?: boolean;
    stairCount?: number;
    parkingDistance?: number;
    needsAssembly?: boolean;
    details?: string;
    rueInaccessible?: boolean;
    paletteComplete?: boolean;
    isDuplex?: boolean;
    deliveryToUpperFloor?: boolean;
  };
  isEditing?: boolean;
  userRole?: string; // 🆕 Rôle de l'utilisateur pour bypass devis obligatoire
  autresArticlesCount?: number; // ✅ Nombre d'autres articles
  autresArticlesPoids?: number; // ✅ Poids unitaire des autres articles
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  articles,
  onVehicleSelect,
  onCrewSelect,
  onDeliveryDetailsChange,
  onCanBeTiltedChange,
  initialVehicle,
  initialCrew,
  initialCanBeTilted = false,
  deliveryInfo = {},
  isEditing = false,
  userRole, // 🆕 Récupération du rôle utilisateur
  autresArticlesCount = 0, // ✅ Autres articles
  autresArticlesPoids = 0 // ✅ Poids unitaire autres articles
}) => {
  const [selectedVehicleShort, setSelectedVehicleShort] = useState<VehicleType | null>(null); // Format court
  const [selectedVehicleLong, setSelectedVehicleLong] = useState<string>('');
  const [crewSize, setCrewSize] = useState<number>(initialCrew || 0);
  const [canBeTilted, setCanBeTilted] = useState<boolean>(initialCanBeTilted);
  const [showTiltQuestion, setShowTiltQuestion] = useState<boolean>(true);
  const [restrictedVehicles, setRestrictedVehicles] = useState<VehicleType[]>([]);
  const [recommendedVehicle, setRecommendedVehicle] = useState<VehicleType | null>(null);
  const [recommendedCrew, setRecommendedCrew] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasDimensionsData, setHasDimensionsData] = useState(false);
  const [restrictedCrewSizes, setRestrictedCrewSizes] = useState<number[]>([]);
  const [crewWarnings, setCrewWarnings] = useState<string[]>([]);

  const availableVehicles = useMemo(() =>
    VehicleValidationService.getAvailableVehicleTypes(),
    []
  );

  const { user } = useAuth();

  const VEHICULES = useMemo(() => {
    const allVehicles = {
      "1M3 (Utilitaire 150kg, 100x100x100cm)": "1M3",
      "6M3 (Camionnette 300kg, 260x160x125cm)": "6M3",
      "10M3 (Camionnette 800kg, 310x178x190cm)": "10M3",
      "20M3 (Avec hayon 750kg, 410, 200, 210cm)": "20M3"
    };

    // ❌ Cacher le véhicule 1M3 uniquement pour le magasin Truffaut Bry-Sur-Marne
    if (user?.storeName === 'Truffaut Bry-Sur-Marne') {
      const { "1M3 (Utilitaire 150kg, 100x100x100cm)": _, ...vehiclesWithout1M3 } = allVehicles;
      return vehiclesWithout1M3;
    }

    return allVehicles;
  }, [user?.storeName]);

  // 🔧 UTILITAIRE : Calculer l'étage effectif UNE SEULE FOIS
  const calculateEffectiveFloor = useCallback((): number => {
    let effectiveFloor = 0;
    if (deliveryInfo?.floor) {
      effectiveFloor = typeof deliveryInfo.floor === 'string'
        ? parseInt(deliveryInfo.floor) || 0
        : deliveryInfo.floor;
    }

    // ✅ CALCUL UNIQUE de l'étage duplex
    if (deliveryInfo?.isDuplex && deliveryInfo?.deliveryToUpperFloor) {
      effectiveFloor += 1;
      console.log(`🏠 [VEHICLE-SELECTOR] Duplex détecté: ${effectiveFloor} étages effectifs`);
    }

    return effectiveFloor;
  }, [deliveryInfo]);

  const validateCrewSize = useCallback((crewSize: number): {
    isRestricted: boolean;
    reasons: string[];
    requiredCrewSize: number; // 🆕 Ajout pour bypass admin
  } => {
    const reasons: string[] = [];

    if (!articles || articles.length === 0) {
      return { isRestricted: false, reasons: [], requiredCrewSize: 0 };
    }

    const totalItemCount = articles.reduce((sum, article) => sum + (article.quantite || 1), 0);

    // ✅ UTILISER LA FONCTION UTILITAIRE au lieu de recalculer
    const effectiveFloor = calculateEffectiveFloor();

    const deliveryConditions = {
      hasElevator: deliveryInfo?.hasElevator || false,
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
      // 🆕 Ajouter les nouvelles conditions pour la logique hiérarchique
      estimatedHandlingTime: 0, // À implémenter dans l'UI si nécessaire
      hasLargeVoluminousItems: false, // À implémenter dans l'UI si nécessaire
      multipleLargeVoluminousItems: false, // À implémenter dans l'UI si nécessaire
      complexAccess: false, // À implémenter dans l'UI si nécessaire
      autresArticlesTotalWeight: autresArticlesCount * autresArticlesPoids // ✅ Poids des "autres articles"
    };

    // ✅ UTILISER LA NOUVELLE MÉTHODE DE VALIDATION
    const validation = VehicleValidationService.validateCrewSize(
      crewSize,
      articles,
      deliveryConditions
    );

    return {
      isRestricted: !validation.isValid,
      requiredCrewSize: validation.requiredCrewSize, // 🆕 Retourner pour bypass admin
      reasons: validation.isValid ? [] : [
        ...validation.triggeredConditions.map(condition => `• ${condition}`),
        ...validation.recommendations.map(rec => `➜ ${rec}`)
      ]
    };
  }, [articles, deliveryInfo, calculateEffectiveFloor]);

  const calculateRecommendedCrewSize = useCallback((): number => {
    if (!articles || articles.length === 0) return 0;

    const totalItemCount = articles.reduce((sum, article) => sum + (article.quantite || 1), 0);

    // ✅ UTILISER LA FONCTION UTILITAIRE au lieu de recalculer
    const effectiveFloor = calculateEffectiveFloor();

    // 🔥 UTILISER LA NOUVELLE LOGIQUE HIÉRARCHIQUE NON-CUMULATIVE
    const deliveryConditions = {
      hasElevator: deliveryInfo?.hasElevator || false,
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
      // 🆕 Nouvelles conditions pour logique hiérarchique
      estimatedHandlingTime: 0, // À implémenter dans l'UI si nécessaire
      hasLargeVoluminousItems: false, // À implémenter dans l'UI si nécessaire
      multipleLargeVoluminousItems: false, // À implémenter dans l'UI si nécessaire
      complexAccess: false, // À implémenter dans l'UI si nécessaire
      autresArticlesTotalWeight: autresArticlesCount * autresArticlesPoids // ✅ Poids des "autres articles"
    };

    // ✅ UTILISER VehicleValidationService.getRequiredCrewSize() au lieu de la logique manuelle
    const recommendedCrew = VehicleValidationService.getRequiredCrewSize(
      articles,
      deliveryConditions
    );

    console.log(`👥 [VEHICLE-SELECTOR] Équipiers calculés: ${recommendedCrew}`);

    // 🔍 DÉBOGAGE : Afficher le niveau détecté par la nouvelle logique hiérarchique
    if (recommendedCrew >= 1) {

      const heaviestWeight = Math.max(...articles.map(a => a.poids || 0));
      const totalWeight = articles.reduce((sum, article) =>
        sum + ((article.poids || 0) * (article.quantite || 1)), 0
      );

      console.log(`   ⚖️ Article le plus lourd: ${heaviestWeight}kg`);
      console.log(`   ⚖️ Poids total: ${totalWeight}kg`);
      console.log(`   📦 Total articles: ${totalItemCount}`);
      console.log(`   🏢 Étage effectif: ${effectiveFloor}`);
      console.log(`   🛗 Ascenseur: ${deliveryConditions.hasElevator ? 'Oui' : 'Non'}`);
      console.log(`   👥 Équipiers requis: ${recommendedCrew} (Niveau ${recommendedCrew === 0 ? '0' : recommendedCrew === 1 ? '1' : recommendedCrew === 2 ? '2' : '3+'})`);

      // Identifier le niveau selon la nouvelle logique
      let detectedLevel = '';
      let detectedReason = '';
      
      if (recommendedCrew >= 3) {
        detectedLevel = 'NIVEAU 3 - DEVIS OBLIGATOIRE';
        if (heaviestWeight >= 90) detectedReason = `Article très lourd (${heaviestWeight}kg ≥90kg)`;
        else detectedReason = 'Conditions complexes nécessitant devis';
      } else if (recommendedCrew === 2) {
        detectedLevel = 'NIVEAU 2 - +2 ÉQUIPIERS';
        if (heaviestWeight >= 60) detectedReason = `Article lourd (${heaviestWeight}kg 60-90kg)`;
        else detectedReason = 'Conditions nécessitant 2 équipiers';
      } else if (recommendedCrew === 1) {
        detectedLevel = 'NIVEAU 1 - +1 ÉQUIPIER';
        if (heaviestWeight >= 30 && heaviestWeight < 60) detectedReason = `Article lourd (${heaviestWeight}kg 30-60kg)`;
        else detectedReason = 'Conditions nécessitant 1 équipier';
      }

      console.log(`   🎯 ${detectedLevel}: ${detectedReason}`);
    }

    return recommendedCrew;
  }, [articles, deliveryInfo, calculateEffectiveFloor]);

  // Calcul des recommandations et restrictions lors des changements d'articles ou des options de livraison
  useEffect(() => {
    // Vérifier s'il y a des données significatives
    const hasSignificantDimensions = articles && articles.length > 0 &&
      articles.some(article =>
        article.longueur || article.largeur || article.hauteur || article.poids
      );

    setHasDimensionsData(hasSignificantDimensions);

    if (!hasSignificantDimensions) {
      setValidationErrors([]);
      setWarnings([]);
      setRestrictedVehicles([]);
      setRecommendedVehicle(null);
      setRecommendedCrew(0);
      setShowTiltQuestion(false);
      setRestrictedCrewSizes([]);
      setCrewWarnings([]);
      return;
    }

    // Logique de validation véhicules
    const hasLongItems = articles.some(article => {
      const maxDimension = Math.max(
        article.longueur || 0,
        article.largeur || 0,
        article.hauteur || 0
      );
      return maxDimension >= 100;
    });

    setShowTiltQuestion(hasLongItems);

    const restricted: VehicleType[] = [];
    availableVehicles.forEach(vehicleType => {
      const canFitAll = articles.every(article => {
        return VehicleValidationService.canFitInVehicle(article, vehicleType, canBeTilted);
      });

      if (!canFitAll) {
        restricted.push(vehicleType);
      }
    });

    setRestrictedVehicles(restricted);

    let recommended = VehicleValidationService.recommendVehicle(articles, canBeTilted);

    // ❌ Si le véhicule recommandé est 1M3 et que l'utilisateur est du magasin Bry-Sur-Marne,
    // trouver le prochain véhicule compatible
    if (recommended === '1M3' && user?.storeName === 'Truffaut Bry-Sur-Marne') {
      // Chercher le prochain véhicule compatible (6M3, 10M3, ou 20M3)
      const alternativeVehicles: VehicleType[] = ['6M3', '10M3', '20M3'];
      const alternative = alternativeVehicles.find(vehicleType => {
        return articles.every(article =>
          VehicleValidationService.canFitInVehicle(article, vehicleType, canBeTilted)
        );
      });
      recommended = alternative || null;
    }

    setRecommendedVehicle(recommended);

    // ========== NOUVELLE LOGIQUE ÉQUIPIERS ==========
    if (!hasDimensionsData) return;

    // Recalculer les équipiers recommandés avec la nouvelle logique
    const newRecommendedCrew = calculateRecommendedCrewSize();
    setRecommendedCrew(newRecommendedCrew);

    console.log(`🔄 [VEHICLE-SELECTOR] Recommandation mise à jour: ${newRecommendedCrew} équipiers`);

    // Mettre à jour l'état si nécessaire
    if (newRecommendedCrew !== recommendedCrew) {
      console.log(`📊 [VEHICLE-SELECTOR] Changement de recommandation: ${recommendedCrew} → ${newRecommendedCrew}`);
    }

    // Déterminer les restrictions d'équipiers
    const restrictedCrew: number[] = [];
    const crewWarn: string[] = [];

    // Analyser chaque option d'équipiers (0, 1, 2, 3+)
    for (let crew = 0; crew <= 3; crew++) {
      const validation = validateCrewSize(crew);
      if (validation.isRestricted) {
        restrictedCrew.push(crew);
        crewWarn.push(...validation.reasons);
      }
    }

    setRestrictedCrewSizes([...new Set(restrictedCrew)]);
    setCrewWarnings([...new Set(crewWarn)]);

    // Validation et avertissements véhicules
    const newValidationErrors: string[] = [];
    const newWarnings: string[] = [];

    if (selectedVehicleShort && restricted.includes(selectedVehicleShort)) {
      newValidationErrors.push(
        `⚠️ Le véhicule sélectionné (${selectedVehicleShort}) ne peut pas transporter tous les articles selon leurs dimensions.`
      );
    }

    if (!recommended) {
      newValidationErrors.push(
        '❌ Aucun de nos véhicules ne peut transporter ces articles. Veuillez vérifier les dimensions ou contacter le service client.'
      );
    }

    // Avertissements généraux
    const hasHeavyItems = articles.some(article => (article.poids || 0) >= 30);
    const totalWeight = articles.reduce((sum, article) =>
      sum + ((article.poids || 0) * (article.quantite || 1)), 0
    );

    if (hasHeavyItems) {
      newWarnings.push('💪 Certains articles sont lourds (≥30kg). Un équipier supplémentaire est recommandé.');
    }

    if (deliveryInfo?.hasStairs && !deliveryInfo?.hasElevator && newRecommendedCrew < 1) {
      newWarnings.push('🚶 Livraison avec escaliers sans ascenseur. Un équipier est recommandé.');
    }

    if (totalWeight >= 300 && deliveryInfo?.hasElevator) {
      newWarnings.push('📦 Charge importante avec ascenseur. Un équipier est recommandé.');
    }

    if (totalWeight >= 200 && !deliveryInfo?.hasElevator) {
      newWarnings.push('📦 Charge importante sans ascenseur. Un équipier est recommandé.');
    }

    setValidationErrors(newValidationErrors);
    setWarnings(newWarnings);

  }, [
    JSON.stringify(articles),
    canBeTilted,
    selectedVehicleShort,
    availableVehicles,
    deliveryInfo?.hasElevator,
    deliveryInfo?.hasStairs,
    deliveryInfo?.stairCount,
    deliveryInfo?.floor,
    deliveryInfo?.parkingDistance,
    deliveryInfo?.needsAssembly,
    deliveryInfo?.rueInaccessible,
    deliveryInfo?.paletteComplete,
    calculateRecommendedCrewSize,
    validateCrewSize,
    user?.storeName // 🆕 Ajout pour réagir au changement de magasin
  ]);

  // Fonction de conversion améliorée
  const getDisplayFormat = useCallback((shortFormat: VehicleType | null): string => {
    if (!shortFormat) return '';

    const longFormat = Object.entries(VEHICULES).find(([long, short]) =>
      short === shortFormat
    )?.[0];

    return longFormat || '';
  }, [VEHICULES]);


  const getShortFormat = useCallback((longFormat: string): VehicleType | null => {
    const shortFormat = VEHICULES[longFormat as keyof typeof VEHICULES];
    return (shortFormat as VehicleType) || null;
  }, [VEHICULES]);

  // Restaurer les valeurs initiales du véhicule et des équipiers
  useEffect(() => {
    // Log seulement lors de vrais changements
    console.log("🔄 [VEHICLE] Restauration:", { initialVehicle, initialCrew });

    if (initialVehicle && initialVehicle !== selectedVehicleShort) {
      const longFormat = getDisplayFormat(initialVehicle);
      setSelectedVehicleShort(initialVehicle);
      setSelectedVehicleLong(longFormat);
    } else if (!initialVehicle && selectedVehicleShort) {
      // Réinitialiser si pas de véhicule initial
      setSelectedVehicleShort(null);
      setSelectedVehicleLong('');
    }

    const newCrewSize = initialCrew ?? 0;
    if (newCrewSize !== crewSize) {
      setCrewSize(newCrewSize);
    }

    // Restaurer canBeTilted
    if (deliveryInfo && typeof deliveryInfo === 'object') {
      let canBeTiltedValue = initialCanBeTilted;

      try {
        if (typeof deliveryInfo.details === 'string' && deliveryInfo.details) {
          const details = JSON.parse(deliveryInfo.details);
          canBeTiltedValue = Boolean(details.canBeTilted);
        }

        if (canBeTiltedValue !== canBeTilted) {
          setCanBeTilted(canBeTiltedValue);
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
        console.error("Erreur lors de la restauration de canBeTilted:", e);
      }
    }

  }, [
    initialVehicle,
    initialCrew,
    // Ne pas inclure selectedVehicleShort dans les dépendances
    // pour éviter la boucle
    getDisplayFormat,
    // Pas de deliveryInfo directement car c'est un objet qui change
    // JSON.stringify(deliveryInfo),
    initialCanBeTilted
  ]);

  const handleVehicleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const longFormat = event.target.value;
    const shortFormat = getShortFormat(longFormat);

    setSelectedVehicleLong(longFormat);
    setSelectedVehicleShort(shortFormat);
    onVehicleSelect(shortFormat || '');
  }, [getShortFormat, onVehicleSelect]);

  const handleCrewChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(event.target.value);
    setCrewSize(value);
    onCrewSelect(value);
  }, [onCrewSelect]);

  const handleTiltChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setCanBeTilted(newValue);

    // ✅ DOUBLE MISE À JOUR
    if (onDeliveryDetailsChange) {
      onDeliveryDetailsChange({ ...deliveryInfo, canBeTilted: newValue });
    }

    if (onCanBeTiltedChange) {
      onCanBeTiltedChange(newValue);
    }
  }, [onDeliveryDetailsChange, onCanBeTiltedChange, deliveryInfo]);

  // ========== MISE À JOUR DES VALIDATIONS DES ÉQUIPIERS ==========
  useEffect(() => {
    if (!articles || articles.length === 0) return;

    // Recalculer les équipiers recommandés avec la nouvelle logique
    const newRecommendedCrew = calculateRecommendedCrewSize();
    setRecommendedCrew(newRecommendedCrew);

    // Déterminer les restrictions d'équipiers avec la nouvelle logique
    const restrictedCrew: number[] = [];
    const crewWarn: string[] = [];

    // Analyser chaque option d'équipiers (0, 1, 2, 3+)
    for (let crew = 0; crew <= 3; crew++) {
      const validation = validateCrewSize(crew);
      if (validation.isRestricted) {
        restrictedCrew.push(crew);
        crewWarn.push(...validation.reasons);
      }
    }

    setRestrictedCrewSizes([...new Set(restrictedCrew)]);
    setCrewWarnings([...new Set(crewWarn)]);

  }, [articles, deliveryInfo]);

  // ========== FONCTIONS DE VALIDATION DES ÉQUIPIERS MISES À JOUR ==========
  const isCrewSizeRestricted = (crew: number): boolean => {
    const validation = validateCrewSize(crew);

    // 🆕 Si l'utilisateur est admin/direction, il peut bypasser la limite devis obligatoire (≥3 équipiers)
    if (validation.requiredCrewSize >= 3 && canBypassQuoteLimit(userRole)) {
      console.log(`✅ [VEHICLE-SELECTOR] Admin bypass: Devis obligatoire autorisé pour ${crew} équipiers`);
      return false; // Pas de restriction pour admin
    }

    return validation.isRestricted;
  };

  const getCrewSizeStatus = (crew: number): 'recommended' | 'compatible' | 'restricted' => {
    if (isCrewSizeRestricted(crew)) return 'restricted';
    if (crew === recommendedCrew) return 'recommended';
    return 'compatible';
  };

  const getCrewOptionLabel = (crew: number): string => {
    const baseLabel = crew === 0
      ? 'Aucun équipier'
      : crew === 3
        ? '3 équipiers ou plus (sur devis)'
        : `${crew} équipier${crew > 1 ? 's' : ''} (+${crew * 22}€)`;

    const status = getCrewSizeStatus(crew);

    if (status === 'recommended') {
      return `${baseLabel} ✅ (Recommandé)`;
    } else if (status === 'restricted') {
      return `${baseLabel} ❌ (Insuffisant)`;
    }

    return baseLabel;
  };

  const getCrewValidationReasons = (crew: number): string[] => {
    const validation = validateCrewSize(crew);
    return validation.reasons;
  };

  useEffect(() => {
    console.log("📊 [VEHICLE] État actuel:", {
      selectedVehicleShort,
      selectedVehicleLong,
      crewSize,
      canBeTilted
    });
  }, [selectedVehicleShort, selectedVehicleLong, crewSize, canBeTilted]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Sélection du véhicule et des équipiers</h3>

      {/* Affichage des erreurs */}
      {hasDimensionsData && validationErrors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <ul className="list-none space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Affichage des avertissements */}
      {(hasDimensionsData && warnings.length > 0 || crewWarnings.length > 0) && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <ul className="list-none space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">💡</span>
                <span>{warning}</span>
              </li>
            ))}
            {crewWarnings.slice(0, 3).map((warning, index) => (
              <li key={`crew-warning-${index}`} className="flex items-start">
                <span className="mr-2">👥</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question pour les articles pouvant être couchés */}
      {showTiltQuestion && (
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={canBeTilted}
              onChange={handleTiltChange}
              className="form-checkbox h-5 w-5 text-red-600"
            />
            <span className='font-medium'>Les articles peuvent-ils être couchés/inclinés pour le transport ?</span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            (Permet d'utiliser un véhicule plus petit si la longueur de certains articles dépasse la hauteur du<br />véhicule)
          </p>
        </div>
      )}

      {/* Sélection du véhicule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Véhicule <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedVehicleLong}
            onChange={handleVehicleChange}
            className={`w-full border rounded-md px-3 py-2 ${hasDimensionsData && selectedVehicleShort && restrictedVehicles.includes(selectedVehicleShort)
              ? 'border-red-500 bg-red-50'
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

          {hasDimensionsData && recommendedVehicle && (
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <span className="mr-1">✅</span>
              Véhicule recommandé : {getDisplayFormat(recommendedVehicle)}
            </p>
          )}
        </div>

        {/* ========== SÉLECTION DES ÉQUIPIERS AVEC VALIDATION ========== */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Équipiers supplémentaires
            {/* {recommendedCrew > 0 && (
              <span className="ml-2 text-sm font-normal text-green-600">
                ✅ Recommandé: {recommendedCrew} équipier{recommendedCrew > 1 ? 's' : ''}
              </span>
            )} */}
          </label>
          <select
            value={crewSize}
            onChange={handleCrewChange}
            className={`w-full border rounded-md px-3 py-2 ${isCrewSizeRestricted(crewSize) ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          >
            {[0, 1, 2, 3].map(crew => {
              const status = getCrewSizeStatus(crew);
              const isRestricted = status === 'restricted';
              const isRecommended = status === 'recommended';

              return (
                <option
                  key={crew}
                  value={crew}
                  disabled={isRestricted}
                  className={
                    isRestricted
                      ? 'text-red-500 bg-red-50'
                      : isRecommended
                        ? 'font-bold text-green-700 bg-green-50'
                        : ''
                  }
                >
                  {getCrewOptionLabel(crew)}
                </option>
              );
            })}
          </select>

          {recommendedCrew > 0 && (
            <p className="text-sm text-green-600 mt-1">
              Recommandation : ✅ {recommendedCrew} équipier{recommendedCrew > 1 ? 's' : ''}
            </p>
          )}

          {crewSize >= 3 && (
            <p className="text-sm text-orange-600 mt-1">
              Plus de 2 équipiers nécessite un devis spécial. Passez à l'étape suivante pour demander le devis.
            </p>
          )}

          {isCrewSizeRestricted(crewSize) && (
            <div className="text-sm text-red-600 mt-1">
              <p className="font-medium">⚠️ Ce nombre d'équipiers est insuffisant :</p>
              <ul className="list-disc pl-5 mt-1">
                {getCrewValidationReasons(crewSize).map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>

              {/* Bouton correction automatique */}
              <button
                type="button"
                onClick={() => {
                  const recommended = calculateRecommendedCrewSize();
                  setCrewSize(recommended);
                  onCrewSelect(recommended);
                }}
                className="mt-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              >
                Corriger automatiquement ({calculateRecommendedCrewSize()} équipiers)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tableau des capacités avec format court */}
      {hasDimensionsData && (
        <div className="mt-6">
          <details className="border border-gray-200 rounded-lg">
            <summary className="cursor-pointer p-3 bg-gray-50 font-medium">
              📋 Voir les capacités des véhicules
            </summary>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Véhicule</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Longueur (cm)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Largeur (cm)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hauteur (cm)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poids max (kg)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {VehicleValidationService.getAvailableVehicleTypes().map((vehicleType) => {
                    const capacity = VehicleValidationService.getVehicleCapacity(vehicleType);
                    const isRestricted = restrictedVehicles.includes(vehicleType);
                    const isRecommended = recommendedVehicle === vehicleType;
                    const isSelected = selectedVehicleShort === vehicleType;

                    return (
                      <tr
                        key={vehicleType}
                        className={`
                          ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                          ${isRestricted ? 'bg-red-50' : ''}
                          ${isRecommended ? 'bg-green-50' : ''}
                        `}
                      >
                        <td className="px-4 py-2 whitespace-nowrap font-medium">
                          {vehicleType}
                          {isSelected ? ' 🔹' : ''}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{capacity.length}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{capacity.width}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{capacity.height}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{capacity.weight}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {isRecommended && <span className="text-green-600">✅ Recommandé</span>}
                          {isRestricted && <span className="text-red-600">❌ Incompatible</span>}
                          {!isRecommended && !isRestricted && <span className="text-gray-500">✓ Compatible</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;