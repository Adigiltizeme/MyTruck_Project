// import { useCallback, useEffect, useRef, useState } from "react";
// import { LivraisonFormProps } from "../../types/form.types";
// import { ERROR_MESSAGES } from "../constants/errorMessages";
// import { CRENEAUX_LIVRAISON, VEHICULES } from "../constants/options";
// import { TarificationService, TypeVehicule } from "../../services/tarification.service";
// import { useAuth } from "../../contexts/AuthContext";
// import { useNavigate } from "react-router-dom";

// export const LivraisonForm: React.FC<LivraisonFormProps> = ({ data, errors, onChange }) => {

//     const [calculatingTarif, setCalculatingTarif] = useState(false);
//     const [selectedVehicle, setSelectedVehicle] = useState(data.livraison?.vehicule || '');
//     const [tarifDetails, setTarifDetails] = useState<{
//         montantHT: number | 'devis';
//         detail: {
//             vehicule: number;
//             distance: number | 'devis';
//             equipiers: number | 'devis';
//         }
//     } | null>(null);

//     // Référence pour suivre si nous avons déjà tenté de récupérer l'adresse
//     const adressMagasinRecuperee = useRef(false);

//     const { user } = useAuth();

//     const navigate = useNavigate();

//     // IMPORTANT: Stocker l'adresse du magasin dans un état local pour éviter qu'elle ne soit écrasée
//     const [storeAddress, setStoreAddress] = useState<string>('');

//     // Synchroniser l'état local avec les données entrantes
//     useEffect(() => {
//         if (data.magasin?.address && data.magasin.address !== storeAddress) {
//             console.log(`Mise à jour de l'adresse du magasin dans l'état local: ${data.magasin.address}`);
//             setStoreAddress(data.magasin.address);
//         }
//     }, [data.magasin?.address]);

//     // Réinitialiser le flag quand la commande change
//     useEffect(() => {
//         adressMagasinRecuperee.current = false;
//     }, [data.id]); // Se réinitialise quand on change de commande

//     // Effet DÉDIÉ uniquement à la récupération de l'adresse manquante du magasin
//     useEffect(() => {
//         // Si l'adresse du magasin est déjà présente ou si on a déjà tenté de la récupérer, ne rien faire
//         if (data.magasin?.address || adressMagasinRecuperee.current) {
//             return;
//         }

//         // Marquer qu'on a essayé de récupérer l'adresse
//         adressMagasinRecuperee.current = true;

//         if (user?.role === 'magasin' && user.storeAddress) {
//             console.log('Récupération UNIQUE de l\'adresse du magasin:', user.storeAddress);

//             // Mettre à jour sans déclencher d'effets en cascade
//             onChange({
//                 target: {
//                     name: 'magasin.address',
//                     value: user.storeAddress
//                 }
//             });
//         }
//     }, []); // Dépendances vides pour n'exécuter qu'une seule fois au montage

//     // Fonction pour récupérer l'adresse du magasin de toutes les sources possibles
//     const getLatestStoreAddress = useCallback(() => {
//         // Priorité 1: Les données du formulaire
//         if (data.magasin?.address) {
//             return data.magasin.address;
//         }

//         // Priorité 2: Le contexte utilisateur
//         if (user?.role === 'magasin' && user.storeAddress) {
//             return user.storeAddress;
//         }

//         // Priorité 3: Le localStorage
//         try {
//             const storedInfo = localStorage.getItem('currentStoreInfo');
//             if (storedInfo) {
//                 const info = JSON.parse(storedInfo);
//                 return info.address;
//             }
//         } catch (e) {
//             console.error('Erreur lors de la lecture de localStorage', e);
//         }

//         // Valeur par défaut
//         return '';
//     }, [data.magasin?.address]);

//     // Pour mettre à jour l'état local quand les données changent
//     useEffect(() => {
//         const latestAddress = getLatestStoreAddress();
//         if (latestAddress && latestAddress !== storeAddress) {
//             console.log(`Mise à jour de l'adresse du magasin: ${latestAddress}`);
//             setStoreAddress(latestAddress);
//         }
//     }, [data.magasin?.address, getLatestStoreAddress]);

