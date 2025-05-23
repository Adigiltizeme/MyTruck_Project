import { CommandeMetier } from "../../types/business.types";
import { ValidationErrors } from "../../types/validation.types";
import { AddressSuggestion, ClientFormProps } from "../../types/form.types"; // Adjust the import path as necessary
import FormInput from "./FormInput";
import { motion } from "framer-motion";
import { useState } from "react";


export const ClientForm: React.FC<ClientFormProps> = ({ data, errors, onChange, addressSuggestions, handleAddressSelect, handleAddressSearch, setAddressSuggestions, isEditing }) => {
    console.log('ClientForm data:', data); // Pour debug
    console.log('onChange:', onChange); // Pour debug
    // Assurer que les données sont correctement initialisées
    const clientData: { adresse?: any } = data.client || {};
    const adresseData = clientData.adresse || {};

    const [editSuggestions, setEditSuggestions] = useState<AddressSuggestion[]>([]);

    // Fonction de recherche d'adresse pour le mode édition
    const searchEditAddress = async (query: string) => {
        if (!query || query.length < 3) {
            setEditSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}`
            );
            const data = await response.json();

            if (data && data.features) {
                setEditSuggestions(data.features);
            } else {
                setEditSuggestions([]);
            }
        } catch (error) {
            console.error('Erreur recherche adresse (édition):', error);
            setEditSuggestions([]);
        }
    };

    // Fonction de sélection d'adresse pour le mode édition
    const selectEditAddress = (suggestion: AddressSuggestion) => {
        onChange({
            target: {
                name: 'client.adresse.ligne1',
                value: suggestion.properties.label
            }
        });
        setEditSuggestions([]);
    };

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
            <div className="space-y-4 relative">
                {isEditing ? (
                    // Champ d'adresse en mode édition
                    <div className="relative">
                        <label className="block text-sm font-bold text-gray-700">
                            Adresse de livraison <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={adresseData.ligne1 || ''}
                            onChange={(e) => {
                                onChange({
                                    target: {
                                        name: 'client.adresse.ligne1',
                                        value: e.target.value
                                    }
                                });
                                if (e.target.value.length > 3) {
                                    searchEditAddress(e.target.value);
                                } else {
                                    setEditSuggestions([]);
                                }
                            }}
                            className={`mt-1 block w-full rounded-md border ${errors.client?.adresse?.ligne1 ? 'border-red-500' : 'border-gray-300'
                                }`}
                            required
                        />
                        {errors.client?.adresse?.ligne1 && (
                            <p className="text-red-500 text-sm">{errors.client?.adresse?.ligne1}</p>
                        )}

                        {/* Suggestions pour le mode édition */}
                        {editSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 mt-0 bg-white shadow-lg rounded-md z-50 border border-gray-300">
                                {editSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => selectEditAddress(suggestion)}
                                    >
                                        {suggestion.properties.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Champ d'adresse en mode ajout (approche originale)
                    <>
                        <FormInput
                            label="Adresse de livraison"
                            name="client.adresse.ligne1"
                            value={adresseData.ligne1 || ''}
                            onChange={(e) => {
                                onChange(e);
                                console.log('onChange adresse:', e.target.value); // Debug
                                if (e.target.value.length > 3) {
                                    console.log('Appel handleAddressSearch'); // Debug
                                    handleAddressSearch(e.target.value);
                                }
                            }}
                            onSearch={handleAddressSearch}
                            onSearchSelect={handleAddressSelect}
                            error={errors.client?.adresse?.ligne1}
                            required
                            disabled={false}
                        />
                        {/* Suggestions avec positionnement amélioré */}
                        {addressSuggestions.length > 0 && (
                            <div
                                className="absolute left-0 right-0 mt-0 bg-white shadow-lg rounded-md z-50 border border-gray-300"
                                style={{ top: "100px" }} // Position fixe sous le champ d'adresse
                            >
                                {addressSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => {
                                            handleAddressSelect(suggestion);
                                            setAddressSuggestions([]); // Vider les suggestions après sélection
                                        }}
                                    >
                                        {suggestion.properties.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
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
                        value={adresseData.interphone || ''}
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