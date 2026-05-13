import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { announcementService, Announcement } from '../services/announcement.service';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/notificationService';

const STORAGE_KEY = 'myTruck_dismissedAnnouncements';

type AnnouncementTypeUI = 'new-feature' | 'improvement' | 'maintenance' | 'info' | 'update';
const mapBackendTypeToUI = (type: Announcement['type']): AnnouncementTypeUI => {
    switch (type) {
        case 'NEW_FEATURE': return 'new-feature';
        case 'IMPROVEMENT': return 'improvement';
        case 'MAINTENANCE': return 'maintenance';
        case 'INFO': return 'info';
        case 'UPDATE': return 'update';
        default: return 'info';
    }
};

/**
 * Composant d'annonce de mise à jour
 * - Affiche les annonces actives pour le rôle de l'utilisateur
 * - Persiste l'état "fermé" dans localStorage
 * - Réutilisable pour toutes les futures annonces
 */
export const UpdateAnnouncement: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [visibleAnnouncement, setVisibleAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        if (!user?.role) return;

        const loadAnnouncements = async () => {
            try {
                // Récupérer les annonces actives depuis l'API
                const activeAnnouncements = await announcementService.getActiveAnnouncements();

                if (activeAnnouncements.length === 0) {
                    return;
                }

                // Récupérer les annonces déjà fermées
                const dismissedData = localStorage.getItem(STORAGE_KEY);
                const dismissed: { [key: string]: boolean } = dismissedData ? JSON.parse(dismissedData) : {};

                // Trouver la première annonce non fermée
                const nextAnnouncement = activeAnnouncements.find(a => !dismissed[a.id]);

                if (nextAnnouncement) {
                    setVisibleAnnouncement(nextAnnouncement);
                }
            } catch (error) {
                console.error('❌ Erreur lors du chargement des annonces:', error);
            }
        };

        loadAnnouncements();
    }, [user?.role]);

    // Écouter les clics sur les notifications pour rouvrir l'annonce
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;

            if (hash.startsWith('#reopen-announcement-')) {
                const announcementId = hash.replace('#reopen-announcement-', '');

                // Retirer l'annonce des fermées
                const dismissedData = localStorage.getItem(STORAGE_KEY);
                const dismissed: { [key: string]: boolean } = dismissedData ? JSON.parse(dismissedData) : {};
                delete dismissed[announcementId];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));

                // Nettoyer le hash
                window.location.hash = '';

                // Recharger les annonces pour afficher celle qui vient d'être rouverte
                window.location.reload();
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        // Vérifier au chargement initial
        handleHashChange();

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    const createNotificationFromAnnouncement = useCallback((announcement: Announcement) => {
        // Vérifier si une notification pour cette annonce existe déjà
        const existingNotifications = localStorage.getItem('notifications');
        if (existingNotifications) {
            try {
                const notifications = JSON.parse(existingNotifications);
                const hasExisting = notifications.some((n: { link?: string }) =>
                    n.link === '#reopen-announcement-' + announcement.id
                );

                if (hasExisting) {
                    return; // Ne pas créer de doublon
                }
            } catch (e) {
                console.error('Erreur vérification notifications:', e);
            }
        }

        // Créer une notification persistante pour permettre de retrouver l'annonce
        const notificationMessage = `${announcement.icon || '📢'} ${announcement.title}`;

        NotificationService.info(
            notificationMessage,
            '#reopen-announcement-' + announcement.id, // Lien spécial pour rouvrir
            'Voir l\'annonce'
        );
    }, []);

    const handleDismiss = useCallback(() => {
        if (!visibleAnnouncement) return;

        // Créer une notification avant de fermer
        createNotificationFromAnnouncement(visibleAnnouncement);

        // Sauvegarder l'état "fermé" dans localStorage
        const dismissedData = localStorage.getItem(STORAGE_KEY);
        const dismissed: { [key: string]: boolean } = dismissedData ? JSON.parse(dismissedData) : {};
        dismissed[visibleAnnouncement.id] = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));

        // Cacher l'annonce
        setVisibleAnnouncement(null);
    }, [visibleAnnouncement, createNotificationFromAnnouncement]);

    const handleCTA = useCallback(() => {
        if (!visibleAnnouncement) return;

        // Pour UPDATE : déconnecter pour forcer un nouveau token, puis recharger les nouveaux assets
        if (visibleAnnouncement.type === 'UPDATE') {
            const dismissedData = localStorage.getItem(STORAGE_KEY);
            const dismissed: { [key: string]: boolean } = dismissedData ? JSON.parse(dismissedData) : {};
            dismissed[visibleAnnouncement.id] = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
            logout(); // Efface le token → l'utilisateur se reconnecte avec un token frais
            window.location.reload();
            return;
        }

        if (!visibleAnnouncement.ctaLink) return;

        createNotificationFromAnnouncement(visibleAnnouncement);
        navigate(visibleAnnouncement.ctaLink);

        const dismissedData = localStorage.getItem(STORAGE_KEY);
        const dismissed: { [key: string]: boolean } = dismissedData ? JSON.parse(dismissedData) : {};
        dismissed[visibleAnnouncement.id] = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
        setVisibleAnnouncement(null);
    }, [visibleAnnouncement, navigate, createNotificationFromAnnouncement]);

    // Couleurs selon le type d'annonce
    const getTypeStyles = (type: AnnouncementTypeUI) => {
        switch (type) {
            case 'new-feature':
                return {
                    bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                    border: 'border-blue-300',
                    icon: '🚀'
                };
            case 'improvement':
                return {
                    bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
                    border: 'border-green-300',
                    icon: '✨'
                };
            case 'maintenance':
                return {
                    bg: 'bg-gradient-to-r from-orange-500 to-amber-600',
                    border: 'border-orange-300',
                    icon: '🔧'
                };
            case 'info':
                return {
                    bg: 'bg-gradient-to-r from-gray-500 to-slate-600',
                    border: 'border-gray-300',
                    icon: 'ℹ️'
                };
            case 'update':
                return {
                    bg: 'bg-gradient-to-r from-violet-600 to-purple-700',
                    border: 'border-violet-300',
                    icon: '⬆️'
                };
            default:
                return {
                    bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                    border: 'border-blue-300',
                    icon: '📢'
                };
        }
    };

    if (!visibleAnnouncement) return null;

    const uiType = mapBackendTypeToUI(visibleAnnouncement.type);
    const styles = getTypeStyles(uiType);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
                className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4"
            >
                <div className={`${styles.bg} rounded-xl shadow-2xl border-2 ${styles.border} text-white overflow-hidden`}>
                    {/* Header avec icône et bouton fermer */}
                    <div className="flex items-start justify-between p-4 pb-2">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">{visibleAnnouncement.icon || styles.icon}</span>
                            <h3 className="text-xl font-bold">{visibleAnnouncement.title}</h3>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            aria-label="Fermer l'annonce"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Message */}
                    <div className="px-4 pb-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-3">
                            <p className="whitespace-pre-line text-sm leading-relaxed">
                                {visibleAnnouncement.message}
                            </p>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                            >
                                J'ai compris
                            </button>
                            {(visibleAnnouncement.ctaText || visibleAnnouncement.type === 'UPDATE') && (
                                <button
                                    onClick={handleCTA}
                                    className={`px-4 py-2 rounded-lg font-bold transition-colors shadow-lg ${
                                        visibleAnnouncement.type === 'UPDATE'
                                            ? 'bg-white text-violet-700 hover:bg-violet-50'
                                            : 'bg-white text-blue-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {visibleAnnouncement.ctaText || 'Mettre à jour et se reconnecter'} →
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Badge de priorité */}
                    {visibleAnnouncement.priority === 1 && (
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            IMPORTANT
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};