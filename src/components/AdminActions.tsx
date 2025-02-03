import React, { useState } from 'react';
import { CommandeMetier, PersonnelInfo } from '../types/business.types';
import { AirtableService } from '../services/airtable.service';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminActionsProps {
    commande: CommandeMetier;
    chauffeurs: PersonnelInfo[];
    onUpdate: (updatedCommande: CommandeMetier) => void;
}

const AdminActions: React.FC<AdminActionsProps> = ({ commande, chauffeurs, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [selectedChauffeurs, setSelectedChauffeurs] = useState<string[]>([]);
    const [showTarifModal, setShowTarifModal] = useState(false);
    const [tarif, setTarif] = useState(commande.financier?.tarifHT || 0);
    const [showFactureModal, setShowFactureModal] = useState(false);
    const [dateFacture, setDateFacture] = useState(new Date().toISOString().split('T')[0]);

    const besoinDevis = commande.livraison?.equipiers > 2;

    const handleDispatch = async () => {
        try {
            setLoading(true);
            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
            
            const selectedChauffeursDetails = chauffeurs.filter(
                chauffeur => selectedChauffeurs.includes(chauffeur.id)
            );

            const updatedCommande = {
                ...commande,
                chauffeurs: selectedChauffeursDetails,
                statuts: {
                    ...commande.statuts,
                    livraison: 'CONFIRMEE' as const
                }
            };

            await airtableService.updateCommande(updatedCommande);
            onUpdate(updatedCommande);
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
            
            const updatedCommande = {
                ...commande,
                financier: {
                    ...commande.financier,
                    tarifHT: tarif,
                    factures: commande.financier?.factures || [],
                    devis: commande.financier?.devis || []
                }
            };

            await airtableService.updateCommande(updatedCommande);
            onUpdate(updatedCommande);
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
                statut: 'En attente' as const
            };

            const updatedCommande = {
                ...commande,
                financier: {
                    ...commande.financier,
                    factures: [...(commande.financier.factures || []), nouvelleFacture]
                }
            };

            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
            await airtableService.updateCommande(updatedCommande);
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
                    devis: [...(commande.financier.devis || []), nouveauDevis]
                }
            };

            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
            await airtableService.updateCommande(updatedCommande);
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {chauffeurs.filter(c => c.status === 'Actif').map(chauffeur => (
                        <label key={chauffeur.id} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={selectedChauffeurs.includes(chauffeur.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedChauffeurs([...selectedChauffeurs, chauffeur.id]);
                                    } else {
                                        setSelectedChauffeurs(selectedChauffeurs.filter(id => id !== chauffeur.id));
                                    }
                                }}
                                className="rounded text-primary focus:ring-primary"
                            />
                            <span>{chauffeur.prenom} {chauffeur.nom}</span>
                        </label>
                    ))}
                </div>
                <button
                    onClick={handleDispatch}
                    disabled={loading || selectedChauffeurs.length === 0}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                    Dispatcher
                </button>
            </div>

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