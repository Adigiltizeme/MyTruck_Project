import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VehicleType, VehicleValidationService } from '../services/vehicle-validation.service';

interface ArticleDimensions {
  longueur?: number;
  largeur?: number;
  hauteur?: number;
  poids?: number;
}

interface VehicleSelectorProps {
  articles: ArticleDimensions[];
  onVehicleSelect: (vehicleType: VehicleType | '') => void;
  onCrewSelect: (crewSize: number) => void;
  onDeliveryDetailsChange?: (details: any) => void;
  initialVehicle?: VehicleType;
  initialCrew?: number;
  deliveryInfo?: {
    floor?: string | number;
    hasElevator?: boolean;
    hasStairs?: boolean;
    stairCount?: number;
    parkingDistance?: number;
    needsAssembly?: boolean;
    details?: string;
    canBeTilted?: boolean;
  };
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  articles,
  onVehicleSelect,
  onCrewSelect,
  onDeliveryDetailsChange,
  initialVehicle,
  initialCrew,
  deliveryInfo = {},
}) => {
  const [selectedVehicleShort, setSelectedVehicleShort] = useState<VehicleType | null>(null); // Format court
  const [selectedVehicleLong, setSelectedVehicleLong] = useState<string>('');
  const [crewSize, setCrewSize] = useState<number>(initialCrew || 0);
  const [canBeTilted, setCanBeTilted] = useState<boolean>(false);
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

  const VEHICULES = useMemo(() => ({
    "1M3 (Utilitaire 150kg, 100x100x100cm)": "1M3",
    "6M3 (Camionnette 300kg, 260x160x125cm)": "6M3",
    "10M3 (Camionnette 800kg, 310x178x190cm)": "10M3",
    "20M3 (Avec hayon 750kg, 410, 200, 210cm)": "20M3"
  }), []);

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
      return;
    }

    // Logique de validation (identique à avant mais sans boucle)
    const hasLongItems = articles.some(article => {
      const maxDimension = Math.max(
        article.longueur || 0,
        article.largeur || 0,
        article.hauteur || 0
      );
      return maxDimension > 100;
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

    const recommended = VehicleValidationService.recommendVehicle(articles, canBeTilted);
    setRecommendedVehicle(recommended);

    const crew = VehicleValidationService.getRecommendedCrewSize(articles);
    setRecommendedCrew(crew);

    // Validation et avertissements
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

    // ========== VALIDATION DES ÉQUIPIERS ==========
    // Calculer les critères pour les équipiers supplémentaires
    const hasHeavyItems = articles.some(article => (article.poids || 0) >= 30);
    const totalItemCount = articles.length;
    const totalWeight = articles.reduce((sum, article) => sum + (article.poids || 0), 0);

    // Déterminer les restrictions d'équipiers
    const restrictedCrew: number[] = [];
    const crewWarn: string[] = [];

    // Analyser chaque option d'équipiers (0, 1, 2, 3+)
    for (let crew = 0; crew <= 3; crew++) {
      // Vérifier si ce nombre d'équipiers est insuffisant
      if (totalWeight >= 300 && crew < 3) {
        if (crew < 2) {
          restrictedCrew.push(crew);
        } else {
          crewWarn.push(`${crew} équipier${crew > 1 ? 's' : ''} pourrait être insuffisant pour ce poids total (${totalWeight.toFixed(1)}kg)`);
        }
      }
      
      // Vérifier les conditions de livraison
      if (deliveryInfo.hasStairs && !deliveryInfo.hasElevator && crew === 0) {
        restrictedCrew.push(crew);
      }
    }

    setRestrictedCrewSizes([...new Set(restrictedCrew)]); // Éliminer les doublons
    setCrewWarnings([...new Set(crewWarn)]); // Éliminer les doublons

    // Avertissements équipiers
    // Vérifier si des équipiers supplémentaires sont nécessaires en fonction des critères de livraison
    const needsAdditionalCrew = VehicleValidationService.needsAdditionalCrew({
      hasElevator: deliveryInfo.hasElevator || false,
      hasStairs: deliveryInfo.hasStairs || false,
      stairCount: deliveryInfo.stairCount,
      floor: deliveryInfo.floor || 0,
      heavyItems: hasHeavyItems,
      totalItemCount,
      parkingDistance: deliveryInfo.parkingDistance,
      needsAssembly: deliveryInfo.needsAssembly
    });

    if (needsAdditionalCrew && crew < 1) {
      newWarnings.push('📦 Les conditions de livraison suggèrent l\'ajout d\'un équipier.');
    }

    if (hasHeavyItems) {
      newWarnings.push('💪 Certains articles sont lourds (>30kg). Un équipier supplémentaire est recommandé.');
    }

    if (deliveryInfo.hasStairs && !deliveryInfo.hasElevator && hasHeavyItems && crew < 1) {
      newWarnings.push('🚶 Livraison avec escaliers sans ascenseur. Un équipier est recommandé.');
    }

    setValidationErrors(newValidationErrors);
    setWarnings(newWarnings);

  }, [
    // Dépendances stables uniquement
    JSON.stringify(articles), // Utiliser JSON.stringify pour comparaison stable
    canBeTilted,
    selectedVehicleShort,
    availableVehicles,
    // Supprimer deliveryInfo direct pour éviter la boucle
    deliveryInfo.hasElevator,
    deliveryInfo.hasStairs,
    deliveryInfo.stairCount,
    deliveryInfo.floor,
    deliveryInfo.parkingDistance,
    deliveryInfo.needsAssembly
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
      let canBeTiltedValue = false;

      try {
        if (typeof deliveryInfo.details === 'string' && deliveryInfo.details) {
          const details = JSON.parse(deliveryInfo.details);
          canBeTiltedValue = Boolean(details.canBeTilted);
        } else if (typeof deliveryInfo.canBeTilted === 'boolean') {
          canBeTiltedValue = deliveryInfo.canBeTilted;
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
    getDisplayFormat
    // Pas de deliveryInfo directement car c'est un objet qui change
  ]);

  // Pour deliveryInfo avec comparaison JSON
  useEffect(() => {
    const deliveryInfoStr = JSON.stringify(deliveryInfo);

    try {
      let canBeTiltedValue = false;

      if (deliveryInfo && typeof deliveryInfo.details === 'string' && deliveryInfo.details) {
        const details = JSON.parse(deliveryInfo.details);
        canBeTiltedValue = Boolean(details.canBeTilted);
      } else if (deliveryInfo && typeof deliveryInfo.canBeTilted === 'boolean') {
        canBeTiltedValue = deliveryInfo.canBeTilted;
      }

      if (canBeTiltedValue !== canBeTilted) {
        setCanBeTilted(canBeTiltedValue);
      }
    } catch (e) {
      // Ignorer
      console.error("Erreur lors de la restauration de canBeTilted:", e);
    }
  }, [JSON.stringify(deliveryInfo)]); // Utiliser JSON.stringify pour comparaison stable

  const handleVehicleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const longFormat = event.target.value;
    const shortFormat = getShortFormat(longFormat);

    setSelectedVehicleLong(longFormat);
    setSelectedVehicleShort(shortFormat);
    onVehicleSelect(shortFormat || '');
  }, [getShortFormat, onVehicleSelect]);

  useEffect(() => {
    console.log("📊 [VEHICLE] État actuel:", {
      selectedVehicleShort,
      selectedVehicleLong,
      crewSize,
      canBeTilted
    });
  }, [selectedVehicleShort, selectedVehicleLong, crewSize, canBeTilted]);

  const handleCrewChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(event.target.value);
    setCrewSize(value);
    onCrewSelect(value);
  }, [onCrewSelect]);


  const handleTiltChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setCanBeTilted(newValue);
    if (onDeliveryDetailsChange) {
      onDeliveryDetailsChange({ ...deliveryInfo, canBeTilted: newValue });
    }
  }, [onDeliveryDetailsChange, deliveryInfo]);

  // ========== FONCTIONS DE VALIDATION DES ÉQUIPIERS ==========
  const isCrewSizeRestricted = (crew: number): boolean => {
    return restrictedCrewSizes.includes(crew);
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
            {crewWarnings.map((warning, index) => (
              <li key={`crew-warning-${index}`}>{warning}</li>
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
            <span>Les articles peuvent-ils être couchés/inclinés pour le transport ?</span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            (Cela permet d'utiliser un véhicule plus petit si la longueur de certains articles dépasse la hauteur du véhicule)
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
              Plus de 2 équipiers nécessite un devis spécial. Le service commercial vous contactera.
            </p>
          )}

          {isCrewSizeRestricted(crewSize) && (
            <p className="text-sm text-red-600 mt-1">
              ⚠️ Ce nombre d'équipiers est insuffisant selon les critères de vos articles et de livraison.
            </p>
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