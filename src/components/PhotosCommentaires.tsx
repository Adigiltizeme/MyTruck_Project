import React, { useState, useEffect } from 'react';
import { CommandeMetier } from '../types/business.types';
import { useOffline } from '../contexts/OfflineContext';
import { SecureImage } from './SecureImage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Clock, AlertTriangle, CheckCircle, Edit, Trash2, Save, X } from 'lucide-react';
import PhotoUploader from './PhotoUploader';
import { useAuth } from '../contexts/AuthContext';

interface PhotosCommentairesProps {
    commande: CommandeMetier;
    onUpdate: (commande: CommandeMetier) => void;
    onRefresh?: () => Promise<void>;
    onRapportOperationStart?: () => void;
    onRapportOperationEnd?: () => void;
}

const PhotosCommentaires: React.FC<PhotosCommentairesProps> = ({
    commande,
    onUpdate,
    onRefresh,
    onRapportOperationStart,
    onRapportOperationEnd
}) => {
    const { dataService } = useOffline();
    const { user } = useAuth();

    const [rapports, setRapports] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [editingRapport, setEditingRapport] = useState<{ type: 'ENLEVEMENT' | 'LIVRAISON', id: string } | null>(null);
    const [editMessage, setEditMessage] = useState('');
    const [editPhotos, setEditPhotos] = useState<Array<{ url: string; file?: File }>>([]);
    const [newEditPhotos, setNewEditPhotos] = useState<Array<{ url: string; file: File }>>([]);
    const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);

    useEffect(() => {
        loadRapportsEtPhotos();
    }, [commande.id]);

    const startEditRapport = async (type: 'ENLEVEMENT' | 'LIVRAISON') => {
        const rapport = type === 'ENLEVEMENT'
            ? rapports.enlevement[0]
            : rapports.livraison[0];

        if (!rapport) return;

        setEditingRapport({ type, id: rapport.id });
        setEditMessage(rapport.message);

        // ✅ Charger les photos existantes du rapport
        const photosRapport = rapports.photos[type.toLowerCase()];
        setEditPhotos(photosRapport.map((p: any) => ({ url: p.url })));
        setNewEditPhotos([]);
        setPhotosToRemove([]);
    };

    const cancelEditRapport = () => {
        setEditingRapport(null);
        setEditMessage('');
        setEditPhotos([]);
        setNewEditPhotos([]);
        setPhotosToRemove([]);
    };

    const saveEditRapport = async () => {
        try {
            setLoading(true);

            // ✅ PROTECTION TOTALE : Marquer le début d'opération rapport
            if (onRapportOperationStart) {
                onRapportOperationStart();
            }

            if (!editingRapport) return;

            await dataService.updateRapport(commande.id, editingRapport.type, {
                message: editMessage.trim(),
                newPhotos: newEditPhotos.map(p => ({ url: p.url })),
                photosToRemove
            });

            console.log('✅ Rapport modifié avec succès');

            // ✅ REFRESH
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

            await loadRapportsEtPhotos();
            cancelEditRapport();

            // ✅ PROTECTION TOTALE : Marquer la fin d'opération rapport
            if (onRapportOperationEnd) {
                onRapportOperationEnd();
            }

        } catch (error) {
            console.error('❌ Erreur modification rapport:', error);
            alert(`Erreur: ${error instanceof Error ? error.message : 'Impossible de modifier le rapport'}`);
        } finally {
            setLoading(false);
            // ✅ S'assurer de marquer la fin même en cas d'erreur
            if (onRapportOperationEnd) {
                onRapportOperationEnd();
            }
        }
    };

    const deleteRapport = async (type: 'ENLEVEMENT' | 'LIVRAISON') => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ce rapport ${type.toLowerCase()} ?`)) {
            return;
        }

        try {
            setLoading(true);

            // ✅ PROTECTION TOTALE : Marquer le début d'opération rapport
            if (onRapportOperationStart) {
                onRapportOperationStart();
            }

            await dataService.deleteRapport(commande.id, type);

            console.log('✅ Rapport supprimé avec succès');

            // ✅ REFRESH
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

            await loadRapportsEtPhotos();

            // ✅ PROTECTION TOTALE : Marquer la fin d'opération rapport
            if (onRapportOperationEnd) {
                onRapportOperationEnd();
            }

        } catch (error) {
            console.error('❌ Erreur suppression rapport:', error);
            alert(`Erreur: ${error instanceof Error ? error.message : 'Impossible de supprimer le rapport'}`);
        } finally {
            setLoading(false);
            // ✅ S'assurer de marquer la fin même en cas d'erreur
            if (onRapportOperationEnd) {
                onRapportOperationEnd();
            }
        }
    };

    // ✅ GESTION PHOTOS MODIFICATION
    const handleEditPhotoUpload = async (uploadedPhotos: Array<{ url: string; file: File }>) => {
        setNewEditPhotos(prev => [...prev, ...uploadedPhotos]);
    };

    const removeEditPhoto = (url: string, isNew: boolean = false) => {
        if (isNew) {
            setNewEditPhotos(prev => prev.filter(p => p.url !== url));
        } else {
            setEditPhotos(prev => prev.filter(p => p.url !== url));
            setPhotosToRemove(prev => [...prev, url]);
        }
    };

    const loadRapportsEtPhotos = async () => {
        try {
            setLoading(true);
            const rapportsData = await dataService.getRapportsCommande(commande.id);
            setRapports(rapportsData);
        } catch (error) {
            console.error('❌ Erreur chargement rapports/photos:', error);
        } finally {
            setLoading(false);
        }
    };

    const showImageInSameWindow = (url: string) => {
        window.open(url, '_blank', 'toolbar=0,location=0,menubar=0')?.focus();
    };

    const formatDate = (date: string): string => {
        return format(new Date(date), 'dd/MM/yyyy - HH:mm');
    };

    const renderRapportWithPhotos = (rapport: any, type: 'ENLEVEMENT' | 'LIVRAISON') => {
        const isEditing = editingRapport?.type === type;
        const bgColor = type === 'ENLEVEMENT' ? 'border-orange-200' : 'border-blue-200';
        const headerColor = type === 'ENLEVEMENT' ? 'bg-orange-50' : 'bg-blue-50';
        const textColor = type === 'ENLEVEMENT' ? 'text-orange-800' : 'text-blue-800';
        const icon = type === 'ENLEVEMENT' ? AlertTriangle : CheckCircle;
        const IconComponent = icon;

        return (
            <div className={`border ${bgColor} rounded-lg overflow-hidden`}>
                <div className={`${headerColor} px-4 py-3 border-b ${bgColor}`}>
                    <div className="flex justify-between items-center">
                        <h3 className={`font-medium ${textColor} flex items-center`}>
                            <IconComponent className="w-5 h-5 mr-2" />
                            Rapport {type === 'ENLEVEMENT' ? "d'enlèvement" : "de livraison"}
                        </h3>

                        {/* ✅ BOUTONS MODIFICATION/SUPPRESSION */}
                        {(user?.role === 'chauffeur' || user?.role === 'admin') && (
                            <div className="flex space-x-1">
                                {!isEditing && (
                                    <>
                                        <button
                                            onClick={() => startEditRapport(type)}
                                            className="p-1 text-gray-600 hover:text-blue-600"
                                            title="Modifier le rapport"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteRapport(type)}
                                            className="p-1 text-gray-600 hover:text-red-600"
                                            title="Supprimer le rapport"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                                {isEditing && (
                                    <>
                                        <button
                                            onClick={saveEditRapport}
                                            disabled={loading}
                                            className="p-1 text-green-600 hover:text-green-700"
                                            title="Sauvegarder"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={cancelEditRapport}
                                            className="p-1 text-red-600 hover:text-red-700"
                                            title="Annuler"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Informations du rapport */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center text-sm text-gray-600">
                                <Clock className="w-4 h-4 mr-1" />
                                {formatDate(rapport.createdAt)}
                            </div>
                            <div className="text-sm text-gray-600">
                                {rapport.chauffeur.prenom} {rapport.chauffeur.nom}
                            </div>
                        </div>

                        {/* ✅ MESSAGE MODIFIABLE */}
                        {isEditing ? (
                            <textarea
                                value={editMessage}
                                onChange={(e) => setEditMessage(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
                                rows={3}
                                placeholder="Modifier le message..."
                            />
                        ) : (
                            <p className="text-gray-800 mb-3">{rapport.message}</p>
                        )}
                    </div>

                    {/* ✅ PHOTOS MODIFIABLES */}
                    {isEditing ? (
                        <div className="space-y-4">
                            {/* Photos existantes */}
                            {editPhotos.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Photos existantes
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {editPhotos.map((photo, index) => (
                                            <div key={index} className="relative group">
                                                <SecureImage
                                                    src={photo.url}
                                                    alt={`Photo ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-lg"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditPhoto(photo.url, false)}
                                                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Nouvelles photos */}
                            {newEditPhotos.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nouvelles photos
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {newEditPhotos.map((photo, index) => (
                                            <div key={index} className="relative group">
                                                <SecureImage
                                                    src={photo.url}
                                                    alt={`Nouvelle photo ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-lg border-2 border-green-300"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditPhoto(photo.url, true)}
                                                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Uploader pour nouvelles photos */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ajouter des photos
                                </label>
                                <PhotoUploader
                                    onUpload={handleEditPhotoUpload}
                                    maxPhotos={5 - editPhotos.length - newEditPhotos.length}
                                    existingPhotos={[...editPhotos, ...newEditPhotos].filter((p) =>
                                        p.file !== undefined) as { url: string; file: File }[]}
                                    MAX_SIZE={10 * 1024 * 1024}
                                />
                            </div>
                        </div>
                    ) : (
                        // ✅ AFFICHAGE PHOTOS LECTURE SEULE
                        rapports?.photos?.[type.toLowerCase()]?.length > 0 && (
                            <div>
                                <h4 className="font-medium text-gray-700 mb-3">
                                    Photos du rapport ({rapports.photos[type.toLowerCase()].length})
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {rapports.photos[type.toLowerCase()].map((photo: any, index: number) => (
                                        <div key={photo.id} className="relative group cursor-pointer">
                                            <SecureImage
                                                src={photo.url}
                                                alt={`Photo ${index + 1}`}
                                                className="w-full h-24 object-cover rounded-lg"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                <button
                                                    onClick={() => showImageInSameWindow(photo.url)}
                                                    className={`text-white px-2 py-1 rounded text-xs ${type === 'ENLEVEMENT' ? 'bg-orange-600' : 'bg-blue-600'
                                                        }`}
                                                >
                                                    Voir
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Chargement des rapports et photos...</p>
            </div>
        );
    }

    const hasRapports = rapports && (rapports.enlevement.length > 0 || rapports.livraison.length > 0);
    // const hasPhotos = rapports && (rapports.photos.enlevement.length > 0 || rapports.photos.livraison.length > 0);

    if (!hasRapports) {
        return (
            <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Aucun rapport ou photo de commentaire</p>
                <p className="text-sm mt-2">
                    Les rapports d'enlèvement et de livraison avec leurs photos apparaîtront ici.
                    Créez un rapport dans l'onglet "Informations" pour commencer.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ✅ RAPPORTS D'ENLÈVEMENT avec modification */}
            {rapports.enlevement.length > 0 && rapports.enlevement.map((rapport: any, index: number) =>
                <div key={`enlevement-${rapport.id || index}`}>
                    {renderRapportWithPhotos(rapport, 'ENLEVEMENT')}
                </div>
            )}

            {/* ✅ RAPPORTS DE LIVRAISON avec modification */}
            {rapports.livraison.length > 0 && rapports.livraison.map((rapport: any, index: number) =>
                <div key={`livraison-${rapport.id || index}`}>
                    {renderRapportWithPhotos(rapport, 'LIVRAISON')}
                </div>
            )}

            {/* ✅ ANCIENNE STRUCTURE (fallback pour compatibilité) */}
            {commande.livraison?.commentaireEnlevement && (
                <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Ancien commentaire d'enlèvement
                    </h4>
                    <p className="text-sm text-yellow-700">{commande.livraison.commentaireEnlevement}</p>
                    <p className="text-xs text-yellow-600 mt-2">
                        ⚠️ Format ancien - Migrer vers nouveau système de rapports recommandé
                    </p>
                </div>
            )}

            {commande.livraison?.commentaireLivraison && (
                <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Ancien commentaire de livraison
                    </h4>
                    <p className="text-sm text-yellow-700">{commande.livraison.commentaireLivraison}</p>
                    <p className="text-xs text-yellow-600 mt-2">
                        ⚠️ Format ancien - Migrer vers nouveau système de rapports recommandé
                    </p>
                </div>
            )}

            {/* ✅ INFORMATION POUR L'UTILISATEUR */}
            {user?.role === 'admin' || user?.role === 'chauffeur' && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-start">
                        <MessageSquare className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-medium text-blue-800">Gestion des rapports et photos</h4>
                            <p className="text-sm text-blue-700 mt-1">
                                • <strong>Création</strong> : Utilisez les boutons dans l'onglet "Informations"<br />
                                • <strong>Modification</strong> : Cliquez sur l'icône crayon pour éditer message et photos<br />
                                • <strong>Suppression</strong> : Cliquez sur l'icône corbeille pour supprimer complètement<br />
                                • <strong>Photos</strong> : Ajoutez, supprimez ou remplacez les photos directement ici
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotosCommentaires;