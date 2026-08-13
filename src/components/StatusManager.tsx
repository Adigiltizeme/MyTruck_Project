import React, { useState, useRef, useCallback } from 'react';
import { CommandeMetier } from '../types/business.types';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { getStatutCommandeStyle, getStatutLivraisonStyle } from '../styles/getStatus';
import { isAdminRole } from '../utils/role-helpers';
import { CloudinaryService } from '../services/cloudinary.service';

interface StatusManagerProps {
    commande: CommandeMetier;
    onUpdate: (commande: CommandeMetier) => void;
    onRefresh?: () => Promise<void>;
    mode?: 'admin' | 'direction' | 'magasin' | 'chauffeur';
    showAdvancedOnly?: boolean;
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
    const [selectedStatutCommande, setSelectedStatutCommande] = useState(() => {
        const statut = commande.statuts?.commande || '';
        const statutAny = statut as any;
        if (statutAny === 'ANNULEE') return 'Annulée';
        if (statutAny === 'EN ATTENTE') return 'En attente';
        if (statutAny === 'CONFIRMEE') return 'Confirmée';
        if (statutAny === 'MODIFIEE') return 'Modifiée';
        return statut;
    });
    const [selectedStatutLivraison, setSelectedStatutLivraison] = useState(commande.statuts?.livraison || '');

    // ── Modal ENLEVEE ──────────────────────────────────────────────────────────
    const [showEnleveeModal, setShowEnleveeModal] = useState(false);
    const [enleveePhotos, setEnleveePhotos] = useState<Array<{ url: string }>>([]);
    const [uploadingEnlevee, setUploadingEnlevee] = useState(false);
    const [confirmingEnlevee, setConfirmingEnlevee] = useState(false);
    const enleveeFileRef = useRef<HTMLInputElement>(null);
    const enleveeCameraRef = useRef<HTMLInputElement>(null);

    // ── Modal LIVREE ───────────────────────────────────────────────────────────
    const [showLivreeModal, setShowLivreeModal] = useState(false);
    const [livreePhotos, setLivreePhotos] = useState<Array<{ url: string }>>([]);
    const [uploadingLivree, setUploadingLivree] = useState(false);
    const [confirmingLivree, setConfirmingLivree] = useState(false);
    const livreeFileRef = useRef<HTMLInputElement>(null);
    const livreeCameraRef = useRef<HTMLInputElement>(null);
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    // ── Règles métier ──────────────────────────────────────────────────────────
    const canModifyCommandeStatus = () => {
        if (isAdminRole(user?.role)) return true;
        if (user?.role === 'magasin') {
            return commande.statuts?.livraison !== 'ENLEVEE' &&
                commande.statuts?.livraison !== 'EN COURS DE LIVRAISON' &&
                commande.statuts?.livraison !== 'LIVREE' &&
                commande.statuts?.livraison !== 'ANNULEE';
        }
        return false;
    };

    const canModifyLivraisonStatus = () => {
        if (isAdminRole(user?.role)) return true;
        if (user?.role === 'chauffeur') return commande.statuts?.livraison !== 'ANNULEE';
        return false;
    };

