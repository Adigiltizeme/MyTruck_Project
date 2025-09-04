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

    /**
     * 🎯 LOGIQUE COMPLÈTE : Détermine les équipiers requis
     * Basé sur l'article le plus lourd + CUMUL de TOUTES les conditions d'ajout
     */
    public static getRequiredCrewSize(
        articles: { poids?: number; quantite?: number }[],
        deliveryConditions: {
            hasElevator?: boolean;
            totalItemCount?: number;
            rueInaccessible?: boolean;
            paletteComplete?: boolean;
            parkingDistance?: number;
            hasStairs?: boolean;
            stairCount?: number;
            needsAssembly?: boolean;
            floor?: number | string;
            isDuplex?: boolean;
            deliveryToUpperFloor?: boolean;
        } = {}
    ): number {
        if (!articles || articles.length === 0) {
            return 0;
        }

        console.log('🎯 CALCUL ÉQUIPIERS - LOGIQUE CORRIGÉE');

        // 🔍 ÉTAPE 1: Identifier l'article le plus lourd individuellement
        let heaviestIndividualWeight = 0;
        articles.forEach(article => {
            const poids = article.poids || 0;
            if (poids > heaviestIndividualWeight) {
                heaviestIndividualWeight = poids;
            }
        });

        // 🔍 ÉTAPE 2: Calculer le poids total avec quantités
        const totalWeight = articles.reduce((sum, article) =>
            sum + ((article.poids || 0) * (article.quantite || 1)), 0
        );

        // 🔍 ÉTAPE 3: Calculer le nombre total d'articles
        const totalItemCount = deliveryConditions.totalItemCount ||
            articles.reduce((sum, article) => sum + (article.quantite || 1), 0);

        // 🔍 ÉTAPE 4: Calculer l'étage effectif (avec duplex/maison)
        let effectiveFloor = 0;
        if (deliveryConditions.floor) {
            effectiveFloor = typeof deliveryConditions.floor === 'string'
                ? parseInt(deliveryConditions.floor) || 0
                : deliveryConditions.floor;
        }

        // 🆕 LOGIQUE DUPLEX/MAISON : +1 étage si livraison à l'étage
        if (deliveryConditions.isDuplex && deliveryConditions.deliveryToUpperFloor) {
            effectiveFloor += 1;
            console.log(`🏠 Duplex/Maison: +1 étage → ${effectiveFloor} étages effectifs`);
        }

        console.log(`📊 Données calculées:`, {
            heaviestIndividualWeight,
            totalWeight,
            totalItemCount,
            effectiveFloor,
            hasElevator: deliveryConditions.hasElevator
        });

        // 🔥 CORRECTION MAJEURE : CUMUL AU LIEU DE Math.max()
        let totalRequiredCrew = 0;
        const triggeredConditions: string[] = [];

        // ✅ CONDITION 1: Au moins un article pèse 30kg individuellement
        if (heaviestIndividualWeight >= 30) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push(`Article lourd: ${heaviestIndividualWeight}kg (≥30kg)`);
            console.log('✅ +1 équipier: Article lourd détecté');
        }

        // ✅ CONDITION 2: Charge totale >300kg avec ascenseur
        if (deliveryConditions.hasElevator && totalWeight > 300) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push(`Charge lourde avec ascenseur: ${totalWeight}kg (>300kg)`);
            console.log('✅ +1 équipier: Charge lourde avec ascenseur');
        }

        // ✅ CONDITION 3: Charge totale >200kg sans ascenseur
        if (!deliveryConditions.hasElevator && totalWeight > 200) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push(`Charge lourde sans ascenseur: ${totalWeight}kg (>200kg)`);
            console.log('✅ +1 équipier: Charge lourde sans ascenseur');
        }

        // ✅ CONDITION 4: Plus de 20 produits
        if (totalItemCount > 20) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push(`Nombreux articles: ${totalItemCount} (>20)`);
            console.log('✅ +1 équipier: Nombreux articles');
        }

        // ✅ CONDITION 5: Rue inaccessible véhicule 4 roues
        if (deliveryConditions.rueInaccessible) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push('Rue inaccessible - portage nécessaire');
            console.log('✅ +1 équipier: Rue inaccessible');
        }

        // ✅ CONDITION 6: Palette complète à dépalettiser
        if (deliveryConditions.paletteComplete) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push('Palette complète à dépalettiser');
            console.log('✅ +1 équipier: Palette complète');
        }

        // 🆕 CONDITIONS SUPPLÉMENTAIRES DÉTAILLÉES

        // Distance de portage importante (>50m)
        if ((deliveryConditions.parkingDistance || 0) > 50) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push(`Distance portage: ${deliveryConditions.parkingDistance}m (>50m)`);
            console.log('✅ +1 équipier: Distance portage importante');
        }

        // Étage élevé sans ascenseur (>2ème étage)
        if (effectiveFloor > 2 && !deliveryConditions.hasElevator) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push(`Étage élevé sans ascenseur: ${effectiveFloor}ème étage`);
            console.log('✅ +1 équipier: Étage élevé sans ascenseur');
        }

        // Nombreuses marches (>20)
        if (deliveryConditions.hasStairs && (deliveryConditions.stairCount || 0) > 20) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push(`Nombreuses marches: ${deliveryConditions.stairCount} (>20)`);
            console.log('✅ +1 équipier: Nombreuses marches');
        }

        // Montage/installation nécessaire
        if (deliveryConditions.needsAssembly) {
            totalRequiredCrew += 1; // 🔥 += au lieu de Math.max
            triggeredConditions.push('Montage/installation requis');
            console.log('✅ +1 équipier: Montage nécessaire');
        }

        // 🎯 RÈGLES POUR ÉQUIPIERS SUPPLÉMENTAIRES (conditions exceptionnelles)

        // +1 équipier supplémentaire pour charges exceptionnelles avec ascenseur (>500kg)
        if (deliveryConditions.hasElevator && totalWeight > 500) {
            totalRequiredCrew += 1;
            triggeredConditions.push(`Charge exceptionnelle avec ascenseur: ${totalWeight}kg (>500kg)`);
            console.log('✅ +1 équipier: Charge exceptionnelle avec ascenseur');
        }

        // +1 équipier supplémentaire pour charges très lourdes sans ascenseur (>400kg)
        if (!deliveryConditions.hasElevator && totalWeight > 400) {
            totalRequiredCrew += 1;
            triggeredConditions.push(`Charge très lourde sans ascenseur: ${totalWeight}kg (>400kg)`);
            console.log('✅ +1 équipier: Charge très lourde sans ascenseur');
        }

        // +1 équipier supplémentaire pour très nombreux articles (>50)
        if (totalItemCount > 50) {
            totalRequiredCrew += 1;
            triggeredConditions.push(`Très nombreux articles: ${totalItemCount} (>50)`);
            console.log('✅ +1 équipier: Très nombreux articles');
        }

        // +1 équipier supplémentaire pour combinaison article lourd + étage élevé
        if (heaviestIndividualWeight >= 30 && effectiveFloor > 3) {
            totalRequiredCrew += 1;
            triggeredConditions.push(`Article lourd + étage élevé: ${heaviestIndividualWeight}kg au ${effectiveFloor}ème`);
            console.log('✅ +1 équipier: Combinaison article lourd + étage élevé');
        }

        // 🎯 RÈGLES POUR DEVIS OBLIGATOIRE (3+ équipiers au total)
        let needsQuote = false;

        // Charges exceptionnelles (>800kg) → Devis obligatoire
        if (totalWeight > 800) {
            needsQuote = true;
            triggeredConditions.push(`Charge exceptionnelle: ${totalWeight}kg (>800kg) - Devis requis`);
            console.log('⚠️ DEVIS REQUIS: Charge exceptionnelle');
        }

        // Charge très lourde sans ascenseur (>600kg) → Devis obligatoire
        if (!deliveryConditions.hasElevator && totalWeight > 600) {
            needsQuote = true;
            triggeredConditions.push(`Charge très lourde sans ascenseur: ${totalWeight}kg (>600kg) - Devis requis`);
            console.log('⚠️ DEVIS REQUIS: Charge très lourde sans ascenseur');
        }

        // Très nombreux articles (>100) → Devis obligatoire
        if (totalItemCount > 100) {
            needsQuote = true;
            triggeredConditions.push(`Articles exceptionnels: ${totalItemCount} (>100) - Devis requis`);
            console.log('⚠️ DEVIS REQUIS: Articles exceptionnels');
        }

        // Si 3+ équipiers requis → Devis obligatoire
        if (totalRequiredCrew >= 3) {
            needsQuote = true;
            console.log('⚠️ DEVIS REQUIS: 3+ équipiers nécessaires');
        }

        console.log(`👥 RÉSULTAT FINAL: ${totalRequiredCrew} équipier(s) requis`);
        console.log(`⚠️ Conditions déclenchées (${triggeredConditions.length}):`, triggeredConditions);
        console.log(`💰 Devis obligatoire: ${needsQuote}`);

        return totalRequiredCrew;
    }

    /**
     * 🆕 MÉTHODE UTILITAIRE : Valide si le nombre d'équipiers sélectionné est suffisant
     */
    public static validateCrewSize(
        selectedCrewSize: number,
        articles: { poids?: number; quantite?: number }[],
        deliveryConditions: any
    ): {
        isValid: boolean;
        requiredCrewSize: number;
        deficiency: number;
        triggeredConditions: string[];
        recommendations: string[];
    } {
        const requiredCrewSize = this.getRequiredCrewSize(articles, deliveryConditions);
        const isValid = selectedCrewSize >= requiredCrewSize;
        const deficiency = Math.max(0, requiredCrewSize - selectedCrewSize);

        const recommendations: string[] = [];
        if (!isValid) {
            if (requiredCrewSize >= 3) {
                recommendations.push('⚠️ Cas exceptionnel - Devis obligatoire');
            }
        }

        // Obtenir les conditions déclenchées depuis getValidationDetails
        const details = this.getValidationDetails(articles, deliveryConditions);

        return {
            isValid,
            requiredCrewSize,
            deficiency,
            triggeredConditions: details.triggeredConditions,
            recommendations
        };
    }

    /**
     * 🆕 MÉTHODE COMPLÈTE : Détails de validation avec toutes les nouvelles conditions
     */
    public static getValidationDetails(
        articles: { longueur?: number; largeur?: number; hauteur?: number; poids?: number; quantite?: number }[],
        conditions: {
            hasElevator?: boolean;
            totalItemCount?: number;
            rueInaccessible?: boolean;
            paletteComplete?: boolean;
            parkingDistance?: number;
            hasStairs?: boolean;
            stairCount?: number;
            needsAssembly?: boolean;
            floor?: number | string;
            isDuplex?: boolean;
            deliveryToUpperFloor?: boolean;
        } = {}
    ): {
        requiredVehicle: VehicleType | null;
        requiredCrew: number;
        largestArticle: { longueur: number; largeur: number; hauteur: number; poids: number } | null;
        heaviestArticle: number;
        totalWeight: number;
        totalItems: number;
        effectiveFloor: number;
        triggeredConditions: string[];
        needsQuote: boolean;
    } {
        const totalWeight = articles.reduce((sum, article) =>
            sum + ((article.poids || 0) * (article.quantite || 1)), 0
        );

        const totalItems = conditions.totalItemCount ||
            articles.reduce((sum, article) => sum + (article.quantite || 1), 0);

        // Calculer l'étage effectif
        let effectiveFloor = 0;
        if (conditions.floor) {
            effectiveFloor = typeof conditions.floor === 'string'
                ? parseInt(conditions.floor) || 0
                : conditions.floor;
        }
        if (conditions.isDuplex && conditions.deliveryToUpperFloor) {
            effectiveFloor += 1;
        }

        let largestArticle = null;
        let largestVolume = 0;
        let heaviestArticle = 0;

        articles.forEach(article => {
            const volume = (article.longueur || 0) * (article.largeur || 0) * (article.hauteur || 0);
            if (volume > largestVolume) {
                largestVolume = volume;
                largestArticle = {
                    longueur: article.longueur || 0,
                    largeur: article.largeur || 0,
                    hauteur: article.hauteur || 0,
                    poids: article.poids || 0
                };
            }

            if ((article.poids || 0) > heaviestArticle) {
                heaviestArticle = article.poids || 0;
            }
        });

        const requiredCrew = this.getRequiredCrewSize(articles, conditions);
        const needsQuote = requiredCrew >= 3 || totalWeight >= 800;

        // Construire la liste des conditions déclenchées
        const triggeredConditions: string[] = [];
        if (heaviestArticle >= 30) triggeredConditions.push(`Article lourd: ${heaviestArticle}kg`);
        if (conditions.hasElevator && totalWeight >= 300) triggeredConditions.push(`Charge lourde avec ascenseur: ${totalWeight}kg`);
        if (!conditions.hasElevator && totalWeight >= 200) triggeredConditions.push(`Charge lourde sans ascenseur: ${totalWeight}kg`);
        if (totalItems >= 20) triggeredConditions.push(`Nombreux articles: ${totalItems}`);
        if (conditions.rueInaccessible) triggeredConditions.push('Rue inaccessible');
        if (conditions.paletteComplete) triggeredConditions.push('Palette complète');
        if ((conditions.parkingDistance || 0) >= 50) triggeredConditions.push(`Distance portage: ${conditions.parkingDistance}m`);
        if (effectiveFloor > 2 && !conditions.hasElevator) triggeredConditions.push(`Étage élevé: ${effectiveFloor}ème sans ascenseur`);
        if (conditions.hasStairs && (conditions.stairCount || 0) >= 20) triggeredConditions.push(`Nombreuses marches: ${conditions.stairCount}`);
        if (conditions.needsAssembly) triggeredConditions.push('Montage requis');
        if (conditions.isDuplex && conditions.deliveryToUpperFloor) triggeredConditions.push('Duplex/Maison - livraison étage');

        return {
            requiredVehicle: this.recommendVehicle(articles),
            requiredCrew,
            largestArticle,
            heaviestArticle,
            totalWeight,
            totalItems,
            effectiveFloor,
            triggeredConditions,
            needsQuote
        };
    }
}