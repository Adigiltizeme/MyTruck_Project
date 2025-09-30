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
    isEditing?: boolean;
}

const ArticleDimensionsForm: React.FC<ArticleDimensionsFormProps> = ({
    initialArticles = [],
    onChange,
    readOnly = false,
    isEditing = false
}) => {
    const [articles, setArticles] = useState<ArticleDimension[]>([]);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const [hasUserStartedTyping, setHasUserStartedTyping] = useState(false);
    const [hasAttemptedSubmission, setHasAttemptedSubmission] = useState(false);
    const [interactionTracker, setInteractionTracker] = useState<Set<string>>(new Set());

    // Utiliser une référence pour suivre si les dimensions initiales ont déjà été chargées
    const initializedRef = useRef(false);
    const lastNotifiedArticlesRef = useRef<ArticleDimension[]>([]);

    const detectUserInteraction = useCallback((articleId: string, fieldValue: any) => {
        if (fieldValue && fieldValue.toString().trim() !== '') {
            setHasUserStartedTyping(true);
            setInteractionTracker(prev => new Set([...prev, articleId]));
        }
    }, []);


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

                // Si on a des articles initiaux avec du contenu, marquer comme interagis
                const hasContentInInitialArticles = initialArticles.some(article =>
                    article.nom && article.nom.trim() !== ''
                );
                if (hasContentInInitialArticles) {
                    setHasUserStartedTyping(true);
                }
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

        // ⚠️ IMPORTANT : Ne pas valider tant que l'utilisateur n'a pas commencé à taper
        if (!hasUserStartedTyping && !hasAttemptedSubmission) {
            setValidationErrors({});
            return;
        }

        const errors: Record<string, string[]> = {};

        articles.forEach((article) => {
            const articleErrors: string[] = [];

            // Seulement valider les articles sur lesquels l'utilisateur a travaillé
            const userWorkedOnThisArticle = interactionTracker.has(article.id) ||
                (article.nom && article.nom.trim() !== '');
            if (userWorkedOnThisArticle) {
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
            }

            // Toujours valider la quantité si elle est définie
            if (article.quantite <= 0) {
                articleErrors.push('La quantité doit être supérieure à 0');
            }

            if (articleErrors.length > 0) {
                errors[article.id] = articleErrors;
            }
        });

        setValidationErrors(errors);
    }, [articles, hasUserStartedTyping, interactionTracker, hasAttemptedSubmission]);

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
            // Réinitialiser à un article vide et remettre les flags d'interaction à zéro
            const newArticle = {
                id: `art-${Date.now()}`,
                nom: '',
                longueur: undefined,
                largeur: undefined,
                hauteur: undefined,
                poids: undefined,
                quantite: 1
            };
            setArticles([newArticle]);
            setHasUserStartedTyping(false);
            setHasAttemptedSubmission(false);
            setInteractionTracker(new Set());
        } else {
            setArticles(prevArticles => prevArticles.filter(article => article.id !== id));
            // Retirer de l'interaction tracker
            setInteractionTracker(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    }, [readOnly, articles.length]);

    const handleChange = useCallback((id: string, field: keyof ArticleDimension, value: any) => {
        if (readOnly) return;

        // ========== DÉTECTER L'INTERACTION UTILISATEUR ==========
        detectUserInteraction(id, value);

        setArticles(prevArticles => prevArticles.map(article => {
            if (article.id === id) {
                return {
                    ...article,
                    [field]: field === 'nom' ? value : value === '' ? undefined : Number(value)
                };
            }
            return article;
        }));
    }, [readOnly, detectUserInteraction]);

    const shouldShowIncompleteWarning = () => {
        // Ne jamais afficher l'avertissement si l'utilisateur n'a pas commencé à taper
        if (!hasUserStartedTyping) {
            return false;
        }

        // Afficher seulement si l'utilisateur a commencé à saisir des articles
        // mais que certaines informations importantes manquent
        return articles.some(article => {
            const hasStartedThisArticle = article.nom && article.nom.trim() !== '';
            const missingImportantDimensions = !article.longueur && !article.largeur && !article.hauteur && !article.poids;

            return hasStartedThisArticle && missingImportantDimensions;
        });
    };

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
                        <div className="space-x-1">
                            <button
                                type="button"
                                onClick={addArticle}
                                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Article le plus lourd
                            </button>
                            <p className="text-sm text-red-600 text-center"> (Si différent)</p>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
                Celui avec les plus grandes dimensions nous aide à déterminer le véhicule adapté<br />
                Le plus lourd (+ conditions spéciales) permet de déterminer le nombre d'équipiers nécessaires.
            </p>

            {/* Avertissement si des dimensions manquent */}
            {shouldShowIncompleteWarning() && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Dimensions incomplètes</p>
                        <p className="text-sm">
                            Vous avez commencé à saisir des articles mais certaines dimensions sont manquantes.
                            Ces informations sont importantes pour déterminer le véhicule adapté.
                        </p>
                        <p className="text-sm mt-1">
                            <strong>Astuce :</strong> Si vous ne connaissez pas les dimensions exactes,
                            vous pouvez continuer et les ajouter plus tard, mais cela peut affecter le choix du véhicule.
                        </p>
                    </div>
                </div>
            )}

            {/* Liste des articles */}
            <div className="space-y-4">
                {articles.map((article, index) => (
                    <div
                        key={article.id}
                        className={`border rounded-lg p-4 ${validationErrors[article.id] ? 'border-red-300 bg-red-50' : 'border-gray-200'
                            }`}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium">Article le plus grand</h4> {/* <-- {index + 1} */}

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
                        {validationErrors[article.id] && hasUserStartedTyping && (
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
                                    className={`w-full border ${!article.nom && hasUserStartedTyping && validationErrors[article.id]
                                        ? 'border-red-300'
                                        : 'border-gray-300'
                                        } rounded-md px-3 py-2`}
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
                <div className="flex justify-center items-center">
                    <button
                        type="button"
                        onClick={addArticle}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 flex items-center"
                    >
                        <Plus className="w-5 h-5 mr-1" />
                        Ajouter l'article le plus lourd
                    </button>
                    {/* Placer paragraphe en dessous du bouton */}
                        <p className="text-sm text-gray-600 text-center ml-2"> (Si différent)</p>
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