import React, { useEffect, useState } from 'react';
import { ChauffeurStatus, CommandeMetier, DevisInfo, PersonnelInfo } from '../types/business.types';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { useOffline } from '../contexts/OfflineContext';
import { StatusManager } from './StatusManager';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../utils/role-helpers';
import { LiveTrackingMap } from './LiveTrackingMap';
import { useDriverTracking } from '../hooks/useDriverTracking';
import { DriverTrackingToggle } from './DriverTrackingToggle';

interface AdminActionsProps {
    commande: CommandeMetier;
    chauffeurs: PersonnelInfo[];
    onUpdate: (updatedCommande: CommandeMetier) => void;
    onRefresh?: () => Promise<void>;
}

const AdminActions: React.FC<AdminActionsProps> = ({ commande, chauffeurs, onUpdate, onRefresh }) => {

    if (!commande) {
        return <div>Chargement des détails de la commande...</div>;
    }

    const [loading, setLoading] = useState(false);
    const [chauffeursData, setChauffeursData] = useState<PersonnelInfo[]>([]);
    const [showTarifModal, setShowTarifModal] = useState(false);
    const [tarif, setTarif] = useState(commande.financier?.tarifHT || 0);
    const [showFactureModal, setShowFactureModal] = useState(false);
    const [dateFacture, setDateFacture] = useState(new Date().toISOString().split('T')[0]);
    const [mapVisible, setMapVisible] = useState(false);
    const [showManageChauffeursModal, setShowManageChauffeursModal] = useState(false);
    const [currentChauffeurs, setCurrentChauffeurs] = useState<string[]>([]);

    const { dataService, isOnline } = useOffline();
    const { user } = useAuth();

    // Hook de tracking GPS temps réel
    const token = localStorage.getItem('authToken');
    const { drivers } = useDriverTracking(token);

    // ✅ Filtrer les chauffeurs liés à cette commande PAR commandeId (pas chauffeurId)
    const commandeDrivers = drivers.filter(d => d.commandeId === commande.id);

    // Debug GPS tracking
    console.log('[AdminActions] GPS Debug:', {
        commandeId: commande.id,
        allDrivers: drivers,
        commandeDrivers,
        driversCount: drivers.length,
        matchedCount: commandeDrivers.length
    });

    useEffect(() => {
        const loadChauffeurs = async () => {
            // ✅ Charger au démarrage du composant (pas seulement à l'ouverture modal)
            if (!chauffeursData || chauffeursData.length === 0) {
                try {
                    console.log('🔍 Chargement initial chauffeurs...');
                    const personnelData = await dataService.getPersonnel();
                    console.log('✅ Chauffeurs chargés:', personnelData.length);
                    setChauffeursData(personnelData);
                } catch (error) {
                    console.error('❌ Erreur chargement chauffeurs:', error);
                }
            }
        };

        loadChauffeurs();
    }, [dataService]);

    // Modal de gestion complète
    const handleManageChauffeurs = () => {
        // ✅ Initialiser avec chauffeurs actuels
        const assignedIds = commande.chauffeurs?.map(c => c.id) || [];
        setCurrentChauffeurs(assignedIds);

        // ✅ Les chauffeurs sont déjà chargés
        console.log('📋 Ouverture modal avec', chauffeursData.length, 'chauffeurs disponibles');
        setShowManageChauffeursModal(true);
    };

    // Sauvegarde des modifications
    const handleSaveChauffeursChanges = async () => {
        try {
            setLoading(true);

            console.log('🔄 ===== MISE À JOUR CHAUFFEURS =====');
            console.log('🔄 Anciens chauffeurs:', commande.chauffeurs?.map(c => c.id) || []);
            console.log('🔄 Nouveaux chauffeurs:', currentChauffeurs);

            // ✅ REMPLACER COMPLÈTEMENT les chauffeurs
            await dataService.replaceChauffeursToCommande(
                commande.id,
                currentChauffeurs
            );

            console.log('✅ Chauffeurs mis à jour avec succès');

            // ✅ REFRESH
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

            setShowManageChauffeursModal(false);

        } catch (error) {
            console.error('❌ Erreur mise à jour chauffeurs:', error);
            alert('Erreur lors de la mise à jour des chauffeurs');
        } finally {
            setLoading(false);
        }
    };

    // Gestion sélection/désélection
    const handleChauffeurToggle = (chauffeurId: string) => {
        setCurrentChauffeurs(prev => {
            if (prev.includes(chauffeurId)) {
                // Retirer le chauffeur
                return prev.filter(id => id !== chauffeurId);
            } else {
                // Ajouter le chauffeur
                return [...prev, chauffeurId];
            }
        });
    };

    const statusOrder: ChauffeurStatus[] = [
        'Actif',
        'En route vers magasin',
        'En route vers client',
        'Inactif'
    ];

    const statusColors: Record<ChauffeurStatus, string> = {
        'Actif': 'bg-green-100 text-green-800',
        'En route vers magasin': 'bg-blue-100 text-blue-800',
        'En route vers client': 'bg-yellow-100 text-yellow-800',
        'Inactif': 'bg-gray-100 text-gray-800'
    };

    const sortedChauffeurs = [...chauffeurs].sort((a, b) => {
        const statusA = statusOrder.indexOf(a.status);
        const statusB = statusOrder.indexOf(b.status);
        return statusA - statusB;
    });

    const besoinDevis = commande?.livraison?.equipiers > 2;

    // Retirer un chauffeur spécifique
    const handleRemoveChauffeur = async (chauffeurId: string) => {
        try {
            setLoading(true);

            const remainingChauffeurIds = (commande.chauffeurs || [])
                .filter(c => c.id !== chauffeurId)
                .map(c => c.id);

            console.log('🗑️ Suppression chauffeur:', chauffeurId);
            console.log('🗑️ Chauffeurs restants:', remainingChauffeurIds);

            await dataService.replaceChauffeursToCommande(
                commande.id,
                remainingChauffeurIds
            );

            // ✅ REFRESH
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

        } catch (error) {
            console.error('❌ Erreur suppression chauffeur:', error);
            alert('Erreur lors de la suppression du chauffeur');
        } finally {
            setLoading(false);
        }
    };

    // Retirer tous les chauffeurs
    const handleRemoveAllChauffeurs = async () => {
        if (!confirm('Êtes-vous sûr de vouloir retirer tous les chauffeurs ?')) {
            return;
        }

        try {
            setLoading(true);

            console.log('🗑️ Suppression de tous les chauffeurs');

            await dataService.replaceChauffeursToCommande(commande.id, []);

            // ✅ REFRESH
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

        } catch (error) {
            console.error('❌ Erreur suppression tous chauffeurs:', error);
            alert('Erreur lors de la suppression des chauffeurs');
        } finally {
            setLoading(false);
        }
    };

    const handleTarifUpdate = async () => {
        try {
            setLoading(true);

            const updatedFields = {
                'TARIF HT': Number(tarif),
                'DATE DE MISE A JOUR COMMANDE': new Date().toISOString()
            };

            await dataService.updateTarif(commande.id, Number(tarif));

            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshTarif = await dataService.updateTarif(commande.id, Number(tarif));
                if (freshTarif) {
                    onUpdate(freshTarif);
                }
            }

            onUpdate({
                ...commande,
                financier: {
                    ...commande.financier,
                    tarifHT: Number(tarif)
                }
            });
            setShowTarifModal(false);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du tarif:', error);
        } finally {
            setLoading(false);
        }
    };

    const genererFacture = async () => {
        try {
            setLoading(true);
            // Logique de génération de facture
            const numeroFacture = `FAC-${Date.now()}`;
            const nouvelleFacture = {
                id: numeroFacture,
                numeroFacture,
                dateFacture,
                dateEcheance: new Date(new Date(dateFacture).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                montantHT: commande.financier.tarifHT,
                statut: 'En attente' as const,
                magasin: commande.magasin || null,
                client: commande.client || null
            };

            const updatedCommande = {
                ...commande,
                financier: {
                    ...commande.financier,
                    factures: [...(commande.financier.factures || []), nouvelleFacture]
                }
            };

            await dataService.updateCommande({ ...updatedCommande });
            onUpdate(updatedCommande);
            setShowFactureModal(false);
        } catch (error) {
            console.error('Erreur lors de la génération de la facture:', error);
        } finally {
            setLoading(false);
        }
    };

    const genererDevis = async () => {
        try {
            setLoading(true);
            // Logique de génération de devis
            const numeroDevis = `DEV-${Date.now()}`;
            const nouveauDevis = {
                id: numeroDevis,
                numeroDevis,
                dateDevis: new Date().toISOString(),
                dateEcheance: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                montantHT: tarif,
                statut: 'En attente' as const
            };

            const updatedCommande = {
                ...commande,
                financier: {
                    ...commande.financier,
                    devis: [
                        ...(commande.financier.devis || []),
                        {
                            ...nouveauDevis,
                            magasin: commande.magasin || null,
                            client: commande.client || null
                        } as DevisInfo
                    ]
                }
            };

            await dataService.updateCommande(updatedCommande);
            onUpdate(updatedCommande);
        } catch (error) {
            console.error('Erreur lors de la génération du devis:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Section Attribution des chauffeurs */}
            {isAdminRole(user?.role) && (commande.statuts.livraison === 'EN ATTENTE'
                || commande.statuts.livraison === 'CONFIRMEE')
                && (
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-medium mb-4">🚛 Gestion dispatching</h3>

                        {/* Chauffeurs actuels */}
                        <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-2">Chauffeurs assignés :</h4>
                            {commande.chauffeurs && commande.chauffeurs.length > 0 ? (
                                <div className="space-y-2">
                                    {commande.chauffeurs.map((chauffeur, index) => (
                                        <div key={chauffeur.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                            <div>
                                                <span className="font-medium">{chauffeur.prenom} {chauffeur.nom}</span>
                                                <span className="text-sm text-gray-500 ml-2">{chauffeur.telephone}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveChauffeur(chauffeur.id)}
                                                className="text-gray-600 hover:text-gray-800 text-sm"
                                            >
                                                Retirer
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">Aucun chauffeur assigné</p>
                            )}
                        </div>

                        {/* Boutons d'actions */}
                        <div className="flex space-x-2">
                            <button
                                onClick={handleManageChauffeurs}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                {commande.chauffeurs && commande.chauffeurs.length > 0
                                    ? "Modifier les chauffeurs"
                                    : "Dispatcher"
                                }
                            </button>

                            {commande.chauffeurs && commande.chauffeurs.length > 0 && (
                                <button
                                    onClick={handleRemoveAllChauffeurs}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                    Retirer tous
                                </button>
                            )}
                        </div>
                    </div>
                )}

            {/* Modal de gestion complète */}
            {
                showManageChauffeursModal && (
                    <Modal
                        isOpen={showManageChauffeursModal}
                        onClose={() => setShowManageChauffeursModal(false)}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-4">
                                {commande.chauffeurs && commande.chauffeurs.length > 0
                                    ? "Modifier les chauffeurs assignés"
                                    : "Assigner des chauffeurs"
                                }
                            </h2>

                            {/* ✅ Affichage conditionnel intelligent */}
                            {chauffeursData && chauffeursData.length > 0 ? (
                                <>
                                    <div className="max-h-96 overflow-y-auto">
                                        {chauffeursData.map(chauffeur => (
                                            <div key={chauffeur.id} className="flex items-center p-3 border-b hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    checked={currentChauffeurs.includes(chauffeur.id)}
                                                    onChange={() => handleChauffeurToggle(chauffeur.id)}
                                                    className="mr-3"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium">{chauffeur.prenom} {chauffeur.nom}</div>
                                                    <div className="text-sm text-gray-500">{chauffeur.telephone}</div>
                                                    <div className="text-sm text-gray-500">Status: {chauffeur.status}</div>
                                                </div>
                                                {/* ✅ Indicateur si déjà assigné */}
                                                {(commande.chauffeurs?.some(c => c.id === chauffeur.id)) && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        Actuellement assigné
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            {currentChauffeurs.length} chauffeur(s) sélectionné(s)
                                            {commande.chauffeurs && commande.chauffeurs.length > 0 &&
                                                ` (${commande.chauffeurs.length} actuellement assigné(s))`
                                            }
                                        </span>
                                        <div className="space-x-2">
                                            <button
                                                onClick={() => setShowManageChauffeursModal(false)}
                                                className="px-4 py-2 border rounded-lg"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                onClick={handleSaveChauffeursChanges}
                                                disabled={loading}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                            >
                                                {commande.chauffeurs && commande.chauffeurs.length > 0
                                                    ? "Mettre à jour"
                                                    : "Assigner"
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p>Chargement des chauffeurs...</p>
                                </div>
                            )}
                        </div>
                    </Modal>
                )
            }

            <StatusManager
                commande={commande}
                onUpdate={onUpdate}
                onRefresh={onRefresh}
                mode="admin"
                showAdvancedOnly={false}
            />

            {/* ✅ Toggle GPS pour Chauffeurs (si admin teste en mode chauffeur) */}
            {user?.role === 'chauffeur' && commande?.statuts?.livraison === 'EN COURS DE LIVRAISON' && (
                <div className="mb-4">
                    <DriverTrackingToggle
                        commandeId={commande.id}
                        statutLivraison={commande.statuts.livraison}
                        isDeliveryActive={true}
                    />
                </div>
            )}

            {/* Section Suivi GPS Temps Réel (Carte pour Admins) */}
            {commande?.statuts?.livraison === 'EN COURS DE LIVRAISON' && (
                <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Suivi GPS en Temps Réel
                    </h3>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <p className='text-sm font-medium text-gray-700'>Localisation des chauffeurs</p>
                            {commandeDrivers.length > 0 ? (
                                <p className="text-xs text-green-600 mt-1">
                                    ✓ {commandeDrivers.length} chauffeur(s) localisé(s)
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500 mt-1">
                                    En attente de position GPS...
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setMapVisible(!mapVisible)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
                        >
                            {mapVisible ? 'Masquer la carte' : 'Voir sur la carte'}
                        </button>
                    </div>
                    {mapVisible && (
                        <div className="mt-4 rounded-lg overflow-hidden shadow-lg border-2 border-blue-200 relative">
                            {commandeDrivers.length > 0 ? (
                                <LiveTrackingMap
                                    drivers={commandeDrivers}
                                    height="400px"
                                />
                            ) : (
                                <div className="h-96 flex items-center justify-center bg-gray-50">
                                    <div className="text-center p-4">
                                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-gray-600 font-medium">En attente de localisation</p>
                                        <p className="text-sm text-gray-500">Les chauffeurs doivent activer leur tracking GPS</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Section Tarification */}
            {
                isAdminRole(user?.role) && (
                    <>
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-lg font-medium mb-4">💰 Gestion financière</h3>
                            <div className="space-y-4 space-x-2">
                                <button
                                    onClick={() => setShowTarifModal(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Définir le tarif
                                </button>

                                {/* {besoinDevis ? (
                                <button
                                    onClick={genererDevis}
                                    disabled={loading || !tarif}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                                >
                                    Générer un devis
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowFactureModal(true)}
                                    disabled={loading || !tarif || commande?.statuts?.livraison !== 'LIVREE'}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Générer une facture
                                </button>
                            )} */}
                            </div>
                        </div>

                        {/* Modal Tarif */}
                        <AnimatePresence>
                            {showTarifModal && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
                                >
                                    <div className="bg-white p-6 rounded-lg w-96">
                                        <h3 className="text-lg font-medium mb-4">Définir le tarif</h3>
                                        <input
                                            type="number"
                                            value={tarif}
                                            onChange={(e) => setTarif(Number(e.target.value))}
                                            className="w-full border rounded-lg px-3 py-2 mb-4"
                                            placeholder="Montant HT"
                                        />
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => setShowTarifModal(false)}
                                                className="px-4 py-2 border rounded-lg"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                onClick={handleTarifUpdate}
                                                disabled={loading}
                                                className="px-4 py-2 bg-primary text-white rounded-lg"
                                            >
                                                Valider
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Modal Facture */}
                        {/* <AnimatePresence>
                        {showFactureModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
                            >
                                <div className="bg-white p-6 rounded-lg w-96">
                                    <h3 className="text-lg font-medium mb-4">Générer une facture</h3>
                                    <input
                                        type="date"
                                        value={dateFacture}
                                        onChange={(e) => setDateFacture(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 mb-4"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setShowFactureModal(false)}
                                            className="px-4 py-2 border rounded-lg"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={genererFacture}
                                            disabled={loading}
                                            className="px-4 py-2 bg-primary text-white rounded-lg"
                                        >
                                            Générer
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence> */}
                    </>
                )
            }
        </div>
    );
};

export default AdminActions;