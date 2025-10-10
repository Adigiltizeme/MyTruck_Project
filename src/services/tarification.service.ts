import mapboxgl from 'mapbox-gl';
import { MapboxService } from './mapbox.service';

export type TypeVehicule = '1M3' | '6M3' | '10M3' | '20M3';

type Coordinates = [number, number];

export interface TarifParams {
    vehicule: TypeVehicule | string;
    adresseMagasin: string;
    adresseLivraison: string;
    equipiers: number;
}

export interface TarifResponse {
    montantHT: number | 'devis';
    detail: {
        vehicule: number;
        distance: number | 'devis';
        equipiers: number | 'devis';
    };
}

export class TarificationService {

    private mapboxToken: string;
    private mapboxService: MapboxService;
    private readonly FACTEUR_CORRECTION = 1.10; // +10% pour tenir compte des détours, trafic, etc.

    constructor() {
        this.mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
        mapboxgl.accessToken = this.mapboxToken;
        this.mapboxService = new MapboxService(import.meta.env.VITE_MAPBOX_TOKEN);
    }

    private readonly TARIFS_VEHICULES: Record<string, number> = {
        '1M3': 38,
        '6M3': 46,
        '10M3': 54,
        '20M3': 68
    };

    private readonly TARIF_EQUIPIER = {
        0: 0,   // Chauffeur seul
        1: 22,  // +1 équipier
        2: 44,  // +2 équipiers 
        3: 'devis', // ≥3 équipiers = devis obligatoire
    };

    private readonly FRAIS_KM = {
        '10': 0,    // Forfait inclus jusqu'à 10km
        '20': 8,    // +8€ à partir de 10km
        '30': 16,   // +16€ à partir de 20km
        '40': 24,   // +24€ à partir de 30km
        '50': 32,   // +32€ à partir de 40km
        'beyond': 'devis' // Au-delà de 50km = devis obligatoire
    };

    private readonly VILLES_FORFAIT_PARIS = [
        'Ivry',
        'Arcueil',
        'Boulogne',
        'Batignolles',
        'Paris'
    ];

    private readonly CODES_POSTAUX_PARIS = [
        '75001', '75002', '75003', '75004', '75005', '75006', '75007', '75008', '75009',
        '75010', '75011', '75012', '75013', '75014', '75015', '75016', '75017', '75018',
        '75019', '75020'
    ];

    /**
 * Détermine si le forfait Paris s'applique selon les règles suivantes:
 * - Le magasin est dans une des villes du forfait ET la livraison est à Paris
 * - OU le magasin et la livraison sont dans la même ville du forfait
 * - OU la distance est inférieure à 10km (pour certains cas)
 */
    private appliqueForfaitParis(adresseMagasin: string, adresseLivraison: string, distance?: number): boolean {
        try {
            // Extraire les informations de ville et code postal
            const infoMagasin = this.extraireInfoAdresse(adresseMagasin);
            const infoLivraison = this.extraireInfoAdresse(adresseLivraison);

            // Cas 1: Si le magasin n'est pas dans une ville du forfait, le forfait ne s'applique pas
            const magasinDansForfait = this.estVilleForfait(infoMagasin);
            if (!magasinDansForfait) {
                console.log('Magasin non situé dans une ville du forfait Paris');
                return false;
            }

            // Cas 2: Si la livraison est à Paris, le forfait s'applique
            const livraisonAParis = this.estParis(infoLivraison);
            if (livraisonAParis) {
                console.log('Livraison à Paris - forfait Paris applicable');
                return true;
            }

            // Cas 3: Si le magasin et la livraison sont dans la même ville du forfait, le forfait s'applique
            if (this.sontMemeVille(infoMagasin, infoLivraison)) {
                console.log('Magasin et livraison dans la même ville du forfait - forfait applicable');
                return true;
            }

            // Cas 4: Si la distance est inférieure à 10km, le forfait peut s'appliquer
            // (uniquement si le magasin est à Paris)
            if (distance !== undefined && distance < 10 && this.estParis(infoMagasin)) {
                console.log(`Distance < 10km (${distance}km) depuis Paris - forfait applicable`);
                return true;
            }

            // Dans tous les autres cas, le forfait ne s'applique pas
            console.log('Conditions du forfait Paris non remplies');
            return false;
        } catch (error) {
            console.error('Erreur lors de la vérification du forfait Paris:', error);
            return false; // Par défaut, ne pas appliquer le forfait en cas d'erreur
        }
    }

