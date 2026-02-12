import { Announcement } from '../types/announcement.types';

/**
 * Configuration centralisée des annonces de mise à jour
 *
 * Pour ajouter une nouvelle annonce:
 * 1. Créer un objet Announcement avec un ID unique
 * 2. Définir les dates de début/fin
 * 3. Cibler les rôles concernés
 * 4. L'ajouter au tableau ANNOUNCEMENTS
 */

export const ANNOUNCEMENTS: Announcement[] = [
    {
        id: 'gps-tracking-release-feb-2026',
        title: '🆕 Nouvelle fonctionnalité : Suivi GPS en temps réel',
        message: `Suivez vos chauffeurs en temps réel sur une carte interactive !

📍 **Comment y accéder :**
1. Ouvrez une commande "EN COURS DE LIVRAISON"
2. Cliquez sur l'onglet "Actions"
3. Trouvez la section "Suivi GPS en Temps Réel"
4. Cliquez sur "Voir sur la carte"

Le chauffeur doit avoir activé son GPS pour que vous puissiez le suivre.`,
        type: 'new-feature',
        icon: '🚀',
        ctaText: 'Voir une livraison',
        ctaLink: '/deliveries',
        targetRoles: ['magasin', 'admin', 'direction'],
        startDate: new Date('2026-02-12'),
        endDate: new Date('2026-02-19'), // 7 jours d'affichage
        priority: 1
    },

    // Exemple d'annonce future (commentée)
    // {
    //     id: 'messaging-update-march-2026',
    //     title: '✨ Amélioration : Messagerie temps réel',
    //     message: 'Nouvelles fonctionnalités de messagerie...',
    //     type: 'improvement',
    //     icon: '💬',
    //     targetRoles: ['all'],
    //     startDate: new Date('2026-03-01'),
    //     endDate: new Date('2026-03-08'),
    //     priority: 2
    // }
];

/**
 * Obtenir les annonces actives pour un rôle donné
 */
export const getActiveAnnouncements = (userRole: string): Announcement[] => {
    const now = new Date();

    return ANNOUNCEMENTS
        .filter(announcement => {
            // Vérifier si l'annonce est dans la période d'affichage
            const isActive = now >= announcement.startDate && now <= announcement.endDate;

            // Vérifier si le rôle est ciblé
            const isTargeted = announcement.targetRoles.includes('all') ||
                             announcement.targetRoles.includes(userRole as any);

            return isActive && isTargeted;
        })
        .sort((a, b) => (a.priority || 999) - (b.priority || 999)); // Trier par priorité
};