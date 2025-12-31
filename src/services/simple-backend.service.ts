import { CommandeMetier, MagasinInfo, PersonnelInfo } from '../types/business.types';

export class SimpleBackendService {
    private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = localStorage.getItem('authToken');

        // ✅ DEBUG: Log détaillé pour diagnostic
        console.log('🔍 SimpleBackendService.request:', {
            endpoint,
            hasToken: !!token,
            tokenLength: token?.length,
            method: options.method || 'GET'
        });

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...(options.headers as Record<string, string> | undefined)
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('⚠️ SimpleBackendService: Aucun token disponible pour', endpoint);
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            // ✅ DIAGNOSTIC détaillé pour erreurs d'authentification
            if (response.status === 401) {
                console.error('❌ SimpleBackendService 401:', {
                    endpoint,
                    hasToken: !!token,
                    tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
                    localStorage: {
                        authToken: !!localStorage.getItem('authToken'),
                        user: !!localStorage.getItem('user')
                    }
                });
            }
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    // ✅ TRANSFORMATION EXACTE BACKEND → FRONTEND
    private transformBackendToFrontend(backendData: any): CommandeMetier {
        // console.log('🔄 Transform Backend → Frontend pour:', backendData.numeroCommande);
        // // console.log('🔄 Articles bruts:', backendData.articles);
        // console.log('🔍 Client Backend brut:', backendData.client);
        // console.log('🔍 Etage Backend:', backendData.client?.etage);
        // console.log('🔍 Interphone Backend:', backendData.client?.interphone);
        // console.log('🔍 Ascenseur Backend:', backendData.client?.ascenseur);

        // ✅ PROTECTION : Vérifier que les données existent
        if (!backendData || !backendData.id) {
            console.error('❌ Données Backend invalides:', backendData);
            throw new Error('Données commande invalides reçues du Backend');
        }

        try {
            const result = {
                id: backendData.id,
                numeroCommande: backendData.numeroCommande,
                type: backendData.type, // ✅ AJOUT: Type de commande (CLIENT ou INTER_MAGASIN)

                // ✅ AJOUT: Champs racine pour compatibilité avec dashboard chauffeur
                statutLivraison: backendData.statutLivraison || 'EN ATTENTE',
                statutCommande: backendData.statutCommande || 'En attente',

                dates: {
                    livraison: backendData.dateLivraison,
                    commande: backendData.dateCommande,
                    misAJour: backendData.updatedAt
                },

                statuts: {
                    commande: backendData.statutCommande || 'En attente',
                    livraison: backendData.statutLivraison || 'EN ATTENTE'
                },

                livraison: {
                    creneau: backendData.creneauLivraison,
                    vehicule: backendData.categorieVehicule,
                    equipiers: backendData.optionEquipier || 0,
                    reserve: backendData.reserveTransport || false,
                    remarques: backendData.remarques || '',
                    details: {
                        // Conditions existantes
                        hasElevator: backendData.clientAscenseur || false,
                        hasStairs: backendData.hasStairs || false,
                        stairCount: backendData.stairCount || 0,
                        parkingDistance: backendData.parkingDistance || 0,
                        needsAssembly: backendData.needsAssembly || false,
                        // 🆕 NOUVELLES CONDITIONS
                        rueInaccessible: backendData.rueInaccessible || false,
                        paletteComplete: backendData.paletteComplete || false,
                        isDuplex: backendData.isDuplex || false,
                        deliveryToUpperFloor: backendData.deliveryToUpperFloor || false
                    }
                },

                validation: {
                    requiredCrewSize: backendData.requiredCrewSize,
                    heaviestArticleWeight: backendData.heaviestArticleWeight,
                    needsQuote: backendData.needsQuote,
                    lastValidationAt: backendData.lastValidationAt,
                    details: backendData.validationDetails ? JSON.parse(backendData.validationDetails) : null
                },
                // ✅ AJOUT CRITIQUE : Champ racine "reserve"
                reserve: backendData.reserveTransport || false,

                // ✅ Client optionnel (absent pour les cessions inter-magasins)
                client: backendData.client ? {
                    nom: backendData.client.nom || '',
                    prenom: backendData.client.prenom || '',
                    nomComplet: `${backendData.client.prenom || ''} ${backendData.client.nom || ''}`.trim(),
                    telephone: {
                        principal: backendData.client.telephone || '',
                        secondaire: backendData.client.telephoneSecondaire || ''
                    },
                    adresse: {
                        type: backendData.client.typeAdresse || 'Domicile',
                        ligne1: backendData.client.adresseLigne1 || '',
                        batiment: backendData.client.batiment || '',
                        etage: backendData.client.etage !== undefined
                            ? String(backendData.client.etage)
                            : '',
                        ascenseur: backendData.client.ascenseur === true,
                        interphone: backendData.client.interphone !== undefined
                            ? String(backendData.client.interphone)
                            : '',
                    }
                } : undefined,

                magasin: backendData.magasin ? {
                    id: backendData.magasin.id,
                    name: backendData.magasin.nom, // ✅ Backend.nom → Frontend.name
                    address: backendData.magasin.adresse, // ✅ Backend.adresse → Frontend.address
                    phone: backendData.magasin.telephone,
                    email: backendData.magasin.email,
                    status: backendData.magasin.status || 'actif',
                    photo: backendData.magasin.photo || '',
                    manager: backendData.magasin.manager || ''
                } : {
                    id: '',
                    name: '',
                    address: '',
                    phone: '',
                    email: '',
                    status: '',
                    photo: '',
                    manager: ''
                },

                // ✅ CESSIONS : Magasin de destination pour les transferts inter-magasins
                magasinDestination: backendData.magasinDestination ? {
                    id: backendData.magasinDestination.id,
                    name: backendData.magasinDestination.nom, // ✅ Backend.nom → Frontend.name
                    address: backendData.magasinDestination.adresse, // ✅ Backend.adresse → Frontend.address
                    phone: backendData.magasinDestination.telephone,
                    email: backendData.magasinDestination.email,
                    status: backendData.magasinDestination.status || 'actif',
                    photo: backendData.magasinDestination.photo || '',
                    manager: backendData.magasinDestination.manager || ''
                } : undefined,

                // ✅ CESSIONS : Informations supplémentaires sur la cession
                cession: backendData.motifCession || backendData.prioriteCession ? {
                    motif: backendData.motifCession || '',
                    priorite: backendData.prioriteCession || 'NORMALE'
                } : undefined,

                // ✅ CORRECTION CRITIQUE : Articles avec array[0]
                articles: {
                    nombre: backendData.articles && backendData.articles.length > 0
                        ? backendData.articles[0].nombre
                        : 0,
                    details: backendData.articles && backendData.articles.length > 0
                        ? backendData.articles[0].details || ''
                        : '',
                    photos: backendData.photos ?
                        backendData.photos
                            .filter((photo: { type: string }) => photo.type === 'ARTICLE')
                            .map((photo: { url: string }) => ({ url: photo.url }))
                        : [],
                    newPhotos: [],
                    categories: backendData.articles && backendData.articles.length > 0
                        ? backendData.articles[0].categories || []
                        : [],
                    dimensions: this.extractDimensions(backendData),
                    autresArticles: backendData.articles && backendData.articles.length > 0
                        ? backendData.articles[0].autresArticles || 0
                        : 0,
                    canBeTilted: backendData.articles && backendData.articles.length > 0
                        ? backendData.articles[0].canBeTilted || false
                        : false
                },

                chauffeurs: backendData.chauffeurs?.map((assignment: any) => ({
                    id: assignment.chauffeur.id,
                    nom: assignment.chauffeur.nom,
                    prenom: assignment.chauffeur.prenom,
                    telephone: assignment.chauffeur.telephone,
                    email: assignment.chauffeur.email,
                    role: 'Chauffeur',
                    status: assignment.chauffeur.status || 'Actif'
                })) || [],

                financier: {
                    tarifHT: parseFloat(backendData.tarifHT) || 0,
                    factures: backendData.factures || [],
                    devis: backendData.devis || []
                },

                documents: backendData.documents || [],

                createdAt: backendData.createdAt,
                updatedAt: backendData.updatedAt
            };

            // console.log('🔍 ===== APRÈS TRANSFORMATION =====');
            // console.log('🔍 Frontend etage:', result.client?.adresse?.etage);
            // console.log('🔍 Frontend interphone:', result.client?.adresse?.interphone);
            // console.log('🔍 Frontend ascenseur:', result.client?.adresse?.ascenseur);
            // console.log('🔍 Frontend tel secondaire:', result.client?.telephone?.secondaire);

            // console.log('✅ Transformation réussie:', {
            //     id: result.id,
            //     numero: result.numeroCommande,
            //     client: result.client?.nomComplet,
            //     magasin: result.magasin.name,
            //     statutCommande: result.statuts.commande,
            //     statutLivraison: result.statuts.livraison
            // });

            return result;
        } catch (error) {
            console.error('❌ Erreur transformation Backend → Frontend:', error);
            console.error('❌ Données problématiques:', backendData);
            throw error;
        }
    }