    /**
 * Extrait les informations d'une adresse (ville et code postal)
 */
    private extraireInfoAdresse(adresse: string): { ville: string, codePostal: string } {
        if (!adresse) return { ville: '', codePostal: '' };

        // Extraire le code postal (format français 5 chiffres)
        const matchCodePostal = adresse.match(/\b\d{5}\b/);
        const codePostal = matchCodePostal ? matchCodePostal[0] : '';

        // Extraire la ville en fonction du code postal
        let ville = '';

        if (codePostal) {
            // Trouver le texte après le code postal
            const partiesAdresse = adresse.split(codePostal);
            if (partiesAdresse.length > 1) {
                // Prendre le premier mot après le code postal, généralement la ville
                const motsSuivants = partiesAdresse[1].trim().split(/\s+/);
                ville = motsSuivants[0];
            }

            // Si c'est un code postal parisien, forcer la ville à "Paris"
            if (this.CODES_POSTAUX_PARIS.includes(codePostal)) {
                ville = 'Paris';
            }

            // Cas spéciaux connus
            if (codePostal === '94200') ville = 'Ivry';
            if (codePostal === '94230' || codePostal === '94110') ville = 'Arcueil';
            if (codePostal === '92100') ville = 'Boulogne';
            if (codePostal.startsWith('75')) ville = 'Paris';
        } else {
            // Sans code postal, essayer de trouver une ville connue dans l'adresse
            for (const villeForfait of this.VILLES_FORFAIT_PARIS) {
                // Vérifier les occurrences avec une limite stricte
                // Éviter les faux positifs comme "Rue du Clos d'Arcueil à Gaillon"
                const regex = new RegExp(`\\b${villeForfait}\\b`, 'i');
                if (regex.test(adresse)) {
                    ville = villeForfait;
                    break;
                }
            }
        }

        return { ville, codePostal };
    }

    /**
     * Vérifie si une adresse est dans une ville du forfait
     */
    private estVilleForfait(info: { ville: string, codePostal: string }): boolean {
        if (!info.ville) return false;

        const villeLower = info.ville.toLowerCase();

        // Vérification par ville
        for (const ville of this.VILLES_FORFAIT_PARIS) {
            if (villeLower === ville.toLowerCase()) return true;
        }

        // Vérification par code postal parisien
        if (this.CODES_POSTAUX_PARIS.includes(info.codePostal)) return true;

        // Cas spéciaux
        if (info.codePostal === '94200') return true; // Ivry
        if (info.codePostal === '94230' || info.codePostal === '94110') return true; // Arcueil
        if (info.codePostal === '92100') return true; // Boulogne

        return false;
    }

    /**
     * Vérifie si une adresse est à Paris
     */
    private estParis(info: { ville: string, codePostal: string }): boolean {
        if (info.ville.toLowerCase() === 'paris') return true;
        if (info.codePostal && info.codePostal.startsWith('75')) return true;
        return false;
    }

    /**
     * Vérifie si deux adresses sont dans la même ville
     */
    private sontMemeVille(info1: { ville: string, codePostal: string },
        info2: { ville: string, codePostal: string }): boolean {
        // Si les deux villes sont renseignées et identiques
        if (info1.ville && info2.ville &&
            info1.ville.toLowerCase() === info2.ville.toLowerCase()) {
            return true;
        }

        // Si les codes postaux indiquent la même ville
        if (info1.codePostal && info2.codePostal) {
            // Cas de Paris (75XXX)
            if (info1.codePostal.startsWith('75') && info2.codePostal.startsWith('75')) {
                return true;
            }

            // Autres cas où les codes postaux sont identiques
            if (info1.codePostal === info2.codePostal) {
                return true;
            }
        }

        return false;
    }