//     // Gérer le calcul du tarif SÉPARÉMENT, sans tenter de récupérer l'adresse ici
//     useEffect(() => {
//         // Ne pas calculer s'il manque des informations essentielles
//         if (!data.client?.adresse?.ligne1 || !data.livraison?.vehicule) {
//             return;
//         }

//         const timeoutId = setTimeout(() => {
//             updateTarif();
//         }, 500);

//         return () => clearTimeout(timeoutId);
//     }, [
//         data.livraison?.vehicule,
//         data.livraison?.equipiers,
//         data.client?.adresse?.ligne1,
//         data.magasin?.address
//     ]);

//     // Effet pour initialiser le véhicule sélectionné
//     useEffect(() => {
//         if (data.livraison?.vehicule) {
//             // Trouver le format long correspondant au format court stocké en BDD
//             const longFormat = data.livraison && Object.entries(VEHICULES).find(
//                 ([_, shortFormat]) => shortFormat === data.livraison?.vehicule
//             )?.[0];

//             if (longFormat) {
//                 setSelectedVehicle(longFormat);
//             }
//         }
//     }, []); // Uniquement à l'initialisation

//     useEffect(() => {
//         const handleStoreChange = (event: Event) => {
//             const customEvent = event as CustomEvent;
//             const storeInfo = customEvent.detail;

//             console.log('Événement de changement de magasin détecté:', storeInfo);

//             // Force la mise à jour de l'adresse dans le formulaire
//             onChange({
//                 target: {
//                     name: 'magasin.address',
//                     value: storeInfo.address
//                 }
//             });

//             // Forcer un recalcul du tarif après la mise à jour
//             setTimeout(() => updateTarif(), 100);
//         };

//         window.addEventListener('storechange', handleStoreChange);
//         return () => {
//             window.removeEventListener('storechange', handleStoreChange);
//         };
//     }, []);

//     // Calculer le tarif quand les données pertinentes changent
//     // Fonction séparée, qui ne tente PAS de récupérer l'adresse
//     const updateTarif = async () => {
//         if (!data.client?.adresse?.ligne1 || !data.livraison?.vehicule) {
//             return;
//         }

//         try {
//             setCalculatingTarif(true);
//             const tarificationService = new TarificationService();

//             // Utiliser l'adresse stockée localement OU récupérer la plus récente
//             const addressToUse = storeAddress || getLatestStoreAddress();

//             // Log de vérification
//             // CRITIQUE: Utiliser l'adresse stockée dans l'état local, pas data.magasin.address
//             console.log('Calcul du tarif avec les paramètres:', {
//                 vehicule: data.livraison.vehicule,
//                 adresseMagasin: addressToUse,
//                 adresseLivraison: data.client.adresse.ligne1,
//                 equipiers: data.livraison.equipiers || 0
//             });

//             const tarif = await tarificationService.calculerTarif({
//                 vehicule: data.livraison.vehicule as TypeVehicule,
//                 adresseMagasin: addressToUse,
//                 adresseLivraison: data.client.adresse.ligne1,
//                 equipiers: data.livraison.equipiers || 0
//             });

//             setTarifDetails(tarif);

//             // Mise à jour du formulaire avec le même format d'événement
//             const tarifEvent = {
//                 target: {
//                     name: 'financier.tarifHT',
//                     value: tarif.montantHT === 'devis' ? 0 : tarif.montantHT
//                 }
//             };
//             onChange(tarifEvent);

//             const devisEvent = {
//                 target: {
//                     name: 'financier.devisRequis',
//                     value: tarif.montantHT === 'devis'
//                 }
//             };
//             onChange(devisEvent);
//         } catch (error) {
//             console.error('Erreur calcul tarif:', error);
//         } finally {
//             setCalculatingTarif(false);
//         }
//     };

