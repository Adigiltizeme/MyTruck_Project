import { CommandeMetier, MagasinInfo } from "../../types/business.types";
import { ValidationErrors } from "../../types/validation.types";
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

    // Gérer la sélection d'un magasin
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Magasin de destination
            </h2>

            {/* Sélection du magasin */}
            <div className="space-y-2">
                <label htmlFor="magasinDestination.id" className="block text-sm font-medium text-gray-700">
                    Magasin de destination <span className="text-red-500">*</span>
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
