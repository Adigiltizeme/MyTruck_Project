import React, { useEffect, useState } from 'react';
import { ChauffeurStatus, CommandeMetier, DevisInfo, PersonnelInfo } from '../types/business.types';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import { Map } from 'react-map-gl';
import { Marker } from 'react-map-gl';
import { Modal } from './Modal';
import { useOffline } from '../contexts/OfflineContext';
import { StatusManager } from './StatusManager';
import { useAuth } from '../contexts/AuthContext';

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
    const [showMap, setShowMap] = useState(false);
    const [mapVisible, setMapVisible] = useState(false);
    const [driverLocations, setDriverLocations] = useState<any[]>([]);
    const [driverLocation, setDriverLocation] = useState<{ longitude?: number; latitude?: number } | null>(null);
    const [showManageChauffeursModal, setShowManageChauffeursModal] = useState(false);
    const [currentChauffeurs, setCurrentChauffeurs] = useState<string[]>([]);

    const { dataService, isOnline } = useOffline();
    const { user } = useAuth();

    // Suivi en temps réel
    useEffect(() => {
        if (mapVisible && commande?.statuts?.livraison === 'EN COURS DE LIVRAISON') {
            // Initialiser la carte
            mapboxgl.accessToken = `${import.meta.env.VITE_MAPBOX_TOKEN}`;
            const map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                // center: [-8.000337, 12.649319], Bamako par défaut
                center: [2.3488, 48.8534], // Paris par défaut
                zoom: 12
            });

            // Mettre à jour la position
            const interval = setInterval(async () => {
                const updatedCommandes = await dataService.getCommandes();
                const updatedCommande = updatedCommandes.find(cmd => cmd.id === commande.id);
                if (updatedCommande?.chauffeurs?.[0]?.location) {
                    setDriverLocation(updatedCommande.chauffeurs[0].location);
                }
            }, 30000);

            return () => {
                clearInterval(interval);
                map.remove();
            };
        }
    }, [mapVisible, commande.id]);

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
            {(user?.role === 'admin' || user?.role === 'direction') && (commande.statuts.livraison === 'EN ATTENTE'
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
            {showManageChauffeursModal && (
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
            )}

            <StatusManager
                commande={commande}
                onUpdate={onUpdate}
                onRefresh={onRefresh}
                mode="admin"
                showAdvancedOnly={false}
            />

            {/* Section Suivi */}
            {commande?.statuts?.livraison === 'EN COURS DE LIVRAISON' && (
                <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Suivi en temps réel (BIENTÔT DISPONIBLE)</h3>
                    <div className="flex justify-between items-center mb-4">
                        <span className='text-sm font-medium text-gray-500'>Localisation des chauffeurs</span>
                        <button
                            onClick={() => setMapVisible(!mapVisible)}
                            className="px-4 py-2 bg-primary text-white rounded-lg"
                        >
                            {mapVisible ? 'Masquer la carte' : 'Voir sur la carte'}
                        </button>
                    </div>
                    {mapVisible && (
                        <div id="map" className="h-96 mt-4 rounded-lg overflow-hidden">
                            {/* La carte sera montée ici */}
                            {driverLocation && (
                                <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow">
                                    Position du transporteur mise à jour
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Section Tarification */}
            {(user?.role === 'admin' || user?.role === 'direction') && (
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
            )}
        </div>
    );
};

export default AdminActions;