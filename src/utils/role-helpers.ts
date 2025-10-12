/**
 * Utilitaires pour la gestion des rôles utilisateurs
 * Centralise la logique pour éviter la duplication de code
 */

import { UserRole } from '../types/dashboard.types';

/**
 * Vérifie si un rôle a les permissions administrateur
 * (admin et direction ont les mêmes accès)
 */
export function isAdminRole(role?: UserRole | string): boolean {
    return role === 'admin' || role === 'direction';
}

/**
 * Vérifie si un rôle est magasin
 */
export function isMagasinRole(role?: UserRole | string): boolean {
    return role === 'magasin';
}

/**
 * Vérifie si un rôle est chauffeur
 */
export function isChauffeurRole(role?: UserRole | string): boolean {
    return role === 'chauffeur';
}

/**
 * Obtient le label d'affichage du rôle
 */
export function getRoleLabel(role?: UserRole | string): string {
    switch (role) {
        case 'admin':
            return 'Administrateur';
        case 'direction':
            return 'Direction';
        case 'magasin':
            return 'Magasin';
        case 'chauffeur':
            return 'Chauffeur';
        default:
            return 'Inconnu';
    }
}

/**
 * Obtient la couleur du badge pour un rôle
 */
export function getRoleBadgeColor(role?: UserRole | string): string {
    switch (role) {
        case 'admin':
        case 'direction':
            return 'bg-red-100 text-red-800';
        case 'magasin':
            return 'bg-blue-100 text-blue-800';
        case 'chauffeur':
            return 'bg-green-100 text-green-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

/**
 * Liste des rôles avec permissions admin
 */
export const ADMIN_ROLES: readonly UserRole[] = ['admin', 'direction'] as const;

/**
 * Vérifie si un utilisateur a accès à une fonctionnalité
 */
export function hasPermission(
    userRole?: UserRole | string,
    requiredRoles?: (UserRole | string)[]
): boolean {
    if (!userRole || !requiredRoles) return false;

    // Si le rôle requis contient 'admin', inclure automatiquement 'direction'
    const expandedRoles = requiredRoles.flatMap(role =>
        role === 'admin' ? ['admin', 'direction'] : [role]
    );

    return expandedRoles.includes(userRole);
}
