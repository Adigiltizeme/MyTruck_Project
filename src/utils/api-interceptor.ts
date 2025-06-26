// Liste des domaines autorisés même en mode hors ligne
const ALLOWED_DOMAINS_OFFLINE = [
    'api.mapbox.com',
    'geocoding.api.mapbox.com',
    'api.cloudinary.com',
    'res.cloudinary.com'
];

// Sauvegarde de la méthode fetch originale
const originalFetch = window.fetch;

// Fonction pour vérifier si on doit bloquer Airtable
function shouldBlockAirtable(): boolean {
    try {
        // 1. Mode hors ligne forcé
        const isOfflineForced = localStorage.getItem('forceOfflineMode') === 'true';
        if (isOfflineForced) {
            console.log('🚫 Airtable bloqué: Mode hors ligne forcé');
            return true;
        }

        // 2. ✅ NOUVEAU: Utilisateur Backend API détecté
        const userSource = localStorage.getItem('userSource');
        const preferredSource = localStorage.getItem('preferredDataSource');

        if (userSource === 'backend' || preferredSource === 'backend_api') {
            console.log('🚫 Airtable bloqué: Utilisateur Backend API');
            return true;
        }

        // 3. ✅ NOUVEAU: Détection format utilisateur Backend
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                // Format Backend détecté
                if (user.nom && (user.magasin || user.chauffeur)) {
                    console.log('🚫 Airtable bloqué: Format utilisateur Backend détecté');
                    return true;
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }

        // 4. ✅ NOUVEAU: Token JWT Backend détecté
        const token = localStorage.getItem('authToken');
        if (token && isValidJWT(token)) {
            console.log('🚫 Airtable bloqué: Token JWT Backend détecté');
            return true;
        }

        return false;
    } catch (error) {
        console.warn('Erreur vérification blocage Airtable:', error);
        return false;
    }
}

// Vérification JWT
function isValidJWT(token: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const payload = JSON.parse(atob(parts[1]));
        return !!(payload.sub && payload.exp && payload.iat);
    } catch {
        return false;
    }
}

// ✅ NOUVEAU: Intercepteur intelligent
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : (input as Request).url;

    // Vérifier si c'est un appel Airtable
    if (url.includes('airtable.com')) {
        const shouldBlock = shouldBlockAirtable();

        if (shouldBlock) {
            const method = init?.method || 'GET';
            console.log(`🚫 AIRTABLE BLOQUÉ: ${method} ${url}`);

            // Retourner une erreur explicite
            throw new Error(`Appel Airtable bloqué - Mode Backend API actif`);
        } else {
            console.log(`✅ AIRTABLE AUTORISÉ: ${init?.method || 'GET'} ${url}`);
        }
    }

    // Mode hors ligne pour autres domaines
    const isOffline = localStorage.getItem('forceOfflineMode') === 'true';
    if (isOffline && !url.startsWith('/') && !url.startsWith(window.location.origin)) {
        const isAllowedDomain = ALLOWED_DOMAINS_OFFLINE.some(domain => url.includes(domain));

        if (!isAllowedDomain && url.includes('api.')) {
            console.log(`🚫 API BLOQUÉE (mode offline): ${init?.method || 'GET'} ${url}`);
            throw new Error(`Mode hors ligne actif - Appel à ${url} non autorisé`);
        }
    }

    // Passer l'appel à la méthode originale
    return originalFetch.apply(window, [input, init]);
};

// ✅ NOUVEAU: Fonction pour debug
function debugApiInterceptor(): void {
    console.group('🔍 DEBUG API INTERCEPTOR');
    console.log('Mode offline forcé:', localStorage.getItem('forceOfflineMode'));
    console.log('User source:', localStorage.getItem('userSource'));
    console.log('Preferred source:', localStorage.getItem('preferredDataSource'));
    console.log('Blocage Airtable actif:', shouldBlockAirtable());
    console.groupEnd();
}

// Exposer pour debug
if (typeof window !== 'undefined') {
    (window as any).debugApiInterceptor = debugApiInterceptor;
}

export function initApiInterceptor() {
    console.log('🛡️ API Interceptor initialisé avec blocage intelligent Airtable');
    debugApiInterceptor();
}