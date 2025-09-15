import React, { useEffect, useState, useRef } from 'react';
import { CommandeMetier, StatusHistoryEntry } from '../types/business.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { dateFormatter, formatDate } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { VehicleValidationService } from '../services/vehicle-validation.service';
import CommandeActions from './CommandeActions';
import AdminActions from './AdminActions';
import { AirtableService } from '../services/airtable.service';
import { Personnel } from '../types/airtable.types';
import { getStatutCommandeStyle, getStatutLivraisonStyle } from '../styles/getStatus';
import PhotoUploader from './PhotoUploader';
import { Upload, XCircle } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';
import { SecureImage } from './SecureImage';
import DocumentViewer from './DocumentViewer';
import { ArticleDimension } from './forms/ArticleDimensionForm';
import { BackendDataService } from '../services/backend-data.service';
import RapportManager from './RapportManager';
import PhotosCommentaires from './PhotosCommentaires';

interface CommandeDetailsProps {
    commande: CommandeMetier;
    onStatusChange?: (newStatus: string) => void;
    onUpdate: (updatedCommande: CommandeMetier) => void;
    onRefresh?: () => Promise<void>;
}

// ✅ SYSTÈME DE CACHE LOCAL pour les dates de changement de statuts
const getStatusDatesCache = () => {
    const cached = localStorage.getItem('statusDatesCache');
    return cached ? JSON.parse(cached) : {};
};

const setStatusDateInCache = (commandeId: string, statusType: 'commande' | 'livraison', status: string, date: string) => {
    const cache = getStatusDatesCache();
    if (!cache[commandeId]) {
        cache[commandeId] = {};
    }
    if (!cache[commandeId][statusType]) {
        cache[commandeId][statusType] = {};
    }
    cache[commandeId][statusType][status] = date;
    localStorage.setItem('statusDatesCache', JSON.stringify(cache));
};

const getStatusDateFromCache = (commandeId: string, statusType: 'commande' | 'livraison', status: string): string | null => {
    const cache = getStatusDatesCache();
    return cache[commandeId]?.[statusType]?.[status] || null;
};

