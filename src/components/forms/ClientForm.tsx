import { CommandeMetier } from "../../types/business.types";
import { ValidationErrors } from "../../types/validation.types";
import { AddressSuggestion, ClientFormProps } from "../../types/form.types"; // Adjust the import path as necessary
import FormInput from "./FormInput";
import { motion } from "framer-motion";


export const ClientForm: React.FC<ClientFormProps> = ({ data, errors, onChange, addressSuggestions, handleAddressSelect, handleAddressSearch, isEditing = false }) => {

    return (
        <div className="space-y-4 mb-6">
            <div className='grid grid-cols-2 gap-4'>
                <FormInput
                    label="Numéro de commande"
                    subLabel="Si aucun, un sera généré automatiquement"
                    name="numeroCommande"
                    value={data.numeroCommande || ''}
                    onChange={onChange}
                    isEditing={isEditing}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormInput
                    label="Nom"
                    name="client.nom"
                    value={data.client?.nom || ''}
                    onChange={onChange}
                    error={errors.client?.nom}
                    required
                />
                <FormInput
                    label="Prénom"
                    name="client.prenom"
                    value={data.client?.prenom || ''}
                    onChange={onChange}
                    error={errors.client?.prenom}
                />
                <FormInput
                    label="Téléphone principal"
                    name="client.telephone.principal"
                    value={data.client?.telephone?.principal || ''}
                    onChange={onChange}
                    error={errors.client?.telephone?.principal}
                    required
                    type="tel"
                />
                <FormInput
                    label="Téléphone secondaire"
                    name="client.telephone.secondaire"
                    value={data.client?.telephone?.secondaire || ''}
                    onChange={onChange}
                    type="tel"
                />
            </div>
            <div className="space-y-4">
                <FormInput
                    label="Adresse de livraison"
                    name="client.adresse.ligne1"
                    value={data.client?.adresse?.ligne1 || ''}
                    onChange={onChange}
                    onSearch={handleAddressSearch}
                    onSearchSelect={handleAddressSelect}
                    suggestions={addressSuggestions}
                    error={errors.client?.adresse?.ligne1}
                    required
                />
                {addressSuggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute z-10 w-full bg-white shadow-lg rounded-md mt-1"
                    >
                    </motion.div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Type d'adresse</label>
                        <select
                            name="client.adresse.type"
                            value={data.client?.adresse?.type || 'Domicile'}
                            onChange={onChange}
                            className="mt-1 block w-full rounded-md border border-gray-300"
                        >
                            <option value="Domicile">Domicile</option>
                            <option value="Professionnelle">Professionnelle</option>
                        </select>
                    </div>
                    <FormInput
                        label="Bâtiment"
                        name="client.adresse.batiment"
                        value={data.client?.adresse?.batiment || ''}
                        onChange={onChange}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label="Interphone/Code"
                        subLabel="Si aucun, le mentionner"
                        name="client.adresse.interphone"
                        value={data.client?.adresse?.interphone || ''}
                        onChange={onChange}
                        error={errors.client?.adresse?.interphone}
                        required
                    />
                    <FormInput
                        label="Étage"
                        name="client.adresse.etage"
                        value={data.client?.adresse?.etage || ''}
                        onChange={onChange}
                        error={errors.client?.adresse?.etage}
                        required
                    />
                    <div>
                        <label className='mt-1 block text-sm font-bold text-gray-700'>Ascenseur <span className="text-red-500">*</span></label>
                        <select
                            className='border border-gray-300 rounded-md'
                            name="client.adresse.ascenseur"
                            value={data.client?.adresse?.ascenseur ? 'Oui' : 'Non'}
                            onChange={(e) => {
                                const customEvent = {
                                    target: {
                                        name: 'client.adresse.ascenseur',
                                        value: (e.target.value === 'Oui')
                                    }
                                } as unknown as React.ChangeEvent<HTMLInputElement>;
                                onChange(customEvent);
                            }}
                    
                        >
                            <option value="Non">Non</option>
                            <option value="Oui">Oui</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};