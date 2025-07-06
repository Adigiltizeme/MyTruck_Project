import React, { useState, useEffect } from 'react';
import { CessionFormData } from '../types/cession.types';
// import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Minus, Upload, AlertCircle } from 'lucide-react';
import { Store } from '../services/store.service';
import { motion, AnimatePresence } from 'framer-motion';

interface CessionFormProps {
    onSubmit: (data: CessionFormData) => Promise<void>;
    onCancel: () => void;
    stores?: Store[];
}

const CessionForm: React.FC<CessionFormProps> = ({ onSubmit, onCancel, stores = [] }) => {
    const { user } = useAuth();
    // const { dataService } = useOffline();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [availableStores, setAvailableStores] = useState<Store[]>(stores);

    // État du formulaire
    const [formData, setFormData] = useState<CessionFormData>({
        magasin_origine_id: user?.storeId || '',
        magasin_destination_id: '',
        date_livraison_souhaitee: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Demain par défaut
        articles: [{ nom: '', reference: '', type: 'Autre', quantite: 1, description: '', photo: null }],
        adresse_livraison: '', // Add default value for adresse_livraison
        motif: '',
        priorite: 'Normale',
        commentaires: ''
    });

    // État de validation
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [step, setStep] = useState(1);

    // Charger les magasins si non fournis
    // useEffect(() => {
    //     const loadStores = async () => {
    //         try {
    //             const storeService = await dataService.getMagasins();
    //             setAvailableStores(storeService);
    //         } catch (error) {
    //             console.error('Erreur lors du chargement des magasins:', error);
    //             setError('Impossible de charger la liste des magasins');
    //         }
    //     };

    //     if (stores.length === 0) {
    //         loadStores();
    //     }
    // }, [dataService, stores]);

    // Mise à jour du magasin d'origine basé sur l'utilisateur connecté
    useEffect(() => {
        if (user?.role === 'magasin' && user?.storeId) {
            setFormData(prev => ({
                ...prev,
                magasin_origine_id: user.storeId || ''
            }));
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleArticleChange = (index: number, field: string, value: any) => {
        const updatedArticles = [...formData.articles];
        updatedArticles[index] = {
            ...updatedArticles[index],
            [field]: value
        };

        setFormData(prev => ({
            ...prev,
            articles: updatedArticles
        }));
    };

    const handleFileChange = (index: number, file: File | null) => {
        const updatedArticles = [...formData.articles];
        updatedArticles[index] = {
            ...updatedArticles[index],
            photo: file
        };

        setFormData(prev => ({
            ...prev,
            articles: updatedArticles
        }));
    };

    const addArticle = () => {
        setFormData(prev => ({
            ...prev,
            articles: [
                ...prev.articles,
                { nom: '', reference: '', type: 'Autre', quantite: 1, description: '', photo: null }
            ]
        }));
    };

    const removeArticle = (index: number) => {
        if (formData.articles.length <= 1) return;

        const updatedArticles = [...formData.articles];
        updatedArticles.splice(index, 1);

        setFormData(prev => ({
            ...prev,
            articles: updatedArticles
        }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validation de base
        if (!formData.magasin_origine_id) {
            newErrors.magasin_origine_id = 'Le magasin d\'origine est requis';
        }

        if (!formData.magasin_destination_id) {
            newErrors.magasin_destination_id = 'Le magasin de destination est requis';
        }

        if (formData.magasin_origine_id === formData.magasin_destination_id) {
            newErrors.magasin_destination_id = 'Le magasin de destination doit être différent du magasin d\'origine';
        }

        if (!formData.date_livraison_souhaitee) {
            newErrors.date_livraison_souhaitee = 'La date de livraison souhaitée est requise';
        }

        // Validation des articles
        formData.articles.forEach((article, index) => {
            if (!article.nom) {
                newErrors[`articles[${index}].nom`] = 'Le nom de l\'article est requis';
            }

            if (!article.reference) {
                newErrors[`articles[${index}].reference`] = 'La référence de l\'article est requise';
            }

            if (article.quantite <= 0) {
                newErrors[`articles[${index}].quantite`] = 'La quantité doit être supérieure à 0';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation du formulaire
        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Soumettre le formulaire
            await onSubmit(formData);

            // Réinitialiser le formulaire en cas de succès
            setSuccess(true);
            setTimeout(() => {
                onCancel();
            }, 2000);
        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire:', error);
            setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de la création de la cession');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        // Validation de l'étape actuelle
        let isValid = true;
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            // Validation de l'étape 1 (Informations générales)
            if (!formData.magasin_origine_id) {
                newErrors.magasin_origine_id = 'Le magasin d\'origine est requis';
                isValid = false;
            }

            if (!formData.magasin_destination_id) {
                newErrors.magasin_destination_id = 'Le magasin de destination est requis';
                isValid = false;
            }

            if (formData.magasin_origine_id === formData.magasin_destination_id) {
                newErrors.magasin_destination_id = 'Le magasin de destination doit être différent du magasin d\'origine';
                isValid = false;
            }

            if (!formData.date_livraison_souhaitee) {
                newErrors.date_livraison_souhaitee = 'La date de livraison souhaitée est requise';
                isValid = false;
            }
        }

        setErrors(newErrors);

        if (isValid) {
            setStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
    };

    const renderStepOne = () => (
        <div className="space-y-4">
            <h3 className="font-medium text-lg">Informations générales</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Magasin d'origine */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Magasin d'origine <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="magasin_origine_id"
                        value={formData.magasin_origine_id}
                        onChange={handleInputChange}
                        className={`w-full border ${errors.magasin_origine_id ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2`}
                        disabled={user?.role === 'magasin'} // Désactivé si l'utilisateur est un magasin (utiliser son propre magasin)
                    >
                        <option value="">Sélectionner un magasin</option>
                        {availableStores.map(store => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                    {errors.magasin_origine_id && (
                        <p className="mt-1 text-sm text-red-500">{errors.magasin_origine_id}</p>
                    )}
                </div>

                {/* Magasin de destination */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Magasin de destination <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="magasin_destination_id"
                        value={formData.magasin_destination_id}
                        onChange={handleInputChange}
                        className={`w-full border ${errors.magasin_destination_id ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2`}
                    >
                        <option value="">Sélectionner un magasin</option>
                        {availableStores
                            .filter(store => store.id !== formData.magasin_origine_id) // Exclure le magasin d'origine
                            .map(store => (
                                <option key={store.id} value={store.id}>
                                    {store.name}
                                </option>
                            ))
                        }
                    </select>
                    {errors.magasin_destination_id && (
                        <p className="mt-1 text-sm text-red-500">{errors.magasin_destination_id}</p>
                    )}
                </div>

                {/* Date de livraison souhaitée */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de livraison souhaitée <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        name="date_livraison_souhaitee"
                        value={formData.date_livraison_souhaitee}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]} // Date minimum = aujourd'hui
                        className={`w-full border ${errors.date_livraison_souhaitee ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2`}
                    />
                    {errors.date_livraison_souhaitee && (
                        <p className="mt-1 text-sm text-red-500">{errors.date_livraison_souhaitee}</p>
                    )}
                </div>

                {/* Priorité */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priorité
                    </label>
                    <select
                        name="priorite"
                        value={formData.priorite}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                        <option value="Normale">Normale</option>
                        <option value="Urgente">Urgente</option>
                        <option value="Planifiée">Planifiée</option>
                    </select>
                </div>
            </div>

            {/* Motif */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motif de la cession
                </label>
                <select
                    name="motif"
                    value={formData.motif}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                    <option value="">Sélectionner un motif</option>
                    <option value="Rupture de stock">Rupture de stock</option>
                    <option value="Rééquilibrage">Rééquilibrage entre magasins</option>
                    <option value="Produit spécifique">Produit spécifique commandé</option>
                    <option value="Autre">Autre</option>
                </select>
            </div>

            {/* Commentaires */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commentaires supplémentaires
                </label>
                <textarea
                    name="commentaires"
                    value={formData.commentaires}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Précisions, informations complémentaires..."
                />
            </div>
        </div>
    );

    const renderStepTwo = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-medium text-lg">Articles à transférer</h3>
                <button
                    type="button"
                    onClick={addArticle}
                    className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un article
                </button>
            </div>

            {formData.articles.map((article, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 relative">
                    {formData.articles.length > 1 && (
                        <button
                            type="button"
                            onClick={() => removeArticle(index)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Nom de l'article */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nom de l'article <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={article.nom}
                                onChange={(e) => handleArticleChange(index, 'nom', e.target.value)}
                                className={`w-full border ${errors[`articles[${index}].nom`] ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2`}
                                placeholder="Ex: Palmier Kentia"
                            />
                            {errors[`articles[${index}].nom`] && (
                                <p className="mt-1 text-sm text-red-500">{errors[`articles[${index}].nom`]}</p>
                            )}
                        </div>

                        {/* Référence */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Référence <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={article.reference}
                                onChange={(e) => handleArticleChange(index, 'reference', e.target.value)}
                                className={`w-full border ${errors[`articles[${index}].reference`] ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2`}
                                placeholder="Ex: PAL-KEN-001"
                            />
                            {errors[`articles[${index}].reference`] && (
                                <p className="mt-1 text-sm text-red-500">{errors[`articles[${index}].reference`]}</p>
                            )}
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type d'article
                            </label>
                            <select
                                value={article.type}
                                onChange={(e) => handleArticleChange(index, 'type', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="Plantes">Plantes</option>
                                <option value="Arbres">Arbres</option>
                                <option value="Meubles">Meubles</option>
                                <option value="Matériaux">Matériaux</option>
                                <option value="Autre">Autre</option>
                            </select>
                        </div>

                        {/* Quantité */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantité <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={article.quantite}
                                onChange={(e) => handleArticleChange(index, 'quantite', parseInt(e.target.value) || 0)}
                                className={`w-full border ${errors[`articles[${index}].quantite`] ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2`}
                            />
                            {errors[`articles[${index}].quantite`] && (
                                <p className="mt-1 text-sm text-red-500">{errors[`articles[${index}].quantite`]}</p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={article.description || ''}
                            onChange={(e) => handleArticleChange(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="Caractéristiques, dimensions, particularités..."
                        />
                    </div>

                    {/* Photo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Photo (optionnelle)
                        </label>
                        <div className="flex items-center space-x-4">
                            <label className="cursor-pointer flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                                <Upload className="w-5 h-5 text-gray-500" />
                                <span>Sélectionner une image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        handleFileChange(index, file);
                                    }}
                                />
                            </label>

                            {article.photo && (
                                <div className="relative">
                                    <img
                                        src={article.photo instanceof File ? URL.createObjectURL(article.photo) : article.photo}
                                        alt={article.nom}
                                        className="w-20 h-20 object-cover rounded"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleFileChange(index, null)}
                                        className="absolute -top-2 -right-2 bg-white rounded-full text-red-500 hover:text-red-700"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-white rounded-lg p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-6">Nouvelle cession inter-magasins</h2>

            {/* Messages d'erreur ou de succès */}
            {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    Cession créée avec succès ! Redirection...
                </div>
            )}

            {/* Étapes du formulaire */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div
                        className={`flex-1 border-t-4 ${step >= 1 ? 'border-red-600' : 'border-gray-200'}`}
                    >
                        <div className="text-center mt-2">Informations</div>
                    </div>
                    <div
                        className={`flex-1 border-t-4 ${step >= 2 ? 'border-red-600' : 'border-gray-200'}`}
                    >
                        <div className="text-center mt-2">Articles</div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {step === 1 ? renderStepOne() : renderStepTwo()}
                    </motion.div>
                </AnimatePresence>

                <div className="mt-8 flex justify-between">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="px-4 py-2 border border-gray-300 rounded-md"
                            disabled={loading}
                        >
                            Précédent
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md"
                            disabled={loading}
                        >
                            Annuler
                        </button>
                    )}

                    {step < 2 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="px-4 py-2 bg-red-600 text-white rounded-md"
                            disabled={loading}
                        >
                            Suivant
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    Traitement...
                                </>
                            ) : (
                                'Créer la cession'
                            )}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CessionForm;