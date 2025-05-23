// src/services/optimized-image-cache.service.ts
import Dexie from 'dexie';
import { DbMonitor } from '../utils/db-repair';
import { SafeDbService } from './safe-db.service';

// Définition de l'interface pour le cache d'images optimisé
interface OptimizedImageCacheDB extends Dexie {
    images: Dexie.Table<CachedImage, string>;
}

interface CachedImage {
    id: string;
    originalUrl: string;
    cloudinaryUrl?: string;
    blob?: Blob;
    contentType?: string;
    lastUpdated: number;
    size?: number;
}

/**
 * Service de cache d'images optimisé utilisant SafeDbService
 */
export class OptimizedImageCache {
    private static readonly DB_NAME = 'OptimizedImageCache';
    private static readonly TABLE_NAME = 'images';
    private static readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 jours
    private static db: OptimizedImageCacheDB;

    /**
     * Initialise la base de données de cache d'images
     */
    static async init(): Promise<boolean> {
        try {
            // Vérifier si la base existe ou la créer
            await this.createDatabase();
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du cache d\'images:', error);
            return false;
        }
    }

    /**
     * Crée la base de données du cache d'images via SafeDbService
     */
    private static async createDatabase(): Promise<void> {
        // Pour simplifier, j'utilise directement Dexie pour cette base spécifique
        // car elle est séparée de la base principale de l'application

        class ImageCacheDB extends Dexie {
            images: Dexie.Table<CachedImage, string>;

            constructor() {
                super('OptimizedImageCache');
                this.version(1).stores({
                    images: 'id, originalUrl, lastUpdated'
                });
                this.images = this.table('images');
            }
        }

        this.db = new ImageCacheDB() as OptimizedImageCacheDB;
        await this.db.open();
    }

    /**
     * Stocke une image dans le cache
     */
    static async storeImage(originalUrl: string, blob: Blob, cloudinaryUrl?: string): Promise<boolean> {
        try {
            // Générer un ID unique
            const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // Créer l'objet image
            const image: CachedImage = {
                id,
                originalUrl,
                blob,
                cloudinaryUrl,
                contentType: blob.type,
                size: blob.size,
                lastUpdated: Date.now()
            };

            // Vérifier si une image avec la même URL existe déjà
            const existingImage = await this.db.images
                .where('originalUrl')
                .equals(originalUrl)
                .first();

            if (existingImage) {
                // Mettre à jour l'image existante
                await this.db.images.update(existingImage.id, {
                    blob,
                    cloudinaryUrl: cloudinaryUrl || existingImage.cloudinaryUrl,
                    contentType: blob.type,
                    size: blob.size,
                    lastUpdated: Date.now()
                });
            } else {
                // Ajouter une nouvelle image
                await this.db.images.add(image);
            }

            // Enregistrer l'opération réussie
            DbMonitor.recordDbOperation(true, 'OptimizedImageCache.storeImage');

            return true;
        } catch (error) {
            console.error('Erreur lors du stockage de l\'image:', error);

            // Enregistrer l'erreur
            DbMonitor.recordDbOperation(
                false,
                'OptimizedImageCache.storeImage',
                error instanceof Error ? error.message : String(error)
            );

            return false;
        }
    }

    /**
     * Récupère une image du cache par URL
     */
    static async getImage(url: string): Promise<{ blob: Blob; contentType: string } | null> {
        try {
            // Rechercher l'image par URL
            const image = await this.db.images
                .where('originalUrl')
                .equals(url)
                .first();

            // Enregistrer l'opération réussie
            DbMonitor.recordDbOperation(true, 'OptimizedImageCache.getImage');

            if (image && image.blob) {
                return {
                    blob: image.blob,
                    contentType: image.contentType || 'image/jpeg'
                };
            }

            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'image:', error);

            // Enregistrer l'erreur
            DbMonitor.recordDbOperation(
                false,
                'OptimizedImageCache.getImage',
                error instanceof Error ? error.message : String(error)
            );

            return null;
        }
    }

    /**
     * Nettoie les anciennes entrées du cache
     */
    static async cleanupCache(): Promise<number> {
        try {
            // Calculer la date d'expiration
            const expiryTime = Date.now() - this.CACHE_DURATION;

            // Supprimer les entrées anciennes
            const deletedCount = await this.db.images
                .where('lastUpdated')
                .below(expiryTime)
                .delete();

            console.log(`Nettoyage du cache d'images terminé, ${deletedCount} images supprimées`);

            // Enregistrer l'opération réussie
            DbMonitor.recordDbOperation(true, 'OptimizedImageCache.cleanupCache');

            return deletedCount;
        } catch (error) {
            console.error('Erreur lors du nettoyage du cache d\'images:', error);

            // Enregistrer l'erreur
            DbMonitor.recordDbOperation(
                false,
                'OptimizedImageCache.cleanupCache',
                error instanceof Error ? error.message : String(error)
            );

            return 0;
        }
    }

    /**
   * Nettoie les URL invalides du cache
   */
    static async cleanupInvalidCachedImages(): Promise<number> {
        try {
            // Ouvrir le cache d'images
            const cache = await caches.open('my-truck-images');

            // Récupérer toutes les entrées du cache
            const keys = await cache.keys();
            let removedCount = 0;

            // Pour chaque entrée, vérifier si elle est valide
            for (const request of keys) {
                try {
                    // Essayer de récupérer l'entrée
                    const response = await cache.match(request);

                    // Si la réponse n'est pas valide ou est une erreur, supprimer l'entrée
                    if (!response || !response.ok || response.status >= 400) {
                        await cache.delete(request);
                        removedCount++;
                        console.log(`Image supprimée du cache: ${request.url}`);
                    }
                } catch (e) {
                    // En cas d'erreur, supprimer l'entrée
                    await cache.delete(request);
                    removedCount++;
                }
            }

            console.log(`${removedCount} images invalides supprimées du cache`);
            return removedCount;
        } catch (error) {
            console.error('Erreur lors du nettoyage du cache d\'images:', error);
            return 0;
        }
    }

    /**
   * Vérifie si une image est en cache et valide
   */
    static async isImageCached(url: string): Promise<boolean> {
        try {
            const cache = await caches.open('my-truck-images');
            const response = await cache.match(url);
            return !!response && response.ok;
        } catch (error) {
            console.error(`Erreur lors de la vérification du cache pour ${url}:`, error);
            return false;
        }
    }

    /**
     * Obtient les statistiques du cache
     */
    static async getStats(): Promise<{
        totalImages: number;
        totalSize: number;
        oldestImage: Date;
        newestImage: Date;
    }> {
        try {
            // Récupérer toutes les entrées
            const images = await this.db.images.toArray();

            // Calculer les statistiques
            let totalSize = 0;
            let oldestTimestamp = Number.MAX_SAFE_INTEGER;
            let newestTimestamp = 0;

            for (const image of images) {
                totalSize += image.size || 0;

                if (image.lastUpdated < oldestTimestamp) {
                    oldestTimestamp = image.lastUpdated;
                }

                if (image.lastUpdated > newestTimestamp) {
                    newestTimestamp = image.lastUpdated;
                }
            }

            return {
                totalImages: images.length,
                totalSize,
                oldestImage: new Date(oldestTimestamp !== Number.MAX_SAFE_INTEGER ? oldestTimestamp : Date.now()),
                newestImage: new Date(newestTimestamp || Date.now())
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);

            return {
                totalImages: 0,
                totalSize: 0,
                oldestImage: new Date(),
                newestImage: new Date()
            };
        }
    }

    /**
   * Récupère l'URL Cloudinary associée à une URL Airtable
   */
    static async getCloudinaryUrl(originalUrl: string): Promise<string | null> {
        try {
            // Rechercher l'image par URL dans la base de données
            const image = await this.db.images
                .where('originalUrl')
                .equals(originalUrl)
                .first();

            // Enregistrer l'opération réussie
            DbMonitor.recordDbOperation(true, 'OptimizedImageCache.getCloudinaryUrl');

            // Retourner l'URL Cloudinary si elle existe
            return image?.cloudinaryUrl || null;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'URL Cloudinary:', error);

            // Enregistrer l'erreur
            DbMonitor.recordDbOperation(
                false,
                'OptimizedImageCache.getCloudinaryUrl',
                error instanceof Error ? error.message : String(error)
            );

            return null;
        }
    }

    /**
     * Stocke une association entre une URL Airtable et une URL Cloudinary
     */
    static async storeCloudinaryUrl(originalUrl: string, cloudinaryUrl: string): Promise<boolean> {
        try {
            // Vérifier si l'URL existe déjà
            const existingImage = await this.db.images
                .where('originalUrl')
                .equals(originalUrl)
                .first();

            if (existingImage) {
                // Mettre à jour l'entrée existante
                await this.db.images.update(existingImage.id, {
                    cloudinaryUrl: cloudinaryUrl,
                    lastUpdated: Date.now()
                });
            } else {
                // Créer une nouvelle entrée
                await this.db.images.add({
                    id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    originalUrl: originalUrl,
                    cloudinaryUrl: cloudinaryUrl,
                    lastUpdated: Date.now()
                });
            }

            // Enregistrer l'opération réussie
            DbMonitor.recordDbOperation(true, 'OptimizedImageCache.storeCloudinaryUrl');

            // Mettre à jour le localStorage pour le suivi rapide
            const migratedImages = JSON.parse(localStorage.getItem('migratedImages') || '{}');
            migratedImages[originalUrl] = cloudinaryUrl;
            localStorage.setItem('migratedImages', JSON.stringify(migratedImages));

            return true;
        } catch (error) {
            console.error('Erreur lors du stockage de l\'URL Cloudinary:', error);

            // Enregistrer l'erreur
            DbMonitor.recordDbOperation(
                false,
                'OptimizedImageCache.storeCloudinaryUrl',
                error instanceof Error ? error.message : String(error)
            );

            return false;
        }
    }

    /**
     * Vérifie si des URLs Airtable sont présentes dans le cache
     */
    static async hasAirtableUrls(): Promise<boolean> {
        try {
            // Vérifier si des entrées ont des URLs Cloudinary non définies
            // ou commençant par le préfixe Airtable
            const count = await this.db.images
                .filter(img => !img.cloudinaryUrl || img.cloudinaryUrl.includes('airtable.com'))
                .count();

            return count > 0;
        } catch (error) {
            console.error('Erreur lors de la vérification des URLs Airtable:', error);
            return false;
        }
    }
}