import Dexie from 'dexie';
import { DbMonitor } from '../utils/db-repair';

interface CachedImage {
    originalUrl: string;  // URL originale (Airtable)
    cloudinaryUrl: string; // URL Cloudinary permanente
    blob?: Blob;          // Données de l'image pour usage hors ligne
    lastUpdated: number;  // Timestamp de dernière mise à jour
}

class ImageCacheDB extends Dexie {
    imageCache: Dexie.Table<CachedImage, string>;

    constructor() {
        super('ImageCacheDB');
        this.version(1).stores({
            imageCache: 'originalUrl, cloudinaryUrl, lastUpdated'
        });
        this.imageCache = this.table('imageCache');
    }
}

export class ImageCacheService {
    private db: ImageCacheDB;
    private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

    constructor() {
        this.db = new ImageCacheDB();
    }

    /**
     * Récupère l'URL Cloudinary pour une URL Airtable
     * Si l'URL n'est pas en cache, renvoie l'URL originale
     */
    async getCloudinaryUrl(originalUrl: string): Promise<string> {
        try {
            const cachedImage = await this.db.imageCache
                .where('originalUrl')
                .equals(originalUrl)
                .first();

            if (cachedImage?.cloudinaryUrl) {
                console.log(`URL Cloudinary trouvée en cache pour ${originalUrl}`);
                return cachedImage.cloudinaryUrl;
            }

            console.log(`Aucune URL Cloudinary en cache pour ${originalUrl}`);
            return originalUrl;
        } catch (error) {
            console.error('Erreur lors de la recherche dans le cache:', error);
            return originalUrl;
        }
    }

    /**
     * Enregistre une association URL Airtable -> URL Cloudinary dans le cache
     */
    async cacheCloudinaryUrl(originalUrl: string, cloudinaryUrl: string): Promise<void> {
        try {
            console.log(`Mise en cache de l'URL Cloudinary pour ${originalUrl}: ${cloudinaryUrl}`);

            // Vérifier si l'entrée existe déjà
            const existing = await this.db.imageCache
                .where('originalUrl')
                .equals(originalUrl)
                .first();

            if (existing) {
                // Mettre à jour l'entrée existante
                await this.db.imageCache.update(originalUrl, {
                    cloudinaryUrl,
                    lastUpdated: Date.now()
                });
            } else {
                // Créer une nouvelle entrée
                await this.db.imageCache.add({
                    originalUrl,
                    cloudinaryUrl,
                    lastUpdated: Date.now()
                });
            }
        } catch (error) {
            console.error('Erreur lors de la mise en cache de l\'URL Cloudinary:', error);
        }
    }

    /**
     * Cache l'image elle-même (blob) pour usage hors ligne
     */
    async cacheImageBlob(url: string, blob: Blob): Promise<void> {
        try {
            // Déterminer quelle URL utiliser comme clé (originale ou Cloudinary)
            const isCloudinaryUrl = url.includes('cloudinary');
            const key = isCloudinaryUrl ? url : await this.getCloudinaryUrl(url);

            // Mettre à jour l'entrée avec le blob
            if (isCloudinaryUrl) {
                // Si c'est une URL Cloudinary, trouver l'entrée par cloudinaryUrl
                const entry = await this.db.imageCache
                    .where('cloudinaryUrl')
                    .equals(url)
                    .first();

                if (entry) {
                    await this.db.imageCache.update(entry.originalUrl, {
                        blob,
                        lastUpdated: Date.now()
                    });
                }
            } else {
                // Si c'est une URL originale
                await this.db.imageCache.update(url, {
                    blob,
                    lastUpdated: Date.now()
                });
            }
        } catch (error) {
            console.error('Erreur lors du cache du blob d\'image:', error);
        }
    }

    /**
     * Récupère un blob d'image depuis le cache
     */
    async getImageBlob(url: string): Promise<Blob | null> {
        try {
            // Déterminer quelle URL utiliser comme clé
            let entry: CachedImage | undefined;

            if (url.includes('cloudinary')) {
                // Recherche par URL Cloudinary
                entry = await this.db.imageCache
                    .where('cloudinaryUrl')
                    .equals(url)
                    .first();
            } else {
                // Recherche par URL originale
                entry = await this.db.imageCache
                    .where('originalUrl')
                    .equals(url)
                    .first();
            }

            return entry?.blob || null;
        } catch (error) {
            console.error('Erreur lors de la récupération du blob d\'image:', error);
            return null;
        }
    }

