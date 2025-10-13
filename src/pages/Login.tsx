import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { SPECIAL_ACCOUNTS } from '../services/authService';
import { isAdminRole } from '../utils/role-helpers';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showSpecialAccountsInfo, setShowSpecialAccountsInfo] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login, user } = useAuth();

    // Vérifier s'il y a un état de redirection
    const from = location.state?.from?.pathname || '/home';
    const sessionExpired = location.state?.expired || false;

    useEffect(() => {
        // Si la session a expiré, afficher un message
        if (sessionExpired) {
            setError('Votre session a expiré. Veuillez vous reconnecter.');
        }
    }, [sessionExpired]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);

        try {
            await login(email, password);
            navigate('/deliveries');
        } catch (error) {
            if (error instanceof Error && error.message === 'Identifiants incorrects') {
                if (SPECIAL_ACCOUNTS.includes(email.toLowerCase())) {
                    setError('Email non reconnu. Vérifiez que vous utilisez exactement un des comptes spéciaux listés ci-dessous.');
                } else {
                    setError('Email ou mot de passe incorrect.');
                }
            } else {
                setError('Erreur de connexion: ' + (error instanceof Error ? error.message : 'Une erreur inconnue est survenue.'));
            }
        } finally {
            setIsLoggingIn(false);
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
                        Connexion
                    </h2>
                    {/* {!error && (
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Utilisez test@admin.com, test@store.com, ou test@driver.com
                        </p>
                    )} */}
                </div>

                {error && (
                    <motion.div
                        className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                    >
                        {error}
                    </motion.div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Mot de passe
                        </label>
                        <div className="relative mt-1">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
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
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                            disabled={isLoggingIn}
                        >
                            {isLoggingIn ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Connexion en cours...
                                </span>
                            ) : 'Se connecter'}
                        </button>
                    </div>
                    <div className="text-sm text-center">
                        <Link to="/forgot-password" className="text-primary hover:text-primary-hover">
                            Mot de passe oublié?
                        </Link>
                    </div>
                </form>

                {isAdminRole(user?.role) && (
                    <div className="text-sm text-center mt-4">
                        <button
                            type="button"
                            onClick={() => setShowSpecialAccountsInfo(!showSpecialAccountsInfo)}
                            className="text-blue-600 hover:text-blue-800 underline"
                        >
                            {showSpecialAccountsInfo ? "Masquer l'aide" : "Besoin d'aide pour se connecter?"}
                        </button>

                        {showSpecialAccountsInfo && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-md text-left">
                                <p className="font-medium">Comptes spéciaux :</p>
                                <p>Les comptes suivants peuvent se connecter avec n'importe quel mot de passe :</p>
                                <ul className="list-disc pl-5 mt-1">
                                    {SPECIAL_ACCOUNTS.map(email => (
                                        <li key={email}>{email}</li>
                                    ))}
                                </ul>
                                <p className="mt-2">Pour les autres comptes, veuillez utiliser le mot de passe défini lors de la création.</p>
                            </div>
                        )}
                    </div>
                )}


                {/* <p className="mt-2 text-center text-sm text-gray-600">
                    Vous n'avez pas de compte ?{' '}
                    <Link to="/signup" className="font-medium text-primary hover:text-primary-hover">
                        Créer un compte
                    </Link>
                </p> */}
            </motion.div>
        </div>
    );
};

export default Login;