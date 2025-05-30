import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, Info, AlertTriangle } from 'lucide-react';

export interface ArticleDimension {
    id: string;
    nom: string;
    longueur?: number;
    largeur?: number;
    hauteur?: number;
    poids?: number;
    quantite: number;
}

interface ArticleDimensionsFormProps {
    initialArticles?: ArticleDimension[];
    onChange: (articles: ArticleDimension[]) => void;
    readOnly?: boolean;
}

const ArticleDimensionsForm: React.FC<ArticleDimensionsFormProps> = ({
    initialArticles = [],
    onChange,
    readOnly = false
}) => {
    const [articles, setArticles] = useState<ArticleDimension[]>([]);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

    // Utiliser une référence pour suivre si les dimensions initiales ont déjà été chargées
    const initializedRef = useRef(false);
    const lastNotifiedArticlesRef = useRef<ArticleDimension[]>([]);

    // Initialisation des articles - une seule fois ou quand les props changent significativement
    useEffect(() => {
        if (initialArticles.length > 0) {
            // Comparer avec la précédente valeur pour éviter les mises à jour inutiles
            const currentString = JSON.stringify(initialArticles);
            const previousString = JSON.stringify(articles);

            if (currentString !== previousString) {
                console.log("Initialisation des dimensions avec props:", initialArticles);
                setArticles([...initialArticles]);
                initializedRef.current = true;
            }
        } else if (!initializedRef.current) {
            // Créer un article par défaut seulement si aucune donnée initiale et pas encore initialisé
            console.log("Création d'un article par défaut");
            setArticles([{
                id: `art-${Date.now()}`,
                nom: '',
                longueur: undefined,
                largeur: undefined,
                hauteur: undefined,
                poids: undefined,
                quantite: 1
            }]);
            initializedRef.current = true;
        }
    }, [initialArticles]);

    // Validation des erreurs (uniquement quand les articles changent)
    useEffect(() => {
        if (!initializedRef.current) return;

        const errors: Record<string, string[]> = {};

        articles.forEach((article) => {
            const articleErrors: string[] = [];

            if (!article.nom.trim()) {
                articleErrors.push('Le nom de l\'article est requis');
            }

            if (article.longueur !== undefined && article.longueur <= 0) {
                articleErrors.push('La longueur doit être supérieure à 0');
            }

            if (article.largeur !== undefined && article.largeur <= 0) {
                articleErrors.push('La largeur doit être supérieure à 0');
            }

            if (article.hauteur !== undefined && article.hauteur <= 0) {
                articleErrors.push('La hauteur doit être supérieure à 0');
            }

            if (article.poids !== undefined && article.poids <= 0) {
                articleErrors.push('Le poids doit être supérieur à 0');
            }

            if (article.quantite <= 0) {
                articleErrors.push('La quantité doit être supérieure à 0');
            }

            if (articleErrors.length > 0) {
                errors[article.id] = articleErrors;
            }
        });

        setValidationErrors(errors);
    }, [articles]);

    // Notification du parent - seulement quand nécessaire
    useEffect(() => {
        if (!initializedRef.current) return;

        // Comparer avec la dernière valeur notifiée
        const currentString = JSON.stringify(articles);
        const lastNotifiedString = JSON.stringify(lastNotifiedArticlesRef.current);

        if (currentString !== lastNotifiedString) {
            console.log("📦 [DIMENSIONS] Notification du parent pour changement de dimensions");
            lastNotifiedArticlesRef.current = [...articles];

            // CORRECTION CRITIQUE: Utiliser un timeout pour éviter les appels synchrones
            // et s'assurer que l'appel se fait APRÈS le rendu complet
            const timer = setTimeout(() => {
                // IMPORTANT: onChange ici ne doit affecter QUE les dimensions
                // Il ne doit PAS déclencher handleVehicleSelect
                onChange(articles);
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [articles, onChange]);

    // Le reste des fonctions reste identique...
    const addArticle = useCallback(() => {
        if (readOnly) return;

        const newArticle: ArticleDimension = {
            id: `art-${Date.now()}`,
            nom: '',
            longueur: undefined,
            largeur: undefined,
            hauteur: undefined,
            poids: undefined,
            quantite: 1
        };

        setArticles(prevArticles => [...prevArticles, newArticle]);
    }, [readOnly]);

    const removeArticle = useCallback((id: string) => {
        if (readOnly) return;

        if (articles.length <= 1) {
            setArticles([{
                id: `art-${Date.now()}`,
                nom: '',
                longueur: undefined,
                largeur: undefined,
                hauteur: undefined,
                poids: undefined,
                quantite: 1
            }]);
        } else {
            setArticles(prevArticles => prevArticles.filter(article => article.id !== id));
        }
    }, [readOnly, articles.length]);

    const handleChange = useCallback((id: string, field: keyof ArticleDimension, value: any) => {
        if (readOnly) return;

        setArticles(prevArticles => prevArticles.map(article => {
            if (article.id === id) {
                return {
                    ...article,
                    [field]: field === 'nom' ? value : value === '' ? undefined : Number(value)
                };
            }
            return article;
        }));
    }, [readOnly]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Dimensions des articles</h3>

                <div className="flex space-x-2">
                    <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Aide sur les dimensions"
                    >
                        <Info className="w-5 h-5" />
                    </button>

                    {!readOnly && (
                        <button
                            type="button"
                            onClick={addArticle}
                            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Ajouter un article
                        </button>
                    )}
                </div>
            </div>

            {/* Avertissement si des dimensions manquent */}
            {articles.some(
                article => !article.longueur && !article.largeur && !article.hauteur && !article.poids
            ) && (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 flex items-start">
                        <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium">Données incomplètes</p>
                            <p className="text-sm">
                                Les dimensions des articles sont importantes pour déterminer le véhicule adapté.
                                Sans ces informations, nous ne pourrons pas garantir que les articles rentreront dans le véhicule sélectionné.
                            </p>
                        </div>
                    </div>
                )}

            {/* Liste des articles */}
            <div className="space-y-4">
                {articles.map((article, index) => (
                    <div
                        key={article.id}
                        className={`border rounded-lg p-4 ${validationErrors[article.id] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium">Article {index + 1}</h4>

                            {!readOnly && articles.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeArticle(article.id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Supprimer cet article"
                                >
                                    <Minus className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Erreurs de validation */}
                        {validationErrors[article.id] && (
                            <div className="mb-3 text-red-600 text-sm">
                                <ul className="list-disc pl-5">
                                    {validationErrors[article.id].map((error, idx) => (
                                        <li key={idx}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Nom de l'article */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nom de l'article <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={article.nom}
                                    onChange={(e) => handleChange(article.id, 'nom', e.target.value)}
                                    className={`w-full border ${!article.nom ? 'border-red-300' : 'border-gray-300'} rounded-md px-3 py-2`}
                                    placeholder="Ex: Palmier Kentia"
                                    disabled={readOnly}
                                    required
                                />
                            </div>

                            {/* Dimensions */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Longueur (cm)
                                </label>
                                <input
                                    type="number"
                                    value={article.longueur === undefined ? '' : article.longueur}
                                    onChange={(e) => handleChange(article.id, 'longueur', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Ex: 150"
                                    min="0"
                                    step="1"
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Largeur (cm)
                                </label>
                                <input
                                    type="number"
                                    value={article.largeur === undefined ? '' : article.largeur}
                                    onChange={(e) => handleChange(article.id, 'largeur', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Ex: 60"
                                    min="0"
                                    step="1"
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Hauteur (cm)
                                </label>
                                <input
                                    type="number"
                                    value={article.hauteur === undefined ? '' : article.hauteur}
                                    onChange={(e) => handleChange(article.id, 'hauteur', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Ex: 180"
                                    min="0"
                                    step="1"
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Poids (kg)
                                </label>
                                <input
                                    type="number"
                                    value={article.poids === undefined ? '' : article.poids}
                                    onChange={(e) => handleChange(article.id, 'poids', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Ex: 15"
                                    min="0"
                                    step="0.1"
                                    disabled={readOnly}
                                />
                            </div>

                            {/* Quantité */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantité <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={article.quantite}
                                    onChange={(e) => handleChange(article.id, 'quantite', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    min="1"
                                    step="1"
                                    disabled={readOnly}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bouton d'ajout en bas */}
            {!readOnly && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={addArticle}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 flex items-center"
                    >
                        <Plus className="w-5 h-5 mr-1" />
                        Ajouter un autre article
                    </button>
                </div>
            )}

            {/* Modal d'aide */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Comment mesurer vos articles</h3>

                        <div className="space-y-4">
                            <p>
                                Pour choisir le véhicule adapté à votre livraison, nous avons besoin de connaître les dimensions précises de vos articles.
                                Voici comment les mesurer correctement :
                            </p>

                            <div className="mb-4">
                                <h4 className="font-medium">Longueur, largeur et hauteur</h4>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li><strong>Longueur</strong> : La dimension la plus grande de l'article.</li>
                                    <li><strong>Largeur</strong> : La deuxième dimension la plus grande, perpendiculaire à la longueur.</li>
                                    <li><strong>Hauteur</strong> : La dimension mesurée de la base au sommet de l'article.</li>
                                </ul>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium">Poids</h4>
                                <p className="mt-2">
                                    Indiquez le poids en kilogrammes. Pour les articles dont vous ne connaissez pas le poids exact,
                                    essayez de l'estimer ou consultez les informations du produit.
                                </p>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium">Cas particuliers</h4>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li>
                                        <strong>Plantes</strong> : Mesurez la hauteur totale depuis la base du pot jusqu'au sommet de la plante.
                                        La largeur correspond au diamètre maximum de la plante.
                                    </li>
                                    <li>
                                        <strong>Meubles</strong> : Mesurez chaque dimension dans son intégralité, y compris les pieds ou autres parties saillantes.
                                    </li>
                                    <li>
                                        <strong>Articles en kit</strong> : Mesurez les dimensions du colis, pas du meuble monté.
                                    </li>
                                </ul>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium">Conseils</h4>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li>Arrondissez toujours au centimètre supérieur.</li>
                                    <li>Pour les articles aux formes irrégulières, mesurez la plus grande dimension dans chaque direction.</li>
                                    <li>N'oubliez pas de prendre en compte l'emballage si l'article est déjà emballé.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowHelpModal(false)}
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

export default ArticleDimensionsForm;