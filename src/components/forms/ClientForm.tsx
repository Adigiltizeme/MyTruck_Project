import { CommandeMetier } from "../../types/business.types";
import { ValidationErrors } from "../../types/validation.types";
import { AddressSuggestion, ClientFormProps } from "../../types/form.types"; // Adjust the import path as necessary
import FormInput from "./FormInput";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// Zones forfait Paris (même logique que tarification.service.ts)
const VILLES_FORFAIT_PARIS = ['Ivry', 'Arcueil', 'Boulogne', 'Batignolles', 'Paris'];
const CODES_POSTAUX_PARIS = [
    '75001', '75002', '75003', '75004', '75005', '75006', '75007', '75008', '75009',
    '75010', '75011', '75012', '75013', '75014', '75015', '75016', '75017', '75018',
    '75019', '75020'
];

export const ClientForm: React.FC<ClientFormProps> = ({ data, errors, onChange, addressSuggestions, handleAddressSelect, handleAddressSearch, setAddressSuggestions, isEditing }) => {
    // Assurer que les données sont correctement initialisées
    const clientData: { adresse?: any } = data.client || {};
    const adresseData = clientData.adresse || {};

    const [editSuggestions, setEditSuggestions] = useState<AddressSuggestion[]>([]);
    const [showKmFeeAlert, setShowKmFeeAlert] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fonction pour vérifier si une adresse est hors zone forfait
    const checkKmFeeRequired = (address: string): boolean => {
        if (!address || address.trim() === '') return false;

        // Extraire code postal et ville de l'adresse
        const codePostalMatch = address.match(/\b\d{5}\b/);
        const codePostal = codePostalMatch ? codePostalMatch[0] : '';

        // Vérifier si c'est un code postal parisien
        if (CODES_POSTAUX_PARIS.includes(codePostal)) return false;

        // Vérifier si la ville est dans le forfait
        const addressLower = address.toLowerCase();
        const isInForfaitZone = VILLES_FORFAIT_PARIS.some(ville =>
            addressLower.includes(ville.toLowerCase())
        );

        // Si hors forfait, des frais km s'appliquent
        return !isInForfaitZone;
    };

    // Vérifier l'état de l'alerte au chargement et lors du changement d'étape
    useEffect(() => {
        const currentAddress = adresseData.ligne1 || '';
        if (currentAddress && currentAddress.length > 10) { // Adresse présente et suffisamment complète
            const requiresKmFee = checkKmFeeRequired(currentAddress);
            setShowKmFeeAlert(requiresKmFee);
        } else {
            setShowKmFeeAlert(false);
        }
    }, [data.client?.adresse?.ligne1]); // Réagir aux changements d'adresse

    // Cleanup du timeout au démontage
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

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

        // Vérifier les frais km pour l'adresse sélectionnée en mode édition
        const requiresKmFee = checkKmFeeRequired(suggestion.properties.label);
        setShowKmFeeAlert(requiresKmFee);
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

                                // Masquer l'alerte pendant la saisie en mode édition
                                setShowKmFeeAlert(false);

                                // Annuler le timeout précédent
                                if (typingTimeoutRef.current) {
                                    clearTimeout(typingTimeoutRef.current);
                                }

                                if (e.target.value.length > 3) {
                                    searchEditAddress(e.target.value);
                                } else {
                                    setEditSuggestions([]);
                                    // Si l'adresse est vide, masquer l'alerte
                                    if (e.target.value.length === 0) {
                                        setShowKmFeeAlert(false);
                                    }
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

                        {/* Alerte frais kilométriques pour mode édition */}
                        {showKmFeeAlert && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md"
                            >
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-orange-800">
                                            Adresse hors zone forfait
                                        </h3>
                                        <div className="mt-1 text-sm text-orange-700">
                                            Frais kilométriques appliqués selon la distance.
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
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

                                // Masquer l'alerte pendant la saisie
                                setShowKmFeeAlert(false);

                                // Annuler le timeout précédent
                                if (typingTimeoutRef.current) {
                                    clearTimeout(typingTimeoutRef.current);
                                }

                                if (e.target.value.length > 3) {
                                    handleAddressSearch(e.target.value);
                                } else {
                                    // Si l'adresse est courte ou vide
                                    if (e.target.value.length === 0) {
                                        setShowKmFeeAlert(false);
                                    }
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

                                            // Vérifier les frais km pour l'adresse sélectionnée
                                            const requiresKmFee = checkKmFeeRequired(suggestion.properties.label);
                                            setShowKmFeeAlert(requiresKmFee);
                                        }}
                                    >
                                        {suggestion.properties.label}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Alerte frais kilométriques */}
                        {showKmFeeAlert && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md"
                            >
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-orange-800">
                                            Adresse hors zone forfait
                                        </h3>
                                        <div className="mt-1 text-sm text-orange-700">
                                            Frais kilométriques appliqués selon la distance.
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
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