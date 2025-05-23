import { ArticlesType } from '../types/business.types';

/**
 * Types de véhicules disponibles pour les livraisons
 */
export type VehicleType = '1M3' | '6M3' | '10M3' | '20M3';

/**
 * Interface représentant les dimensions maximales d'un véhicule
 */
export interface VehicleCapacity {
    length: number; // Longueur en cm
    width: number;  // Largeur en cm
    height: number; // Hauteur en cm
    weight: number; // Poids en kg
    description: string; // Description du véhicule
}

/**
 * Service pour la validation des véhicules et équipiers en fonction des articles à livrer
 */
export class VehicleValidationService {
    // Capacités maximales des véhicules, basées sur le PDF partagé
    private static readonly VEHICLE_CAPACITIES: Record<VehicleType, VehicleCapacity> = {
        '1M3': {
            length: 100,
            width: 100,
            height: 100,
            weight: 150,
            description: 'Utilitaire 1m³ (150kg, max 100x100x100cm)'
        },
        '6M3': {
            length: 260,
            width: 160,
            height: 125,
            weight: 300,
            description: 'Camionnette 6m³ (300kg, max 260x160x125cm)'
        },
        '10M3': {
            length: 310,
            width: 178,
            height: 190,
            weight: 800,
            description: 'Camionnette 10m³ (800kg, max 310x178x190cm)'
        },
        '20M3': {
            length: 410,
            width: 200,
            height: 210,
            weight: 750,
            description: 'Camion 20m³ avec hayon (750kg, max 410x200x210cm)'
        }
    };

    /**
     * Obtient les capacités d'un type de véhicule
     * @param vehicleType Type de véhicule
     * @returns Capacités du véhicule
     */
    public static getVehicleCapacity(vehicleType: VehicleType): VehicleCapacity {
        return this.VEHICLE_CAPACITIES[vehicleType];
    }

    /**
     * Obtient tous les types de véhicules disponibles
     * @returns Liste des types de véhicules
     */
    public static getAvailableVehicleTypes(): VehicleType[] {
        return Object.keys(this.VEHICLE_CAPACITIES) as VehicleType[];
    }

    /**
     * Vérifie si un article peut être transporté dans un véhicule
     * @param article Article à transporter
     * @param vehicleType Type de véhicule
     * @param canBeTilted L'article peut-il être couché (pour les arbres, objets longs)
     * @returns True si l'article peut être transporté, false sinon
     */
    public static canFitInVehicle(
        article: { longueur?: number; largeur?: number; hauteur?: number; poids?: number },
        vehicleType: VehicleType,
        canBeTilted: boolean = false
    ): boolean {
        const vehicleCapacity = this.VEHICLE_CAPACITIES[vehicleType];

        // Vérifier le poids
        if (article.poids && article.poids > vehicleCapacity.weight) {
            return false;
        }

        // Si aucune dimension n'est spécifiée, on considère que l'article peut être transporté
        if (!article.longueur && !article.largeur && !article.hauteur) {
            return true;
        }

        const longueur = article.longueur || 0;
        const largeur = article.largeur || 0;
        const hauteur = article.hauteur || 0;

        // Vérifier les dimensions standards
        const standardFit =
            longueur <= vehicleCapacity.length &&
            largeur <= vehicleCapacity.width &&
            hauteur <= vehicleCapacity.height;

        if (standardFit) {
            return true;
        }

        // Si l'article peut être couché, vérifier les dimensions supplémentaires
        if (canBeTilted) {
            // Vérifier toutes les orientations possibles
            // Orientation 1: longueur dans la longueur, largeur dans la largeur, hauteur dans la hauteur
            const orientation1 =
                longueur <= vehicleCapacity.length &&
                largeur <= vehicleCapacity.width &&
                hauteur <= vehicleCapacity.height;

            // Orientation 2: longueur dans la longueur, hauteur dans la largeur, largeur dans la hauteur
            const orientation2 =
                longueur <= vehicleCapacity.length &&
                hauteur <= vehicleCapacity.width &&
                largeur <= vehicleCapacity.height;

            // Orientation 3: largeur dans la longueur, longueur dans la largeur, hauteur dans la hauteur
            const orientation3 =
                largeur <= vehicleCapacity.length &&
                longueur <= vehicleCapacity.width &&
                hauteur <= vehicleCapacity.height;

            // Orientation 4: largeur dans la longueur, hauteur dans la largeur, longueur dans la hauteur
            const orientation4 =
                largeur <= vehicleCapacity.length &&
                hauteur <= vehicleCapacity.width &&
                longueur <= vehicleCapacity.height;

            // Orientation 5: hauteur dans la longueur, longueur dans la largeur, largeur dans la hauteur
            const orientation5 =
                hauteur <= vehicleCapacity.length &&
                longueur <= vehicleCapacity.width &&
                largeur <= vehicleCapacity.height;

            // Orientation 6: hauteur dans la longueur, largeur dans la largeur, longueur dans la hauteur
            const orientation6 =
                hauteur <= vehicleCapacity.length &&
                largeur <= vehicleCapacity.width &&
                longueur <= vehicleCapacity.height;

            return orientation1 || orientation2 || orientation3 || orientation4 || orientation5 || orientation6;
        }

        return false;
    }

