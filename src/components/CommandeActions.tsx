import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CommandeMetier } from '../types/business.types';
import { DocumentService } from '../services/document.service';
import { getDocumentInfo } from '../utils/documents.utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Map, Marker } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import { isValidForModification, validateCommande } from '../utils/validation.utils';
import { Modal } from './Modal';
import AjoutCommande from './AjoutCommande';
import { useNavigate } from 'react-router-dom';
import { ArticlesForm, ClientForm, LivraisonForm, RecapitulatifForm } from './forms';
import { CloudinaryService } from '../services/cloudinary.service';
import { useOffline } from '../contexts/OfflineContext';
import { ApiService } from '../services/api.service';
import { StatusManager } from './StatusManager';

interface CommandeActionsProps {
    commande: CommandeMetier;
    onUpdate: (updatedCommande: CommandeMetier) => void;
    onRefresh?: () => Promise<void>;
}

const CommandeActions: React.FC<CommandeActionsProps> = ({ commande, onUpdate, onRefresh }) => {
    // ✅ PROTECTION : Vérifier commande avant utilisation
    if (!commande) {
        console.warn('⚠️ CommandeActions: commande undefined');
        return <div>Chargement des détails de la commande...</div>;
    }
    if (!commande.statuts) {
        console.warn('⚠️ CommandeActions: commande.statuts undefined');
        return <div>Chargement des statuts de la commande...</div>;
    }

    const { user } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [editData, setEditData] = useState<Partial<CommandeMetier>>(commande);
    const [loading, setLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [mapVisible, setMapVisible] = useState(false);
    const [driverLocation, setDriverLocation] = useState<{ longitude?: number; latitude?: number } | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [driverLocations, setDriverLocations] = useState<any[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);

    const documentService = new DocumentService();
    const apiService = new ApiService();
    const { dataService } = useOffline();

    // Utilisation des validations
    const canModify = isValidForModification(commande);

    // Suivi en temps réel
    useEffect(() => {
        if (mapVisible && commande?.statuts?.livraison === 'EN COURS DE LIVRAISON') {
            // Initialiser la carte
            mapboxgl.accessToken = `${import.meta.env.VITE_MAPBOX_TOKEN}`;
            const map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [2.3488, 48.8534], // Paris par défaut
                zoom: 12
            });

            // Mettre à jour la position
            const interval = setInterval(async () => {
                const updatedCommandes = await apiService.getCommandes();
                const updatedCommande = updatedCommandes.data.find((c: CommandeMetier) => c.id === commande?.id);
                if (updatedCommande?.chauffeurs?.[0]?.location) {
                    setDriverLocation(updatedCommande.chauffeurs[0].location);
                }
            }, 30000);

            return () => {
                clearInterval(interval);
                map.remove();
            };
        }
    }, [mapVisible, commande?.id]);

    // Utilisation de la gestion des documents
    const handleDocumentDownload = async (type: 'facture' | 'devis') => {
        try {
            setDownloading(true);
            const document = await documentService.getCommandeDocument(commande, type);

            if (!document) {
                throw new Error(`Aucun ${type} disponible`);
            }

            const fileName = type === 'facture'
                ? `Facture_${commande?.numeroCommande}.pdf`
                : `Devis_${commande?.numeroCommande}.pdf`;

            documentService.downloadDocument(document, fileName);
        } catch (error) {
            console.error('Erreur lors du téléchargement:', error);
        } finally {
            setDownloading(false);
        }
    };

    const handleModify = () => {
        if (!canModify) {
            console.warn('⚠️ Modification non autorisée');
            alert('Cette commande ne peut plus être modifiée');
            return;
        }

        console.log('📝 Ouverture modal modification');
        setShowEditModal(true);
    };

    // const EditCommandeModal = () => {
    //     return (
    //         <Modal
    //             isOpen={showEditModal}
    //             onClose={() => setShowEditModal(false)}
    //         >
    //             <div className="p-6">
    //                 <h2 className="text-xl font-semibold mb-4">Modifier la commande</h2>
    //                 <AjoutCommande
    //                     commande={commande}
    //                     initialData={commande}
    //                     onSubmit={handleEditSubmit}
    //                     onCancel={() => setShowEditModal(false)}
    //                     isEditing={true}
    //                 />
    //             </div>
    //         </Modal>
    //     );
    // };
    // const handleEditSubmit = async (updatedData: Partial<CommandeMetier>) => {
    //     try {
    //         setLoading(true);

    //         // Préserver la valeur de réserve si elle n'a pas été explicitement modifiée
    //         if (updatedData.livraison && commande?.livraison) {
    //             updatedData.livraison = {
    //                 ...updatedData.livraison,
    //                 reserve: commande?.livraison.reserve
    //             };
    //         }

    //         const result = await dataService.updateCommande({
    //             ...updatedData,
    //             id: commande?.id,
    //             // Préserver les champs qui ne doivent pas être modifiés
    //             numeroCommande: commande?.numeroCommande,
    //             dates: {
    //                 ...commande?.dates,
    //                 misAJour: new Date().toISOString()
    //             }
    //         });

    //         if (onRefresh && typeof onRefresh === 'function') {
    //             await onRefresh();
    //         } else {
    //             onUpdate(result);
    //         }

    //         setShowEditModal(false);
    //     } catch (error) {
    //         console.error('Erreur lors de la modification:', error);
    //     } finally {
    //         setLoading(false);
    //     }
    // };
    const handleSubmitModification = async () => {
        try {
            setLoading(true);
            console.log('📝 ===== SOUMISSION MODIFICATION =====');
            console.log('📝 Données editData:', editData);

            // ✅ STRUCTURE FLAT comme pour la création (qui fonctionne)
            const modifiedData: any = {
                // Champs de base
                dateLivraison: editData.dates?.livraison,
                creneauLivraison: editData.livraison?.creneau,
                categorieVehicule: editData.livraison?.vehicule,
                optionEquipier: Number(editData.livraison?.equipiers || 0),
                tarifHT: Number(editData.financier?.tarifHT || 0),
                reserveTransport: editData.livraison?.reserve || false,
                remarques: editData.livraison?.remarques || '',

                // ✅ CLIENT STRUCTURE FLAT (comme création)
                ...(editData.client && {
                    clientNom: editData.client.nom,
                    clientPrenom: editData.client.prenom,
                    clientTelephone: editData.client.telephone?.principal || editData.client.telephone,
                    clientTelephoneSecondaire: editData.client.telephone?.secondaire || '',
                    clientAdresseLigne1: editData.client.adresse?.ligne1,
                    clientBatiment: editData.client.adresse?.batiment || '',
                    clientEtage: editData.client.adresse?.etage || '',
                    clientInterphone: editData.client.adresse?.interphone || '',
                    clientAscenseur: editData.client.adresse?.ascenseur || false,
                    clientTypeAdresse: editData.client.adresse?.type || 'Domicile'
                }),

                // ✅ ARTICLES STRUCTURE FLAT (comme création)
                ...(editData.articles && {
                    nombreArticles: Number(editData.articles.nombre),
                    detailsArticles: editData.articles.details || '',
                    categoriesArticles: editData.articles.categories || [],
                    dimensionsArticles: editData.articles.dimensions || [],
                    canBeTiltedArticles: editData.articles.canBeTilted || false,
                }),

                ...(editData.livraison && {
                    deliveryConditions: typeof editData.livraison.details === 'string'
                        ? JSON.parse(editData.livraison.details)
                        : editData.livraison.details
                })
            };

            console.log('📝 Données FLAT à envoyer:', modifiedData);

            // ✅ UTILISER PATCH direct avec structure flat
            const result = await apiService.patch(`/commandes/${commande.id}`, modifiedData);

            console.log('✅ Modification réussie');

            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                onUpdate(result as CommandeMetier);
            }

            setShowEditModal(false);
            setIsEditing(false);

        } catch (error) {
            console.error('❌ Erreur modification:', error);
            if (error instanceof Error) {
                alert(`Erreur: ${error.message}`);
            } else {
                alert('Erreur modification');
            }
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, label: 'Client' },
        { id: 2, label: 'Articles' },
        { id: 3, label: 'Livraison' },
        { id: 4, label: 'Confirmer' }
    ];

    const renderEditStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <ClientForm
                        data={editData}
                        onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                        errors={{}} // Add appropriate error handling here
                        handleAddressSearch={async (query: string) => { /* Add appropriate address search handling here */ }} // Add appropriate address search handling here
                        handleAddressSelect={() => { [] }} // Add appropriate address select handling here
                        addressSuggestions={[]} // Add appropriate address suggestions here
                        setAddressSuggestions={() => { }} // Add appropriate setAddressSuggestions handling here
                        isEditing
                    />
                );
            case 2:
                return (
                    <ArticlesForm
                        data={editData}
                        onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                        errors={{}} // Add the errors prop here
                    />
                );
            case 3:
                return (
                    <LivraisonForm
                        data={editData}
                        onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                        showErrors={false}
                        errors={{}}
                        isEditing={true}
                    />
                );
            case 4:
                return (
                    <RecapitulatifForm
                        data={editData}
                        readOnly
                        showErrors={false}
                        errors={{}} // Add appropriate error handling here
                        onChange={() => { }} // Add appropriate onChange handling here
                    />
                );
            default:
                return null;
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const fieldPath = name.split('.');

        setEditData(prev => {
            const newData = { ...prev };
            let current = newData;

            // Navigation dans l'objet jusqu'au champ à modifier
            for (let i = 0; i < fieldPath.length - 1; i++) {
                current[fieldPath[i]] = { ...current[fieldPath[i]] };
                current = current[fieldPath[i]];
            }

            current[fieldPath[fieldPath.length - 1]] = value;
            return newData;
        });
    };

    const handleCancel = async () => {
        try {
            setLoading(true);
            // ✅ UTILISER le nouveau système intelligent
            await dataService.updateStatutsCommande(
                commande?.id,
                'Annulée',
                'ANNULEE',
                'Annulation par magasin'
            );

            if (onRefresh) await onRefresh();
        } catch (error) {
            console.error('Erreur lors de l\'annulation:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-x-16">
                    {canModify ? (
                        <>
                            <button
                                onClick={handleModify}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                            >
                                Modifier
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Annuler
                            </button>
                        </>
                    ) : (
                        <div className="text-gray-500 italic mb-4">
                            Cette commande ne peut plus être modifiée
                        </div>
                    )}
                </div>
            </div>

            {showEditModal && (
                <Modal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                >
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Modifier la commande</h2>
                            <div className="flex space-x-4">
                                {currentStep > 1 && (
                                    <button
                                        onClick={() => setCurrentStep(prev => prev - 1)}
                                        className="px-4 py-2 border rounded-lg"
                                    >
                                        Précédent
                                    </button>
                                )}
                                <button
                                    onClick={handleSubmitModification}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg"
                                >
                                    Confirmer les modifications
                                </button>
                                {currentStep < steps.length && (
                                    <button
                                        onClick={() => setCurrentStep(prev => prev + 1)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                                    >
                                        Suivant
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Étapes */}
                        <div className="flex justify-between mb-8">
                            {steps.map(step => (
                                <div
                                    key={step.id}
                                    className={`flex flex-col items-center ${step.id === currentStep ? 'text-blue-600' : 'text-gray-400'
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">
                                        {step.id}
                                    </div>
                                    <span className="mt-2">{step.label}</span>
                                </div>
                            ))}
                        </div>

                        {renderEditStep()}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 mb-6 ml-6 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        Annuler
                    </button>
                </Modal>
            )}

            {/* Section de suivi */}
            {commande?.statuts?.livraison === 'EN COURS DE LIVRAISON' && (
                <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Suivi des livraisons (BIENTÔT DISPONIBLE)</h3>
                    <div className="flex justify-between items-center mb-4">
                        <span className='text-sm font-medium text-gray-500'>En temps réel</span>
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

            {/* Section des statuts */}
            <StatusManager
                commande={commande}
                onUpdate={onUpdate}
                onRefresh={onRefresh}
                mode="magasin"
                showAdvancedOnly={true}
            />

            {/* Section des documents */}
            <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Documents</h3>
                <div className="space-y-2">
                    {commande?.financier?.factures?.map(facture => (
                        <button
                            key={facture.id}
                            onClick={() => handleDocumentDownload('facture')}
                            disabled={downloading}
                            className="w-full text-left px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            {downloading ? 'Téléchargement...' : `Facture ${facture.numeroFacture}`}
                        </button>
                    ))}

                    {commande?.financier?.devis?.map(devis => (
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