    // ── Mise à jour statut de base ─────────────────────────────────────────────
    const doStatusUpdate = async (type: 'commande' | 'livraison', newStatus: string) => {
        setLoading(true);
        try {
            if (type === 'commande') {
                await dataService.updateStatutsCommande(commande.id, newStatus, undefined, `Action rapide: ${newStatus}`);
            } else {
                await dataService.updateStatutsCommande(commande.id, undefined, newStatus, `Action rapide: ${newStatus}`);
            }
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) onUpdate(freshCommande);
            }
        } catch (error) {
            const msg = typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message?: string }).message
                : undefined;
            alert(`Erreur: ${msg || 'Impossible de mettre à jour le statut'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickStatusUpdate = async (type: 'commande' | 'livraison', newStatus: string) => {
        // Intercepter ENLEVEE → modal photo obligatoire
        if (type === 'livraison' && newStatus === 'ENLEVEE') {
            setEnleveePhotos([]);
            setShowEnleveeModal(true);
            return;
        }
        // Intercepter LIVREE → modal photo + signature obligatoires
        if (type === 'livraison' && newStatus === 'LIVREE') {
            setLivreePhotos([]);
            setHasSignature(false);
            setShowLivreeModal(true);
            // Reset canvas après l'ouverture
            setTimeout(() => {
                const canvas = signatureCanvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }, 50);
            return;
        }
        await doStatusUpdate(type, newStatus);
    };

    // ── Upload photos commun ───────────────────────────────────────────────────
    const uploadFiles = async (
        files: FileList,
        setPhotos: React.Dispatch<React.SetStateAction<Array<{ url: string }>>>,
        setUploading: (v: boolean) => void
    ) => {
        setUploading(true);
        try {
            const cloudinaryService = new CloudinaryService();
            for (const file of Array.from(files)) {
                const result = await cloudinaryService.uploadImage(file);
                setPhotos(prev => [...prev, { url: result.url }]);
            }
        } catch (err) {
            alert('Erreur lors de l\'upload de la photo');
        } finally {
            setUploading(false);
        }
    };

    // ── Confirmer ENLEVEE ──────────────────────────────────────────────────────
    const handleConfirmEnlevee = async () => {
        if (enleveePhotos.length === 0) return;
        setConfirmingEnlevee(true);
        try {
            await dataService.addPhotosLivraison(commande.id, {
                photos: enleveePhotos.map(p => ({ url: p.url, type: 'ENLEVEMENT' }))
            });
            setShowEnleveeModal(false);
            await doStatusUpdate('livraison', 'ENLEVEE');
        } catch (error) {
            const msg = typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message?: string }).message : undefined;
            alert(`Erreur: ${msg || 'Impossible de confirmer l\'enlèvement'}`);
        } finally {
            setConfirmingEnlevee(false);
        }
    };

    // ── Signature canvas ───────────────────────────────────────────────────────
    const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        const pos = getCanvasPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const pos = getCanvasPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    // ── Confirmer LIVREE ───────────────────────────────────────────────────────
    const handleConfirmLivree = async () => {
        if (livreePhotos.length === 0 || !hasSignature) return;
        setConfirmingLivree(true);
        try {
            // 1. Sauvegarder les photos de preuve
            await dataService.addPhotosLivraison(commande.id, {
                photos: livreePhotos.map(p => ({ url: p.url, type: 'PREUVE_LIVRAISON' }))
            });

            // 2. Uploader la signature et la sauvegarder
            const canvas = signatureCanvasRef.current;
            if (canvas) {
                const dataUrl = canvas.toDataURL('image/png');
                const arr = dataUrl.split(',');
                const mimeMatch = arr[0].match(/:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                const bstr = atob(arr[1]);
                const u8arr = new Uint8Array(bstr.length);
                for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
                const signatureFile = new File([u8arr], 'signature_client.png', { type: mime });
                const cloudinaryService = new CloudinaryService();
                const sigResult = await cloudinaryService.uploadImage(signatureFile);
                await dataService.saveSignatureLivraison(commande.id, sigResult.url);
            }

            // 3. Changer le statut
            setShowLivreeModal(false);
            await doStatusUpdate('livraison', 'LIVREE');
        } catch (error) {
            const msg = typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message?: string }).message : undefined;
            alert(`Erreur: ${msg || 'Impossible de confirmer la livraison'}`);
        } finally {
            setConfirmingLivree(false);
        }
    };

    const handleModalStatusUpdate = async () => {
        try {
            setLoading(true);
            const isAdmin = isAdminRole(user?.role);
            const isMagasin = user?.role === 'magasin';
            const isChauffeur = user?.role === 'chauffeur';

            let statutCommandeToSend: string | undefined;
            let statutLivraisonToSend: string | undefined;

            if (isAdmin) {
                statutCommandeToSend = selectedStatutCommande;
                statutLivraisonToSend = selectedStatutLivraison;
            } else if (isMagasin) {
                statutCommandeToSend = selectedStatutCommande;
            } else if (isChauffeur) {
                statutLivraisonToSend = selectedStatutLivraison;
            }

            await dataService.updateStatutsCommande(
                commande.id,
                statutCommandeToSend,
                statutLivraisonToSend,
                'Modification manuelle via modal'
            );

            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) onUpdate(freshCommande);
            }
            setShowStatusModal(false);
        } catch (error) {
            const msg = typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message?: string }).message : undefined;
            alert(`Erreur: ${msg || 'Impossible de mettre à jour les statuts'}`);
        } finally {
            setLoading(false);
        }
    };

    const getAvailableCommandeStatuses = () => {
        const baseStatuses = ['En attente', 'Confirmée', 'Modifiée'];
        if (user?.role === 'magasin' && commande.statuts?.livraison === 'CONFIRMEE') {
            return baseStatuses.filter(s => s !== 'Annulée');
        }
        return [...baseStatuses, 'Annulée'];
    };

    const getAvailableLivraisonStatuses = () => {
        return ['EN ATTENTE', 'CONFIRMEE', 'ENLEVEE', 'EN COURS DE LIVRAISON', 'LIVREE', 'ANNULEE', 'ECHEC'];
    };

    const getQuickActions = () => {
        const actions = [];

        if (mode === 'admin' || mode === 'direction' || mode === 'chauffeur') {
            if (canModifyLivraisonStatus()) {
                if (commande.statuts?.livraison === 'EN ATTENTE' && commande.statuts?.commande === 'Confirmée') {
                    actions.push({
                        label: 'Confirmer prise en charge',
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
            if (canModifyCommandeStatus()) {
                if (commande.statuts?.commande === 'En attente') {
                    actions.push({
                        label: 'Confirmer commande',
                        action: () => handleQuickStatusUpdate('commande', 'Confirmée'),
                        color: 'bg-green-600 hover:bg-green-700'
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

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-4">📊 Gestion des statuts</h3>

            {/* Statuts actuels */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Statut commande :</span>
                    <span className={getStatutCommandeStyle(commande.statuts?.commande || 'En attente')}>
                        {commande.statuts?.commande || 'En attente'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Statut livraison :</span>
                    <span className={getStatutLivraisonStyle(commande.statuts?.livraison || 'EN ATTENTE')}>
                        {commande.statuts?.livraison || 'EN ATTENTE'}
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

            {/* Bouton modification avancée (admin uniquement) */}
            {isAdminRole(user?.role) && (
                <button
                    onClick={() => {
                        const statut = commande.statuts?.commande || '';
                        const statutAny = statut as any;
                        let normalized = statut;
                        if (statutAny === 'ANNULEE') normalized = 'Annulée';
                        else if (statutAny === 'EN ATTENTE') normalized = 'En attente';
                        else if (statutAny === 'CONFIRMEE') normalized = 'Confirmée';
                        else if (statutAny === 'MODIFIEE') normalized = 'Modifiée';
                        setSelectedStatutCommande(normalized);
                        setSelectedStatutLivraison(commande.statuts?.livraison || '');
                        setShowStatusModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Modification avancée
                </button>
            )}

            {/* Règles métier */}
            <div className="mt-4 text-xs text-gray-500 space-y-1">
                {user?.role === 'magasin' && (commande.statuts?.livraison === 'ENLEVEE'
                    || commande.statuts?.livraison === 'ANNULEE'
                    || commande.statuts?.livraison === 'EN COURS DE LIVRAISON'
                    || commande.statuts?.livraison === 'LIVREE') && (
                        <p>⚠️ Modification limitée : livraison {commande.statuts?.livraison}</p>
                    )}
                {user?.role === 'chauffeur' && commande.statuts?.livraison !== 'ANNULEE' && (
                    <p>🚛 Vous pouvez gérer les statuts de livraison</p>
                )}
                {user?.role === 'chauffeur' && commande.statuts?.livraison === 'ANNULEE' && (
                    <p>⚠️ Commande annulée - modification limitée</p>
                )}
                {isAdminRole(user?.role) && (
                    <p>🔑 Accès complet à tous les statuts (même commandes annulées)</p>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL : Photos obligatoires pour ENLEVEE
            ═══════════════════════════════════════════════════════════════ */}
            {showEnleveeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-1">📦 Photos d'enlèvement obligatoires</h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Prenez au moins une photo avant de passer la commande en statut ENLEVEE.
                            </p>

                            {/* Zone upload */}
                            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 mb-4">
                                <div className="flex gap-3 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => enleveeCameraRef.current?.click()}
                                        disabled={uploadingEnlevee}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                                    >
                                        📷 Prendre une photo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => enleveeFileRef.current?.click()}
                                        disabled={uploadingEnlevee}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
                                    >
                                        🖼️ Galerie
                                    </button>
                                </div>
                                <input ref={enleveeCameraRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden"
                                    onChange={e => { if (e.target.files) uploadFiles(e.target.files, setEnleveePhotos, setUploadingEnlevee); e.target.value = ''; }}
                                />
                                <input ref={enleveeFileRef} type="file" accept="image/jpeg,image/png" multiple className="hidden"
                                    onChange={e => { if (e.target.files) uploadFiles(e.target.files, setEnleveePhotos, setUploadingEnlevee); e.target.value = ''; }}
                                />
                                {uploadingEnlevee && <p className="text-center text-sm text-blue-600 mt-2">Envoi en cours…</p>}
                            </div>

                            {/* Miniatures */}
                            {enleveePhotos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {enleveePhotos.map((p, i) => (
                                        <div key={i} className="relative">
                                            <img src={p.url} alt={`Enlèvement ${i + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                                            <button
                                                onClick={() => setEnleveePhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {enleveePhotos.length === 0 && !uploadingEnlevee && (
                                <p className="text-center text-sm text-gray-400 mb-4">Aucune photo ajoutée</p>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowEnleveeModal(false)}
                                    disabled={confirmingEnlevee}
                                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleConfirmEnlevee}
                                    disabled={enleveePhotos.length === 0 || confirmingEnlevee || uploadingEnlevee}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {confirmingEnlevee ? 'Confirmation…' : `✅ Confirmer l'enlèvement (${enleveePhotos.length} photo${enleveePhotos.length > 1 ? 's' : ''})`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MODAL : Photos + signature obligatoires pour LIVREE
            ═══════════════════════════════════════════════════════════════ */}
            {showLivreeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
                        <div className="p-6 space-y-5">
                            <div>
                                <h2 className="text-xl font-bold mb-1">✅ Confirmation de livraison</h2>
                                <p className="text-sm text-gray-500">
                                    Une photo de preuve ET la signature du client sont obligatoires.
                                </p>
                            </div>

                            {/* Section 1 : Photos de preuve */}
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">
                                    📷 Photos de preuve de livraison
                                    {livreePhotos.length === 0 && <span className="text-red-500 text-sm ml-1">*</span>}
                                </h3>
                                <div className="border-2 border-dashed border-green-300 rounded-lg p-3 bg-green-50">
                                    <div className="flex gap-3 justify-center">
                                        <button
                                            type="button"
                                            onClick={() => livreeCameraRef.current?.click()}
                                            disabled={uploadingLivree}
                                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                                        >
                                            📷 Prendre
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => livreeFileRef.current?.click()}
                                            disabled={uploadingLivree}
                                            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
                                        >
                                            🖼️ Galerie
                                        </button>
                                    </div>
                                    <input ref={livreeCameraRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden"
                                        onChange={e => { if (e.target.files) uploadFiles(e.target.files, setLivreePhotos, setUploadingLivree); e.target.value = ''; }}
                                    />
                                    <input ref={livreeFileRef} type="file" accept="image/jpeg,image/png" multiple className="hidden"
                                        onChange={e => { if (e.target.files) uploadFiles(e.target.files, setLivreePhotos, setUploadingLivree); e.target.value = ''; }}
                                    />
                                    {uploadingLivree && <p className="text-center text-sm text-green-600 mt-2">Envoi en cours…</p>}
                                </div>
                                {livreePhotos.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {livreePhotos.map((p, i) => (
                                            <div key={i} className="relative">
                                                <img src={p.url} alt={`Preuve ${i + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                                                <button
                                                    onClick={() => setLivreePhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                >✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 2 : Signature */}
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">
                                    ✍️ Signature du client / magasin
                                    {!hasSignature && <span className="text-red-500 text-sm ml-1">*</span>}
                                </h3>
                                <div className="border-2 border-gray-300 rounded-lg bg-gray-50 relative">
                                    <canvas
                                        ref={signatureCanvasRef}
                                        width={440}
                                        height={140}
                                        className="w-full h-36 cursor-crosshair rounded-lg touch-none"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    {!hasSignature && (
                                        <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none">
                                            Signez ici
                                        </p>
                                    )}
                                </div>
                                {hasSignature && (
                                    <button
                                        onClick={clearSignature}
                                        className="mt-1 text-sm text-red-500 hover:text-red-700"
                                    >
                                        Effacer la signature
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowLivreeModal(false)}
                                    disabled={confirmingLivree}
                                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleConfirmLivree}
                                    disabled={livreePhotos.length === 0 || !hasSignature || confirmingLivree || uploadingLivree}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {confirmingLivree ? 'Confirmation…' : '✅ Confirmer la livraison'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MODAL : Modification avancée (admin uniquement)
            ═══════════════════════════════════════════════════════════════ */}
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
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatutCommande(e.target.value as 'En attente' | 'Confirmée' | 'Annulée' | 'Modifiée')}
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
                            <div className="text-sm text-center text-gray-500 bg-blue-50 p-2 rounded">
                                💡 La confirmation de livraison confirmera<br />automatiquement la commande
                            </div>
                            {(selectedStatutCommande === 'Annulée' || selectedStatutLivraison === 'ANNULEE') && (
                                <div className="text-sm text-center text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                                    ⚠️ L'annulation d'un statut annulera<br />automatiquement l'autre
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end space-x-2">
                            <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 border rounded-lg">
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
