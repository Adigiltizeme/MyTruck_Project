/**
 * Types pour le système d'annonces de mises à jour
 */

export type AnnouncementType = 'new-feature' | 'improvement' | 'maintenance' | 'info';

export type UserRole = 'admin' | 'direction' | 'magasin' | 'chauffeur' | 'all';

export interface Announcement {
    id: string; // Identifiant unique (ex: "gps-tracking-feb-2026")
    title: string; // Titre de l'annonce
    message: string; // Message principal
    type: AnnouncementType; // Type d'annonce
    icon?: string; // Emoji ou icône
    ctaText?: string; // Texte du bouton d'action (optionnel)
    ctaLink?: string; // Lien du bouton d'action (optionnel)
    targetRoles: UserRole[]; // Rôles ciblés par l'annonce
    startDate: Date; // Date de début d'affichage
    endDate: Date; // Date de fin d'affichage
    priority?: number; // Priorité (1 = haute, 2 = moyenne, 3 = basse)
}

export interface AnnouncementState {
    [announcementId: string]: {
        dismissed: boolean; // L'utilisateur a fermé l'annonce
        dismissedAt?: Date; // Date de fermeture
    };
}