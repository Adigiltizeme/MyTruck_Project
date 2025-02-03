import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CommandeMetier } from '../types/business.types';
import { AirtableService } from '../services/airtable.service';
import { DocumentService } from '../services/document.service';
import { getDocumentInfo } from '../utils/documents.utils';
import { motion } from 'framer-motion';
import { Map, Marker } from 'react-map-gl';
import { getStatutCommandeStyle, getStatutLivraisonStyle } from '../helpers/getStatus';
import { isValidForModification, validateCommande } from '../utils/validation.utils';

interface CommandeActionsProps {
    commande: CommandeMetier;
    onUpdate: (updatedCommande: CommandeMetier) => void;
}

const CommandeActions: React.FC<CommandeActionsProps> = ({ commande, onUpdate }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [driverLocation, setDriverLocation] = useState<{ longitude?: number; latitude?: number } | null>(null);
    const [downloading, setDownloading] = useState(false);

    const documentService = new DocumentService(import.meta.env.VITE_AIRTABLE_TOKEN);
    const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);

    // Utilisation des validations
    const canModify = isValidForModification(commande);
    const canConfirmTransmission = validateCommande.canConfirmTransmission(commande);

    // Utilisation de la gestion des documents
    const handleDocumentDownload = async (type: 'facture' | 'devis') => {
        try {
            setDownloading(true);
            const document = await documentService.getCommandeDocument(commande, type);

            if (!document) {
                throw new Error(`Aucun ${type} disponible`);
                return;
            }

            const fileName = type === 'facture'
                ? `Facture_${commande.numeroCommande}.pdf`
                : `Devis_${commande.numeroCommande}.pdf`;

            documentService.downloadDocument(document, fileName);
        } catch (error) {
            console.error('Erreur lors du téléchargement:', error);
        } finally {
            setDownloading(false);
        }
    };

    const handleModify = () => {
        setIsEditing(true);
        // Navigation vers le formulaire d'édition
    };

    const handleCancel = async () => {
        try {
            setLoading(true);
            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);

            if (!commande.id) {
                throw new Error('ID de commande manquant');
            }

            const updatedCommande = {
                ...commande,
                statuts: {
                    ...commande.statuts,
                    commande: 'Annulée' as const,
                    livraison: 'ANNULEE' as const
                }
            };

            await airtableService.updateCommande(updatedCommande);
            onUpdate(updatedCommande);
        } catch (error) {
            console.error('Erreur lors de l\'annulation:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmTransmission = async () => {
        try {
            setLoading(true);
            const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
            const updatedCommande = {
                ...commande,
                statuts: {
                    ...commande.statuts,
                    commande: 'Transmise' as const,
                    livraison: 'ENLEVEE' as const
                }
            };
            await airtableService.updateCommande(updatedCommande);
            onUpdate(updatedCommande);
        } catch (error) {
            console.error('Erreur lors de la confirmation:', error);
        } finally {
            setLoading(false);
        }
    };

    // Suivi en temps réel
    useEffect(() => {
        if (commande.statuts.livraison === 'EN COURS DE LIVRAISON') {
            // Implémentation du suivi en temps réel
            const interval = setInterval(async () => {
                const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
                const updatedCommandes = await airtableService.getCommandes();
                if (updatedCommandes && updatedCommandes.length > 0) {
                    const updatedCommande = updatedCommandes[0];
                    onUpdate(updatedCommande);
                    if (updatedCommande.chauffeurs?.[0]?.location) {
                        setDriverLocation(updatedCommande.chauffeurs[0].location);
                    }
                }
            }, 30000); // Mise à jour toutes les 30 secondes

            return () => clearInterval(interval);
        }
    }, [commande.id, commande.statuts.livraison]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-x-16">
                    {canModify && (
                        <>
                            <button
                                onClick={handleModify}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Modifier
                            </button>
                            <button
                                onClick={() => handleCancel()}
                                disabled={loading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Annuler
                            </button>
                        </>
                    )}
                    {canConfirmTransmission && (
                        <button
                            onClick={handleConfirmTransmission}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Confirmer la transmission
                        </button>
                    )}
                </div>
            </div>

            {/* Section de suivi */}
            {commande.statuts.livraison === 'EN COURS DE LIVRAISON' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4"
                >
                    <button
                        onClick={() => setShowMap(!showMap)}
                        className="px-4 py-2 bg-primary text-white rounded-lg"
                    >
                        {showMap ? 'Masquer la carte' : 'Voir sur la carte'}
                    </button>

                    {showMap && driverLocation && (
                        <div className="h-64 mt-4">
                            <Map
                                initialViewState={{
                                    longitude: driverLocation.longitude,
                                    latitude: driverLocation.latitude,
                                    zoom: 14
                                }}
                                style={{ width: '100%', height: '100%' }}
                                mapStyle="mapbox://styles/mapbox/streets-v11"
                            >
                                <Marker
                                    longitude={driverLocation.longitude ?? 0}
                                    latitude={driverLocation.latitude ?? 0}
                                    color="#E11D48"
                                />
                            </Map>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Section des documents */}
            <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Documents</h3>
                <div className="space-y-2">
                    {commande.financier?.factures?.map(facture => (
                        <button
                            key={facture.id}
                            onClick={() => handleDocumentDownload('facture')}
                            disabled={downloading}
                            className="w-full text-left px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            {downloading ? 'Téléchargement...' : `Facture ${facture.numeroFacture}`}
                        </button>
                    ))}

                    {commande.financier?.devis?.map(devis => (
                        <button
                            key={devis.id}
                            onClick={() => handleDocumentDownload('devis')}
                            disabled={downloading}
                            className="w-full text-left px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            {downloading ? 'Téléchargement...' : `Devis ${devis.numeroDevis}`}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommandeActions;