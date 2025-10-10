import { CommandeMetier } from "../../types/business.types";
import { RecapitulatifFormProps } from "../../types/form.types";
import { VehicleValidationService } from "../../services/vehicle-validation.service";
import FormInput from "./FormInput";

export const RecapitulatifForm: React.FC<RecapitulatifFormProps> = ({ data, errors, onChange, showErrors = false }) => {
    const getDeliveryConditions = () => {
        // Extraire les conditions de livraison des données
        let deliveryConditions = null;

        try {
            if (typeof data.livraison?.details === 'string') {
                deliveryConditions = JSON.parse(data.livraison.details);
            } else if (data.livraison?.details) {
                deliveryConditions = data.livraison.details;
            }
        } catch (e) {
            console.warn('Impossible de parser les détails de livraison');
        }

        // Vérifier s'il y a des conditions spéciales
        const hasSpecialConditions = deliveryConditions && (
            deliveryConditions.rueInaccessible ||
            deliveryConditions.paletteComplete ||
            (deliveryConditions.parkingDistance && deliveryConditions.parkingDistance > 50) ||
            deliveryConditions.needsAssembly ||
            (deliveryConditions.isDuplex && deliveryConditions.deliveryToUpperFloor) ||
            (deliveryConditions.hasStairs && deliveryConditions.stairCount > 20)
        );

        // Calculer l'étage effectif
        const baseFloor = parseInt(data.client?.adresse?.etage || '0');
        const effectiveFloor = baseFloor +
            (deliveryConditions?.isDuplex && deliveryConditions?.deliveryToUpperFloor ? 1 : 0);

        if (!hasSpecialConditions) return null;

        return (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium text-orange-800 mb-3">
                    ⚠️ Conditions spéciales de livraison
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {/* Type de logement */}
                    {!!deliveryConditions.isDuplex && (
                        <div className="flex items-start">
                            <span className="text-orange-600 mr-2">🏠</span>
                            <div>
                                <p className="font-medium text-orange-800">Duplex/Maison avec étages</p>
                                <p className="text-orange-700">
                                    {deliveryConditions.deliveryToUpperFloor
                                        ? `Livraison à l'étage supérieur (${effectiveFloor} étages effectifs)`
                                        : 'Livraison au rez-de-chaussée uniquement'
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Rue inaccessible */}
                    {!!deliveryConditions.rueInaccessible && (
                        <div className="flex items-start">
                            <span className="text-orange-600 mr-2">🚫</span>
                            <div>
                                <p className="font-medium text-orange-800">Rue inaccessible</p>
                                <p className="text-orange-700">Véhicule ne peut pas accéder directement</p>
                            </div>
                        </div>
                    )}

                    {/* Palette complète */}
                    {!!deliveryConditions.paletteComplete && (
                        <div className="flex items-start">
                            <span className="text-orange-600 mr-2">📦</span>
                            <div>
                                <p className="font-medium text-orange-800">Palette complète</p>
                                <p className="text-orange-700">Dépalettisation et déchargement requis</p>
                            </div>
                        </div>
                    )}

                    {/* Distance de portage */}
                    {!!(deliveryConditions.parkingDistance && deliveryConditions.parkingDistance > 50) && (
                        <div className="flex items-start">
                            <span className="text-orange-600 mr-2">📏</span>
                            <div>
                                <p className="font-medium text-orange-800">Distance de portage</p>
                                <p className="text-orange-700">{deliveryConditions.parkingDistance}m depuis le stationnement</p>
                            </div>
                        </div>
                    )}

                    {/* Escaliers */}
                    {!!(deliveryConditions.hasStairs && deliveryConditions.stairCount > 0) && (
                        <div className="flex items-start">
                            <span className="text-orange-600 mr-2">🪜</span>
                            <div>
                                <p className="font-medium text-orange-800">Escaliers présents</p>
                                <p className="text-orange-700">
                                    {deliveryConditions.stairCount} marches
                                    {deliveryConditions.stairCount > 20 && ' (nombreuses marches)'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Montage nécessaire */}
                    {!!deliveryConditions.needsAssembly && (
                        <div className="flex items-start">
                            <span className="text-orange-600 mr-2">🔧</span>
                            <div>
                                <p className="font-medium text-orange-800">Montage/Installation</p>
                                <p className="text-orange-700">Assemblage ou installation nécessaire</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 🎯 CALCUL AUTOMATIQUE DES ÉQUIPIERS REQUIS */}
                {getRequiredCrew(deliveryConditions, effectiveFloor)}
            </div>
        );
    }

    // 🔥 CORRECTION CRITIQUE : Utiliser la NOUVELLE logique hiérarchique
    const getRequiredCrew = (deliveryConditions: any, effectiveFloor: number) => {
        const articles = data.articles?.dimensions || [];
        if (articles.length === 0) return null;

        const totalItemCount = articles.reduce((sum, article) => sum + (article.quantite || 1), 0);

        // 🆕 UTILISER VehicleValidationService.getRequiredCrewSize() avec TOUTES les conditions
        const validationConditions = {
            hasElevator: data.client?.adresse?.ascenseur || false,
            totalItemCount,
            rueInaccessible: deliveryConditions?.rueInaccessible || false,
            paletteComplete: deliveryConditions?.paletteComplete || false,
            parkingDistance: deliveryConditions?.parkingDistance || 0,
            hasStairs: deliveryConditions?.hasStairs || false,
            stairCount: deliveryConditions?.stairCount || 0,
            needsAssembly: deliveryConditions?.needsAssembly || false,
            floor: effectiveFloor,
            isDuplex: deliveryConditions?.isDuplex || false,
            deliveryToUpperFloor: deliveryConditions?.deliveryToUpperFloor || false,
            // 🆕 Nouvelles conditions pour logique hiérarchique
            estimatedHandlingTime: deliveryConditions?.estimatedHandlingTime || 0,
            hasLargeVoluminousItems: deliveryConditions?.hasLargeVoluminousItems || false,
            multipleLargeVoluminousItems: deliveryConditions?.multipleLargeVoluminousItems || false,
            complexAccess: deliveryConditions?.complexAccess || false
        };

        // ✅ UTILISER LA MÉTHODE OFFICIELLE au lieu de la logique manuelle
        const requiredCrew = VehicleValidationService.getRequiredCrewSize(articles, validationConditions);

        console.log('📊 [RECAPITULATIF] Équipiers calculés:', requiredCrew);

        return (
            <div className="mt-3 pt-3 border-t border-orange-300">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-orange-800">
                        📊 Équipiers requis selon conditions :
                    </span>
                    <span className="font-bold text-orange-900 text-lg">
                        {requiredCrew} équipier{requiredCrew > 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-orange-700">Équipiers sélectionnés :</span>
                    <span className={`font-medium ${(data.livraison?.equipiers || 0) >= requiredCrew
                        ? 'text-green-600'
                        : 'text-red-600'
                        }`}>
                        {data.livraison?.equipiers || 0} équipier{(data.livraison?.equipiers || 0) > 1 ? 's' : ''}
                        {(data.livraison?.equipiers || 0) >= requiredCrew ? ' ✅' : ' ⚠️'}
                    </span>
                </div>
            </div>
        );
    };
    return (
        <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-medium secondary">Récapitulatif de la commande</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="font-medium">Client</h4>
                    <p>{data.client?.nom} {data.client?.prenom}</p>
                    <p>{data.client?.adresse?.ligne1}</p>
                    <p>Tél: {data.client?.telephone?.principal}</p>
                    {data.client?.telephone?.secondaire && (
                        <p>Tél 2: {data.client?.telephone?.secondaire}</p>
                    )}
                    <p>Type: {data.client?.adresse?.type}</p>
                    {data.client?.adresse?.batiment && (
                        <p>Bâtiment: {data.client?.adresse?.batiment}</p>
                    )}
                    {data.client?.adresse?.etage && (
                        <p>Étage: {data.client?.adresse?.etage}</p>
                    )}
                    {data.client?.adresse?.interphone && (
                        <p>Interphone: {data.client?.adresse?.interphone}</p>
                    )}
                    {data.client?.adresse?.ascenseur && (
                        <p>Ascenseur: {data.client?.adresse?.ascenseur ? 'Oui' : 'Non'}</p>
                    )}
                </div>

                <div>
                    <h4 className="font-medium">Articles</h4>
                    <p>Quantité totale: {data.articles?.nombre}</p>
                    {data.articles?.autresArticles > 0 && (
                        <p className="text-sm text-blue-700">
                            Dont {data.articles.autresArticles} autre{data.articles.autresArticles > 1 ? 's' : ''} article{data.articles.autresArticles > 1 ? 's' : ''}
                            <span className="text-xs text-gray-500 ml-1">(ni les plus grands, ni les plus lourds)</span>
                        </p>
                    )}
                    {data.articles?.details && (
                        <p>Détails: {data.articles.details}</p>
                    )}
                    {data.articles?.photos && data.articles.photos.length > 0 && (
                        <p>Photos: {data.articles.photos.length}</p>
                    )}
                </div>

                {data.articles?.dimensions && data.articles.dimensions.length > 0 && (
                    <div className="mt-2">
                        <p className="font-medium">Dimensions:</p>
                        <ul className="list-disc pl-5 text-sm">
                            {data.articles.dimensions.map((article, index) => (
                                <li key={index}>
                                    {article.nom} (x{article.quantite}):
                                    {article.longueur && ` L:${article.longueur}cm`}
                                    {article.largeur && ` l:${article.largeur}cm`}
                                    {article.hauteur && ` H:${article.hauteur}cm`}
                                    {article.poids && ` P:${article.poids}kg`}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div>
                    <h4 className="font-medium">Livraison</h4>
                    <p>Date: {new Date(data.dates?.livraison || '').toLocaleDateString()}</p>
                    <p>Créneau: {data.livraison?.creneau}</p>
                    <p>Véhicule: {data.livraison?.vehicule}</p>
                    <p>Équipiers: {data.livraison?.equipiers}</p>
                    {data.livraison?.remarques && (
                        <p>Autres remarques: {data.livraison.remarques}</p>
                    )}
                </div>
            </div>

            {getDeliveryConditions()}
            
            <div className="mt-4 text-sm text-gray-500">
                Veuillez vérifier ces informations avant de confirmer la commande.
            </div>
            <div className="mt-6 p-4 py-4 bg-white flex justify-between">
                <FormInput
                    label="Nom du vendeur"
                    name="magasin.manager"
                    value={data.magasin?.manager || ''}
                    onChange={onChange}
                    error={showErrors ? errors.magasin?.manager : undefined}
                    required
                />
            </div>
        </div>
    )
};