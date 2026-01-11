/**
 * RÈGLE MÉTIER IMPORTANTE : RÉSERVE MY TRUCK
 *
 * La "Réserve My Truck" est un indicateur crucial qui signale à la direction
 * qu'une commande a rencontré des problèmes nécessitant une attention particulière.
 *
 * COMPORTEMENT :
 * - Dès qu'un rapport (enlèvement OU livraison) est créé → Réserve = OUI
 * - Si tous les rapports sont supprimés → Réserve = NON
 * - Visible dans le tableau des commandes (Deliveries.tsx)
 * - Permet à la direction d'identifier rapidement les commandes problématiques
 *
 * CAS D'USAGE :
 * - Produit abîmé lors enlèvement → Rapport enlèvement → Réserve OUI
 * - Client absent lors livraison → Rapport livraison → Réserve OUI
 * - Difficultés d'accès → Rapport → Réserve OUI
 */

import React, { useState, useEffect } from 'react';
import { isAdminRole } from '../utils/role-helpers';
import { CommandeMetier, PersonnelInfo } from '../types/business.types';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';
import PhotoUploader from './PhotoUploader';
import { AlertTriangle, MessageSquare, Clock, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RapportManagerProps {
    commande: CommandeMetier;
    onUpdate: (commande: CommandeMetier) => void;
    onRefresh?: () => Promise<void>;
    onRapportOperationStart?: () => void;
    onRapportOperationEnd?: () => void;
}

export const RapportManager: React.FC<RapportManagerProps> = ({
    commande,
    onUpdate,
    onRefresh,
    onRapportOperationStart,
    onRapportOperationEnd
}) => {
    const { user } = useAuth();
    const { dataService } = useOffline();

    const [showCreateRapport, setShowCreateRapport] = useState(false);
    const [rapportType, setRapportType] = useState<'ENLEVEMENT' | 'LIVRAISON'>('ENLEVEMENT');
    const [message, setMessage] = useState('');
    const [photos, setPhotos] = useState<Array<{ url: string; file: File }>>([]);
    const [loading, setLoading] = useState(false);
    const [rapports, setRapports] = useState<any>(null);
    const [isObligatoire, setIsObligatoire] = useState(false);

    // ✅ État pour photos de preuve de livraison (après LIVREE)
    const [showAddPhotos, setShowAddPhotos] = useState(false);
    const [loadingPreuve, setLoadingPreuve] = useState(false);

    // ✅ Charger les rapports existants
    useEffect(() => {
        loadRapports();
    }, [commande.id]);

    // ✅ Vérifier si rapport obligatoire (statut ECHEC)
    useEffect(() => {
        checkObligationRapport();
    }, [commande.statuts?.livraison, rapports]);

    const checkObligationRapport = async () => {
        try {
            if (commande.statuts?.livraison === 'ECHEC') {
                // Vérifier si rapport livraison manquant
                if (!rapports?.livraison || rapports.livraison.length === 0) {
                    setIsObligatoire(true);
                    setRapportType('LIVRAISON');
                    return;
                }
            }
            setIsObligatoire(false);
        } catch (error) {
            console.error('Erreur vérification obligation rapport:', error);
        }
    };

    const loadRapports = async () => {
        try {
            const rapportsData = await dataService.getRapportsCommande(commande.id);
            setRapports(rapportsData);
        } catch (error) {
            console.error('❌ Erreur chargement rapports:', error);
        }
    };

    const handleCreateRapport = async () => {
        try {
            setLoading(true);

            // ✅ PROTECTION TOTALE : Marquer le début d'opération rapport
            if (onRapportOperationStart) {
                onRapportOperationStart();
            }

            // ✅ Validation
            if (!message.trim()) {
                alert('Veuillez saisir un message');
                return;
            }

            const chauffeurId = user?.role === 'chauffeur'
                ? user.id
                : commande.chauffeurs?.[0]?.id;

            if (!chauffeurId) {
                alert('Aucun chauffeur disponible');
                return;
            }

            // ✅ Créer le rapport
            await dataService.createRapport(commande.id, {
                message: message.trim(),
                type: rapportType,
                chauffeurId,
                photos: photos.map(p => ({ url: p.url })),
                obligatoire: isObligatoire
            });

            console.log('✅ Rapport créé avec succès');

            // ✅ NOTIFICATION RÉSERVE
            if (!commande.reserve && !commande.livraison?.reserve) {
                console.log('📢 Réserve My Truck activée automatiquement');
                // Optionnel : notification toast
                if (typeof window !== 'undefined') {
                    const event = new CustomEvent('reserve-activated', {
                        detail: { message: 'Réserve My Truck activée suite au rapport' }
                    });
                    window.dispatchEvent(event);
                }
            }

            // ✅ NOTIFICATION si c'était obligatoire
            if (isObligatoire) {
                console.log('📋 Rapport obligatoire créé avec succès');
                if (typeof window !== 'undefined') {
                    const event = new CustomEvent('rapport-obligatoire-complete', {
                        detail: {
                            message: 'Rapport obligatoire créé suite au statut ECHEC',
                            type: rapportType
                        }
                    });
                    window.dispatchEvent(event);
                }
            }

            // ✅ REFRESH avec contexte (pattern éprouvé)
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

            // ✅ Reset form
            setMessage('');
            setPhotos([]);
            setShowCreateRapport(false);
            setIsObligatoire(false);
            await loadRapports();

            // ✅ PROTECTION TOTALE : Marquer la fin d'opération rapport
            if (onRapportOperationEnd) {
                onRapportOperationEnd();
            }

        } catch (error) {
            console.error('❌ Erreur création rapport:', error);
            alert(`Erreur: ${error instanceof Error ? error.message : 'Impossible de créer le rapport'}`);
        } finally {
            setLoading(false);
            // ✅ S'assurer de marquer la fin même en cas d'erreur
            if (onRapportOperationEnd) {
                onRapportOperationEnd();
            }
        }
    };

    const handlePhotoUpload = async (uploadedPhotos: Array<{ url: string; file: File }>) => {
        setPhotos(prev => [...prev, ...uploadedPhotos]);
    };

    const handlePreuveLivraisonUpload = async (uploadedPhotos: Array<{ url: string; file: File }>) => {
        try {
            setLoadingPreuve(true);

            // ✅ ENVOI IMMÉDIAT des photos (pas d'attente)
            await dataService.addPhotosLivraison(commande.id, {
                photos: uploadedPhotos.map(p => ({ url: p.url, filename: p.file?.name }))
            });

            // ✅ REFRESH pour afficher les nouvelles photos
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

            await loadRapports();

        } catch (error) {
            console.error('❌ Erreur ajout preuve livraison:', error);
            alert(`Erreur: ${error instanceof Error ? error.message : 'Impossible d\'ajouter les photos'}`);
        } finally {
            setLoadingPreuve(false);
        }
    };


    const canCreateRapport = (type: 'ENLEVEMENT' | 'LIVRAISON'): boolean => {
        if (!rapports) return false;

        // ✅ Un seul rapport par type
        if (type === 'ENLEVEMENT') {
            return rapports.enlevement.length === 0;
        } else {
            return rapports.livraison.length === 0;
        }
    };

    const formatRapportDate = (date: string): string => {
        return format(new Date(date), 'dd/MM/yyyy - HH:mm');
    };

    const showImageInSameWindow = (url: string) => {
        window.open(url, '_blank', 'toolbar=0,location=0,menubar=0')?.focus();
    };

    const deletePhotoLivraison = async (photoUrl: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo de preuve de livraison ?')) {
            return;
        }

        try {
            setLoadingPreuve(true);

            // Appeler l'endpoint de suppression de photo
            await dataService.deletePhoto(commande.id, photoUrl);

            // Refresh
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

            await loadRapports();

        } catch (error) {
            console.error('❌ Erreur suppression photo:', error);
            alert(`Erreur: ${error instanceof Error ? error.message : 'Impossible de supprimer la photo'}`);
        } finally {
            setLoadingPreuve(false);
        }
    };

    const renderRapportCard = (rapport: any, type: 'ENLEVEMENT' | 'LIVRAISON') => {
        const bgColor = type === 'ENLEVEMENT' ? 'bg-orange-50' : 'bg-blue-50';
        const borderColor = type === 'ENLEVEMENT' ? 'border-orange-200' : 'border-blue-200';
        const textColor = type === 'ENLEVEMENT' ? 'text-orange-800' : 'text-blue-800';

        return (
            <div key={rapport.id} className={`${bgColor} ${borderColor} border p-4 rounded-lg`}>
                <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-medium ${textColor}`}>
                        Rapport {type === 'ENLEVEMENT' ? "d'enlèvement" : "de livraison"}
                    </h4>
                    <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatRapportDate(rapport.createdAt)}
                    </div>
                </div>

                {/* ✅ MESSAGE LECTURE SEULE */}
                <p className="text-gray-700 mb-2">{rapport.message}</p>

                <p className="text-sm text-gray-600">
                    Par: {rapport.chauffeur.prenom} {rapport.chauffeur.nom}
                </p>

                {/* ✅ INDICATION PHOTOS (sans affichage) */}
                {rapports?.photos?.[type.toLowerCase()]?.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2">
                        📸 {rapports.photos[type.toLowerCase()].length} photo(s) disponible(s)
                        dans l'onglet "Photos commentaires"
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Rapports/Commentaires
                </h3>

                {/* ✅ Bouton création si permissions et possible */}
                {(user?.role === 'chauffeur' || isAdminRole(user?.role)) && (
                    <div className="flex space-x-2">
                        {canCreateRapport('ENLEVEMENT') && ['CONFIRMEE', 'ENLEVEE'].includes(commande.statuts?.livraison || '') && (
                            <button
                                onClick={() => {
                                    setRapportType('ENLEVEMENT');
                                    setIsObligatoire(false);
                                    setShowCreateRapport(true);
                                }}
                                className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm"
                                title="Signaler un problème lors de l'enlèvement"
                            >
                                Rapport Enlèvement
                            </button>
                        )}

                        {canCreateRapport('LIVRAISON') && ['EN COURS DE LIVRAISON', 'ECHEC'].includes(commande.statuts?.livraison || '') && (
                            <button
                                onClick={() => {
                                    setRapportType('LIVRAISON');
                                    setIsObligatoire(false);
                                    setShowCreateRapport(true);
                                }}
                                className={`px-3 py-2 text-white rounded-lg text-sm ${isObligatoire ? 'bg-red-600' : 'bg-blue-600'
                                    }`}
                                title="Signaler un problème lors de la livraison"
                            >
                                {isObligatoire ? 'Rapport Obligatoire' : 'Rapport Livraison'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ✅ Avertissement rapport obligatoire */}
            {isObligatoire && canCreateRapport('LIVRAISON') && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Rapport de livraison obligatoire</p>
                        <p className="text-sm">
                            La livraison est {commande.statuts?.livraison}. Un rapport expliquant les raisons de l'échec est requis pour la traçabilité.
                        </p>
                    </div>
                </div>
            )}

            {/* ✅ INFORMATION MÉTIER CLAIRE */}
            {isAdminRole(user?.role) || user?.role === 'chauffeur' && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                    <p className="text-blue-800">
                        <strong>ℹ️ Les rapports</strong> permettent de signaler des problèmes et activent la "Réserve My Truck"
                        sans changer automatiquement le statut de livraison.
                        Les photos et modifications sont<br />disponibles dans l'onglet "Photos commentaires".
                    </p>
                </div>
            )}

            {/* ✅ Affichage des rapports existants */}
            {rapports && (
                <div className="space-y-4">
                    {rapports.enlevement.map((rapport: any) =>
                        renderRapportCard(rapport, 'ENLEVEMENT')
                    )}
                    {rapports.livraison.map((rapport: any) =>
                        renderRapportCard(rapport, 'LIVRAISON')
                    )}
                </div>
            )}

            {/* ✅ Modal création avec indication obligation */}
            {showCreateRapport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-medium mb-4">
                            Créer un rapport {rapportType === 'ENLEVEMENT' ? "d'enlèvement" : "de livraison"}
                            {isObligatoire && (
                                <span className="text-red-600 ml-2 font-bold">
                                    (OBLIGATOIRE - Statut ECHEC)
                                </span>
                            )}
                        </h3>

                        {/* ✅ Avertissement si obligatoire */}
                        {isObligatoire && (
                            <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded">
                                <p className="text-red-800 text-sm">
                                    <strong>⚠️ Rapport obligatoire :</strong> Ce rapport est requis pour justifier
                                    le statut ECHEC de la livraison et assurer la traçabilité.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Décrivez le problème rencontré *
                                    {isObligatoire && <span className="text-red-600"> (Obligatoire)</span>}
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    rows={4}
                                    placeholder={
                                        rapportType === 'ENLEVEMENT'
                                            ? "Ex: Produit endommagé au magasin, article manquant, accès difficile..."
                                            : isObligatoire
                                                ? "Ex: Client absent, adresse introuvable, refus de livraison, conditions météo dangereuses..."
                                                : "Ex: Client absent, adresse introuvable, produit refusé, accès impossible..."
                                    }
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Photos {isObligatoire ? "(recommandées)" : "(optionnelles)"}
                                </label>
                                <PhotoUploader
                                    onUpload={handlePhotoUpload}
                                    maxPhotos={5 - photos.length}
                                    existingPhotos={photos}
                                    MAX_SIZE={10 * 1024 * 1024}
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    onClick={() => {
                                        if (isObligatoire && !confirm('Ce rapport est obligatoire. Êtes-vous sûr de vouloir annuler ?')) {
                                            return;
                                        }
                                        setShowCreateRapport(false);
                                        setMessage('');
                                        setPhotos([]);
                                        setIsObligatoire(false);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                                    disabled={loading}
                                >
                                    {isObligatoire ? 'Annuler (obligatoire)' : 'Annuler'}
                                </button>
                                <button
                                    onClick={handleCreateRapport}
                                    disabled={loading || !message.trim()}
                                    className={`px-4 py-2 text-white rounded-md ${isObligatoire ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                                        } disabled:opacity-50`}
                                >
                                    {loading ? 'Création...' :
                                        isObligatoire ? 'Créer rapport obligatoire' : 'Créer le rapport'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ Message si aucun rapport */}
            {rapports && rapports.enlevement.length === 0 && rapports.livraison.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                    Aucun rapport créé pour cette commande
                </p>
            )}

            {/* ✅ NOUVELLE SECTION : Preuve de livraison (après statut LIVREE) */}
            {commande.statuts?.livraison === 'LIVREE' &&
                (user?.role === 'chauffeur' || isAdminRole(user?.role)) && (
                    <div className="mt-6 border-t pt-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-800 flex items-center mb-3">
                                ✅ Livraison réussie - Photos de preuve
                            </h4>

                            {/* Affichage des photos existantes */}
                            {rapports?.photos?.livraison && rapports.photos.livraison.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm text-green-700 mb-2">
                                        📸 {rapports.photos.livraison.length} photo(s) de preuve de livraison
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {rapports.photos.livraison.map((photo: any, index: number) => (
                                            <div key={photo.id || index} className="relative group">
                                                <img
                                                    src={photo.url}
                                                    alt={`Preuve de livraison ${index + 1}`}
                                                    className="w-full h-32 object-cover rounded border border-green-300 cursor-pointer hover:opacity-90"
                                                    onClick={() => showImageInSameWindow(photo.url)}
                                                />
                                                {/* Boutons actions */}
                                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => showImageInSameWindow(photo.url)}
                                                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                        title="Voir en grand"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => deletePhotoLivraison(photo.url)}
                                                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bouton pour afficher le PhotoUploader */}
                            {!showAddPhotos ? (
                                <button
                                    onClick={() => setShowAddPhotos(true)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                                >
                                    📸 Ajouter des photos
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-green-700">
                                            Ajoutez des photos (signature client, colis déposé, etc.) - Envoi immédiat
                                        </p>
                                        <button
                                            onClick={() => setShowAddPhotos(false)}
                                            className="text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            ✕ Fermer
                                        </button>
                                    </div>
                                    <PhotoUploader
                                        onUpload={handlePreuveLivraisonUpload}
                                        existingPhotos={[]}
                                    />
                                    {loadingPreuve && (
                                        <div className="mt-2 text-sm text-blue-600">
                                            ⏳ Envoi en cours...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
        </div>
    );
};

export default RapportManager;