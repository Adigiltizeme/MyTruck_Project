import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NotificationService } from '../services/notificationService';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
            const response = await fetch(`${apiUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setEmailSent(true);
                NotificationService.success('Votre demande a été envoyée à My Truck !');
            } else {
                const data = await response.json();
                NotificationService.error(data.message || 'Erreur lors de l\'envoi de la demande');
            }
        } catch (error) {
            console.error('Erreur:', error);
            NotificationService.error('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <motion.div
                className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div>
                    <img
                        src="/my-truck-logo.jpg"
                        alt="My Truck Logo"
                        className="h-16 mx-auto"
                    />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Mot de passe oublié ?
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Entrez votre adresse email et My Truck vous attribuera un nouveau mot de passe rapidement.
                    </p>
                </div>

                {emailSent ? (
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="bg-green-50 border border-green-200 p-6 rounded-md">
                            <svg
                                className="mx-auto h-12 w-12 text-green-500 mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <h3 className="text-lg font-medium text-green-800 mb-2">
                                Demande envoyée !
                            </h3>
                            <p className="text-sm text-green-700 mb-4">
                                Votre demande de réinitialisation pour <strong>{email}</strong> a été transmise à l'équipe My Truck.
                            </p>
                            <p className="text-xs text-gray-500 mb-4">
                                Un nouveau mot de passe vous sera attribué rapidement. Vous recevrez un email de confirmation.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center text-primary hover:text-primary-hover font-medium"
                            >
                                <svg
                                    className="w-4 h-4 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                    />
                                </svg>
                                Retour à la connexion
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Adresse email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                placeholder="votre@email.com"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Envoi en cours...
                                    </span>
                                ) : (
                                    'Envoyer le lien de réinitialisation'
                                )}
                            </button>
                        </div>

                        <div className="text-center">
                            <Link
                                to="/login"
                                className="text-sm text-gray-600 hover:text-gray-900"
                            >
                                Retour à la connexion
                            </Link>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