    private extractDimensions(backendData: any): any[] {
        try {
            if (!backendData.articles || backendData.articles.length === 0) {
                return [];
            }

            const article = backendData.articles[0];
            const dimensionsRaw = article.dimensions;

            // Si c'est déjà un array
            if (Array.isArray(dimensionsRaw)) {
                return dimensionsRaw;
            }

            // Si c'est une string JSON
            if (typeof dimensionsRaw === 'string') {
                const parsed = JSON.parse(dimensionsRaw);
                return Array.isArray(parsed) ? parsed : [];
            }

            // Si c'est un objet (JSON parse automatique de Prisma)
            if (dimensionsRaw && typeof dimensionsRaw === 'object') {

                // Si c'est déjà un array d'objets valides
                if (Array.isArray(dimensionsRaw)) {
                    return dimensionsRaw;
                }

                // Si c'est un objet unique, le mettre dans un array
                if (dimensionsRaw.nom && dimensionsRaw.quantite) {
                    return [dimensionsRaw];
                }
            }

            // console.warn('⚠️ Dimensions non reconnues, retour array vide');
            return [];

        } catch (error) {
            console.error('❌ Erreur extraction dimensions:', error);
            return [];
        }
    }

    private transformCommandeUpdateToApi(commande: Partial<CommandeMetier>): any {
        const apiData: any = {};

        // ✅ SEULS les champs modifiables sont envoyés
        if (commande.articles) {
            apiData.articles = {
                nombre: commande.articles.nombre,
                details: commande.articles.details,
                categories: commande.articles.categories || []
                // ✅ PAS de photos dans articles - géré séparément
            };
        }

        if (commande.statuts) {
            apiData.statutCommande = commande.statuts.commande;
            apiData.statutLivraison = commande.statuts.livraison;
        }

        if (commande.livraison) {
            apiData.creneauLivraison = commande.livraison.creneau;
            apiData.categorieVehicule = commande.livraison.vehicule;
            apiData.optionEquipier = commande.livraison.equipiers;
            apiData.reserveTransport = commande.livraison.reserve;
        }

        if (commande.tarifHT !== undefined) {
            apiData.tarifHT = commande.tarifHT;
        }

        // console.log('🔄 Données API pour PATCH:', apiData);
        return apiData;
    }