    async storeImage(url: string, data: Blob): Promise<void> {
        try {
            await this.db.imageCache.put({
                originalUrl: url,
                cloudinaryUrl: '', // Provide a default or appropriate value
                blob: data,
                lastUpdated: Date.now()
            });

            // Enregistrer l'opération réussie
            DbMonitor.recordDbOperation(true, 'storeImage');
        } catch (error) {
            console.error('Erreur de mise en cache de l\'image:', error);

            // Enregistrer l'opération échouée
            DbMonitor.recordDbOperation(false, 'storeImage');
        }
    }

    // Méthode getImage
    async getImage(url: string): Promise<Blob | null> {
        try {
            const cachedImage = await this.db.table('imageCache')
                .where('url')
                .equals(url)
                .first();

            if (cachedImage) {
                // Enregistrer l'opération réussie
                DbMonitor.recordDbOperation(true, 'getImage');
                return cachedImage.data;
            }

            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'image:', error);

            // Enregistrer l'opération échouée
            DbMonitor.recordDbOperation(false, 'getImage');

            return null;
        }
    }

    /**
     * Nettoie le cache d'images (supprime les entrées obsolètes)
     */
    async cleanupCache(): Promise<void> {
        try {
            const expiryTime = Date.now() - this.CACHE_DURATION;

            // Supprimer les entrées anciennes
            await this.db.imageCache
                .where('lastUpdated')
                .below(expiryTime)
                .delete();

            console.log('Nettoyage du cache d\'images terminé');
        } catch (error) {
            console.error('Erreur lors du nettoyage du cache d\'images:', error);
        }
    }

    async trackMigratedImage(originalUrl: string, cloudinaryUrl: string): Promise<void> {
        await this.cacheCloudinaryUrl(originalUrl, cloudinaryUrl);

        // Marquer comme déjà migrée dans localStorage
        const migratedImages = JSON.parse(localStorage.getItem('migratedImages') || '{}');
        migratedImages[originalUrl] = cloudinaryUrl;
        localStorage.setItem('migratedImages', JSON.stringify(migratedImages));
    }

    // Ajouter cette méthode pour vérifier si une image a déjà été migrée
    async isImageAlreadyMigrated(originalUrl: string): Promise<boolean> {
        // Vérifier d'abord dans le cache IndexedDB
        const cachedUrl = await this.getCloudinaryUrl(originalUrl);
        if (cachedUrl !== originalUrl) {
            return true;
        }

        // Vérifier ensuite dans localStorage
        const migratedImages = JSON.parse(localStorage.getItem('migratedImages') || '{}');
        return !!migratedImages[originalUrl];
    }

    /**
 * Vérifie si une migration globale a été effectuée récemment
 */
    async shouldRunGlobalMigration(): Promise<boolean> {
        // Vérifier la date de dernière migration
        const lastMigration = localStorage.getItem('lastImageMigration');
        if (lastMigration) {
            const lastMigrationDate = new Date(parseInt(lastMigration));
            const now = new Date();
            const daysSinceLastMigration = (now.getTime() - lastMigrationDate.getTime()) / (1000 * 60 * 60 * 24);

            // Si la dernière migration date de moins de 24h, ne pas la refaire
            if (daysSinceLastMigration < 1) {
                console.log('Migration globale déjà effectuée récemment, ignorée');
                return false;
            }
        }

        // Vérifier si des images Airtable existent encore
        try {
            // Compter les entrées qui ne sont pas des URLs Cloudinary
            const airtableUrlCount = await this.db.imageCache
                .filter(entry => !entry.cloudinaryUrl.includes('cloudinary'))
                .count();

            return airtableUrlCount > 0;
        } catch (error) {
            console.error('Erreur lors de la vérification des images à migrer:', error);
            return false;
        }
    }

    /**
     * Marque la migration globale comme effectuée
     */
    markGlobalMigrationComplete(): void {
        localStorage.setItem('lastImageMigration', Date.now().toString());
        console.log('Migration globale marquée comme terminée');
    }
}

// Créer une instance singleton
export const imageCache = new ImageCacheService();