    async calculerTarif(params: {
        vehicule: string;
        adresseMagasin: string;
        adresseLivraison: string;
        equipiers: number;
    }): Promise<{
        montantHT: number | 'devis';
        detail: {
            vehicule: number;
            distance: number | 'devis';
            equipiers: number | 'devis';
        }
    }> {
        try {
            console.log('Calcul du tarif avec les paramètres:', JSON.stringify(params, null, 2));

            // 1. Calcul tarif véhicule
            // Extraire le format court du véhicule (1M3, 6M3, etc.)
            const shortFormat = params.vehicule.split(' ')[0];
            const tarifVehicule = this.TARIFS_VEHICULES[shortFormat];

            if (!tarifVehicule) {
                console.error('Type de véhicule non reconnu:', params.vehicule);
                throw new Error(`Véhicule non reconnu: ${params.vehicule}`);
            }

            // 2. Calcul tarif équipiers selon nouvelle logique hiérarchique
            let tarifEquipiers: number | 'devis' = 0;
            
            if (params.equipiers >= 3) {
                tarifEquipiers = 'devis'; // Niveau 3: Devis obligatoire
            } else if (params.equipiers === 2) {
                tarifEquipiers = 44; // Niveau 2: +2 équipiers
            } else if (params.equipiers === 1) {
                tarifEquipiers = 22; // Niveau 1: +1 équipier
            } else {
                tarifEquipiers = 0; // Niveau 0: Chauffeur seul
            }

            if (tarifEquipiers === 'devis') {
                return {
                    montantHT: 'devis',
                    detail: {
                        vehicule: tarifVehicule,
                        distance: 0,
                        equipiers: 'devis'
                    }
                };
            }

            // Vérification et log des adresses
            if (!params.adresseMagasin) {
                console.warn('⚠️ Adresse du magasin manquante dans calculerTarif!');
            } else {
                console.log('✅ Adresse magasin utilisée dans calculerTarif:', params.adresseMagasin);
            }

            if (!params.adresseLivraison) {
                console.warn('⚠️ Adresse de livraison manquante dans calculerTarif!');
            } else {
                console.log('✅ Adresse livraison utilisée dans calculerTarif:', params.adresseLivraison);
            }

            // 3. Calcul distance et frais kilométriques
            const { distance, fraisKm } = await this.calculerFraisKilometriques(
                params.adresseMagasin,
                params.adresseLivraison
            );

            console.log(`Distance calculée: ${distance}km, frais kilométriques: ${fraisKm}`);

            if (fraisKm === 'devis') {
                return {
                    montantHT: 'devis',
                    detail: {
                        vehicule: tarifVehicule,
                        distance: 'devis',
                        equipiers: tarifEquipiers as number
                    }
                };
            }

            // 4. Calcul total
            const montantHT = tarifVehicule + (tarifEquipiers as number) + fraisKm;

            console.log(`Tarif calculé: ${montantHT}€ (véhicule: ${tarifVehicule}€, équipiers: ${tarifEquipiers}€, distance: ${fraisKm}€)`);

            return {
                montantHT,
                detail: {
                    vehicule: tarifVehicule,
                    distance: fraisKm,
                    equipiers: tarifEquipiers as number
                }
            };
        } catch (error) {
            console.error('Erreur calcul tarif:', error);
            // En cas d'erreur, renvoyer une estimation de base
            return {
                montantHT: this.TARIFS_VEHICULES[params.vehicule.split(' ')[0]] || 0,
                detail: {
                    vehicule: this.TARIFS_VEHICULES[params.vehicule.split(' ')[0]] || 0,
                    distance: 0,
                    equipiers: params.equipiers * 22
                }
            };
        }
    }

    /**
     * Calcule une estimation de tarif SANS les frais kilométriques
     * Utilisé pour l'estimation rapide dans le formulaire avant de connaître l'adresse client
     */
    calculerEstimationSansKm(params: {
        vehicule: string;
        equipiers: number;
    }): {
        montantHT: number | 'devis';
        detail: {
            vehicule: number;
            equipiers: number | 'devis';
        };
    } {
        try {
            // 1. Calcul tarif véhicule
            const shortFormat = params.vehicule.split(' ')[0];
            const tarifVehicule = this.TARIFS_VEHICULES[shortFormat];

            if (!tarifVehicule) {
                console.error('Type de véhicule non reconnu:', params.vehicule);
                throw new Error(`Véhicule non reconnu: ${params.vehicule}`);
            }

            // 2. Calcul tarif équipiers
            let tarifEquipiers: number | 'devis' = 0;

            if (params.equipiers >= 3) {
                tarifEquipiers = 'devis'; // Niveau 3: Devis obligatoire
            } else if (params.equipiers === 2) {
                tarifEquipiers = 44; // Niveau 2: +2 équipiers
            } else if (params.equipiers === 1) {
                tarifEquipiers = 22; // Niveau 1: +1 équipier
            } else {
                tarifEquipiers = 0; // Niveau 0: Chauffeur seul
            }

            if (tarifEquipiers === 'devis') {
                return {
                    montantHT: 'devis',
                    detail: {
                        vehicule: tarifVehicule,
                        equipiers: 'devis'
                    }
                };
            }

            // 3. Calcul total SANS frais kilométriques
            const montantHT = tarifVehicule + (tarifEquipiers as number);

            console.log(`Estimation sans km: ${montantHT}€ (véhicule: ${tarifVehicule}€, équipiers: ${tarifEquipiers}€)`);

            return {
                montantHT,
                detail: {
                    vehicule: tarifVehicule,
                    equipiers: tarifEquipiers as number
                }
            };
        } catch (error) {
            console.error('Erreur estimation tarif sans km:', error);
            return {
                montantHT: this.TARIFS_VEHICULES[params.vehicule.split(' ')[0]] || 0,
                detail: {
                    vehicule: this.TARIFS_VEHICULES[params.vehicule.split(' ')[0]] || 0,
                    equipiers: params.equipiers * 22
                }
            };
        }
    }

