import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

const AvisClient: React.FC = () => {
    const { commandeId } = useParams<{ commandeId: string }>();
    const navigate = useNavigate();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [commentaire, setCommentaire] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [avisExistant, setAvisExistant] = useState(false);

    useEffect(() => {
        // Vérifier si un avis existe déjà
        checkAvisExistant();
    }, [commandeId]);

    const checkAvisExistant = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
            const response = await fetch(`${apiUrl}/avis/commande/${commandeId}`);

            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setAvisExistant(true);
                    setRating(data.rating);
                    setCommentaire(data.commentaire || '');
                }
            }
        } catch (err) {
            console.error('Erreur lors de la vérification de l\'avis:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            setError('Veuillez sélectionner une note');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
            const response = await fetch(`${apiUrl}/avis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commandeId,
                    rating,
                    commentaire: commentaire.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de l\'envoi de l\'avis');
            }

            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    if (avisExistant) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
                            <Star className="w-10 h-10 text-blue-600 fill-current" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            Merci pour votre avis !
                        </h1>
                        <p className="text-gray-600">
                            Vous avez déjà donné votre avis pour cette livraison.
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <div className="flex justify-center mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-8 h-8 mx-1 ${
                                        star <= rating
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                    }`}
                                />
                            ))}
                        </div>
                        {commentaire && (
                            <p className="text-gray-700 italic">"{commentaire}"</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                            <svg
                                className="w-10 h-10 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            Merci pour votre avis !
                        </h1>
                        <p className="text-gray-600">
                            Votre retour nous aide à améliorer nos services.
                        </p>
                    </div>

                    <div className="flex justify-center mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-10 h-10 mx-1 ${
                                    star <= rating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
                        <Star className="w-10 h-10 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Comment s'est passée votre livraison ?
                    </h1>
                    <p className="text-gray-600">
                        Votre avis nous aide à améliorer nos services
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                            Notez votre expérience
                        </label>
                        <div className="flex justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-12 h-12 ${
                                            star <= (hoverRating || rating)
                                                ? 'text-yellow-400 fill-current'
                                                : 'text-gray-300'
                                        } transition-colors`}
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-2">
                            {rating === 0 && 'Cliquez sur les étoiles'}
                            {rating === 1 && 'Très insatisfait'}
                            {rating === 2 && 'Insatisfait'}
                            {rating === 3 && 'Neutre'}
                            {rating === 4 && 'Satisfait'}
                            {rating === 5 && 'Très satisfait'}
                        </p>
                    </div>

                    {/* Commentaire */}
                    <div>
                        <label
                            htmlFor="commentaire"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Commentaire (optionnel)
                        </label>
                        <textarea
                            id="commentaire"
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Partagez votre expérience avec nous..."
                            value={commentaire}
                            onChange={(e) => setCommentaire(e.target.value)}
                            maxLength={500}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            {commentaire.length}/500 caractères
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || rating === 0}
                        className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors ${
                            loading || rating === 0
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {loading ? 'Envoi en cours...' : 'Envoyer mon avis'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                    🔒 Vos données sont protégées et utilisées uniquement pour améliorer nos
                    services
                </p>
            </div>
        </div>
    );
};

export default AvisClient;
