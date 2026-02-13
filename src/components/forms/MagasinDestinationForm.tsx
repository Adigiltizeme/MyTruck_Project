import { CommandeMetier, MagasinInfo } from "../../types/business.types";
import { ValidationErrors } from "../../types/validation.types";
import { AddressSuggestion } from "../../types/form.types";
import FormInput from "./FormInput";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useApi } from "../../services/api.service";
import { normalizeMagasin } from "../../utils/data-normalization";

// Type temporaire pour gérer les données backend
interface BackendMagasin {
    id: string;
    nom: string;
    adresse: string;
    telephone?: string;
    email?: string;
    manager?: string;
    status: string;
    categories?: string[];
}

interface MagasinDestinationFormProps {
    data: Partial<CommandeMetier>;
    errors: ValidationErrors;
    onChange: (e: { target: { name: string; value: any } }) => void;
    isEditing?: boolean;
    magasinOrigineId?: string; // Pour exclure le magasin d'origine de la liste
}

export const MagasinDestinationForm: React.FC<MagasinDestinationFormProps> = ({
    data,
    errors,
    onChange,
    isEditing,
    magasinOrigineId
}) => {
    const [magasins, setMagasins] = useState<MagasinInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMagasin, setSelectedMagasin] = useState<MagasinInfo | null>(null);

    // Mode de saisie : 'liste' (sélection magasin Truffaut) ou 'manuel' (saisie libre)
    const [inputMode, setInputMode] = useState<'liste' | 'manuel'>('liste');

    // État pour l'auto-complétion d'adresse en mode manuel
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);

    const apiService = useApi();

    // Données du magasin de destination
    const magasinDestData: Partial<MagasinInfo> = data.magasinDestination || {};

    // Fonction pour transformer les données backend en format MagasinInfo (même que MagasinManagement)
    const transformBackendMagasin = (backendData: BackendMagasin): MagasinInfo => {
        const normalized = normalizeMagasin({
            id: backendData.id,
            name: backendData.nom,
            address: backendData.adresse,
            phone: backendData.telephone ?? '',
            email: backendData.email,
            manager: backendData.manager,
            status: backendData.status || 'inactif',
            photo: ''
        });

        return normalized;
    };

    // Charger la liste des magasins (même méthode que MagasinManagement)
    useEffect(() => {
        const loadMagasins = async () => {
            try {
                setLoading(true);
                console.log('🏪 Chargement des magasins pour cession...');

                // Même structure que MagasinManagement - appel direct au service API
                const rawData = await apiService.get('/magasins') as { data: BackendMagasin[] };

                // Transformation des données backend → frontend
                const transformedMagasins = rawData.data.map(transformBackendMagasin);
                console.log('✅ Magasins transformés:', transformedMagasins.length, transformedMagasins);

                // Filtrer pour exclure le magasin d'origine
                let filteredMagasins = transformedMagasins;
                if (magasinOrigineId) {
                    console.log('🔍 Filtrage magasin origine:', magasinOrigineId);
                    filteredMagasins = transformedMagasins.filter(m => m.id !== magasinOrigineId);
                    console.log('✅ Magasins filtrés:', filteredMagasins.length);
                }

                setMagasins(filteredMagasins);
            } catch (error) {
                console.error('❌ Erreur chargement magasins:', error);
                // Fallback avec données vides pour éviter crashes
                setMagasins([]);
            } finally {
                setLoading(false);
            }
        };

        loadMagasins();
    }, [magasinOrigineId]);

    // Mettre à jour le magasin sélectionné si l'ID change
    useEffect(() => {
        if (magasinDestData.id && magasins.length > 0) {
            const magasin = magasins.find(m => m.id === magasinDestData.id);
            setSelectedMagasin(magasin || null);
        }
    }, [magasinDestData.id, magasins]);

    // Gérer la sélection d'un magasin depuis la liste
    const handleMagasinSelect = (magasinId: string) => {
        const magasin = magasins.find(m => m.id === magasinId);

        if (magasin) {
            setSelectedMagasin(magasin);

            // Mettre à jour toutes les informations du magasin de destination
            onChange({ target: { name: 'magasinDestination.id', value: magasin.id } });
            onChange({ target: { name: 'magasinDestination.name', value: magasin.name } });
            onChange({ target: { name: 'magasinDestination.address', value: magasin.address } });
            onChange({ target: { name: 'magasinDestination.phone', value: magasin.phone } });
            onChange({ target: { name: 'magasinDestination.email', value: magasin.email || '' } });
            onChange({ target: { name: 'magasinDestination.manager', value: magasin.manager || '' } });
            onChange({ target: { name: 'magasinDestination.status', value: magasin.status } });
        }
    };

    // Recherche d'adresse avec auto-complétion (même logique que ClientForm)
    const handleAddressSearch = async (query: string) => {
        if (!query || query.length < 3) {
            setAddressSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}`
            );
            const apiData = await response.json();

            if (apiData && apiData.features) {
                setAddressSuggestions(apiData.features);
            } else {
                setAddressSuggestions([]);
            }
        } catch (error) {
            console.error('Erreur recherche adresse:', error);
            setAddressSuggestions([]);
        }
    };

    // Sélection d'une adresse depuis les suggestions
    const handleAddressSelect = (suggestion: AddressSuggestion) => {
        onChange({
            target: {
                name: 'magasinDestination.address',
                value: suggestion.properties.label
            }
        });
        setAddressSuggestions([]);
    };

    // Basculer entre mode liste et mode manuel
    const toggleInputMode = (mode: 'liste' | 'manuel') => {
        setInputMode(mode);

        // Réinitialiser les champs selon le mode
        if (mode === 'manuel') {
            // Effacer l'ID pour signaler qu'il s'agit d'un magasin externe
            onChange({ target: { name: 'magasinDestination.id', value: '' } });
            onChange({ target: { name: 'magasinDestination.name', value: '' } });
            onChange({ target: { name: 'magasinDestination.address', value: '' } });
            onChange({ target: { name: 'magasinDestination.phone', value: '' } });
            onChange({ target: { name: 'magasinDestination.email', value: '' } });
            setSelectedMagasin(null);
        } else {
            // Réinitialiser les champs manuels
            onChange({ target: { name: 'magasinDestination.name', value: '' } });
            onChange({ target: { name: 'magasinDestination.address', value: '' } });
            onChange({ target: { name: 'magasinDestination.phone', value: '' } });
            onChange({ target: { name: 'magasinDestination.email', value: '' } });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Magasin de destination
                </h2>

                {/* Toggle mode de saisie */}
                {!isEditing && (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => toggleInputMode('liste')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                inputMode === 'liste'
                                    ? 'bg-white text-red-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            📋 Liste Truffaut
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleInputMode('manuel')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                inputMode === 'manuel'
                                    ? 'bg-white text-red-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            ✍️ Saisie manuelle
                        </button>
                    </div>
                )}
            </div>

            {/* Mode Liste : Sélection depuis la liste Truffaut */}
            {inputMode === 'liste' && (
                <div className="space-y-2">
                    <label htmlFor="magasinDestination.id" className="block text-sm font-medium text-gray-700">
                        Magasin Truffaut de destination <span className="text-red-500">*</span>
                    </label>

                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                    ) : (
                        <select
                            id="magasinDestination.id"
                            name="magasinDestination.id"
                            value={magasinDestData.id || ''}
                            onChange={(e) => handleMagasinSelect(e.target.value)}
                            disabled={isEditing}
                            className={`w-full px-4 py-2 border ${
                                errors.magasinDestination?.id ? 'border-red-500' : 'border-gray-300'
                            } rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                                isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                        >
                            <option value="">-- Sélectionner un magasin --</option>
                            {magasins.map(magasin => (
                                <option key={magasin.id} value={magasin.id}>
                                    {magasin.name} - {magasin.address}
                                </option>
                            ))}
                        </select>
                    )}

                    {errors.magasinDestination?.id && (
                        <p className="text-red-500 text-sm mt-1">{errors.magasinDestination?.id}</p>
                    )}
                </div>
            )}

            {/* Mode Manuel : Saisie libre avec auto-complétion */}
            {inputMode === 'manuel' && (
                <div className="space-y-4">

                    {/* Nom du magasin */}
                    <div className="space-y-2">
                        <label htmlFor="magasinDestination.name" className="block text-sm font-medium text-gray-700">
                            Nom du magasin <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="magasinDestination.name"
                            name="magasinDestination.name"
                            value={magasinDestData.name || ''}
                            onChange={(e) => onChange({ target: { name: 'magasinDestination.name', value: e.target.value } })}
                            placeholder="Ex: Truffaut Bry-sur-Marne, Jardiland Paris, etc."
                            className={`w-full px-4 py-2 border ${
                                errors.magasinDestination?.name ? 'border-red-500' : 'border-gray-300'
                            } rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500`}
                        />
                        {errors.magasinDestination?.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.magasinDestination?.name}</p>
                        )}
                    </div>

                    {/* Adresse avec auto-complétion */}
                    <div className="space-y-2 relative">
                        <label htmlFor="magasinDestination.address" className="block text-sm font-medium text-gray-700">
                            Adresse de livraison <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="magasinDestination.address"
                            name="magasinDestination.address"
                            value={magasinDestData.address || ''}
                            onChange={(e) => {
                                onChange({ target: { name: 'magasinDestination.address', value: e.target.value } });
                                if (e.target.value.length > 3) {
                                    handleAddressSearch(e.target.value);
                                } else {
                                    setAddressSuggestions([]);
                                }
                            }}
                            placeholder="Commencez à saisir l'adresse..."
                            className={`w-full px-4 py-2 border ${
                                errors.magasinDestination?.address ? 'border-red-500' : 'border-gray-300'
                            } rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500`}
                        />
                        {errors.magasinDestination?.address && (
                            <p className="text-red-500 text-sm mt-1">{errors.magasinDestination?.address}</p>
                        )}

                        {/* Suggestions d'adresse */}
                        {addressSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 bg-white shadow-lg rounded-md z-50 border border-gray-300 max-h-60 overflow-y-auto">
                                {addressSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => handleAddressSelect(suggestion)}
                                    >
                                        {suggestion.properties.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Téléphone */}
                    <div className="space-y-2">
                        <label htmlFor="magasinDestination.phone" className="block text-sm font-medium text-gray-700">
                            Téléphone <span className="text-gray-500">(optionnel)</span>
                        </label>
                        <input
                            type="tel"
                            id="magasinDestination.phone"
                            name="magasinDestination.phone"
                            value={magasinDestData.phone || ''}
                            onChange={(e) => onChange({ target: { name: 'magasinDestination.phone', value: e.target.value } })}
                            placeholder="Ex: 01 23 45 67 89"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="magasinDestination.email" className="block text-sm font-medium text-gray-700">
                            Email <span className="text-gray-500">(optionnel)</span>
                        </label>
                        <input
                            type="email"
                            id="magasinDestination.email"
                            name="magasinDestination.email"
                            value={magasinDestData.email || ''}
                            onChange={(e) => onChange({ target: { name: 'magasinDestination.email', value: e.target.value } })}
                            placeholder="Ex: contact@magasin.fr"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                </div>
            )}

            {/* Informations du magasin sélectionné */}
            {selectedMagasin && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3"
                >
                    <h3 className="font-semibold text-blue-900">Informations du magasin</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Nom</p>
                            <p className="font-medium text-gray-900">{selectedMagasin.name}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">Téléphone</p>
                            <p className="font-medium text-gray-900">{selectedMagasin.phone || 'Non renseigné'}</p>
                        </div>

                        <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">Adresse de livraison</p>
                            <p className="font-medium text-gray-900">{selectedMagasin.address}</p>
                        </div>

                        {selectedMagasin.manager && (
                            <div>
                                <p className="text-sm text-gray-600">Responsable</p>
                                <p className="font-medium text-gray-900">{selectedMagasin.manager}</p>
                            </div>
                        )}

                        {selectedMagasin.email && (
                            <div>
                                <p className="text-sm text-gray-600">Email</p>
                                <p className="font-medium text-gray-900">{selectedMagasin.email}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}


            {/* Commentaires optionnels */}
            <div className="space-y-2">
                <label htmlFor="cession.commentaires" className="block text-sm font-medium text-gray-700">
                    Remarques sur la cession
                </label>
                <textarea
                    id="cession.commentaires"
                    name="cession.commentaires"
                    value={data.cession?.commentaires || ''}
                    onChange={(e) => onChange({ target: { name: 'cession.commentaires', value: e.target.value } })}
                    rows={3}
                    placeholder="Précisions, informations complémentaires sur la cession..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
            </div>
        </motion.div>
    );
};
