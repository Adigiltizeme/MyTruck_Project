import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { isAdminRole } from '../utils/role-helpers';

export const AuthStatus: React.FC = () => {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <motion.div
            className="fixed bottom-4 left-4 p-2 rounded-lg bg-white shadow-md z-40 text-xs text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>
                    Connecté en tant que: {isAdminRole(user.role) ? 'Administrateur' :
                        user.role === 'magasin' ? `Magasin ${user.storeName}` :
                            'Chauffeur'}
                </span>
            </div>
        </motion.div>
    );
};