const CommandeDetails: React.FC<CommandeDetailsProps> = ({ commande, onUpdate, onRefresh }) => {
    // Vérification de sécurité - si commande est undefined ou null, afficher un message
    if (!commande) {
        return <div className="p-4 bg-red-100 text-red-700 rounded">Données de commande indisponibles.</div>;
    }

    const [activeTab, setActiveTab] = useState(() => {
        // Restaurer l'onglet sauvegardé pour cette commande spécifique
        const savedTab = localStorage.getItem(`commandeDetails_tab_${commande.id}`);
        return savedTab || 'informations';
    });
    const [chauffeurs, setChauffeurs] = useState<Personnel[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    
    // ✅ Ref pour suivre les changements de statuts (évite les boucles de rendu)
    const previousStatutsRef = useRef<{commande?: string, livraison?: string}>({
        commande: commande?.statuts?.commande,
        livraison: commande?.statuts?.livraison
    });

    // ✅ FLAG pour ignorer les changements pendant les opérations de rapports
    const rapportOperationInProgressRef = useRef<boolean>(false);

    const backendDataService = new BackendDataService();
    const { dataService } = useOffline();

    // Chargement des chauffeurs pour l'admin
    useEffect(() => {
        const loadChauffeurs = async () => {
            if (user?.role === 'admin') {
                const personnelData = await dataService.getPersonnel();
                setChauffeurs(personnelData.filter((p: any) => p.role === 'Chauffeur').map((p: any) => ({
                    ...p,
                    status: p.status === 'En route vers magasin' ? 'Actif' : p.status
                })));
            }
        };

        loadChauffeurs();
    }, [user]);

    // ✅ EFFET pour détecter les changements de statuts et mettre à jour le cache
    useEffect(() => {
        if (!commande?.id) return;

        const currentCommande = commande?.statuts?.commande;
        const currentLivraison = commande?.statuts?.livraison;
        const now = new Date().toISOString();

        // ✅ INITIALISATION DU CACHE au premier chargement avec les vraies dates backend
        const initCacheIfNeeded = () => {
            if (currentCommande && !getStatusDateFromCache(commande.id, 'commande', currentCommande)) {
                console.log('🏗️ INITIALISATION cache commande:', currentCommande);
                // Utiliser la vraie date de mise à jour du statut depuis le backend
                const backendDate = getUpdateDateForStatus('commande');
                console.log('🏗️ Date backend utilisée pour initialisation commande:', backendDate);
                setStatusDateInCache(commande.id, 'commande', currentCommande, backendDate);
            }
            
            if (currentLivraison && !getStatusDateFromCache(commande.id, 'livraison', currentLivraison)) {
                console.log('🏗️ INITIALISATION cache livraison:', currentLivraison);
                // Utiliser la vraie date de mise à jour du statut depuis le backend
                const backendDate = getUpdateDateForStatus('livraison');
                console.log('🏗️ Date backend utilisée pour initialisation livraison:', backendDate);
                setStatusDateInCache(commande.id, 'livraison', currentLivraison, backendDate);
            }
        };

        // Initialiser le cache au premier chargement
        initCacheIfNeeded();

        // ✅ PROTECTION TOTALE : Ignorer pendant les opérations de rapports
        if (rapportOperationInProgressRef.current) {
            console.log('🚫 PROTECTION ACTIVE - Changements de statuts ignorés (opération rapport en cours)');
            console.log('🚫 Statuts actuels:', { currentCommande, currentLivraison });
            console.log('🚫 Statuts précédents:', previousStatutsRef.current);
            return;
        }

        // Vérifier changement de statut commande
        if (previousStatutsRef.current.commande !== currentCommande && currentCommande) {
            // ✅ SÉCURITÉ : Vérifier qu'il n'y a pas déjà une date en cache pour ce statut
            const cachedDate = getStatusDateFromCache(commande.id, 'commande', currentCommande);
            if (!cachedDate) {
                console.log('📅 🔴 NOUVEAU STATUT COMMANDE DÉTECTÉ:', currentCommande);
                console.log('📅 🔴 Statut précédent:', previousStatutsRef.current.commande);
                console.log('📅 🔴 MISE À JOUR CACHE AVEC DATE:', now);
                setStatusDateInCache(commande.id, 'commande', currentCommande, now);
            } else {
                console.log('📅 ✅ Statut commande inchangé (cache existant):', currentCommande, cachedDate);
            }
        }

        // Vérifier changement de statut livraison
        if (previousStatutsRef.current.livraison !== currentLivraison && currentLivraison) {
            // ✅ SÉCURITÉ : Vérifier qu'il n'y a pas déjà une date en cache pour ce statut
            const cachedDate = getStatusDateFromCache(commande.id, 'livraison', currentLivraison);
            if (!cachedDate) {
                console.log('📅 🔴 NOUVEAU STATUT LIVRAISON DÉTECTÉ:', currentLivraison);
                console.log('📅 🔴 Statut précédent:', previousStatutsRef.current.livraison);
                console.log('📅 🔴 MISE À JOUR CACHE AVEC DATE:', now);
                setStatusDateInCache(commande.id, 'livraison', currentLivraison, now);
            } else {
                console.log('📅 ✅ Statut livraison inchangé (cache existant):', currentLivraison, cachedDate);
            }
        }

        // Mettre à jour les statuts précédents (pas de re-render car c'est une ref)
        previousStatutsRef.current = {
            commande: currentCommande,
            livraison: currentLivraison
        };
    }, [commande?.statuts?.commande, commande?.statuts?.livraison, commande?.id]);

    // ✅ FONCTION helper pour obtenir la date de mise à jour avec rétro-compatibilité
    const getUpdateDateForStatus = (statusType: 'commande' | 'livraison'): string | null => {
        const misAJour = commande?.dates?.misAJour;
        
        if (!misAJour) {
            return null;
        }
        
        // Nouveau format (objet avec commande/livraison séparées)
        if (typeof misAJour === 'object' && misAJour !== null) {
            return statusType === 'commande' ? misAJour.commande || null : misAJour.livraison || null;
        }
        
        // Ancien format (string) - pour rétro-compatibilité
        if (typeof misAJour === 'string') {
            return misAJour;
        }
        
        return null;
    };

    // ✅ FONCTION pour obtenir la date intelligente d'un statut
    const getSmartStatusDate = (statusType: 'commande' | 'livraison', currentStatus: string): Date => {
        // 1. D'abord essayer depuis le cache local
        const cachedDate = getStatusDateFromCache(commande.id, statusType, currentStatus);
        if (cachedDate) {
            console.log(`📅 🔍 Cache trouvé pour ${statusType}[${currentStatus}]:`, cachedDate);
            return new Date(cachedDate);
        } else {
            console.log(`📅 ❌ Pas de cache pour ${statusType}[${currentStatus}] - utilisation date backend`);
        }

        // 2. Si pas dans le cache, logique intelligente selon le statut
        if (statusType === 'commande') {
            const isDefaultStatus = !currentStatus || currentStatus === 'En attente';
            if (isDefaultStatus) {
                // Statut par défaut = date de création
                return commande?.dates?.commande ? new Date(commande.dates.commande) : new Date();
            } else {
                // Statut modifié = date de mise à jour
                const updateDate = getUpdateDateForStatus('commande');
                return updateDate ? new Date(updateDate) : 
                       (commande?.dates?.commande ? new Date(commande.dates.commande) : new Date());
            }
        } else { // livraison
            const isDefaultStatus = !currentStatus || currentStatus === 'EN ATTENTE';
            if (isDefaultStatus) {
                // Statut par défaut = date de création
                return commande?.dates?.commande ? new Date(commande.dates.commande) : new Date();
            } else {
                // Statut modifié = date de mise à jour
                const updateDate = getUpdateDateForStatus('livraison');
                return updateDate ? new Date(updateDate) : new Date();
            }
        }
    };

    // Monitoring minimal pour les erreurs importantes
    useEffect(() => {
        if (!commande?.dates) {
            console.warn('⚠️ Commande sans dates détectée:', commande?.id);
        }
    }, [commande]);

    // Chronologie avec historique réel des statuts
    const buildTimelineFromHistory = () => {
        const events: { date: Date; status: string; type: string; oldStatus?: string; reason?: string }[] = [];
        
        // ✅ SOLUTION SIMPLE : Toujours utiliser les dates du cache local pour la cohérence
        // Cela évite les incohérences entre l'historique et les dates indépendantes
        
        const currentCommandeStatus = commande?.statuts?.commande || 'En attente';
        const currentLivraisonStatus = commande?.statuts?.livraison || 'EN ATTENTE';
        
        const commandeSmartDate = getSmartStatusDate('commande', currentCommandeStatus);
        const livraisonSmartDate = getSmartStatusDate('livraison', currentLivraisonStatus);
            
        events.push({
            date: commandeSmartDate,
            status: currentCommandeStatus,
            type: 'commande',
        });
            
        events.push({
            date: livraisonSmartDate,
            status: currentLivraisonStatus,
            type: 'livraison',
        });
        
        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    const timelineEvents = buildTimelineFromHistory();

    // Helper pour formatter les dates de manière sécurisée
    // const formatDate = (date: Date | string | undefined) => {
    //     if (!date) return 'Non spécifiée';
    //     try {
    //         return format(new Date(date), 'Pp', { locale: fr });
    //     } catch {
    //         return 'Date invalide';
    //     }
    // };

    const showImageInSameWindow = (url: string) => {
        window.open(url, '_blank', 'toolbar=0,location=0,menubar=0')
            ?.focus();
    }

    const addArticlePhoto = () => {
        console.log('Ajouter photo article');
    }

    const tabs = [
        { id: 'informations', label: 'Informations', icon: '📋' },
        { id: 'conditions-speciales', label: 'Conditions spéciales', icon: '⚠️' },
        { id: 'photos-articles', label: 'Photos articles', icon: '📸' },
        { id: 'photos-commentaires', label: 'Photos commentaires', icon: '🖼️' },
        { id: 'chronologie', label: 'Chronologie', icon: '⏱️' },
        ...(user?.role !== 'chauffeur' ? [{ id: 'documents', label: 'Documents', icon: '📄' }] : []),
        { id: 'actions', label: 'Actions', icon: '⚡' },
    ];

    // ✅ SAUVEGARDER l'onglet actif à chaque changement
    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        localStorage.setItem(`commandeDetails_tab_${commande.id}`, newTab);
    };

    // ✅ FONCTION REFRESH PERSONNALISÉE qui préserve l'onglet
    const handleRefreshWithTabPreservation = async () => {

        // Sauvegarder l'onglet actuel
        const currentTab = activeTab;
        localStorage.setItem(`commandeDetails_tab_${commande.id}`, currentTab);

        // Exécuter le refresh original
        if (onRefresh && typeof onRefresh === 'function') {
            await onRefresh();
        }

        // Restaurer l'onglet après le refresh
        setTimeout(() => {
            const savedTab = localStorage.getItem(`commandeDetails_tab_${commande.id}`);
            if (savedTab && savedTab !== activeTab) {
                setActiveTab(savedTab);
            }
        }, 100);

        console.log('✅ Refresh terminé, onglet préservé:', currentTab);
    };

    // ✅ FONCTIONS D'AIDE pour marquer les opérations de rapports
    const markRapportOperationStart = () => {
        console.log('🔒 DÉBUT OPÉRATION RAPPORT - Protection activée');
        rapportOperationInProgressRef.current = true;
        
        // ✅ Exposer le flag globalement pour bloquer les synchronisations
        if (typeof window !== 'undefined') {
            (window as any).rapportOperationInProgress = true;
        }
        
        console.log('🔒 Flag protection rapport:', rapportOperationInProgressRef.current);
    };

    const markRapportOperationEnd = () => {
        console.log('⏰ Programmation fin protection rapport dans 3 secondes...');
        setTimeout(() => {
            rapportOperationInProgressRef.current = false;
            
            // ✅ Retirer le flag global pour permettre les synchronisations
            if (typeof window !== 'undefined') {
                (window as any).rapportOperationInProgress = false;
            }
            
            console.log('🔓 FIN OPÉRATION RAPPORT - Protection désactivée');
            console.log('🔓 Flag protection rapport:', rapportOperationInProgressRef.current);
        }, 3000); // 3 secondes de protection pour éviter les synchronisations automatiques
    };

    // ✅ FONCTION REFRESH SPÉCIALE POUR RAPPORTS (isolation totale des dates)
    const handleRapportRefresh = async () => {
        try {
            console.log('📋 Refresh rapport - isolation totale des dates...');
            
            // ✅ PAS DE DOUBLE PROTECTION - la protection est déjà activée par le composant appelant
            console.log('🔍 Protection déjà active ?', rapportOperationInProgressRef.current);
            
            // Sauvegarder l'onglet actuel
            const currentTab = activeTab;
            localStorage.setItem(`commandeDetails_tab_${commande.id}`, currentTab);

            // Exécuter le refresh original
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            }
            
            // Restaurer l'onglet après le refresh
            setTimeout(() => {
                const savedTab = localStorage.getItem(`commandeDetails_tab_${commande.id}`);
                if (savedTab && savedTab !== activeTab) {
                    setActiveTab(savedTab);
                }
            }, 100);

            console.log('✅ Refresh rapport terminé, dates totalement isolées, onglet préservé:', currentTab);
            // ✅ PAS DE FIN DE PROTECTION ICI - laissée au composant appelant
        } catch (error) {
            console.error('❌ Erreur refresh rapport:', error);
        }
    };

    // ✅ NETTOYAGE : Supprimer la sauvegarde si la commande change
    useEffect(() => {
        return () => {
            // Optionnel : nettoyer les anciennes sauvegardes
            const allKeys = Object.keys(localStorage);
            const oldCommandeTabs = allKeys.filter(key =>
                key.startsWith('commandeDetails_tab_') &&
                key !== `commandeDetails_tab_${commande.id}`
            );

            // Garder seulement les 10 plus récentes pour éviter l'accumulation
            if (oldCommandeTabs.length > 10) {
                oldCommandeTabs.slice(0, oldCommandeTabs.length - 10).forEach(key => {
                    localStorage.removeItem(key);
                });
            }
        };
    }, [commande.id]);

    // Gestion des photos
    const handlePhotoUpload = async (uploadedPhotos: Array<{ url: string }>) => {
        try {
            console.log('📸 handlePhotoUpload - Début');

            const existingPhotos = commande.articles?.photos || [];

            // 1. Opération photo
            await dataService.addPhotosToCommande(
                commande.id,
                uploadedPhotos,
                existingPhotos
            );

            console.log('✅ Photos ajoutées, refresh des données...');

            // 2. ✅ REFRESH SIMPLE : Déclencher rechargement parent
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh?.();
            } else {
                // Fallback : recharger cette commande spécifiquement
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

        } catch (error) {
            console.error('❌ Erreur upload photo:', error);
            alert('Erreur lors de l\'ajout de photos');
        }
    };

    const handlePhotoDelete = async (photoToDelete: { url: string }) => {
        try {
            console.log('🗑️ handlePhotoDelete - Début');

            const updatedPhotos = (commande.articles?.photos || []).filter(
                photo => photo.url !== photoToDelete.url
            );

            // 1. Opération suppression
            await dataService.deletePhotoFromCommande(
                commande.id,
                updatedPhotos
            );

            console.log('✅ Photo supprimée, refresh des données...');

            // 2. ✅ REFRESH SIMPLE
            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh?.();
            } else {
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    onUpdate(freshCommande);
                }
            }

        } catch (error) {
            console.error('❌ Erreur suppression photo:', error);
            alert('Erreur lors de la suppression de photo');
        }
    };

    const renderContent = () => {
        // Vérification des propriétés nécessaires avant le switch
        if (!commande) {
            return <div>Données manquantes</div>;
        }
        switch (activeTab) {
            case 'informations':
                return (
                    // Section Informations existante
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Magasin */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Magasin</h3>
                            <div className="space-y-2">
                                <p><span className="text-gray-500">Nom:</span> {commande.magasin?.name || 'Non spécifié'}</p>
                                {/* <p><span className="text-gray-500">Téléphone:</span> {commande.magasin?.phone || 'Non spécifié'}</p>
                                    <p><span className="text-gray-500">Adresse:</span> {commande.magasin?.address || 'Non spécifiée'}</p> */}
                            </div>
                        </div>

                        {/* Client */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Client</h3>
                            <div className="space-y-2">
                                <p><span className="text-gray-500">Nom:</span> {commande.client?.nom.toUpperCase() || 'Non spécifié'} {commande.client?.prenom || ''}</p>
                                {/* <p><span className="text-gray-500">Nom:</span> {commande.client?.nomComplet || 'Non spécifié'}</p> */}

                                <p><span className="text-gray-500">Téléphone:</span> {commande.client?.telephone?.principal || 'Non spécifié'}</p>

                                {commande.client?.telephone?.secondaire && (
                                    <p><span className="text-gray-500">Téléphone secondaire:</span> {commande.client?.telephone?.secondaire}</p>
                                )}

                                <p><span className="text-gray-500">Adresse:</span> {commande.client?.adresse?.ligne1 || 'Non spécifiée'}</p>

                                {commande.client?.adresse?.type && (
                                    <p><span className="text-gray-500">Type d'adresse:</span> {commande.client?.adresse?.type}</p>
                                )}

                                {commande.client?.adresse?.batiment && (
                                    <p><span className="text-gray-500">Bâtiment:</span> {commande.client?.adresse?.batiment || commande.batiment}</p>
                                )}

                                <p><span className="text-gray-500">Étage:</span> {
                                    commande.client?.adresse?.etage !== undefined && commande.client?.adresse?.etage !== null
                                        ? commande.client.adresse.etage
                                        : (commande.etage !== undefined && commande.etage !== null
                                            ? commande.etage
                                            : 'Non spécifié')
                                }</p>

                                <p><span className="text-gray-500">Interphone/Code:</span> {
                                    commande.client?.adresse?.interphone !== undefined && commande.client?.adresse?.interphone !== null
                                        ? commande.client.adresse.interphone
                                        : (commande.interphone !== undefined && commande.interphone !== null
                                            ? commande.interphone
                                            : 'Non spécifié')
                                }</p>

                                <p><span className="text-gray-500">Ascenseur:</span> {
                                    commande.client?.adresse?.ascenseur !== undefined
                                        ? (commande.client.adresse.ascenseur ? 'Oui' : 'Non')
                                        : (commande.ascenseur !== undefined
                                            ? (commande.ascenseur ? 'Oui' : 'Non')
                                            : 'Non spécifié')
                                }</p>
                            </div>
                        </div>

                        {/* Livraison */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Livraison</h3>
                            <div className="space-y-2">
                                <p><span className="text-gray-500">Date:</span> {dateFormatter.forDisplay(commande.dates?.livraison)}</p>
                                <p><span className="text-gray-500">Créneau:</span> {commande.livraison?.creneau || 'Non spécifié'}</p>
                                <p><span className="text-gray-500">Véhicule:</span> {commande.livraison?.vehicule || 'Non spécifié'}</p>
                                <p><span className="text-gray-500">Équipiers:</span> {commande.livraison?.equipiers || '0'}</p>
                            </div>
                        </div>

                        {/* Articles */}
                        {commande.articles && (
                            <div className="space-y-4">
                                <h3 className="font-medium text-lg">Articles</h3>
                                <div className="space-y-2">
                                    <p><span className="text-gray-500">Nombre total:</span> {commande.articles.nombre || '0'}</p>
                                    <p><span className="text-gray-500">Détails:</span> {commande.articles.details || 'Aucun détail'}</p>
                                </div>
                                {(commande.articles?.photos && Array.isArray(commande.articles.photos)) && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {commande.articles.photos.map((photo: string | { url: string }, index) => {
                                            // Vérifier si l'URL de la photo est un URL valide
                                            const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                                            return (
                                                <div key={index} className="relative group">
                                                    {photoUrl && (
                                                        <SecureImage
                                                            src={photoUrl}
                                                            alt={`Photo ${index + 1}`}
                                                            className="rounded-lg w-full h-48 object-cover"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {commande.articles?.dimensions && commande.articles.dimensions.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Dimensions des articles</h4>
                                        <div className="space-y-3">
                                            {commande.articles.dimensions.map((article: ArticleDimension, index: number) => (
                                                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                                                    <p className="font-medium">{article.nom} (x{article.quantite})</p>
                                                    <div className="grid grid-cols-2 text-sm text-gray-600 mt-1">
                                                        {article.longueur && (
                                                            <p>Longueur: {article.longueur} cm</p>
                                                        )}
                                                        {article.largeur && (
                                                            <p>Largeur: {article.largeur} cm</p>
                                                        )}
                                                        {article.hauteur && (
                                                            <p>Hauteur: {article.hauteur} cm</p>
                                                        )}
                                                        {article.poids && (
                                                            <p>Poids: {article.poids} kg</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Chauffeur(s)</h3>
                            {commande?.chauffeurs?.length ?? 0 > 0 ? (
                                commande.chauffeurs.map((chauffeur, index) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded">
                                        <p>{chauffeur.prenom} {chauffeur.nom}</p>
                                        <p className="text-sm text-gray-600">{chauffeur.telephone}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500">Aucun chauffeur assigné</p>
                            )}
                        </div>

                        {/* Autres remarques */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Autres remarques</h3>

                            {(commande?.livraison?.remarques || commande?.remarques) ? (
                                <div className="space-y-2">
                                    <p>{commande?.livraison?.remarques || commande?.remarques}</p>
                                </div>
                            ) : (
                                <p className="text-gray-500">Aucune remarque</p>
                            )}
                        </div>

                        {/* Commentaires/Rapports */}
                        <div className="col-span-2 space-y-4">
                            <RapportManager
                                commande={commande}
                                onUpdate={onUpdate}
                                onRefresh={handleRapportRefresh}
                                onRapportOperationStart={markRapportOperationStart}
                                onRapportOperationEnd={markRapportOperationEnd}
                            />
                        </div>
                    </div>
                );
            case 'conditions-speciales':
                return (
                    <div className="space-y-4">
                        {(() => {
                            // Extraire les conditions de livraison
                            let deliveryConditions = null;

                            try {
                                if (typeof commande.livraison?.details === 'string') {
                                    deliveryConditions = JSON.parse(commande.livraison.details);
                                } else if (commande.livraison?.details) {
                                    deliveryConditions = commande.livraison.details;
                                }
                            } catch (e) {
                                console.warn('Impossible de parser les détails de livraison');
                            }

                            // 🎯 VÉRIFIER S'IL Y A DES CONDITIONS SPÉCIALES
                            const hasSpecialConditions = deliveryConditions && (
                                deliveryConditions.rueInaccessible ||
                                deliveryConditions.paletteComplete ||
                                (deliveryConditions.parkingDistance && deliveryConditions.parkingDistance > 50) ||
                                deliveryConditions.needsAssembly ||
                                (deliveryConditions.isDuplex && deliveryConditions.deliveryToUpperFloor) ||
                                (deliveryConditions.hasStairs && deliveryConditions.stairCount > 20)
                            );

                            if (!hasSpecialConditions) {
                                return (
                                    <div className="text-center py-8">
                                        <div className="max-w-md mx-auto">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">✅</span>
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-gray-400">
                                                Livraison standard
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-500">
                                                Cette commande ne présente aucune condition spéciale de livraison.
                                                Les équipiers peuvent procéder selon les procédures normales.
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            // Calculer l'étage effectif
                            const baseFloor = parseInt(commande.client?.adresse?.etage || '0');
                            const effectiveFloor = baseFloor +
                                (deliveryConditions.isDuplex && deliveryConditions.deliveryToUpperFloor ? 1 : 0);

                            return (
                                <div className="space-y-6">
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                        <h3 className="text-lg font-medium text-orange-800 mb-4 flex items-center">
                                            <span className="mr-2">⚠️</span>
                                            Conditions spéciales détectées
                                        </h3>
                                        <p className="text-orange-700 text-sm mb-4">
                                            Cette livraison présente des conditions particulières qui nécessitent une attention spéciale.
                                        </p>

                                        <div className="space-y-4">
                                            {/* 🏠 DUPLEX/MAISON - Seulement si présent */}
                                            {deliveryConditions.isDuplex && deliveryConditions.deliveryToUpperFloor && (
                                                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                                                    <div className="flex items-start">
                                                        <span className="text-blue-600 text-2xl mr-3">🏠</span>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-blue-800 mb-2">
                                                                Duplex/Maison - Livraison à l'étage
                                                            </h4>
                                                            <div className="text-blue-700 space-y-1">
                                                                <p><strong>Étage de base :</strong> {baseFloor}ème</p>
                                                                <p><strong>Étage effectif :</strong> {effectiveFloor}ème (+1 duplex/maison)</p>
                                                                <p className="text-sm mt-2 p-2 bg-blue-200 rounded">
                                                                    💡 <strong>Note :</strong> Les articles doivent être montés à l'étage supérieur dans un logement duplex/maison.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 🚫 RUE INACCESSIBLE - Seulement si présent */}
                                            {deliveryConditions.rueInaccessible && (
                                                <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                                                    <div className="flex items-start">
                                                        <span className="text-red-600 text-2xl mr-3">🚫</span>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-red-800 mb-2">
                                                                Rue inaccessible pour véhicule 4 roues
                                                            </h4>
                                                            <div className="text-red-700">
                                                                <p>Le véhicule ne peut pas accéder directement devant l'adresse.</p>
                                                                <p className="text-sm mt-2 p-2 bg-red-200 rounded">
                                                                    ⚠️ <strong>Action requise :</strong> Stationnement à distance + portage nécessaire
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 📦 PALETTE COMPLÈTE - Seulement si présent */}
                                            {deliveryConditions.paletteComplete && (
                                                <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                                                    <div className="flex items-start">
                                                        <span className="text-orange-600 text-2xl mr-3">📦</span>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-orange-800 mb-2">
                                                                Palette complète à dépalettiser
                                                            </h4>
                                                            <div className="text-orange-700">
                                                                <p>Déchargement complet d'une palette et manutention article par article.</p>
                                                                <p className="text-sm mt-2 p-2 bg-orange-200 rounded">
                                                                    🔧 <strong>Équipement :</strong> Outils de dépalettisation nécessaires
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 📏 DISTANCE PORTAGE - Seulement si >50m */}
                                            {deliveryConditions.parkingDistance && deliveryConditions.parkingDistance > 50 && (
                                                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                                                    <div className="flex items-start">
                                                        <span className="text-yellow-600 text-2xl mr-3">📏</span>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-yellow-800 mb-2">
                                                                Distance de portage importante
                                                            </h4>
                                                            <div className="text-yellow-700">
                                                                <p><strong>Distance :</strong> {deliveryConditions.parkingDistance} mètres</p>
                                                                <p>Entre le stationnement du véhicule et l'entrée du bâtiment.</p>
                                                                <p className="text-sm mt-2 p-2 bg-yellow-200 rounded">
                                                                    💪 <strong>Impact :</strong> Effort physique supplémentaire requis
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 🪜 NOMBREUSES MARCHES - Seulement si >20 */}
                                            {deliveryConditions.hasStairs && deliveryConditions.stairCount > 20 && (
                                                <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
                                                    <div className="flex items-start">
                                                        <span className="text-purple-600 text-2xl mr-3">🪜</span>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-purple-800 mb-2">
                                                                Nombreuses marches d'escaliers
                                                            </h4>
                                                            <div className="text-purple-700">
                                                                <p><strong>Nombre de marches :</strong> {deliveryConditions.stairCount}</p>
                                                                <p>Jusqu'au point de livraison final.</p>
                                                                <p className="text-sm mt-2 p-2 bg-purple-200 rounded">
                                                                    ⚠️ <strong>Précaution :</strong> Risque de fatigue, pauses recommandées
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 🔧 MONTAGE NÉCESSAIRE - Seulement si présent */}
                                            {deliveryConditions.needsAssembly && (
                                                <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                                                    <div className="flex items-start">
                                                        <span className="text-red-600 text-2xl mr-3">🔧</span>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-red-800 mb-2">
                                                                Montage ou installation nécessaire
                                                            </h4>
                                                            <div className="text-red-700">
                                                                <p>Assemblage de meubles, installation d'arbres, plantes ou équipements.</p>
                                                                {user?.role === 'admin' || user?.role === 'chauffeur' ? (
                                                                    <p className="text-sm mt-2 p-2 bg-red-200 rounded">
                                                                        🛠️ <strong>Préparation :</strong> Vérifier les outils nécessaires avant départ
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 📊 CALCUL DES ÉQUIPIERS - Toujours affiché si conditions présentes */}
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-medium text-green-800 mb-3 flex items-center">
                                            <span className="mr-2">📊</span>
                                            Impact sur les équipiers requis
                                        </h4>

                                        {(() => {
                                            const articles = commande.articles?.dimensions || [];

                                            // Calculs de base
                                            const heaviestWeight = articles.length > 0 ? Math.max(...articles.map(a => a.poids || 0)) : 0;
                                            const totalWeight = articles.reduce((sum, article) =>
                                                sum + ((article.poids || 0) * (article.quantite || 1)), 0
                                            );
                                            const totalItems = articles.reduce((sum, article) => sum + (article.quantite || 1), 0);

                                            // 🔥 CORRECTION MAJEURE : Utiliser la nouvelle logique hiérarchique officielle
                                            const hasElevator = commande.client?.adresse?.ascenseur;
                                            
                                            const validationConditions = {
                                                hasElevator: hasElevator || false,
                                                totalItemCount: totalItems,
                                                rueInaccessible: deliveryConditions.rueInaccessible || false,
                                                paletteComplete: deliveryConditions.paletteComplete || false,
                                                parkingDistance: deliveryConditions.parkingDistance || 0,
                                                hasStairs: deliveryConditions.hasStairs || false,
                                                stairCount: deliveryConditions.stairCount || 0,
                                                needsAssembly: deliveryConditions.needsAssembly || false,
                                                floor: effectiveFloor,
                                                isDuplex: deliveryConditions.isDuplex || false,
                                                deliveryToUpperFloor: deliveryConditions.deliveryToUpperFloor || false,
                                                // 🆕 Nouvelles conditions
                                                estimatedHandlingTime: deliveryConditions.estimatedHandlingTime || 0,
                                                hasLargeVoluminousItems: deliveryConditions.hasLargeVoluminousItems || false,
                                                multipleLargeVoluminousItems: deliveryConditions.multipleLargeVoluminousItems || false,
                                                complexAccess: deliveryConditions.complexAccess || false
                                            };

                                            // ✅ UTILISER LA MÉTHODE OFFICIELLE
                                            const requiredCrew = VehicleValidationService.getRequiredCrewSize(articles, validationConditions);
                                            
                                            // Obtenir les détails de validation pour l'affichage
                                            const validationDetails = VehicleValidationService.getValidationDetails(articles, validationConditions);
                                            
                                            console.log('📊 [COMMANDE-DETAILS] Validation:', validationDetails);

                                            // Construire les conditions actives pour l'affichage
                                            const activeConditions = validationDetails.triggeredConditions || [];
                                            
                                            // Détecter le niveau pour l'affichage
                                            let levelInfo = { level: 'NIVEAU 0', description: 'Chauffeur seul' };
                                            if (requiredCrew >= 3) {
                                                levelInfo = { level: 'NIVEAU 3', description: 'Devis obligatoire' };
                                            } else if (requiredCrew === 2) {
                                                levelInfo = { level: 'NIVEAU 2', description: '+2 équipiers' };
                                            } else if (requiredCrew === 1) {
                                                levelInfo = { level: 'NIVEAU 1', description: '+1 équipier' };
                                            }

                                            return (
                                                <div className="space-y-3">
                                                    {/* Résultat final */}
                                                    <div className="flex items-center justify-between p-3 bg-white rounded border-2 border-green-300">
                                                        <div>
                                                            <p className="font-medium text-green-800">
                                                                Équipiers requis avec ces conditions :
                                                            </p>
                                                            <p className="text-sm text-green-700">
                                                                {activeConditions.length} condition{activeConditions.length > 1 ? 's' : ''} détectée{activeConditions.length > 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-2xl font-bold text-green-600">{requiredCrew}</p>
                                                            <p className="text-sm text-green-700">équipier{requiredCrew > 1 ? 's' : ''}</p>
                                                        </div>
                                                    </div>

                                                    {/* Comparaison avec sélection */}
                                                    <div className={`p-3 rounded border ${(commande.livraison?.equipiers || 0) >= requiredCrew
                                                        ? 'bg-green-100 border-green-300'
                                                        : 'bg-red-100 border-red-300'
                                                        }`}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">
                                                                Équipiers assignés : {commande.livraison?.equipiers || 0}
                                                            </span>
                                                            <span className={`font-bold ${(commande.livraison?.equipiers || 0) >= requiredCrew
                                                                ? 'text-green-600'
                                                                : 'text-red-600'
                                                                }`}>
                                                                {(commande.livraison?.equipiers || 0) >= requiredCrew ? '✅ Suffisant' : '⚠️ Insuffisant'}
                                                            </span>
                                                        </div>
                                                        {(commande.livraison?.equipiers || 0) < requiredCrew && (
                                                            <p className="text-red-700 text-sm mt-1 font-medium">
                                                                ⚠️ ATTENTION : Il manque {requiredCrew - (commande.livraison?.equipiers || 0)} équipier{requiredCrew - (commande.livraison?.equipiers || 0) > 1 ? 's' : ''} !
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Message devis si nécessaire */}
                                                    {requiredCrew >= 3 && (
                                                        <div className="p-3 bg-yellow-100 border border-yellow-300 rounded">
                                                            <p className="font-medium text-yellow-800">💰 Devis obligatoire</p>
                                                            <p className="text-yellow-700 text-sm">
                                                                Cette livraison nécessite {requiredCrew} équipiers, un devis spécial est requis.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                );
            case 'photos-articles':
                // Calcul sécurisé des photos existantes
                const articles = commande.articles || { photos: [] };
                const photos = Array.isArray(articles.photos) ? articles.photos : [];
                const totalPhotos = photos.length;
                const remainingPhotos = 5 - totalPhotos;

                return (
                    <div className="space-y-4">
                        {/* Photos existantes */}
                        {totalPhotos > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {photos.map((photo, index) => {
                                    // Vérification et extraction sécurisée de l'URL
                                    const photoUrl = typeof photo === 'string'
                                        ? photo
                                        : (photo && typeof photo === 'object' && 'url' in photo)
                                            ? photo.url
                                            : null;

                                    if (!photoUrl) return null;

                                    return (
                                        <div key={index} className="relative group">
                                            <SecureImage
                                                src={photoUrl}
                                                alt={`Photo ${index + 1}`}
                                                className="rounded-lg w-full h-48 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                                <button
                                                    className="text-white bg-red-600 px-4 py-2 rounded-lg"
                                                    onClick={() => typeof showImageInSameWindow === 'function' && showImageInSameWindow(photoUrl)}
                                                >
                                                    Voir
                                                </button>
                                                <button
                                                    onClick={() => typeof handlePhotoDelete === 'function' && handlePhotoDelete(
                                                        typeof photo === 'string' ? { url: photo } : photo
                                                    )}
                                                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }).filter(Boolean)} {/* Filtrer les photos nulles */}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500">Aucune photo d'article disponible</p>
                        )}

                        {/* Zone d'upload */}
                        {user?.role !== 'chauffeur' && (
                            <div className="flex flex-col items-center">
                                <PhotoUploader
                                    onUpload={handlePhotoUpload}
                                    maxPhotos={remainingPhotos}
                                    existingPhotos={photos.map(photo => ({ url: photo.url, file: new File([], '') }))}
                                    MAX_SIZE={10 * 1024 * 1024}
                                />
                            </div>
                        )}
                    </div>
                );
            case 'photos-commentaires':
                return (
                    <div className="space-y-4">
                        {/* ✅ Photos des rapports via Backend */}
                        <PhotosCommentaires
                            commande={commande}
                            onUpdate={onUpdate}
                            onRefresh={handleRapportRefresh}
                            onRapportOperationStart={markRapportOperationStart}
                            onRapportOperationEnd={markRapportOperationEnd}
                        />
                    </div>
                );
            case 'chronologie':
                return (
                    <div className="max-w-3xl mx-auto">
                        {/* Section des dates actuelles des statuts */}
                        <div>
                            <h4 className="text-lg font-medium mb-4 text-gray-800">⏰ Chronologie des statuts</h4>
                        </div>
                        <div className="flow-root">
                            <ul className="-mb-8">
                                {timelineEvents.map((event, index) => (
                                    <li key={index}>
                                        <div className="relative pb-8">
                                            {index !== (timelineEvents?.length ?? 0) - 1 && (
                                                <span
                                                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                                                            ${event.type === 'commande' ? 'bg-blue-500' : 'bg-green-500'}`}>
                                                        {/* Icon based on type */}
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <div>
                                                        <p className="text-sm text-gray-500">
                                                            <span className="font-medium">
                                                                {event.type === 'commande' ? 'Commande' : 'Livraison'}
                                                            </span>
                                                            {event.oldStatus ? (
                                                                <span>: {event.oldStatus} → <span className="font-medium text-gray-700">{event.status}</span></span>
                                                            ) : (
                                                                <span>: <span className="font-medium text-gray-700">{event.status}</span></span>
                                                            )}
                                                        </p>
                                                        {event.reason && (
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {event.reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                                        {formatDate(event.date)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            case 'documents':
                return (
                    <>
                        {user?.role !== 'chauffeur' && (
                            <DocumentViewer
                                commande={commande}
                                onUpdate={onUpdate}
                                onRefresh={handleRefreshWithTabPreservation}
                            />)
                        }
                    </>
                );
            case 'actions':
                return (
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                        {user?.role === 'magasin' && (
                            <CommandeActions
                                commande={commande}
                                onUpdate={onUpdate}
                                onRefresh={handleRefreshWithTabPreservation}
                            />
                        )}
                        {user?.role !== 'magasin' && (
                            <AdminActions
                                commande={commande}
                                chauffeurs={chauffeurs}
                                onUpdate={onUpdate}
                                onRefresh={handleRefreshWithTabPreservation}
                            />
                        )}
                        {/* {user?.role === 'chauffeur' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800">👨‍💼 Espace Chauffeur</h3>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-blue-700">
                                                <strong>Commande assignée à vous.</strong><br />
                                                Consultez tous les détails de livraison dans les onglets ci-dessus.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )} */}
                    </div>
                );
            default:
                return <div>Onglet non trouvé</div>;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden dark:bg-gray-800" data-commande-id={commande.id}>
            {/* En-tête avec informations principales */}
            <div className="bg-gray-50 p-4 border-b dark:bg-gray-700 dark:border-gray-600">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                        Commande #{commande.numeroCommande || 'Non spécifiée'}
                    </h2>
                    <span className={`ml-2 ${getStatutCommandeStyle(commande.statuts?.commande || 'En attente')}`}>
                        {commande.statuts?.commande || 'En attente'}
                    </span>
                    <span className={`ml-2 ${getStatutLivraisonStyle(commande.statuts?.livraison || 'EN ATTENTE')}`}>
                        {commande.statuts?.livraison || 'EN ATTENTE'}
                    </span>
                </div>
            </div>

            {/* Navigation par onglets */}
            <div className="border-b">
                <nav className="flex">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                                ${activeTab === tab.id
                                    ? 'border-red-600 text-red-600'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenu dynamique selon l'onglet */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-4"
                >
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default CommandeDetails;