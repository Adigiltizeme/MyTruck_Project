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
     * 🎯 NOUVELLE LOGIQUE HIÉRARCHIQUE NON-CUMULATIVE
     * Détermine le niveau d'équipiers requis selon 3 niveaux:
     * NIVEAU 1: +1 équipier (2 personnes total)
     * NIVEAU 2: +2 équipiers (3 personnes total) 
     * NIVEAU 3: Devis obligatoire (≥3 équipiers)
     */
    public static getRequiredCrewSize(
        articles: { poids?: number; quantite?: number; categories?: string[] }[],
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
            estimatedHandlingTime?: number; // en minutes
            hasLargeVoluminousItems?: boolean;
            multipleLargeVoluminousItems?: boolean;
            complexAccess?: boolean; // combinaison: pas ascenseur + >45min + cours à traverser
        } = {}
    ): number {
        if (!articles || articles.length === 0) {
            return 0;
        }

        console.log('🎯 NOUVELLE LOGIQUE ÉQUIPIERS - HIÉRARCHIQUE NON-CUMULATIVE');

        // 🔍 CALCULS DE BASE
        let heaviestIndividualWeight = 0;
        articles.forEach(article => {
            const poids = article.poids || 0;
            if (poids > heaviestIndividualWeight) {
                heaviestIndividualWeight = poids;
            }
        });

        const totalWeight = articles.reduce((sum, article) =>
            sum + ((article.poids || 0) * (article.quantite || 1)), 0
        );

        const totalItemCount = deliveryConditions.totalItemCount ||
            articles.reduce((sum, article) => sum + (article.quantite || 1), 0);

        // Calculer l'étage effectif
        let effectiveFloor = 0;
        if (deliveryConditions.floor) {
            effectiveFloor = typeof deliveryConditions.floor === 'string'
                ? parseInt(deliveryConditions.floor) || 0
                : deliveryConditions.floor;
        }
        if (deliveryConditions.isDuplex && deliveryConditions.deliveryToUpperFloor) {
            effectiveFloor += 1;
        }

        // Identifier les articles type plantes/terreaux/pots
        const plantArticleCount = articles.reduce((sum, article) => {
            const isPlantRelated = article.categories?.some(cat => 
                cat.toLowerCase().includes('plante') || 
                cat.toLowerCase().includes('terreau') || 
                cat.toLowerCase().includes('pot')
            ) || false;
            return sum + (isPlantRelated ? (article.quantite || 1) : 0);
        }, 0);

        console.log(`📊 Données calculées:`, {
            heaviestIndividualWeight,
            totalWeight,
            totalItemCount,
            plantArticleCount,
            effectiveFloor,
            hasElevator: deliveryConditions.hasElevator,
            estimatedHandlingTime: deliveryConditions.estimatedHandlingTime
        });

        const triggeredConditions: string[] = [];

        // 🔥 NIVEAU 3: DEVIS OBLIGATOIRE (≥3 équipiers) - PRIORITÉ MAXIMALE
        
        // Article ≥90kg
        if (heaviestIndividualWeight >= 90) {
            triggeredConditions.push(`DEVIS: Article très lourd (${heaviestIndividualWeight}kg ≥90kg)`);
            console.log('🚨 DEVIS REQUIS: Article ≥90kg');
            return 3; // Retour immédiat
        }

        // 3+ étages sans ascenseur avec ≥40 articles plantes/terreaux/pots
        if (effectiveFloor >= 3 && !deliveryConditions.hasElevator && plantArticleCount >= 40) {
            triggeredConditions.push(`DEVIS: ${effectiveFloor} étages + ${plantArticleCount} articles plantes sans ascenseur`);
            console.log('🚨 DEVIS REQUIS: Étages + nombreuses plantes sans ascenseur');
            return 3;
        }

        // Palette + accès compliqué (pas ascenseur + >45min + cours à traverser)
        if (deliveryConditions.paletteComplete && deliveryConditions.complexAccess) {
            triggeredConditions.push('DEVIS: Palette + accès très compliqué');
            console.log('🚨 DEVIS REQUIS: Palette + accès compliqué');
            return 3;
        }

        // Plusieurs gros sujets volumineux
        if (deliveryConditions.multipleLargeVoluminousItems) {
            triggeredConditions.push('DEVIS: Plusieurs gros sujets volumineux');
            console.log('🚨 DEVIS REQUIS: Plusieurs gros sujets volumineux');
            return 3;
        }

        // Manutention >45min
        if ((deliveryConditions.estimatedHandlingTime || 0) > 45) {
            triggeredConditions.push(`DEVIS: Manutention longue (${deliveryConditions.estimatedHandlingTime}min >45min)`);
            console.log('🚨 DEVIS REQUIS: Manutention >45min');
            return 3;
        }

        // 🟡 NIVEAU 2: +2 ÉQUIPIERS (3 personnes total)
        
        // Article ≥60kg et <90kg
        if (heaviestIndividualWeight >= 60 && heaviestIndividualWeight < 90) {
            triggeredConditions.push(`2 équipiers: Article lourd (${heaviestIndividualWeight}kg ≥60kg et <90kg)`);
            console.log('⚠️ 2 ÉQUIPIERS: Article ≥60kg et <90kg');
            return 2;
        }

        // ≥3 étages sans ascenseur avec ≥30 articles plantes/terreaux/pots
        if (effectiveFloor >= 3 && !deliveryConditions.hasElevator && plantArticleCount >= 30) {
            triggeredConditions.push(`2 équipiers: ${effectiveFloor} étages + ${plantArticleCount} articles plantes sans ascenseur`);
            console.log('⚠️ 2 ÉQUIPIERS: Étages + plantes sans ascenseur');
            return 2;
        }

        // Palette à dépalettiser + montage en étage
        if (deliveryConditions.paletteComplete && effectiveFloor > 0) {
            triggeredConditions.push(`2 équipiers: Palette + montage en étage (${effectiveFloor}ème)`);
            console.log('⚠️ 2 ÉQUIPIERS: Palette + étage');
            return 2;
        }

        // Gros sujets volumineux (palmiers, etc.)
        if (deliveryConditions.hasLargeVoluminousItems) {
            triggeredConditions.push('2 équipiers: Gros sujet volumineux (palmier, etc.)');
            console.log('⚠️ 2 ÉQUIPIERS: Gros sujet volumineux');
            return 2;
        }

        // Manutention ≥30min et ≤45min
        if ((deliveryConditions.estimatedHandlingTime || 0) >= 30 && (deliveryConditions.estimatedHandlingTime || 0) <= 45) {
            triggeredConditions.push(`2 équipiers: Manutention longue (${deliveryConditions.estimatedHandlingTime}min ≥30min et ≤45min)`);
            console.log('⚠️ 2 ÉQUIPIERS: Manutention ≥30min et ≤45min');
            return 2;
        }

        // 🟢 NIVEAU 1: +1 ÉQUIPIER (2 personnes total)
        
        // 🔸 CONDITION PRIORITAIRE: Article ≥30kg et <60kg (prend priorité sur charge totale)
        if (heaviestIndividualWeight >= 30 && heaviestIndividualWeight < 60) {
            triggeredConditions.push(`1 équipier: Article lourd (${heaviestIndividualWeight}kg ≥30kg et <60kg)`);
            console.log('✅ 1 ÉQUIPIER: Article ≥30kg et <60kg');
            return 1;
        }

        // 🔸 Charge totale lourde (SEULEMENT si pas d'article ≥30kg individuel)
        if (heaviestIndividualWeight < 30 && 
            ((deliveryConditions.hasElevator && totalWeight >= 300) || 
             (!deliveryConditions.hasElevator && totalWeight >= 200))) {
            const condition = deliveryConditions.hasElevator ? 'avec ascenseur' : 'sans ascenseur';
            triggeredConditions.push(`1 équipier: Charge lourde ${totalWeight}kg ${condition} (aucun article ≥30kg)`);
            console.log(`✅ 1 ÉQUIPIER: Charge lourde ${condition} sans article lourd individuel`);
            return 1;
        }

        // 🔸 Étage élevé sans ascenseur (≥2ème étage) avec nombreux articles (≥20)
        if (effectiveFloor >= 2 && !deliveryConditions.hasElevator && totalItemCount >= 20) {
            triggeredConditions.push(`1 équipier: Étage élevé (${effectiveFloor}ème sans ascenseur) + nombreux articles (${totalItemCount})`);
            console.log('✅ 1 ÉQUIPIER: Étage élevé + nombreux articles');
            return 1;
        }

        // 🔸 Nombreux articles (≥20) - SEULEMENT si pas d'étage sans ascenseur
        if (totalItemCount >= 20 && (deliveryConditions.hasElevator || effectiveFloor < 2)) {
            triggeredConditions.push(`1 équipier: Nombreux articles (${totalItemCount} ≥20)`);
            console.log('✅ 1 ÉQUIPIER: Nombreux articles (sans étage problématique)');
            return 1;
        }

        // 🔸 Rue inaccessible
        if (deliveryConditions.rueInaccessible) {
            triggeredConditions.push('1 équipier: Rue inaccessible');
            console.log('✅ 1 ÉQUIPIER: Rue inaccessible');
            return 1;
        }

        // 🔸 Palette complète simple (rez-de-chaussée uniquement)
        if (deliveryConditions.paletteComplete && effectiveFloor === 0) {
            triggeredConditions.push('1 équipier: Palette complète (rez-de-chaussée)');
            console.log('✅ 1 ÉQUIPIER: Palette simple');
            return 1;
        }

        // 🔸 Distance de portage ≥50m
        if ((deliveryConditions.parkingDistance || 0) >= 50) {
            triggeredConditions.push(`1 équipier: Distance portage (${deliveryConditions.parkingDistance}m ≥50m)`);
            console.log('✅ 1 ÉQUIPIER: Distance portage');
            return 1;
        }

        // 🔸 Nombreuses marches ≥20
        if (deliveryConditions.hasStairs && (deliveryConditions.stairCount || 0) >= 20) {
            triggeredConditions.push(`1 équipier: Nombreuses marches (${deliveryConditions.stairCount} ≥20)`);
            console.log('✅ 1 ÉQUIPIER: Nombreuses marches');
            return 1;
        }

        // 🔸 Montage/installation standard
        if (deliveryConditions.needsAssembly) {
            triggeredConditions.push('1 équipier: Montage/installation');
            console.log('✅ 1 ÉQUIPIER: Montage nécessaire');
            return 1;
        }

        // 🔵 AUCUNE CONDITION = CHAUFFEUR SEUL
        console.log('✅ 0 ÉQUIPIER: Chauffeur seul suffisant');
        return 0;
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
     * 🆕 MÉTHODE COMPLÈTE : Détails de validation avec la nouvelle logique hiérarchique
     */
    public static getValidationDetails(
        articles: { longueur?: number; largeur?: number; hauteur?: number; poids?: number; quantite?: number; categories?: string[] }[],
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
            estimatedHandlingTime?: number;
            hasLargeVoluminousItems?: boolean;
            multipleLargeVoluminousItems?: boolean;
            complexAccess?: boolean;
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

        // Identifier les articles type plantes/terreaux/pots
        const plantArticleCount = articles.reduce((sum, article) => {
            const isPlantRelated = article.categories?.some(cat => 
                cat.toLowerCase().includes('plante') || 
                cat.toLowerCase().includes('terreau') || 
                cat.toLowerCase().includes('pot')
            ) || false;
            return sum + (isPlantRelated ? (article.quantite || 1) : 0);
        }, 0);

        const requiredCrew = this.getRequiredCrewSize(articles, conditions);
        const needsQuote = requiredCrew >= 3;

        // 🆕 Construire la liste des conditions selon la nouvelle logique hiérarchique
        const triggeredConditions: string[] = [];

        // NIVEAU 3: DEVIS OBLIGATOIRE
        if (heaviestArticle >= 90) {
            triggeredConditions.push(`DEVIS: Article très lourd (${heaviestArticle}kg ≥90kg)`);
        } else if (effectiveFloor >= 3 && !conditions.hasElevator && plantArticleCount >= 40) {
            triggeredConditions.push(`DEVIS: ${effectiveFloor} étages + ${plantArticleCount} articles plantes sans ascenseur`);
        } else if (conditions.paletteComplete && conditions.complexAccess) {
            triggeredConditions.push('DEVIS: Palette + accès très compliqué');
        } else if (conditions.multipleLargeVoluminousItems) {
            triggeredConditions.push('DEVIS: Plusieurs gros sujets volumineux');
        } else if ((conditions.estimatedHandlingTime || 0) > 45) {
            triggeredConditions.push(`DEVIS: Manutention longue (${conditions.estimatedHandlingTime}min >45min)`);
        }
        // NIVEAU 2: +2 ÉQUIPIERS
        else if (heaviestArticle >= 60) {
            triggeredConditions.push(`2 équipiers: Article lourd (${heaviestArticle}kg ≥60kg)`);
        } else if (effectiveFloor >= 3 && !conditions.hasElevator && plantArticleCount >= 30) {
            triggeredConditions.push(`2 équipiers: ${effectiveFloor} étages + ${plantArticleCount} articles plantes sans ascenseur`);
        } else if (conditions.paletteComplete && effectiveFloor > 0) {
            triggeredConditions.push(`2 équipiers: Palette + montage en étage (${effectiveFloor}ème)`);
        } else if (conditions.hasLargeVoluminousItems) {
            triggeredConditions.push('2 équipiers: Gros sujet volumineux (palmier, etc.)');
        } else if ((conditions.estimatedHandlingTime || 0) >= 30) {
            triggeredConditions.push(`2 équipiers: Manutention longue (${conditions.estimatedHandlingTime}min ≥30min)`);
        }
        // NIVEAU 1: +1 ÉQUIPIER
        else {
            if ((conditions.hasElevator && totalWeight > 300) || (!conditions.hasElevator && totalWeight > 200)) {
                const condition = conditions.hasElevator ? 'avec ascenseur' : 'sans ascenseur';
                triggeredConditions.push(`1 équipier: Charge lourde ${totalWeight}kg ${condition}`);
            }
            if (totalItems > 20) triggeredConditions.push(`1 équipier: Nombreux articles (${totalItems} >20)`);
            if (conditions.rueInaccessible) triggeredConditions.push('1 équipier: Rue inaccessible');
            if (conditions.paletteComplete && effectiveFloor === 0) triggeredConditions.push('1 équipier: Palette complète (rez-de-chaussée)');
            if ((conditions.parkingDistance || 0) > 50) triggeredConditions.push(`1 équipier: Distance portage (${conditions.parkingDistance}m >50m)`);
            if (effectiveFloor > 2 && !conditions.hasElevator) triggeredConditions.push(`1 équipier: Étage élevé (${effectiveFloor}ème sans ascenseur)`);
            if (conditions.hasStairs && (conditions.stairCount || 0) > 20) triggeredConditions.push(`1 équipier: Nombreuses marches (${conditions.stairCount} >20)`);
            if (conditions.needsAssembly) triggeredConditions.push('1 équipier: Montage/installation');
        }

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