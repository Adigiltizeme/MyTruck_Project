import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/20/solid';

const SignupSuccess: React.FC = () => {
    const navigate = useNavigate();

    // Redirection automatique après un délai
    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/home');
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <motion.div
                className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                </div>

                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Inscription réussie !
                </h2>

                <p className="mt-2 text-gray-600">
                    Votre compte a été créé avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités de My Truck.
                </p>

                <div className="mt-6 flex flex-col space-y-4">
                    <Link
                        to="/home"
                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                        Accéder au tableau de bord
                    </Link>

                    <Link
                        to="/profile"
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Compléter mon profil
                    </Link>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                    Vous serez redirigé automatiquement dans quelques secondes...
                </p>
            </motion.div>
        </div>
    );
};

export default SignupSuccess;