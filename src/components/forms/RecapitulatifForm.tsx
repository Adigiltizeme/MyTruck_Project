import { CommandeMetier } from "../../types/business.types";
import { RecapitulatifFormProps } from "../../types/form.types";
import FormInput from "./FormInput";

export const RecapitulatifForm: React.FC<RecapitulatifFormProps> = ({ data, errors, onChange, showErrors = false }) => {
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
                </div>

                <div>
                    <h4 className="font-medium">Articles</h4>
                    <p>Quantité: {data.articles?.nombre}</p>
                    <p>{data.articles?.details}</p>
                    {data.articles?.photos && data.articles.photos.length > 0 && (
                        <p>Photos: {data.articles.photos.length}</p>
                    )}
                </div>

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

            <div className="mt-4 text-sm text-gray-500">
                Veuillez vérifier ces informations avant de confirmer la commande.
            </div>
            <div className="mt-6 p-4 py-4 bg-white flex justify-between">
                <FormInput
                    label="Manager magasin"
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