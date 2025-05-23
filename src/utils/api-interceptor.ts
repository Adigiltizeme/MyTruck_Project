// Liste des domaines autorisés même en mode hors ligne
const ALLOWED_DOMAINS_OFFLINE = [
    'api.mapbox.com',      // Pour le calcul des distances
    'geocoding.api.mapbox.com', // Pour le géocodage des adresses
    'api.cloudinary.com',  // Pour la gestion des images
    'res.cloudinary.com'   // Pour l'affichage des images
];

// Sauvegarde de la méthode fetch originale
const originalFetch = window.fetch;

// Remplace la méthode fetch par notre version qui vérifie le mode hors ligne
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const isOffline = localStorage.getItem('forceOfflineMode') === 'true';
    const url = typeof input === 'string' ? input : (input as Request).url;

    // Si nous sommes en mode hors ligne et que l'URL n'est pas locale
    if (isOffline && !url.startsWith('/') && !url.startsWith(window.location.origin)) {
        // Vérifier si l'URL est autorisée en mode hors ligne
        const isAllowedDomain = ALLOWED_DOMAINS_OFFLINE.some(domain => url.includes(domain));
        // Si c'est un appel à Airtable (jamais autorisé en mode hors ligne) ou autre domaine non autorisé
        if (url.includes('airtable.com') || (!isAllowedDomain && url.includes('api.'))) {
            console.log(`[Mode hors ligne] Appel API bloqué: ${init?.method || 'GET'} ${url}`);
            throw new Error(`Mode hors ligne actif - Appel à ${url} non autorisé`);
        }

        // Si le domaine est autorisé, on log mais on laisse passer
        if (isAllowedDomain) {
            console.log(`[Mode hors ligne] Appel API autorisé: ${init?.method || 'GET'} ${url}`);
        }
    }

    // Sinon, procéder avec la requête normale
    return originalFetch.apply(window, [input, init]);
};

// Fonction pour initialiser l'intercepteur
export function initApiInterceptor() {
    console.log('API Interceptor initialized');
    // Déjà initialisé par le simple fait d'importer ce fichier
}