    private async getDistanceFromMapbox(originCoords: Coordinates, destCoords: Coordinates): Promise<number> {
        try {
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/` +
                `${originCoords.join(',')};${destCoords.join(',')}` +
                `?access_token=${this.mapboxToken}`
            );

            const data = await response.json();

            if (!data.routes || !data.routes[0]) {
                throw new Error('Aucun itinéraire trouvé');
            }

            // La distance est en mètres, conversion en kilomètres
            return Math.round(data.routes[0].distance / 1000);
        } catch (error) {
            console.error('Erreur calcul distance Mapbox:', error);
            throw error;
        }
    }

    private async geocodeAddress(address: string): Promise<Coordinates> {
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
                `${encodeURIComponent(address)}.json` +
                `?access_token=${this.mapboxToken}` +
                `&country=fr`
            );

            const data = await response.json();

            if (!data.features || !data.features[0]) {
                throw new Error('Adresse non trouvée');
            }

            return data.features[0].center as Coordinates;
        } catch (error) {
            console.error('Erreur géocodage Mapbox:', error);
            throw error;
        }
    }

    private async calculerFraisKilometriques(adresseMagasin: string, adresseLivraison: string): Promise<{
        distance: number;
        fraisKm: number | 'devis';
    }> {
        try {
            // Vérifier si l'adresse est dans une ville avec forfait Paris
            const estZoneParis = this.VILLES_FORFAIT_PARIS.some(ville =>
                // (adresseMagasin || '').toLowerCase().includes(ville.toLowerCase()) ||
                (adresseLivraison || '').toLowerCase().includes(ville.toLowerCase())
            );

            if (estZoneParis) {
                console.log('Zone Paris détectée, forfait appliqué');
                return { distance: 0, fraisKm: 0 }; // Forfait Paris inclus
            }

            // Si une des adresses est manquante
            if (!adresseMagasin || !adresseLivraison ||
                adresseMagasin.trim() === '' || adresseLivraison.trim() === '') {
                console.warn('Adresse(s) manquante(s), aucun frais kilométrique appliqué');
                return { distance: 0, fraisKm: 0 };
            }

            // Obtenir la distance via Mapbox
            let distance;
            try {
                console.log(`Calcul de distance: ${adresseMagasin} → ${adresseLivraison}`);
                distance = await this.mapboxService.calculateDistance(adresseMagasin, adresseLivraison);
                console.log(`Distance brute calculée: ${distance}km`);
            } catch (error) {
                console.error('Erreur lors du calcul de distance Mapbox:', error);
                // Valeur par défaut en cas d'erreur
                console.log(`Utilisation d'une distance par défaut: 10km`);
                distance = 10;
            }

            // Appliquer le facteur de correction
            distance = Math.round(distance * this.FACTEUR_CORRECTION * 10) / 10;
            console.log(`Distance après correction (facteur ${this.FACTEUR_CORRECTION}): ${distance}km`);

            // Vérifier si le forfait Paris s'applique (en fonction de la distance)
            if (this.appliqueForfaitParis(adresseMagasin, adresseLivraison, distance)) {
                console.log('Forfait Paris applicable - pas de frais kilométriques');
                return { distance, fraisKm: 0 };
            }

            // Calculer les frais selon la grille tarifaire
            let fraisKm = 0;
            if (distance > 50) {
                console.log('Distance > 50km, un devis est requis');
                return { distance, fraisKm: 'devis' };
            } else if (distance > 40) {
                fraisKm = 32; // Tarif 40-50km
                console.log('Tarif distance 40-50km appliqué: 32€');
            } else if (distance > 30) {
                fraisKm = 24; // Tarif 30-40km
                console.log('Tarif distance 30-40km appliqué: 24€');
            } else if (distance > 20) {
                fraisKm = 16; // Tarif 20-30km
                console.log('Tarif distance 20-30km appliqué: 16€');
            } else if (distance > 10) {
                fraisKm = 8;  // Tarif 10-20km
                console.log('Tarif distance 10-20km appliqué: 8€');
            } else {
                console.log('Distance ≤ 10km, aucun frais supplémentaire');
            }

            return { distance, fraisKm };
        } catch (error) {
            console.error('Erreur calcul distance:', error);
            // En cas d'erreur, pas de frais supplémentaires
            return { distance: 0, fraisKm: 0 };
        }
    }

    public debugDistanceCalculation(adresseMagasin: string, adresseLivraison: string): void {
        console.group('Débogage du calcul de distance');
        console.log('Adresse magasin:', adresseMagasin);
        console.log('Adresse livraison:', adresseLivraison);

        const estZoneParis = this.VILLES_FORFAIT_PARIS.some(ville =>
            (adresseMagasin || '').toLowerCase().includes(ville.toLowerCase()) ||
            (adresseLivraison || '').toLowerCase().includes(ville.toLowerCase())
        );

        console.log('Est en zone Paris?', estZoneParis);
        console.log('Villes Paris:', this.VILLES_FORFAIT_PARIS);

        this.mapboxService.calculateDistance(adresseMagasin, adresseLivraison)
            .then(distance => {
                console.log('Distance brute Mapbox:', distance, 'km');
                const correctedDistance = Math.round(distance * this.FACTEUR_CORRECTION * 10) / 10;
                console.log('Distance corrigée:', correctedDistance, 'km');
                console.log('Devis requis?', correctedDistance > 50);

                // Calcul des frais
                let fraisKm = 0 as number | 'devis';
                if (correctedDistance > 50) {
                    fraisKm = 'devis';
                } else if (correctedDistance > 40) {
                    fraisKm = 32;
                } else if (correctedDistance > 30) {
                    fraisKm = 24;
                } else if (correctedDistance > 20) {
                    fraisKm = 16;
                } else if (correctedDistance > 10) {
                    fraisKm = 8;
                }

                console.log('Frais kilométriques calculés:', fraisKm);
            })
            .catch(error => {
                console.error('Erreur lors du calcul de distance:', error);
            })
            .finally(() => {
                console.groupEnd();
            });
    }

    /**
   * Récupère le tarif pour un type de véhicule donné
   * @param vehicule Type de véhicule
   * @returns Tarif du véhicule
   */
    private getTarifVehicule(vehicule: string): number {
        // Gérer les différentes représentations possibles du véhicule
        const vehiculeKey = this.normalizeVehiculeType(vehicule);

        if (vehiculeKey in this.TARIFS_VEHICULES) {
            return this.TARIFS_VEHICULES[vehiculeKey as TypeVehicule];
        }

        // Valeur par défaut si type de véhicule non reconnu
        console.warn(`Type de véhicule non reconnu: ${vehicule}, utilisation du tarif 1M3 par défaut`);
        return this.TARIFS_VEHICULES['1M3'];
    }

    /**
   * Normalise le type de véhicule pour gérer les différentes représentations
   * @param vehicule Type de véhicule à normaliser
   * @returns Type de véhicule normalisé
   */
    private normalizeVehiculeType(vehicule: string): string {
        // Si c'est déjà un des types standard, le retourner tel quel
        if (vehicule in this.TARIFS_VEHICULES) {
            return vehicule;
        }

        // Nettoyer et extraire le type
        const cleanedType = vehicule.trim().toUpperCase();

        // Essayer de trouver une correspondance
        if (cleanedType.includes('1M3') || cleanedType.includes('1 M3')) return '1M3';
        if (cleanedType.includes('6M3') || cleanedType.includes('6 M3')) return '6M3';
        if (cleanedType.includes('10M3') || cleanedType.includes('10 M3')) return '10M3';
        if (cleanedType.includes('20M3') || cleanedType.includes('20 M3')) return '20M3';

        // Si aucune correspondance n'est trouvée, retourner le type tel quel
        return vehicule;
    }
}