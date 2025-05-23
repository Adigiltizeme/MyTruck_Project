import React, { useEffect, useState } from 'react';
import { ChauffeurStatus, CommandeMetier, DevisInfo, PersonnelInfo } from '../types/business.types';
import { AirtableService } from '../services/airtable.service';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import { Map } from 'react-map-gl';
import { Marker } from 'react-map-gl';
import { Modal } from './Modal';
import { useOffline } from '../contexts/OfflineContext';

interface AdminActionsProps {
    commande: CommandeMetier;
    chauffeurs: PersonnelInfo[];
    onUpdate: (updatedCommande: CommandeMetier) => void;
}

const AdminActions: React.FC<AdminActionsProps> = ({ commande, chauffeurs, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [showChauffeursModal, setShowChauffeursModal] = useState(false);
    const [selectedChauffeurs, setSelectedChauffeurs] = useState<string[]>([]);
    const [chauffeursData, setChauffeursData] = useState<PersonnelInfo[]>([]);
    const [isDispatched, setIsDispatched] = useState(commande.chauffeurs?.length > 0);
    const [isDispatching, setIsDispatching] = useState(false);
    const [showChauffeurList, setShowChauffeurList] = useState(false);
    const [showTarifModal, setShowTarifModal] = useState(false);
    const [tarif, setTarif] = useState(commande.financier?.tarifHT || 0);
    const [showFactureModal, setShowFactureModal] = useState(false);
    const [dateFacture, setDateFacture] = useState(new Date().toISOString().split('T')[0]);
    const [showMap, setShowMap] = useState(false);
    const [mapVisible, setMapVisible] = useState(false);
    const [driverLocations, setDriverLocations] = useState<any[]>([]);
    const [driverLocation, setDriverLocation] = useState<{ longitude?: number; latitude?: number } | null>(null);

    const { dataService, isOnline } = useOffline();

    // Suivi en temps réel
    useEffect(() => {
        if (mapVisible && commande.statuts.livraison === 'EN COURS DE LIVRAISON') {
            // Initialiser la carte
            mapboxgl.accessToken = `${import.meta.env.VITE_MAPBOX_TOKEN}`;
            const map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [-8.000337, 12.649319], // Bamako par défaut et [2.3488, 48.8534], Paris par défaut
                zoom: 12
            });

            // Mettre à jour la position
            const interval = setInterval(async () => {
                const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
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
            if (showChauffeursModal) {  // Charger seulement quand le modal est ouvert
                try {
                    const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
                    const personnelData = await dataService.getPersonnel();
                    setChauffeursData(personnelData.filter((p: PersonnelInfo) => p.role === 'Chauffeur'));
                } catch (error) {
                    console.error('Erreur chargement chauffeurs:', error);
                }
            }
        };

        loadChauffeurs();
    }, [showChauffeursModal]);

    const handleDispatchClick = () => {
        setShowChauffeursModal(true);
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

    const renderChauffeursList = () => (
        <div className="max-h-96 overflow-y-auto">
            {chauffeurs.map((chauffeur, index) => (
                <div key={chauffeur.id} className="flex items-center p-2 hover:bg-gray-50">
                    <label className="flex items-center w-full cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedChauffeurs.includes(chauffeur.id)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedChauffeurs([...selectedChauffeurs, chauffeur.id]);
                                } else {
                                    setSelectedChauffeurs(
                                        selectedChauffeurs.filter(id => id !== chauffeur.id)
                                    );
                                }
                            }}
                            className="mr-3"
                        />
                        <div>
                            <div className="font-medium">{chauffeur.nom}</div>
                            <div className="text-sm text-gray-500">{chauffeur.prenom}</div>
                        </div>
                    </label>
                </div>
            ))}
        </div>
    );

    const besoinDevis = commande.livraison?.equipiers > 2;

    const canDispatch = true;
    const hasSelectedChauffeurs = selectedChauffeurs.length > 0;

    const handleDispatch = async () => {
        try {
            setLoading(true);

            // Créer un tableau de chauffeurs sélectionnés avec leurs informations complètes
            const selectedChauffeursData = chauffeursData.filter(chauffeur =>
                selectedChauffeurs.includes(chauffeur.id)
            );

            const updatedCommande = {
                ...commande,
                chauffeurs: selectedChauffeursData,
                statuts: {
                    commande: 'Confirmée' as const,
                    livraison: 'CONFIRMEE' as const
                }
            };

            const result = await dataService.updateCommande(updatedCommande);
            onUpdate(result);
            setShowChauffeursModal(false);
        } catch (error) {
            console.error('Erreur lors du dispatch:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTarifUpdate = async () => {
        try {
            setLoading(true);
            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);

            const updatedFields = {
                'TARIF HT': Number(tarif),
                'DATE DE MISE A JOUR COMMANDE': new Date().toISOString()
            };

            await dataService.updateTarif(commande.id, Number(tarif));

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

            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
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
            {/* Section Dispatch */}
            <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium mb-4">Attribution des chauffeurs</h3>
                <button
                    onClick={() => setShowChauffeursModal(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg"
                // disabled={loading || isDispatched}
                >
                    Dispatcher
                </button>
                {showChauffeursModal && (
                    <Modal
                        isOpen={showChauffeursModal}
                        onClose={() => setShowChauffeursModal(false)}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-4">Sélection des chauffeurs</h2>
                            {chauffeurs.length > 0 ? (
                                <div className="max-h-96 overflow-y-auto">
                                    {chauffeursData.map(chauffeur => (
                                        <div
                                            key={chauffeur.id}
                                            className="flex items-center p-3 border-b"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedChauffeurs.includes(chauffeur.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedChauffeurs([...selectedChauffeurs, chauffeur.id]);
                                                    } else {
                                                        setSelectedChauffeurs(
                                                            selectedChauffeurs.filter(id => id !== chauffeur.id)
                                                        );
                                                    }
                                                }}
                                                className="mr-3"
                                            />
                                            <div>
                                                <div className="font-medium">{chauffeur.prenom} {chauffeur.nom}</div>
                                                <div className="text-sm text-gray-500">{chauffeur.telephone}</div>
                                                <div className="text-sm text-gray-500">Status: {chauffeur.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">Chargement des chauffeurs...</div>
                            )}
                            <div className="mt-4 flex justify-end space-x-2">
                                <button
                                    onClick={() => setShowChauffeursModal(false)}
                                    className="px-4 py-2 border rounded-lg"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDispatch}
                                    disabled={loading || selectedChauffeurs.length === 0}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>

            {/* Section Suivi */}
            {commande.statuts.livraison === 'EN COURS DE LIVRAISON' && (
                <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Suivi en temps réel</h3>
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
            <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium mb-4">Gestion financière</h3>
                <div className="space-y-4 space-x-2">
                    <button
                        onClick={() => setShowTarifModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Définir le tarif
                    </button>

                    {besoinDevis ? (
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
                            disabled={loading || !tarif || commande.statuts.livraison !== 'LIVREE'}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Générer une facture
                        </button>
                    )}
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
            <AnimatePresence>
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
            </AnimatePresence>
        </div>
    );
};

export default AdminActions;