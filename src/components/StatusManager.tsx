import React, { useState, useEffect } from 'react';
import { CommandeMetier } from '../types/business.types';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { getStatutCommandeStyle, getStatutLivraisonStyle } from '../styles/getStatus';

interface StatusManagerProps {
    commande: CommandeMetier;
    onUpdate: (commande: CommandeMetier) => void;
    onRefresh?: () => Promise<void>;
    mode?: 'admin' | 'magasin'; // Pour différencier AdminActions vs CommandeActions*
    showAdvancedOnly?: boolean; // Pour afficher uniquement les actions avancées
}

export const StatusManager: React.FC<StatusManagerProps> = ({
    commande,
    onUpdate,
    onRefresh,
    mode = 'admin',
    showAdvancedOnly = false,
}) => {
    const { user } = useAuth();
    const { dataService } = useOffline();
    const [loading, setLoading] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatutCommande, setSelectedStatutCommande] = useState(commande.statuts?.commande || '');
    const [selectedStatutLivraison, setSelectedStatutLivraison] = useState(commande.statuts?.livraison || '');

    // ✅ RÈGLES MÉTIER : Définir les permissions
    const canModifyCommandeStatus = () => {
        // Règle 2 : Magasin peut modifier tant que livraison pas CONFIRMEE
        if (user?.role === 'magasin') {
            return commande.statuts?.livraison !== 'CONFIRMEE' &&
                commande.statuts?.livraison !== 'EN COURS DE LIVRAISON' &&
                commande.statuts?.livraison !== 'LIVREE';
        }
        // Admin/Direction peuvent toujours modifier
        return user?.role === 'admin';
    };

    const canModifyLivraisonStatus = () => {
        // Règle 4 : Chauffeurs et Direction peuvent gérer livraisons
        if (user?.role === 'admin') {
            return true; // Admin/Direction ont accès complet
        }
        return user?.role === 'chauffeur';
    };

    // ✅ RÈGLE 1 : Auto-confirmation commande après soumission (désactivé pour contrôle manuel)
    useEffect(() => {
        const autoConfirmCommande = async () => {
            if (commande.statuts?.commande === 'En attente' && user?.role === 'magasin') {
                setTimeout(async () => {
                    await handleQuickStatusUpdate('commande', 'Confirmée');
                }, 5000);
            }
        };
        autoConfirmCommande();
    }, [commande.id]);

    // ✅ Mise à jour rapide (boutons individuels)
    // ✅ CORRIGER la structure d'envoi
    // ✅ REMPLACER les méthodes existantes par :

    const handleQuickStatusUpdate = async (type: 'commande' | 'livraison', newStatus: string) => {
        try {
            setLoading(true);

            // ✅ BACKEND INTELLIGENT gérera toutes les règles
            if (type === 'commande') {
                await dataService.updateStatutsCommande(
                    commande.id,
                    newStatus,
                    undefined,
                    `Action rapide: ${newStatus}`
                );
            } else {
                await dataService.updateStatutsCommande(
                    commande.id,
                    undefined,
                    newStatus,
                    `Action rapide: ${newStatus}`
                );
            }

            // ✅ REFRESH avec contexte
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

        } catch (error) {
            console.error('❌ Erreur Backend intelligent:', error);
            const errorMessage = typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message?: string }).message
                : undefined;
            alert(`Erreur: ${errorMessage || 'Impossible de mettre à jour le statut'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleModalStatusUpdate = async () => {
        try {
            setLoading(true);

            // ✅ BACKEND INTELLIGENT gérera toutes les règles
            await dataService.updateStatutsCommande(
                commande.id,
                selectedStatutCommande,
                selectedStatutLivraison,
                'Modification manuelle via modal'
            );

            // ✅ REFRESH avec contexte
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

            setShowStatusModal(false);

        } catch (error) {
            console.error('❌ Erreur Backend intelligent:', error);
            const errorMessage = typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message?: string }).message
                : undefined;
            alert(`Erreur: ${errorMessage || 'Impossible de mettre à jour les statuts'}`);
        } finally {
            setLoading(false);
        }
    };

    const getAvailableCommandeStatuses = () => {
        const baseStatuses = ['En attente', 'Confirmée', 'Transmise', 'Modifiée'];

        if (user?.role === 'magasin') {
            // Magasin ne peut pas annuler si livraison confirmée
            if (commande.statuts?.livraison === 'CONFIRMEE') {
                return baseStatuses.filter(s => s !== 'Annulée');
            }
            return [...baseStatuses, 'Annulée'];
        }

        return [...baseStatuses, 'Annulée']; // Admin/Direction peuvent tout
    };

    const getAvailableLivraisonStatuses = () => {
        return ['EN ATTENTE', 'CONFIRMEE', 'ENLEVEE', 'EN COURS DE LIVRAISON', 'LIVREE', 'ANNULEE', 'ECHEC'];
    };

    // ✅ Boutons d'actions rapides selon le contexte
    const getQuickActions = () => {
        const actions = [];

        if (mode === 'admin') {
            // Actions admin/direction
            if (canModifyLivraisonStatus()) {
                if (commande.statuts?.livraison === 'EN ATTENTE') {
                    actions.push({
                        label: 'Confirmer livraison',
                        action: () => handleQuickStatusUpdate('livraison', 'CONFIRMEE'),
                        color: 'bg-green-600 hover:bg-green-700'
                    });
                }
                if (commande.statuts?.livraison === 'CONFIRMEE') {
                    actions.push({
                        label: 'Marquer enlevée',
                        action: () => handleQuickStatusUpdate('livraison', 'ENLEVEE'),
                        color: 'bg-blue-600 hover:bg-blue-700'
                    });
                }
                if (commande.statuts?.livraison === 'ENLEVEE') {
                    actions.push({
                        label: 'Démarrer livraison',
                        action: () => handleQuickStatusUpdate('livraison', 'EN COURS DE LIVRAISON'),
                        color: 'bg-yellow-600 hover:bg-yellow-700'
                    });
                }
                if (commande.statuts?.livraison === 'EN COURS DE LIVRAISON') {
                    actions.push({
                        label: 'Marquer livrée',
                        action: () => handleQuickStatusUpdate('livraison', 'LIVREE'),
                        color: 'bg-green-600 hover:bg-green-700'
                    });
                }
            }
        } else if (mode === 'magasin') {
            // Actions magasin
            if (canModifyCommandeStatus()) {
                if (commande.statuts?.commande === 'En attente') {
                    actions.push({
                        label: 'Confirmer commande',
                        action: () => handleQuickStatusUpdate('commande', 'Confirmée'),
                        color: 'bg-green-600 hover:bg-green-700'
                    });
                }
                if (commande.statuts?.commande === 'Confirmée') {
                    actions.push({
                        label: 'Marquer transmise',
                        action: () => handleQuickStatusUpdate('commande', 'Transmise'),
                        color: 'bg-blue-600 hover:bg-blue-700'
                    });
                }
                if (
                    commande.statuts?.commande === 'Transmise' &&
                    (
                        commande.statuts?.livraison !== 'EN COURS DE LIVRAISON' &&
                        commande.statuts?.livraison !== 'LIVREE' &&
                        commande.statuts?.livraison !== 'ANNULEE'
                    )
                ) {
                    actions.push({
                        label: 'Non transmise',
                        action: () => handleQuickStatusUpdate('commande', 'Confirmée'),
                        color: 'bg-red-600 hover:bg-red-700'
                    });
                }
                if (commande.statuts?.commande === 'Modifiée') {
                    actions.push({
                        label: 'Reconfirmer',
                        action: () => handleQuickStatusUpdate('commande', 'Confirmée'),
                        color: 'bg-green-600 hover:bg-green-700'
                    });
                }
            }
        }

        return actions;
    };

    // if (showAdvancedOnly && mode === 'magasin') {
    //     return (
    //         <div className="p-4 border rounded-lg">
    //             <h3 className="text-lg font-medium mb-4">📊 Suivi des statuts</h3>

    //             {/* Affichage statuts actuels */}
    //             <div className="space-y-2 mb-4">
    //                 <div className="flex items-center justify-between">
    //                     <span className="text-gray-600">Statut commande :</span>
    //                     <span className={getStatutCommandeStyle(commande.statuts?.commande || '')}>
    //                         {commande.statuts?.commande || 'N/A'}
    //                     </span>
    //                 </div>
    //                 <div className="flex items-center justify-between">
    //                     <span className="text-gray-600">Statut livraison :</span>
    //                     <span className={getStatutLivraisonStyle(commande.statuts?.livraison || '')}>
    //                         {commande.statuts?.livraison || 'N/A'}
    //                     </span>
    //                 </div>
    //             </div>

    //             {/* Règles métier affichées */}
    //             <div className="text-xs text-gray-500 space-y-1">
    //                 {commande.statuts?.livraison === 'CONFIRMEE' && (
    //                     <p>⚠️ Modification limitée : livraison confirmée par My Truck</p>
    //                 )}
    //                 <p>📊 Statuts mis à jour automatiquement selon l'évolution</p>
    //             </div>

    //             {/* Bouton modification avancée seulement si permissions */}
    //             {canModifyCommandeStatus() && (
    //                 <button
    //                     onClick={() => {
    //                         setSelectedStatutCommande(commande.statuts?.commande || '');
    //                         setSelectedStatutLivraison(commande.statuts?.livraison || '');
    //                         setShowStatusModal(true);
    //                     }}
    //                     className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
    //                 >
    //                     Gestion avancée des statuts
    //                 </button>
    //             )}

    //             {/* Modal modification avancée */}
    //             {showStatusModal && (
    //                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    //                     <div className="bg-white rounded-lg p-6 w-96 max-w-full">
    //                         <h2 className="text-xl font-semibold mb-4">Modification des statuts</h2>

    //                         <div className="space-y-4">
    //                             {canModifyCommandeStatus() && (
    //                                 <div>
    //                                     <label className="block text-sm font-medium mb-2">Statut de la commande</label>
    //                                     <select
    //                                         value={selectedStatutCommande}
    //                                         onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatutCommande(e.target.value as 'En attente' | 'Confirmée' | 'Transmise' | 'Annulée' | 'Modifiée')}
    //                                         className="w-full border rounded-lg px-3 py-2"
    //                                     >
    //                                         {getAvailableCommandeStatuses().map(statut => (
    //                                             <option key={statut} value={statut}>{statut}</option>
    //                                         ))}
    //                                     </select>
    //                                 </div>
    //                             )}

    //                             {canModifyLivraisonStatus() && (
    //                                 <div>
    //                                     <label className="block text-sm font-medium mb-2">Statut de la livraison</label>
    //                                     <select
    //                                         value={selectedStatutLivraison}
    //                                         onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatutLivraison(e.target.value as 'EN ATTENTE' | 'CONFIRMEE' | 'ENLEVEE' | 'EN COURS DE LIVRAISON' | 'LIVREE' | 'ANNULEE' | 'ECHEC')}
    //                                         className="w-full border rounded-lg px-3 py-2"
    //                                     >
    //                                         {getAvailableLivraisonStatuses().map(statut => (
    //                                             <option key={statut} value={statut}>{statut}</option>
    //                                         ))}
    //                                     </select>
    //                                 </div>
    //                             )}

    //                             {/* Indication automatisation */}
    //                             <div className="text-sm text-center text-gray-500 bg-blue-50 p-2 rounded">
    //                                 💡 La confirmation de livraison confirmera<br /> automatiquement la commande
    //                             </div>
    //                         </div>

    //                         <div className="mt-6 flex justify-end space-x-2">
    //                             <button
    //                                 onClick={() => setShowStatusModal(false)}
    //                                 className="px-4 py-2 border rounded-lg"
    //                             >
    //                                 Annuler
    //                             </button>
    //                             <button
    //                                 onClick={handleModalStatusUpdate}
    //                                 disabled={loading}
    //                                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
    //                             >
    //                                 Mettre à jour
    //                             </button>
    //                         </div>
    //                     </div>
    //                 </div>
    //             )}
    //         </div>
    //     );
    // }

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-4">📊 Gestion des statuts</h3>

            {/* Affichage statuts actuels */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Statut commande :</span>
                    <span className={getStatutCommandeStyle(commande.statuts?.commande || '')}>
                        {commande.statuts?.commande || 'N/A'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Statut livraison :</span>
                    <span className={getStatutLivraisonStyle(commande.statuts?.livraison || '')}>
                        {commande.statuts?.livraison || 'N/A'}
                    </span>
                </div>
            </div>

            {/* Actions rapides */}
            {getQuickActions().length > 0 && (
                <div className="space-y-2 mb-4">
                    <h4 className="font-medium text-gray-700">Actions rapides :</h4>
                    <div className="flex flex-wrap gap-2">
                        {getQuickActions().map((action, index) => (
                            <button
                                key={index}
                                onClick={action.action}
                                disabled={loading}
                                className={`px-3 py-2 text-white text-sm rounded-lg ${action.color} disabled:opacity-50`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Bouton modification avancée */}
            {(canModifyCommandeStatus() || canModifyLivraisonStatus()) && (
                <button
                    onClick={() => {
                        setSelectedStatutCommande(commande.statuts?.commande || '');
                        setSelectedStatutLivraison(commande.statuts?.livraison || '');
                        setShowStatusModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Modification avancée
                </button>
            )}

            {/* Règles métier affichées */}
            <div className="mt-4 text-xs text-gray-500 space-y-1">
                {user?.role === 'magasin' && (commande.statuts?.livraison === 'CONFIRMEE'
                    || commande.statuts?.livraison === 'EN COURS DE LIVRAISON'
                    || commande.statuts?.livraison === 'LIVREE') && (
                        <p>⚠️ Modification limitée : livraison confirmée par My Truck</p>
                    )}
                {user?.role === 'chauffeur' && (
                    <p>🚛 Vous pouvez gérer les statuts de livraison</p>
                )}
                {(user?.role === 'admin') && (
                    <p>🔑 Accès complet à tous les statuts</p>
                )}
            </div>

            {/* Modal modification avancée */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full">
                        <h2 className="text-xl font-semibold mb-4">Modification des statuts</h2>

                        <div className="space-y-4">
                            {canModifyCommandeStatus() && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Statut de la commande</label>
                                    <select
                                        value={selectedStatutCommande}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatutCommande(e.target.value as 'En attente' | 'Confirmée' | 'Transmise' | 'Annulée' | 'Modifiée')}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        {getAvailableCommandeStatuses().map(statut => (
                                            <option key={statut} value={statut}>{statut}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {canModifyLivraisonStatus() && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Statut de la livraison</label>
                                    <select
                                        value={selectedStatutLivraison}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatutLivraison(e.target.value as 'EN ATTENTE' | 'CONFIRMEE' | 'ENLEVEE' | 'EN COURS DE LIVRAISON' | 'LIVREE' | 'ANNULEE' | 'ECHEC')}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        {getAvailableLivraisonStatuses().map(statut => (
                                            <option key={statut} value={statut}>{statut}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Indication automatisation */}
                            <div className="text-sm text-center text-gray-500 bg-blue-50 p-2 rounded">
                                💡 La confirmation de livraison confirmera<br /> automatiquement la commande
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-2">
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="px-4 py-2 border rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleModalStatusUpdate}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Mettre à jour
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};