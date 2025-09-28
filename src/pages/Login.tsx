import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { SPECIAL_ACCOUNTS } from '../services/authService';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showSpecialAccountsInfo, setShowSpecialAccountsInfo] = useState(false);

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
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                            required
                        />
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
                        <a href="#" className="text-primary hover:text-primary-hover">
                            Mot de passe oublié?
                        </a>
                    </div>
                </form>

                {user?.role === 'admin' && (
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