import React, { useState, useEffect } from 'react';
import { VehicleType, VehicleValidationService } from '../services/vehicle-validation.service';
import { VEHICULES, VehiculeType } from '../components/constants/options';

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
  deliveryInfo = {}
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(initialVehicle || null);
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

  // Obtenir la liste des véhicules disponibles
  const availableVehicles = VehicleValidationService.getAvailableVehicleTypes();

  // Calcul des recommandations et restrictions lors des changements d'articles ou des options de livraison
  useEffect(() => {
    if (!articles || articles.length === 0) return;

    // Utiliser le format court pour les validations
    const restricted: VehicleType[] = [];
    const availableVehicles = VehicleValidationService.getAvailableVehicleTypes();

    availableVehicles.forEach(vehicleType => {
      const canFitAll = articles.every(article => {
        return VehicleValidationService.canFitInVehicle(article, vehicleType, canBeTilted);
      });

      if (!canFitAll) {
        restricted.push(vehicleType);
      }
    });

    setRestrictedVehicles(restricted);

    // Recommandation
    const recommended = VehicleValidationService.recommendVehicle(articles, canBeTilted);
    setRecommendedVehicle(recommended);

    // Si le véhicule sélectionné est restreint
    if (selectedVehicleShort && restricted.includes(selectedVehicleShort)) {
      setSelectedVehicleShort(null);
      setSelectedVehicleLong('');
      onVehicleSelect('');
    }

  }, [articles, canBeTilted, deliveryInfo, selectedVehicleShort]);

  // Restaurer les valeurs initiales du véhicule et des équipiers
  useEffect(() => {
    console.log("[VEHICLE] Restauration - véhicule initial:", initialVehicle);

    if (initialVehicle && initialVehicle !== selectedVehicleShort) {
      // initialVehicle est en format court ('1M3')
      const longFormat = getDisplayFormat(initialVehicle);

      console.log(`[VEHICLE] Conversion: ${initialVehicle} → ${longFormat}`);

      setSelectedVehicleShort(initialVehicle);
      setSelectedVehicleLong(longFormat);

      console.log("[VEHICLE] Véhicule restauré avec succès");
    }

    // Restaurer les équipiers
    if (initialCrew !== undefined && initialCrew !== crewSize) {
      console.log(`[VEHICLE] Restauration équipiers: ${crewSize} → ${initialCrew}`);
      setCrewSize(initialCrew);
    }

    // Restaurer canBeTilted
    if (deliveryInfo) {
      let canBeTiltedValue = false;

      try {
        if (typeof deliveryInfo.details === 'string' && deliveryInfo.details) {
          const details = JSON.parse(deliveryInfo.details);
          canBeTiltedValue = details.canBeTilted || false;
        } else if (deliveryInfo.canBeTilted !== undefined) {
          canBeTiltedValue = deliveryInfo.canBeTilted;
        }

        if (canBeTiltedValue !== canBeTilted) {
          console.log(`[VEHICLE] Restauration canBeTilted: ${canBeTilted} → ${canBeTiltedValue}`);
          setCanBeTilted(canBeTiltedValue);
        }
      } catch (e) {
        console.warn("[VEHICLE] Erreur parsing deliveryInfo:", e);
      }
    }

  }, [initialVehicle, initialCrew, deliveryInfo]);

  // Fonction de conversion format court → format long
  const getDisplayFormat = (shortFormat: VehicleType | null): string => {
    if (!shortFormat) return '';

    // Trouver la clé correspondante dans VEHICULES
    const longFormat = Object.entries(VEHICULES).find(([long, short]) =>
      short === shortFormat
    )?.[0];

    return longFormat || '';
  };

  // Fonction de conversion format long → format court  
  const getShortFormat = (longFormat: string): VehicleType | null => {
    const shortFormat = VEHICULES[longFormat];
    return shortFormat as VehicleType || null;
  };

  const handleVehicleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const longFormat = event.target.value; // Format long sélectionné
    const shortFormat = getShortFormat(longFormat); // Conversion en format court

    console.log(`[VEHICLE] Sélection: ${longFormat} → ${shortFormat}`);

    setSelectedVehicleLong(longFormat);
    setSelectedVehicleShort(shortFormat);

    // CORRECTION: Notifier le parent avec le format court (VehicleType)
    onVehicleSelect(shortFormat || '');
  };

  const handleCrewChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(event.target.value);
    console.log(`[VEHICLE] Changement équipiers: ${crewSize} → ${value}`);
    setCrewSize(value);
    onCrewSelect(value);
  };

  const handleTiltChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    console.log(`[VEHICLE] Changement canBeTilted: ${canBeTilted} → ${newValue}`);
    setCanBeTilted(newValue);

    // CORRECTION: Notifier le parent si la fonction existe
    if (onDeliveryDetailsChange) {
      const updatedDetails = {
        ...deliveryInfo,
        canBeTilted: newValue
      };
      onDeliveryDetailsChange(updatedDetails);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Sélection du véhicule et des équipiers</h3>

      {/* Affichage des erreurs */}
      {validationErrors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <ul className="list-disc pl-5">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Affichage des avertissements */}
      {warnings.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <ul className="list-disc pl-5">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
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
              onChange={(e) => {
                const newValue = e.target.checked;
                setCanBeTilted(newValue);
                if (onDeliveryDetailsChange) {
                  onDeliveryDetailsChange({ ...deliveryInfo, canBeTilted: newValue });
                }
              }}
              className="form-checkbox h-5 w-5 text-red-600"
            />
            <span>Les articles peuvent-ils être couchés/inclinés pour le transport ?</span>
          </label>
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
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          >
            <option value="">Sélectionner un véhicule</option>
            {Object.entries(VEHICULES).map(([longFormat, shortFormat]) => {
              const isRestricted = restrictedVehicles.includes(shortFormat as VehicleType);
              const isRecommended = recommendedVehicle === shortFormat;

              return (
                <option
                  key={longFormat}
                  value={longFormat}
                  disabled={isRestricted}
                  className={isRestricted ? 'text-gray-400' : isRecommended ? 'font-bold' : ''}
                >
                  {longFormat}
                  {isRecommended ? ' (Recommandé)' : ''}
                  {isRestricted ? ' (inadéquat)' : ''}
                </option>
              );
            })}
          </select>

          {recommendedVehicle && (
            <p className="text-sm text-green-600 mt-1">
              Véhicule recommandé : {getDisplayFormat(recommendedVehicle)}
            </p>
          )}

          {/* Debug en mode développement */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 mt-1">
              Debug: Short={selectedVehicleShort}, Long={selectedVehicleLong}
            </div>
          )}
        </div>

        {/* Sélection des équipiers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Équipiers supplémentaires
          </label>
          <select
            value={crewSize}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setCrewSize(value);
              onCrewSelect(value);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="0">Aucun équipier</option>
            <option value="1">1 équipier (+22€)</option>
            <option value="2">2 équipiers (+44€)</option>
            <option value="3">3 équipiers ou plus (sur devis)</option>
          </select>

          {recommendedCrew > 0 && (
            <p className="text-sm text-green-600 mt-1">
              Recommandation : {recommendedCrew} équipier{recommendedCrew > 1 ? 's' : ''}
            </p>
          )}

          {crewSize >= 3 && (
            <p className="text-sm text-orange-600 mt-1">
              Plus de 2 équipiers nécessite un devis spécial. Le service commercial vous contactera.
            </p>
          )}
        </div>
      </div>

      {/* Tableau des capacités avec format court */}
      <div className="mt-6 overflow-x-auto">
        <h4 className="text-md font-medium mb-2">Capacités des véhicules disponibles</h4>
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
            {VehicleValidationService.getAvailableVehicleTypes().map((vehicleType) => {
              const capacity = VehicleValidationService.getVehicleCapacity(vehicleType);
              const isRestricted = restrictedVehicles.includes(vehicleType);
              const isSelected = selectedVehicleShort === vehicleType;

              return (
                <tr
                  key={vehicleType}
                  className={`${isRestricted ? 'bg-red-50 text-red-700' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-2 whitespace-nowrap font-medium">{vehicleType}</td>
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
    </div>
  );
};

export default VehicleSelector;