    /**
     * Récupère les commandes depuis le backend
     * @param type Type de commande à filtrer : 'CLIENT' ou 'INTER_MAGASIN' (optionnel)
     */
    async getCommandes(type?: 'CLIENT' | 'INTER_MAGASIN'): Promise<CommandeMetier[]> {
        try {
            const typeParam = type ? `&type=${type}` : '';
            console.log(`🔄 SimpleBackendService: Tentative récupération commandes${type ? ` (type=${type})` : ''}...`);

            // ✅ SOLUTION PROGRESSIVE : Essayer d'abord avec moins de données
            let result;
            try {
                console.log('📡 Essai avec take=100...');
                result = await this.request<{ data: any[] }>(`/commandes?take=100${typeParam}`);
                console.log(`✅ Succès avec take=100: ${result.data.length} commandes`);
            } catch (error) {
                console.warn('⚠️ Echec avec take=100, essai avec take=20');
                console.log('📡 Essai avec take=20...');
                result = await this.request<{ data: any[] }>(`/commandes?take=20${typeParam}`);
                console.log(`✅ Succès avec take=20: ${result.data.length} commandes`);
            }

            // ✅ TRANSFORMER chaque commande avec protection
            const transformedData = result.data.map(item => {
                try {
                    return this.transformBackendToFrontend(item);
                } catch (transformError) {
                    console.warn('⚠️ Erreur transformation commande:', item.id, transformError);
                    return null;
                }
            }).filter(Boolean);

            console.log(`🔄 ${transformedData.length} commandes transformées avec succès`);
            return transformedData;
        } catch (error) {
            console.error('❌ TOTAL ECHEC récupération commandes:', error);
            // ✅ FALLBACK : Retourner données vides plutôt que crash
            console.log('🔄 FALLBACK ACTIVÉ: Retour array vide pour commandes');
            return [];
        }
    }