    /**
     * Détermine le nombre d'équipiers recommandé en fonction des articles à livrer
     * @param articles Liste des articles à livrer
     * @returns Nombre d'équipiers recommandé (0, 1, 2 ou 3)
     */
    public static getRecommendedCrewSize(articles: { poids?: number }[]): number {
        // Calculer le poids total des articles
        const totalWeight = articles.reduce((sum, article) => sum + (article.poids || 0), 0);

        // Règles pour déterminer le nombre d'équipiers
        // (basées sur les informations du PDF et les bonnes pratiques de livraison)

        // 0 équipier si le poids total est inférieur à 30kg
        if (totalWeight < 30) {
            return 0;
        }

        // 1 équipier si le poids total est entre 30kg et 100kg
        if (totalWeight <= 100) {
            return 1;
        }

        // 2 équipiers si le poids total est entre 100kg et 300kg
        if (totalWeight <= 300) {
            return 2;
        }

        // 3 équipiers (cas spécial, nécessite un devis) si le poids est supérieur à 300kg
        return 3;
    }

    /**
     * Vérifie si une livraison nécessite des équipiers supplémentaires basée sur d'autres critères
     * @param criteria Critères supplémentaires
     * @returns True si des équipiers supplémentaires sont nécessaires
     */
    public static needsAdditionalCrew(criteria: {
        hasElevator: boolean;        // Présence d'un ascenseur
        hasStairs: boolean;          // Présence d'escaliers
        stairCount?: number;         // Nombre de marches
        floor: number | string;      // Étage
        heavyItems: boolean;         // Articles lourds (plus de 30kg individuellement)
        totalItemCount: number;      // Nombre total d'articles
        parkingDistance?: number;    // Distance de stationnement en mètres
        needsAssembly?: boolean;     // Nécessite un montage
    }): boolean {
        // Situations qui nécessitent des équipiers supplémentaires

        // Livraison à un étage élevé sans ascenseur
        if (!criteria.hasElevator) {
            const floor = typeof criteria.floor === 'string'
                ? parseInt(criteria.floor.replace(/\D/g, '')) || 0
                : criteria.floor;

            if (floor > 2) {
                return true;
            }
        }

        // Beaucoup d'escaliers
        if (criteria.hasStairs && criteria.stairCount && criteria.stairCount > 20) {
            return true;
        }

        // Articles lourds
        if (criteria.heavyItems) {
            return true;
        }

        // Beaucoup d'articles
        if (criteria.totalItemCount > 20) {
            return true;
        }

        // Distance de stationnement importante
        if (criteria.parkingDistance && criteria.parkingDistance > 50) {
            return true;
        }

        // Montage nécessaire
        if (criteria.needsAssembly) {
            return true;
        }

        return false;
    }

    /**
     * Recommande un véhicule pour transporter un ensemble d'articles
     * @param articles Articles à transporter
     * @param canBeTilted Les articles peuvent-ils être couchés
     * @returns Le type de véhicule recommandé ou null si aucun ne convient
     */
    public static recommendVehicle(
        articles: { longueur?: number; largeur?: number; hauteur?: number; poids?: number }[],
        canBeTilted: boolean = false
    ): VehicleType | null {
        // Si aucun article n'est spécifié, recommander le plus petit véhicule
        if (!articles || articles.length === 0) {
            return '1M3';
        }

        // Calculer les dimensions maximales et le poids total
        let maxLength = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        let totalWeight = 0;

        articles.forEach(article => {
            maxLength = Math.max(maxLength, article.longueur || 0);
            maxWidth = Math.max(maxWidth, article.largeur || 0);
            maxHeight = Math.max(maxHeight, article.hauteur || 0);
            totalWeight += article.poids || 0;
        });

        // Chercher le plus petit véhicule qui peut transporter les articles
        const vehicleTypes = this.getAvailableVehicleTypes();

        for (const vehicleType of vehicleTypes) {
            const vehicleCapacity = this.VEHICLE_CAPACITIES[vehicleType];

            // Vérifier le poids
            if (totalWeight > vehicleCapacity.weight) {
                continue;
            }

            // Vérifier les dimensions standards
            if (
                maxLength <= vehicleCapacity.length &&
                maxWidth <= vehicleCapacity.width &&
                maxHeight <= vehicleCapacity.height
            ) {
                return vehicleType;
            }

            // Si les articles peuvent être couchés, vérifier les orientations alternatives
            if (canBeTilted) {
                // On vérifie si l'une des orientations possibles permet de faire entrer les articles
                if (
                    (maxLength <= vehicleCapacity.length && maxHeight <= vehicleCapacity.width && maxWidth <= vehicleCapacity.height) ||
                    (maxWidth <= vehicleCapacity.length && maxLength <= vehicleCapacity.width && maxHeight <= vehicleCapacity.height) ||
                    (maxWidth <= vehicleCapacity.length && maxHeight <= vehicleCapacity.width && maxLength <= vehicleCapacity.height) ||
                    (maxHeight <= vehicleCapacity.length && maxLength <= vehicleCapacity.width && maxWidth <= vehicleCapacity.height) ||
                    (maxHeight <= vehicleCapacity.length && maxWidth <= vehicleCapacity.width && maxLength <= vehicleCapacity.height)
                ) {
                    return vehicleType;
                }
            }
        }

        // Si aucun véhicule ne convient, retourner null
        return null;
    }
}