//     const minDate = new Date().toISOString().split('T')[0];
//     const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const selectedDate = new Date(e.target.value);
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         if (selectedDate < today) {
//             e.preventDefault();
//             return;
//         }

//         onChange(e);
//     };

//     const isCreneauPasse = useCallback((creneau: string) => {
//         if (data.dates?.livraison === minDate) {
//             const [heureFin] = creneau.split('-')[1].split('h');
//             const heureActuelle = new Date().getHours();
//             return parseInt(heureFin) <= heureActuelle;
//         }
//         return false;
//     }, [data.dates?.livraison]);

//     const creneauxDisponibles = CRENEAUX_LIVRAISON.filter(creneau => !isCreneauPasse(creneau));

//     const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//         const longFormat = e.target.value;
//         setSelectedVehicle(longFormat);

//         // Convertir en format court pour la BDD
//         const shortFormat = VEHICULES[longFormat];
//         onChange({
//             target: {
//                 name: 'livraison.vehicule',
//                 value: shortFormat
//             }
//         });
//     };

//     return (
//         <div className="space-y-4 mb-6">
//             <h3 className="text-lg font-medium">Informations de livraison</h3>
//             <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1">
//                     <label className="block text-sm font-bold text-gray-700">
//                         Date de livraison <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                         type="date"
//                         name="dates.livraison"
//                         value={data.dates?.livraison?.split('T')[0] || ''}
//                         onChange={handleDateChange}
//                         min={minDate}
//                         className="mt-1 block w-full rounded-md border border-gray-300"
//                         required
//                     />
//                 </div>
//                 <div className="space-y-1">
//                     <label className="block text-sm font-bold text-gray-700">
//                         Créneau de livraison <span className="text-red-500">*</span>
//                     </label>
//                     <select
//                         name="livraison.creneau"
//                         value={data.livraison?.creneau || ''}
//                         onChange={onChange}
//                         className="mt-1 block w-full rounded-md border border-gray-300"
//                         required
//                     >
//                         <option value="">Sélectionner un créneau</option>
//                         {creneauxDisponibles.map(creneau => (
//                             <option key={creneau} value={creneau}>{creneau}</option>
//                         ))}
//                     </select>
//                 </div>
//                 <div className="space-y-1">
//                     <label className="block text-sm font-bold text-gray-700">
//                         Type de véhicule <span className="text-red-500">*</span>
//                     </label>
//                     <select
//                         name="livraison.vehicule"
//                         value={selectedVehicle}
//                         onChange={handleVehicleChange}
//                         className={`mt-1 block w-full rounded-md border ${errors.livraison?.vehicule ? 'border-red-500' : 'border-gray-300'
//                             }`}
//                         required
//                     >
//                         <option value="">Sélectionner un véhicule</option>
//                         {Object.entries(VEHICULES).map(([longFormat, _]) => (
//                             <option key={longFormat} value={longFormat}>
//                                 {longFormat}
//                             </option>
//                         ))}
//                     </select>
//                     {errors.livraison?.vehicule && (
//                         <p className="text-red-500 text-sm mt-1">
//                             {errors.livraison.vehicule}
//                         </p>
//                     )}
//                 </div>
//                 <div className="space-y-1">
//                     <label className="block text-sm font-bold text-gray-700">
//                         Option équipier de manutention
//                     </label>
//                     <span className="ml-1 text-sm text-gray-500" title={ERROR_MESSAGES.equipiers.contact}>
//                         {ERROR_MESSAGES.equipiers.info}
//                     </span>
//                     <div className="relative">
//                         <input
//                             type="number"
//                             name="livraison.equipiers"
//                             min="0"
//                             max="3"
//                             value={data.livraison?.equipiers || 0}
//                             onChange={onChange}
//                             className={`mt-1 block w-full rounded-md border ${errors.livraison?.equipiers ? 'border-red-500' : 'border-gray-300'}`}
//                         />
//                         {/* {errors.livraison?.equipiers && (
//                             <div className="mt-1 flex items-center">
//                                 <span className="text-red-500 text-sm">{ERROR_MESSAGES.equipiers?.max}</span>
//                                 <button
//                                     type="button"
//                                     onClick={() => window.location.href = 'mailto:commercial@mytruck.fr'}
//                                     className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
//                                 >
//                                     Contacter le service commercial
//                                 </button>
//                             </div>
//                         )} */}
//                     </div>
//                 </div>
//                 <div className="space-y-1">
//                     <label className="block text-sm font-bold text-gray-700">
//                         Autres remarques
//                     </label>
//                     <p className="text-sm text-gray-500">Précisions nécessaires au bon fonctionnement de la livraison</p>
//                     <textarea
//                         name="livraison.remarques"
//                         value={data.livraison?.remarques || ''}
//                         onChange={(e) => onChange(e as any)}
//                         className={`mt-1 block w-full rounded-md border 'border-gray-300'
//                         }`}
//                         rows={4}
//                     />
//                 </div>

//             </div>

//             {calculatingTarif ? (
//                 <div className="mt-4 p-4 border rounded-lg">
//                     <p className="text-gray-600">Calcul du tarif en cours...</p>
//                 </div>
//             ) : tarifDetails && (
//                 <div className="mt-4 p-4 border rounded-lg">
//                     <h3 className="font-medium text-lg mb-2 secondary">Détail du tarif</h3>
//                     {tarifDetails.montantHT === 'devis' ? (
//                         <div className="text-red-600 font-medium">
//                             Devis obligatoire pour cette livraison
//                             {tarifDetails.detail.equipiers === 'devis' && (
//                                 <p className="text-sm mt-1">
//                                     Raison : Plus de 2 équipiers demandés
//                                 </p>
//                             )}
//                             {tarifDetails.detail.distance === 'devis' && (
//                                 <p className="text-sm mt-1">
//                                     Raison : Distance supérieure à 50km
//                                 </p>
//                             )}
//                             {errors.livraison?.equipiers && (
//                                 <div className="mt-1 flex items-center">
//                                     <span className="text-red-500 text-sm">{ERROR_MESSAGES.equipiers?.max}</span>
//                                     <button
//                                         type="button"
//                                         onClick={() => window.location.href = 'mailto:commercial@mytruck.fr'}
//                                         // onClick={() => navigate('/devis')}
//                                         className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
//                                     >
//                                         Contacter le service commercial
//                                     </button>
//                                 </div>
//                             )}
//                         </div>
//                     ) : (
//                         <div className="space-y-2">
//                             <p>
//                                 <span className="font-medium">Véhicule:</span> {tarifDetails.detail.vehicule}€
//                             </p>
//                             {typeof tarifDetails.detail.equipiers === 'number' && tarifDetails.detail.equipiers > 0 && (
//                                 <p>
//                                     <span className="font-medium">Équipiers:</span> {tarifDetails.detail.equipiers}€
//                                 </p>
//                             )}
//                             {typeof tarifDetails.detail.distance === 'number' && tarifDetails.detail.distance > 0 && (
//                                 <p>
//                                     <span className="font-medium">Frais kilométriques:</span> {tarifDetails.detail.distance}€
//                                 </p>
//                             )}
//                             <p className="text-lg font-medium mt-2 border-t pt-2">
//                                 Total HT: {tarifDetails.montantHT}€
//                             </p>
//                         </div>
//                     )}
//                 </div>
//             )}

//             <div className="mt-6 py-4 bg-white flex-col">
//                 <p className="text-red-500 font-bold text-center px-4">
//                     TOUTE ABSENCE LORS DE LA LIVRAISON VOUS ENGAGE
//                 </p>
//                 <p className="text-red-500 font-bold text-center px-4">
//                     A REGLER LE RETOUR AINSI QUE LA NOUVELLE LIVRAISON
//                 </p>
//             </div>
//         </div>
//     );
// };

import { useCallback, useEffect, useRef, useState } from "react";
import { LivraisonFormProps } from "../../types/form.types";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { CRENEAUX_LIVRAISON, VEHICULES } from "../constants/options";
import { TarificationService, TypeVehicule } from "../../services/tarification.service";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { VehicleType, VehicleValidationService } from "../../services/vehicle-validation.service";
import { AlertTriangle, Info } from "lucide-react";

export const LivraisonForm: React.FC<LivraisonFormProps> = ({ data, errors, onChange, showErrors = false, isEditing = false }) => {
    const [selectedVehicleLong, setSelectedVehicleLong] = useState('');
    const [selectedVehicleShort, setSelectedVehicleShort] = useState(data.livraison?.vehicule || '');
    const [calculatingTarif, setCalculatingTarif] = useState(false);
    const [tarifDetails, setTarifDetails] = useState<{
        montantHT: number | 'devis';
        detail: {
            vehicule: number;
            distance: number | 'devis';
            equipiers: number | 'devis';
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
        canBeTilted: false
    });

    // Référence pour suivre si nous avons déjà tenté de récupérer l'adresse
    const adressMagasinRecuperee = useRef(false);

    const { user } = useAuth();

    const navigate = useNavigate();

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
                        canBeTilted: livDetails.canBeTilted || false
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

        availableVehicles.forEach(vehicleType => {
            const canFitAll = articleDimensions.every(article => {
                return VehicleValidationService.canFitInVehicle(article, vehicleType, currentDeliveryInfo.canBeTilted);
            });

            if (!canFitAll) {
                restricted.push(vehicleType);
            }
        });

        setRestrictedVehicles(restricted);

        // Recommander un véhicule
        const recommended = VehicleValidationService.recommendVehicle(articleDimensions, currentDeliveryInfo.canBeTilted);
        setRecommendedVehicle(recommended);

        // Calculer les équipiers recommandés
        const crew = VehicleValidationService.getRecommendedCrewSize(articleDimensions);
        setRecommendedCrew(crew);

        // Vérifier si des équipiers supplémentaires sont nécessaires
        const hasHeavyItems = articleDimensions.some(article => (article.poids || 0) > 30);
        const totalItemCount = articleDimensions.length;
        const floor = data.client?.adresse?.etage ? parseInt(data.client.adresse.etage) : 0;

        const needsAdditionalCrew = VehicleValidationService.needsAdditionalCrew({
            hasElevator: currentDeliveryInfo.hasElevator,
            hasStairs: currentDeliveryInfo.hasStairs,
            stairCount: currentDeliveryInfo.stairCount,
            floor: floor,
            heavyItems: hasHeavyItems,
            totalItemCount,
            parkingDistance: currentDeliveryInfo.parkingDistance,
            needsAssembly: currentDeliveryInfo.needsAssembly
        });

        // Générer des avertissements
        const newWarnings: string[] = [];
        if (needsAdditionalCrew && crew < 1) {
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
    const getLatestStoreAddress = useCallback(() => {
        // Priorité 1: Les données du formulaire
        if (data.magasin?.address) {
            return data.magasin.address;
        }

        // Priorité 2: Le contexte utilisateur
        if (user?.role === 'magasin' && user.storeAddress) {
            return user.storeAddress;
        }

        // Priorité 3: Le localStorage
        try {
            const storedInfo = localStorage.getItem('currentStoreInfo');
            if (storedInfo) {
                const info = JSON.parse(storedInfo);
                return info.address;
            }
        } catch (e) {
            console.error('Erreur lors de la lecture de localStorage', e);
        }

        // Valeur par défaut
        return '';
    }, [data.magasin?.address]);

    // Pour mettre à jour l'état local quand les données changent
    useEffect(() => {
        const latestAddress = getLatestStoreAddress();
        if (latestAddress && latestAddress !== storeAddress) {
            console.log(`Mise à jour de l'adresse du magasin: ${latestAddress}`);
            setStoreAddress(latestAddress);
        }
    }, [data.magasin?.address, getLatestStoreAddress]);

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
                const canBeTilted = data.livraison?.details ?
                    JSON.parse(data.livraison.details).canBeTilted || false :
                    false;

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

    // Gérer le calcul du tarif SÉPARÉMENT, sans tenter de récupérer l'adresse ici
    useEffect(() => {
        // Ne pas calculer s'il manque des informations essentielles
        if (!data.client?.adresse?.ligne1 || !data.livraison?.vehicule) {
            return;
        }

        const timeoutId = setTimeout(() => {
            updateTarif();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [
        data.livraison?.vehicule,
        data.livraison?.equipiers,
        data.client?.adresse?.ligne1,
        data.magasin?.address
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
    }, []);

    // Calculer le tarif quand les données pertinentes changent
    // Fonction séparée, qui ne tente PAS de récupérer l'adresse
    const updateTarif = async () => {
        if (!data.client?.adresse?.ligne1 || !data.livraison?.vehicule) {
            return;
        }

        try {
            setCalculatingTarif(true);
            const tarificationService = new TarificationService();

            // Utiliser l'adresse stockée localement OU récupérer la plus récente
            const addressToUse = storeAddress || getLatestStoreAddress();

            // Log de vérification
            // CRITIQUE: Utiliser l'adresse stockée dans l'état local, pas data.magasin.address
            console.log('Calcul du tarif avec les paramètres:', {
                vehicule: data.livraison.vehicule,
                adresseMagasin: addressToUse,
                adresseLivraison: data.client.adresse.ligne1,
                equipiers: data.livraison.equipiers || 0
            });

            const tarif = await tarificationService.calculerTarif({
                vehicule: data.livraison.vehicule as TypeVehicule,
                adresseMagasin: addressToUse,
                adresseLivraison: data.client.adresse.ligne1,
                equipiers: data.livraison.equipiers || 0
            });

            setTarifDetails(tarif);

            // Mise à jour du formulaire avec le même format d'événement
            const tarifEvent = {
                target: {
                    name: 'financier.tarifHT',
                    value: tarif.montantHT === 'devis' ? 0 : tarif.montantHT
                }
            };
            onChange(tarifEvent);

            const devisEvent = {
                target: {
                    name: 'financier.devisRequis',
                    value: tarif.montantHT === 'devis'
                }
            };
            onChange(devisEvent);
        } catch (error) {
            console.error('Erreur calcul tarif:', error);
        } finally {
            setCalculatingTarif(false);
        }
    };

    const minDate = new Date().toISOString().split('T')[0];
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = new Date(e.target.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            e.preventDefault();
            return;
        }

        onChange(e);
    };

    const isCreneauPasse = useCallback((creneau: string) => {
        if (data.dates?.livraison === minDate) {
            const [heureFin] = creneau.split('-')[1].split('h');
            const heureActuelle = new Date().getHours();
            return parseInt(heureFin) <= heureActuelle;
        }
        return false;
    }, [data.dates?.livraison]);

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
    const isCrewSizeRestricted = (crewSize: number): boolean => {
        if (!hasDimensionsData) return false;

        const articleDimensions = data.articles?.dimensions || [];
        const totalWeight = articleDimensions.reduce((sum, article) => sum + (article.poids || 0), 0);
        const hasHeavyItems = articleDimensions.some(article => (article.poids || 0) > 30);

        // Cas où 0 équipier est insuffisant
        if (crewSize === 0) {
            // Articles très lourds (>30kg individuellement)
            if (hasHeavyItems) return true;

            // Poids total important (>100kg)
            if (totalWeight > 100) return true;

            // Conditions de livraison difficiles
            if (deliveryInfo.hasStairs && !deliveryInfo.hasElevator) return true;
            if (deliveryInfo.parkingDistance && deliveryInfo.parkingDistance > 50) return true;
            if (deliveryInfo.needsAssembly) return true;

            // Étage élevé sans ascenseur
            const floor = data.client?.adresse?.etage ? parseInt(data.client.adresse.etage) : 0;
            if (floor > 2 && !deliveryInfo.hasElevator) return true;
        }

        // Cas où 1-2 équipiers sont insuffisants pour très gros poids
        if (totalWeight > 300 && crewSize < 3) {
            return crewSize < 2; // 0-1 équipier restreint, 2 équipiers en warning
        }

        return false;
    };

    const getCrewSizeStatus = (crewSize: number): 'recommended' | 'compatible' | 'restricted' => {
        if (!hasDimensionsData) return 'compatible';

        if (crewSize === recommendedCrew) return 'recommended';
        if (isCrewSizeRestricted(crewSize)) return 'restricted';
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

            {hasDimensionsData && warnings.length > 0 && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 flex items-start">
                    <Info className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Recommandations</p>
                        <ul className="list-disc pl-5 mt-1">
                            {warnings.map((warning, index) => (
                                <li key={index} className="text-sm">{warning}</li>
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
                    <label className="block text-sm font-bold text-gray-700">
                        Créneau de livraison <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="livraison.creneau"
                        value={data.livraison?.creneau || ''}
                        onChange={onChange}
                        className="mt-1 block w-full rounded-md border border-gray-300"
                        required
                    >
                        <option value="">Sélectionner un créneau</option>
                        {creneauxDisponibles.map(creneau => (
                            <option key={creneau} value={creneau}>{creneau}</option>
                        ))}
                    </select>
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
                        onChange={onChange}
                        className={`mt-1 block w-full rounded-md border ${hasDimensionsData && isCrewSizeRestricted(data.livraison?.equipiers || 0)
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
                                            ? '3 équipiers ou plus (sur devis)'
                                            : `${crewSize} équipier${crewSize > 1 ? 's' : ''} (+${crewSize * 22}€)`
                                    }
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
                        <p className="text-sm text-red-600 mt-1">
                            ⚠️ Ce nombre d'équipiers est insuffisant selon les critères de vos articles et de livraison.
                        </p>
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
                    />
                </div>
            </div>

            {/* ========== AFFICHAGE DU TARIF ========== */}
            {calculatingTarif ? (
                <div className="mt-4 p-4 border rounded-lg">
                    <p className="text-gray-600">Calcul du tarif en cours...</p>
                </div>
            ) : tarifDetails && (
                <div className="mt-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-lg mb-2 secondary">Détail du tarif</h3>
                    {tarifDetails.montantHT === 'devis' ? (
                        <div className="text-red-600 font-medium">
                            Devis obligatoire pour cette livraison
                            {tarifDetails.detail.equipiers === 'devis' && (
                                <p className="text-sm mt-1">
                                    Raison : Plus de 2 équipiers demandés
                                </p>
                            )}
                            {tarifDetails.detail.distance === 'devis' && (
                                <p className="text-sm mt-1">
                                    Raison : Distance supérieure à 50km
                                </p>
                            )}
                            {errors.livraison?.equipiers && (
                                <div className="mt-1 flex items-center">
                                    <span className="text-red-500 text-sm">{ERROR_MESSAGES.equipiers?.max}</span>
                                    <button
                                        type="button"
                                        onClick={() => window.location.href = 'mailto:commercial@mytruck.fr'}
                                        // onClick={() => navigate('/devis')}
                                        className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
                                    >
                                        Contacter le service commercial
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p>
                                <span className="font-medium">Véhicule:</span> {tarifDetails.detail.vehicule}€
                            </p>
                            {typeof tarifDetails.detail.equipiers === 'number' && tarifDetails.detail.equipiers > 0 && (
                                <p>
                                    <span className="font-medium">Équipiers:</span> {tarifDetails.detail.equipiers}€
                                </p>
                            )}
                            {typeof tarifDetails.detail.distance === 'number' && tarifDetails.detail.distance > 0 && (
                                <p>
                                    <span className="font-medium">Frais kilométriques:</span> {tarifDetails.detail.distance}€
                                </p>
                            )}
                            <p className="text-lg font-medium mt-2 border-t pt-2">
                                Total HT: {tarifDetails.montantHT}€
                            </p>
                        </div>
                    )}
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