    async getCommande(id: string): Promise<CommandeMetier> {
        const result = await this.request<any>(`/commandes/${id}`);
        return this.transformBackendToFrontend(result);
    }

    async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        const result = await this.request<any>('/commandes', {
            method: 'POST',
            body: JSON.stringify(commande)
        });
        return this.transformBackendToFrontend(result);
    }

    async updateCommande(id: string, commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        try {
            // ✅ Utiliser la transformation spécifique pour les mises à jour
            const apiData = this.transformCommandeUpdateToApi(commande);

            // console.log('📤 Envoi PATCH /commandes/' + id, apiData);

            const result = await this.request<any>(`/commandes/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(apiData)
            });

            // console.log('✅ Réponse PATCH:', result);
            return this.transformBackendToFrontend(result);
        } catch (error) {
            console.error('❌ Erreur updateCommande:', error);
            throw error;
        }
    }

    async getChauffeurs(): Promise<PersonnelInfo[]> {
        try {
            const result = await this.request<{ data: any[] }>('/chauffeurs');
            console.log('🔍 Chauffeurs Backend brutes:', result.data);

            // ✅ TRANSFORMER les données Backend → Frontend
            const transformedChauffeurs = result.data.map(chauffeur => ({
                id: chauffeur.id,
                nom: chauffeur.nom,
                prenom: chauffeur.prenom,
                telephone: chauffeur.telephone,
                email: chauffeur.email,
                role: chauffeur.role,
                status: chauffeur.status,
                location: {
                    latitude: chauffeur.latitude,
                    longitude: chauffeur.longitude
                }
            }));

            return transformedChauffeurs;
        } catch (error) {
            console.error('❌ Erreur récupération chauffeurs:', error);
            throw error;
        }
    }

    async getCommandesByChauffeur(chauffeurId: string): Promise<CommandeMetier[]> {
        try {
            console.log(`🚛 Récupération commandes pour chauffeur: ${chauffeurId}`);

            const result = await this.request<{ data: any[] }>(`/commandes/chauffeur/${chauffeurId}`);

            console.log(`✅ ${result.data.length} commandes trouvées pour le chauffeur`);

            return result.data.map(commande => this.transformBackendToFrontend(commande));

        } catch (error) {
            console.error(`❌ Erreur récupération commandes chauffeur ${chauffeurId}:`, error);
            return [];
        }
    }

    async updateCommandePhotos(id: string, photos: Array<{ url: string }>): Promise<CommandeMetier> {
        try {
            const result = await this.request<any>(`/commandes/${id}/photos`, {
                method: 'PATCH',
                body: JSON.stringify({ photos })
            });
            return this.transformBackendToFrontend(result);
        } catch (error) {
            console.error('❌ Erreur update photos:', error);
            throw error;
        }
    }

    async getMagasins(): Promise<MagasinInfo[]> {
        try {
            console.log('🏪 SimpleBackendService: Tentative récupération magasins...');
            const result = await this.request<{ data: {
                id: string;
                nom: string;
                adresse: string;
                telephone?: string;
                email?: string;
                status?: string;
                photo?: string;
                manager?: string;
            }[] }>('/magasins');

            console.log(`✅ Magasins récupérés: ${result.data.length} magasins`);

            const transformed = result.data.map(magasin => ({
                id: magasin.id,
                name: magasin.nom,
                address: magasin.adresse,
                phone: magasin.telephone || '',
                email: magasin.email || '',
                status: magasin.status || 'actif',
                photo: magasin.photo || '',
                manager: magasin.manager || ''
            }));

            console.log(`🏪 ${transformed.length} magasins transformés avec succès`);
            return transformed;
        } catch (error) {
            console.error('❌ TOTAL ECHEC récupération magasins:', error);
            // ✅ FALLBACK : Retourner magasins fictifs pour continuer l'interface
            console.log('🔄 FALLBACK ACTIVÉ: Utilisation de magasins fallback');
            return [
                {
                    id: 'fallback-1',
                    name: 'Magasin Temporaire',
                    address: 'Service temporairement indisponible',
                    phone: '',
                    email: '',
                    status: 'maintenance',
                    photo: '',
                    manager: ''
                }
            ];
        }
    }
}

export const simpleBackendService = new SimpleBackendService();