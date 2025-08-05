import { CommandeMetier, PersonnelInfo } from '../types/business.types';

export class SimpleBackendService {
    private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = localStorage.getItem('authToken');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> | undefined)
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    // ✅ TRANSFORMATION EXACTE BACKEND → FRONTEND
    private transformBackendToFrontend(backendData: any): CommandeMetier {
        console.log('🔄 Transform Backend → Frontend pour:', backendData.numeroCommande);
        console.log('🔄 Articles bruts:', backendData.articles);
        console.log('🔄 Photos Backend (racine):', backendData.photos);
        console.log('🔄 Chauffeurs Backend bruts:', backendData.chauffeurs);

        return {
            id: backendData.id,
            numeroCommande: backendData.numeroCommande,

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
                remarques: backendData.remarques
            },

            client: {
                nom: backendData.client?.nom || '',
                prenom: backendData.client?.prenom || '',
                nomComplet: `${backendData.client?.prenom || ''} ${backendData.client?.nom || ''}`.trim(),
                telephone: {
                    principal: backendData.client?.telephone || '',
                    secondaire: backendData.client?.telephoneSecondaire || ''
                },
                adresse: {
                    type: backendData.client?.typeAdresse || 'Domicile',
                    ligne1: backendData.client?.adresseLigne1 || '',
                    batiment: backendData.client?.batiment || '',
                    etage: backendData.client?.etage || '',
                    ascenseur: backendData.client?.ascenseur || false,
                    interphone: backendData.client?.interphone || ''
                }
            },

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

            // ✅ CORRECTION CRITIQUE : Articles avec array[0]
            articles: {
                nombre: backendData.articles && backendData.articles.length > 0
                    ? backendData.articles[0].nombre
                    : 0,
                details: backendData.articles && backendData.articles.length > 0
                    ? backendData.articles[0].details || ''
                    : '',
                photos: backendData.photos ? backendData.photos.map((photo: { url: string }) => ({ url: photo.url })) : [],
                newPhotos: [],
                categories: backendData.articles && backendData.articles.length > 0
                    ? backendData.articles[0].categories || []
                    : [],
                dimensions: this.extractDimensions(backendData),
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
                tarifHT: parseFloat(backendData.tarifHT) || 0
            },

            createdAt: backendData.createdAt,
            updatedAt: backendData.updatedAt
        };
    }

    private extractDimensions(backendData: any): any[] {
        try {
            if (!backendData.articles || backendData.articles.length === 0) {
                return [];
            }

            const article = backendData.articles[0];
            const dimensionsRaw = article.dimensions;

            console.log('🔄 Dimensions brutes type:', typeof dimensionsRaw);
            console.log('🔄 Dimensions brutes valeur:', dimensionsRaw);

            // Si c'est déjà un array
            if (Array.isArray(dimensionsRaw)) {
                console.log('✅ Dimensions déjà array:', dimensionsRaw.length);
                return dimensionsRaw;
            }

            // Si c'est une string JSON
            if (typeof dimensionsRaw === 'string') {
                console.log('🔄 Parsing JSON string dimensions');
                const parsed = JSON.parse(dimensionsRaw);
                return Array.isArray(parsed) ? parsed : [];
            }

            // Si c'est un objet (JSON parse automatique de Prisma)
            if (dimensionsRaw && typeof dimensionsRaw === 'object') {
                console.log('🔄 Dimensions objet, tentative conversion');

                // Si c'est déjà un array d'objets valides
                if (Array.isArray(dimensionsRaw)) {
                    return dimensionsRaw;
                }

                // Si c'est un objet unique, le mettre dans un array
                if (dimensionsRaw.nom && dimensionsRaw.quantite) {
                    return [dimensionsRaw];
                }
            }

            console.warn('⚠️ Dimensions non reconnues, retour array vide');
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

        console.log('🔄 Données API pour PATCH:', apiData);
        return apiData;
    }

    async getCommandes(): Promise<CommandeMetier[]> {
        try {
            const result = await this.request<{ data: any[] }>('/commandes');
            console.log('🔍 Données Backend brutes:', result.data[0]);

            // ✅ TRANSFORMER chaque commande
            const transformedData = result.data.map(item => this.transformBackendToFrontend(item));
            console.log('🔄 Données transformées:', transformedData[0]);
            console.log('📋 Structure dates:', transformedData[0]?.dates);
            console.log('📋 Structure statuts:', transformedData[0]?.statuts);
            console.log('📋 Structure livraison:', transformedData[0]?.livraison);

            return transformedData;
        } catch (error) {
            console.error('❌ Erreur récupération commandes:', error);
            throw error;
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

            console.log('📤 Envoi PATCH /commandes/' + id, apiData);

            const result = await this.request<any>(`/commandes/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(apiData)
            });

            console.log('✅ Réponse PATCH:', result);
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

            console.log('🔄 Chauffeurs transformés:', transformedChauffeurs);
            return transformedChauffeurs;
        } catch (error) {
            console.error('❌ Erreur récupération chauffeurs:', error);
            throw error;
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
}

export const simpleBackendService = new SimpleBackendService();