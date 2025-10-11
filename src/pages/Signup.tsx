import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService, SPECIAL_ACCOUNTS, UserSignupData } from '../services/authService';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/notificationService';
import { useOffline } from '../contexts/OfflineContext';
import { UserRole } from '../types/roles';

const Signup: React.FC = () => {
    const [formData, setFormData] = useState<UserSignupData>({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'magasin' as UserRole,
        storeName: '',
        storeAddress: '',
        phone: '',
    } as UserSignupData);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const { isOnline } = useOffline();

    // Afficher un avertissement ou des informations sur le mode hors ligne si nécessaire
    useEffect(() => {
        if (!isOnline) {
            NotificationService.warning(
                "Vous êtes en mode hors ligne. Votre compte sera créé localement et synchronisé ultérieurement."
            );
        }
    }, [isOnline]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Effacer l'erreur pour ce champ
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Valider l'email
        if (!formData.email) {
            newErrors.email = 'L\'email est requis';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Format d\'email invalide';
        }

        // Valider le mot de passe
        if (!formData.password) {
            newErrors.password = 'Le mot de passe est requis';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
        }

        // Valider la confirmation de mot de passe
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }

        // Valider le nom
        if (!formData.name) {
            newErrors.name = 'Le nom est requis';
        }

        // Validation conditionnelle selon le rôle
        if (formData.role === 'magasin') {
            if (!formData.storeName) {
                newErrors.storeName = 'Le nom du magasin est requis';
            }
            if (!formData.storeAddress) {
                newErrors.storeAddress = 'L\'adresse du magasin est requise';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            setLoading(true);

            // Préparer les données selon le rôle
            const userData = {
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                name: formData.name,
                role: formData.role
            };

            // Ajouter les données spécifiques au rôle
            if (formData.role === 'magasin') {
                Object.assign(userData, {
                    storeName: formData.storeName,
                    storeAddress: formData.storeAddress,
                    phone: formData.phone
                });
            } else if (formData.role === 'chauffeur') {
                Object.assign(userData, {
                    phone: formData.phone
                });
            }
            // Appel au service d'authentification
            const result = await AuthService.signup(formData);

            if (result.success && result.user) {
                NotificationService.success('Inscription réussie! Vous êtes maintenant connecté.');

                // Connecter l'utilisateur
                await login(formData.email, formData.password);

                // Rediriger vers la page d'accueil
                navigate('/home');
            } else {
                setErrors({ form: result.message || 'Erreur lors de l\'inscription' });
                NotificationService.error(result.message || 'Erreur lors de l\'inscription');
            }
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            setErrors({ form: 'Une erreur est survenue lors de l\'inscription' });
            NotificationService.error('Une erreur est survenue lors de l\'inscription');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderOfflineWarning = () => {
        if (!isOnline) {
            return (
                <motion.div
                    className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-700"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <p className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Mode hors ligne
                    </p>
                    <p className="mt-1 text-sm">
                        Vous êtes actuellement en mode hors ligne. Votre compte sera créé localement
                        et synchronisé avec le serveur lorsque vous serez à nouveau connecté.
                    </p>
                </motion.div>
            );
        }
        return null;
    };

    const SpecialAccountsInfo = () => (
        <div className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded-md">
            <p className="font-medium">Comptes spéciaux :</p>
            <p>Ces comptes peuvent se connecter avec n'importe quel mot de passe :</p>
            <ul className="list-disc pl-5 mt-1">
                {SPECIAL_ACCOUNTS.map(email => (
                    <li key={email}>{email}</li>
                ))}
            </ul>
        </div>
    );

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
                        Créer un compte
                    </h2>

                    {user?.role === 'admin' && <SpecialAccountsInfo />}

                    <p className="mt-2 text-center text-sm text-gray-600">
                        Ou{' '}
                        <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
                            connectez-vous à votre compte existant
                        </Link>
                    </p>
                </div>

                {renderOfflineWarning()}

                {errors.form && (
                    <motion.div
                        className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                    >
                        {errors.form}
                    </motion.div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`mt-1 block w-full rounded-md border ${errors.email ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'}`}
                                required
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Nom complet
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                className={`mt-1 block w-full rounded-md border ${errors.name ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'}`}
                                required
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Mot de passe
                            </label>
                            <div className="relative mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`block w-full px-3 py-2 pr-10 rounded-md border ${errors.password ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'}`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirmer le mot de passe
                            </label>
                            <div className="relative mt-1">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={`block w-full px-3 py-2 pr-10 rounded-md border ${errors.confirmPassword ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'}`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                                Type de compte
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                                required
                            >
                                <option value="magasin">Magasin</option>
                                <option value="chauffeur">Chauffeur</option>
                            </select>
                        </div>

                        {formData.role === 'magasin' && (
                            <>
                                <div className="mb-4">
                                    <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                                        Nom du magasin
                                    </label>
                                    <input
                                        id="storeName"
                                        name="storeName"
                                        type="text"
                                        value={formData.storeName}
                                        onChange={handleChange}
                                        className={`mt-1 block w-full rounded-md border ${errors.storeName ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'}`}
                                        required
                                    />
                                    {errors.storeName && (
                                        <p className="mt-1 text-sm text-red-600">{errors.storeName}</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700">
                                        Adresse du magasin
                                    </label>
                                    <input
                                        id="storeAddress"
                                        name="storeAddress"
                                        type="text"
                                        value={formData.storeAddress}
                                        onChange={handleChange}
                                        className={`mt-1 block w-full rounded-md border ${errors.storeAddress ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'}`}
                                        required
                                    />
                                    {errors.storeAddress && (
                                        <p className="mt-1 text-sm text-red-600">{errors.storeAddress}</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Création du compte...
                                </span>
                            ) : (
                                'Créer mon compte'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Signup;