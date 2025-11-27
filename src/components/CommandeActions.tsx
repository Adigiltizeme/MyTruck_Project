import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CommandeMetier } from '../types/business.types';
import { DocumentService } from '../services/document.service';
import { getDocumentInfo } from '../utils/documents.utils';
import { AnimatePresence, motion } from 'framer-motion';
import { isValidForModification, validateCommande } from '../utils/validation.utils';
import { Modal } from './Modal';
import AjoutCommande from './AjoutCommande';
import { useNavigate } from 'react-router-dom';
import { ArticlesForm, ClientForm, LivraisonForm, RecapitulatifForm, MagasinDestinationForm } from './forms';
import { CloudinaryService } from '../services/cloudinary.service';
import { useOffline } from '../contexts/OfflineContext';
import { ApiService } from '../services/api.service';
import { StatusManager } from './StatusManager';
import { LiveTrackingMap } from './LiveTrackingMap';
import { useDriverTracking } from '../hooks/useDriverTracking';
import { DriverTrackingToggle } from './DriverTrackingToggle';

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
    const [mapVisible, setMapVisible] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const documentService = new DocumentService();
    const apiService = new ApiService();
    const { dataService } = useOffline();

    // Utilisation des validations
    const canModify = isValidForModification(commande);

    // Hook de tracking GPS temps réel
    const token = localStorage.getItem('authToken');
    const { drivers } = useDriverTracking(token);

    // ✅ Filtrer les chauffeurs liés à cette commande PAR commandeId (pas chauffeurId)
    const commandeDrivers = drivers.filter(d => d.commandeId === commande.id);

    // Debug GPS tracking
    console.log('[CommandeActions] GPS Debug:', {
        commandeId: commande.id,
        allDrivers: drivers,
        commandeDrivers,
        driversCount: drivers.length,
        matchedCount: commandeDrivers.length
    });

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
                    autresArticles: Number(editData.articles.autresArticles || 0),
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

    // Détecter si c'est une cession en vérifiant le type
    const isCession = commande.type === 'INTER_MAGASIN';

    const steps = isCession
        ? [
            { id: 1, label: 'Articles' },
            { id: 2, label: 'Magasin' },
            { id: 3, label: 'Livraison' },
            { id: 4, label: 'Confirmer' }
        ]
        : [
            { id: 1, label: 'Articles' },
            { id: 2, label: 'Client' },
            { id: 3, label: 'Livraison' },
            { id: 4, label: 'Confirmer' }
        ];

    const renderEditStep = () => {
        if (isCession) {
            // Pour les cessions: Articles → Magasin → Livraison → Confirmer
            switch (currentStep) {
                case 1:
                    return (
                        <ArticlesForm
                            data={editData}
                            onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                            errors={{}}
                        />
                    );
                case 2:
                    return (
                        <MagasinDestinationForm
                            data={editData}
                            onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                            errors={{}}
                            isEditing={true}
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
                            isCession={true}
                        />
                    );
                case 4:
                    return (
                        <RecapitulatifForm
                            data={editData}
                            readOnly
                            showErrors={false}
                            errors={{}}
                            onChange={() => { }}
                            isCession={true}
                        />
                    );
                default:
                    return null;
            }
        } else {
            // Pour les commandes: Articles → Client → Livraison → Confirmer
            switch (currentStep) {
                case 1:
                    return (
                        <ArticlesForm
                            data={editData}
                            onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                            errors={{}}
                        />
                    );
                case 2:
                    return (
                        <ClientForm
                            data={editData}
                            onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                            errors={{}}
                            handleAddressSearch={async (query: string) => { }}
                            handleAddressSelect={() => { [] }}
                            addressSuggestions={[]}
                            setAddressSuggestions={() => { }}
                            isEditing
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
                            errors={{}}
                            onChange={() => { }}
                        />
                    );
                default:
                    return null;
            }
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

            {/* ✅ Toggle GPS pour Chauffeurs */}
            {user?.role === 'chauffeur' && commande?.statuts?.livraison === 'EN COURS DE LIVRAISON' && (
                <div className="mb-4">
                    <DriverTrackingToggle
                        commandeId={commande.id}
                        statutLivraison={commande.statuts.livraison}
                        isDeliveryActive={true}
                    />
                </div>
            )}

            {/* Section Suivi GPS Temps Réel (Carte pour Magasins) */}
            {import.meta.env.DEV && commande?.statuts?.livraison === 'EN COURS DE LIVRAISON' && (
                <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md"
                        >
                            {mapVisible ? 'Masquer la carte' : 'Voir sur la carte'}
                        </button>
                    </div>
                    {mapVisible && (
                        <div className="mt-4 rounded-lg overflow-hidden shadow-lg border-2 border-green-200 relative">
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