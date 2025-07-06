import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
// import { useOffline } from '../../contexts/OfflineContext';
import CessionList from '../../components/CessionList';
import { motion } from 'framer-motion';
import { Truck, AlertTriangle } from 'lucide-react';

/**
 * Page principale pour la gestion des cessions inter-magasins
 */
const Cessions: React.FC = () => {
    const { user } = useAuth();
    // const { isOnline } = useOffline();
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="container mx-auto"
            >
                {/* En-tête */}
                <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                        <Truck className="w-6 h-6 text-red-600" />
                        <h1 className="text-2xl font-bold">Cessions Inter-Magasins</h1>
                    </div>
                    <p className="text-gray-600">
                        Gérez les transferts de produits entre les différents points de vente.
                    </p>
                </div>

                {/* Message d'erreur */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {/* Avertissement hors ligne */}
                {/* {!isOnline && (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
                        Vous êtes en mode hors ligne. Les actions seront synchronisées lorsque la connexion sera rétablie.
                    </div>
                )} */}

                {/* Information contextuelle selon le rôle */}
                {user?.role === 'magasin' && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
                        <p className="font-medium">Magasin: {user.storeName || 'Non spécifié'}</p>
                        <p className="text-sm mt-1">
                            Vous pouvez créer des demandes de cession et gérer les cessions qui concernent votre magasin.
                        </p>
                    </div>
                )}

                {user?.role === 'chauffeur' && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
                        <p className="font-medium">Mode Chauffeur</p>
                        <p className="text-sm mt-1">
                            Vous pouvez consulter et mettre à jour le statut des cessions qui vous sont assignées.
                        </p>
                    </div>
                )}

                {/* Liste des cessions */}
                <CessionList
                    filterByStore={user?.role === 'magasin' ? user.storeId : undefined}
                />
            </motion.div>
        </div>
    );
};

export default Cessions;