import { LivraisonFormProps } from "../../types/form.types";
import { CRENEAUX_LIVRAISON, VEHICULES } from "../constants/options";
import FormInput from "./FormInput";

export const LivraisonForm: React.FC<LivraisonFormProps> = ({ data, errors, onChange, showErrors = false }) => {
    return (
        <div className="space-y-4 mb-6">
            <h3 className="text-lg font-medium">Informations de livraison</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                        Date de livraison <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        name="dates.livraison"
                        value={data.dates?.livraison?.split('T')[0] || ''}
                        onChange={onChange}
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
                        {CRENEAUX_LIVRAISON.map(creneau => (
                            <option key={creneau} value={creneau}>{creneau}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                        Type de véhicule <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="livraison.vehicule"
                        value={data.livraison?.vehicule || ''}
                        onChange={onChange}
                        className="mt-1 block w-full rounded-md border border-gray-300"
                        required
                    >
                        <option value="">Sélectionner un véhicule</option>
                        {Object.entries(VEHICULES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                </div>
                <FormInput
                    label="Option équipier de manutention"
                    name="livraison.equipiers"
                    type="number"
                    min={0}
                    max={3}
                    value={String(data.livraison?.equipiers || 0)}
                    onChange={onChange}
                    error={errors.livraison?.equipiers}
                />
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                        Autres remarques
                    </label>
                    <p className="text-sm text-gray-500">Précisions nécessaires au bon fonctionnement de la livraison</p>
                    <textarea
                        name="livraison.remarques"
                        value={data.livraison?.remarques || ''}
                        onChange={(e) => onChange(e as any)}
                        className={`mt-1 block w-full rounded-md border 'border-gray-300'
                        }`}
                        rows={4}
                    />
                </div>
            </div>
            <div className="mt-6 py-4 bg-white flex justify-between">
                <p className="text-red-500 font-bold text-center px-4">
                    TOUTE ABSENCE LORS DE LA LIVRAISON VOUS ENGAGE A REGLER LE RETOUR AINSI QUE LA NOUVELLE LIVRAISON
                </p>
            </div>
            <div className="mt-6 py-4 bg-white flex justify-between">
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
    );
};