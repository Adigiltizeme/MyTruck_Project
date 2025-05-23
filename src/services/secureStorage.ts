// Une implémentation simple pour le MVP, à renforcer en production
export class SecureStorageService {
    private static readonly TOKEN_KEY = 'auth_token';
    private static readonly USER_KEY = 'user_data';

    // Stocke les informations d'authentification
    static setAuthData(token: string, userData: any): void {
        // Encoder les données en base64 pour une légère obfuscation (pas sécurisé mais suffisant pour le MVP)
        const encodedToken = btoa(token);
        const encodedUserData = btoa(JSON.stringify(userData));

        localStorage.setItem(this.TOKEN_KEY, encodedToken);
        localStorage.setItem(this.USER_KEY, encodedUserData);

        // Définir un timestamp d'expiration (1 jour)
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('expires_at', expiresAt.toString());
    }

    // Récupère le token
    static getToken(): string | null {
        const encodedToken = localStorage.getItem(this.TOKEN_KEY);
        if (!encodedToken) return null;

        // Vérifier l'expiration
        if (this.isTokenExpired()) {
            this.clearAuthData();
            return null;
        }

        return atob(encodedToken); // Décoder le token
    }

    // Récupère les données utilisateur
    static getUserData(): any | null {
        const encodedUserData = localStorage.getItem(this.USER_KEY);
        if (!encodedUserData) return null;

        // Vérifier l'expiration
        if (this.isTokenExpired()) {
            this.clearAuthData();
            return null;
        }

        try {
            return JSON.parse(atob(encodedUserData));
        } catch (e) {
            console.error('Erreur lors du décodage des données utilisateur', e);
            return null;
        }
    }

    // Mettre à jour les données utilisateur sans modifier le token
    static updateAuthData(userData: any): void {
        // Récupérer le token existant
        const encodedToken = localStorage.getItem(this.TOKEN_KEY);
        if (!encodedToken) {
            console.warn('Tentative de mise à jour des données sans token existant');
            return;
        }

        // Encoder les nouvelles données utilisateur
        const encodedUserData = btoa(JSON.stringify(userData));

        // Mettre à jour uniquement les données utilisateur
        localStorage.setItem(this.USER_KEY, encodedUserData);

        // Renouveler l'expiration
        this.updateExpiration();
    }

    // Efface les données d'authentification
    static clearAuthData(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem('expires_at');
    }

    // Vérifie si le token a expiré
    static isTokenExpired(): boolean {
        const expiresAt = localStorage.getItem('expires_at');
        if (!expiresAt) return true;

        return Date.now() > parseInt(expiresAt);
    }

    // Mettre à jour l'expiration (utilisé lors du rafraîchissement du token)
    static updateExpiration(durationMs: number = 24 * 60 * 60 * 1000): void {
        const expiresAt = Date.now() + durationMs;
        localStorage.setItem('expires_at', expiresAt.toString());
    }
}