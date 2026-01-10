/**
 * 🔗 Utilitaires pour créer des liens cliquables (téléphone, navigation GPS)
 *
 * Utilisés pour permettre aux chauffeurs et administrateurs de :
 * - Appeler directement depuis l'interface
 * - Naviguer vers une adresse via GPS
 */

/**
 * Formate un numéro de téléphone pour un lien tel:
 * Supprime tous les caractères non-numériques sauf le +
 */
export function formatPhoneForLink(phone: string | undefined | null): string {
    if (!phone) return '';

    // Nettoyer le numéro : garder uniquement chiffres et +
    return phone.replace(/[^\d+]/g, '');
}

/**
 * Crée un lien tel: cliquable
 * Fonctionne sur mobile (appel direct) et desktop (ouvre application téléphone si disponible)
 */
export function createPhoneLink(phone: string | undefined | null): string {
    const cleaned = formatPhoneForLink(phone);
    return cleaned ? `tel:${cleaned}` : '';
}

/**
 * Formate une adresse pour la navigation GPS
 * Compatible avec Google Maps, Apple Maps, Waze
 */
export function formatAddressForNavigation(
    address: string | undefined | null,
    city?: string | undefined | null,
    postalCode?: string | undefined | null
): string {
    if (!address) return '';

    const parts = [
        address,
        postalCode,
        city
    ].filter(Boolean);

    return encodeURIComponent(parts.join(', '));
}

/**
 * Crée un lien de navigation GPS universel
 * Utilise geo: URI scheme qui ouvre le sélecteur d'applications GPS
 * Compatible iOS, Android et Desktop
 */
export function createNavigationLink(
    address: string | undefined | null,
    city?: string | undefined | null,
    postalCode?: string | undefined | null
): string {
    const formattedAddress = formatAddressForNavigation(address, city, postalCode);

    if (!formattedAddress) return '';

    // geo: URI scheme universellement supporté
    // Sur mobile : ouvre sélecteur avec TOUTES les apps GPS (Google Maps, Waze, Apple Maps, etc.)
    // Sur desktop : fallback vers Google Maps
    // Format : geo:0,0?q=adresse (0,0 = pas de coordonnées GPS précises, utilise l'adresse)
    return `geo:0,0?q=${formattedAddress}`;
}

/**
 * Crée un lien Google Maps (toujours web, compatible tous appareils)
 */
export function createGoogleMapsLink(
    address: string | undefined | null,
    city?: string | undefined | null,
    postalCode?: string | undefined | null
): string {
    const formattedAddress = formatAddressForNavigation(address, city, postalCode);

    if (!formattedAddress) return '';

    return `https://www.google.com/maps/search/?api=1&query=${formattedAddress}`;
}

/**
 * Crée un lien Waze
 */
export function createWazeLink(
    address: string | undefined | null,
    city?: string | undefined | null,
    postalCode?: string | undefined | null
): string {
    const formattedAddress = formatAddressForNavigation(address, city, postalCode);

    if (!formattedAddress) return '';

    return `https://waze.com/ul?q=${formattedAddress}&navigate=yes`;
}

/**
 * Type pour les options de navigation
 */
export type NavigationApp = 'auto' | 'google-maps' | 'waze' | 'apple-maps';

/**
 * Crée un lien de navigation selon l'application choisie
 */
export function createNavigationLinkByApp(
    app: NavigationApp,
    address: string | undefined | null,
    city?: string | undefined | null,
    postalCode?: string | undefined | null
): string {
    switch (app) {
        case 'google-maps':
            return createGoogleMapsLink(address, city, postalCode);
        case 'waze':
            return createWazeLink(address, city, postalCode);
        case 'apple-maps':
            const formattedAddress = formatAddressForNavigation(address, city, postalCode);
            return formattedAddress ? `maps://maps.apple.com/?q=${formattedAddress}` : '';
        case 'auto':
        default:
            return createNavigationLink(address, city, postalCode);
    }
}

/**
 * Vérifie si un numéro de téléphone est valide
 */
export function isValidPhone(phone: string | undefined | null): boolean {
    if (!phone) return false;

    const cleaned = formatPhoneForLink(phone);
    // Au moins 10 chiffres (numéro français standard)
    return cleaned.replace(/\+/g, '').length >= 10;
}

/**
 * Vérifie si une adresse est valide pour la navigation
 */
export function isValidAddress(address: string | undefined | null): boolean {
    if (!address) return false;

    // Au moins 5 caractères pour être considérée valide
    return address.trim().length >= 5;
}
