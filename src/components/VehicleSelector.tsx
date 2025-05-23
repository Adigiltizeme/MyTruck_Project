import React, { useState, useEffect } from 'react';
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
  initialVehicle?: VehicleType;
  initialCrew?: number;
  deliveryInfo?: {
    floor?: string | number;
    hasElevator?: boolean;
    hasStairs?: boolean;
    stairCount?: number;
    parkingDistance?: number;
    needsAssembly?: boolean;
  };
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  articles,
  onVehicleSelect,
  onCrewSelect,
  initialVehicle,
  initialCrew,
  deliveryInfo = {}
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(initialVehicle || null);
  const [crewSize, setCrewSize] = useState<number>(initialCrew || 0);
  const [canBeTilted, setCanBeTilted] = useState<boolean>(false);
  const [showTiltQuestion, setShowTiltQuestion] = useState<boolean>(false);
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

    // Vérifie s'il y a des articles longs qui pourraient nécessiter d'être couchés
    const hasLongItems = articles.some(article => {
      const maxDimension = Math.max(
        article.longueur || 0, 
        article.largeur || 0, 
        article.hauteur || 0
      );
      return maxDimension > 100; // 1 mètre comme seuil pour considérer un article comme long
    });

    setShowTiltQuestion(hasLongItems);

    // Déterminer les véhicules qui ne peuvent pas transporter les articles
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

    // Recommander un véhicule
    const recommended = VehicleValidationService.recommendVehicle(articles, canBeTilted);
    setRecommendedVehicle(recommended);

    // Si un véhicule est sélectionné mais qu'il est maintenant restreint, réinitialiser la sélection
    if (selectedVehicle && restricted.includes(selectedVehicle)) {
      setSelectedVehicle(null);
      onVehicleSelect(''); // Informer le parent que la sélection a été réinitialisée
    }

    // Déterminer les équipiers recommandés
    const hasHeavyItems = articles.some(article => (article.poids || 0) > 30);
    const totalItemCount = articles.length;

    const crew = VehicleValidationService.getRecommendedCrewSize(articles);
    setRecommendedCrew(crew);

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

    // Ajouter des avertissements en fonction des conditions de livraison
    const newWarnings: string[] = [];
    
    if (needsAdditionalCrew && crew < 1) {
      newWarnings.push('Les conditions de livraison suggèrent l\'ajout d\'un équipier.');
    }

    if (hasHeavyItems) {
      newWarnings.push('Certains articles sont lourds (>30kg). Un équipier supplémentaire est recommandé.');
    }

    if (deliveryInfo.hasStairs && !deliveryInfo.hasElevator && crew < 1) {
      newWarnings.push('Livraison avec escaliers sans ascenseur. Un équipier est recommandé.');
    }

    setWarnings(newWarnings);

    // Validation des erreurs
    const errors: string[] = [];
    
    if (selectedVehicle && restrictedVehicles.includes(selectedVehicle)) {
      errors.push(`Le véhicule sélectionné (${selectedVehicle}) ne peut pas transporter tous les articles.`);
    }

    if (!recommended) {
      errors.push('Aucun de nos véhicules ne peut transporter ces articles. Veuillez contacter le service client.');
    }

    setValidationErrors(errors);

  }, [articles, canBeTilted, deliveryInfo, selectedVehicle]);

  const handleVehicleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as VehicleType;
    setSelectedVehicle(value);
    onVehicleSelect(value);
  };

  const handleCrewChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(event.target.value);
    setCrewSize(value);
    onCrewSelect(value);
  };

  const handleTiltChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCanBeTilted(event.target.checked);
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
            value={selectedVehicle || ''}
            onChange={handleVehicleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          >
            <option value="">Sélectionner un véhicule</option>
            {availableVehicles.map((vehicleType) => {
              const capacity = VehicleValidationService.getVehicleCapacity(vehicleType);
              const isRestricted = restrictedVehicles.includes(vehicleType);
              const isRecommended = recommendedVehicle === vehicleType;
              
              return (
                <option 
                  key={vehicleType} 
                  value={vehicleType}
                  disabled={isRestricted}
                  className={isRestricted ? 'text-gray-400' : isRecommended ? 'font-bold' : ''}
                >
                  {vehicleType} - {capacity.description}
                  {isRecommended ? ' (Recommandé)' : ''}
                </option>
              );
            })}
          </select>
          
          {recommendedVehicle && (
            <p className="text-sm text-green-600 mt-1">
              Véhicule recommandé : {recommendedVehicle} ({VehicleValidationService.getVehicleCapacity(recommendedVehicle).description})
            </p>
          )}
        </div>
        
        {/* Sélection des équipiers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Équipiers supplémentaires
          </label>
          <select
            value={crewSize}
            onChange={handleCrewChange}
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
      
      {/* Capacités des véhicules (informationnel) */}
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
            {availableVehicles.map((vehicleType) => {
              const capacity = VehicleValidationService.getVehicleCapacity(vehicleType);
              const isRestricted = restrictedVehicles.includes(vehicleType);
              
              return (
                <tr 
                  key={vehicleType}
                  className={`${isRestricted ? 'bg-red-50 text-red-700' : ''} ${selectedVehicle === vehicleType ? 'bg-blue-50' : ''}`}
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