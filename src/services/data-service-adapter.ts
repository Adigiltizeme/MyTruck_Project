// Adaptateur pour migrer progressivement de Airtable vers le nouveau backend
import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
import { StatutCommande, StatutLivraison } from '../types/commande.types';
// import { DataService } from './data.service';
import { BackendDataService } from './backend-data.service';
import { ApiService } from './api.service';
import { SafeDbService } from './safe-db.service';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './authService';
import { DbMonitor } from '../utils/db-repair';
import { PendingChange } from './offline-db.service';
import { SimpleBackendService } from './simple-backend.service';
import { isAdminRole } from '../utils/role-helpers';

// Ajout pour permettre l'accès à window.currentAuthUser sans erreur TypeScript
declare global {
    interface Window {
        currentAuthUser?: any;
    }
}

export enum DataSource {
    AIRTABLE = 'airtable',
    BACKEND_API = 'backend_api',
    AUTO = 'auto' // Détermine automatiquement la meilleure source
}

export class DataServiceAdapter {
    private dataService: BackendDataService;
    private apiService: ApiService;
    private dataSource: DataSource;
    private simpleBackendService: SimpleBackendService;
    private isApiAvailable: boolean = false;

    constructor() {
        this.dataService = new BackendDataService();
        this.apiService = new ApiService();
        this.dataSource = DataSource.BACKEND_API;
        this.simpleBackendService = new SimpleBackendService();
        this.isApiAvailable = false;

        // Initialisation immédiate et synchrone
        this.initializeDataSourceImmediate();

    }

    private initializeDataSourceImmediate(): void {

        // 1. TOUJOURS essayer Backend API en premier
        this.dataSource = DataSource.BACKEND_API;

        // 2. Test asynchone en arrière-plan, mais on commence par Backend
        this.testBackendAndFallback();

    }

    private async testBackendAndFallback(): Promise<void> {
        try {
            // Test simple et rapide
            const response = await fetch(`${import.meta.env.VITE_API_URL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(3000) // Timeout 3s
            });

            if (response.ok) {
                this.isApiAvailable = true;
                this.dataSource = DataSource.BACKEND_API;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }

        } catch (error) {
            console.warn('⚠️ Backend API indisponible, fallback vers Airtable:', error);

            // ✅ SEULEMENT en cas d'échec Backend, passer à Airtable
            this.isApiAvailable = false;
            this.dataSource = DataSource.AIRTABLE;

            // Afficher un warning visible
            this.showBackendUnavailableWarning();
        }
    }

    private showBackendUnavailableWarning(): void {
        console.warn('🔴 WARNING: Backend API indisponible - Utilisation Airtable (limité)');

        // Notification utilisateur
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('backend-unavailable', {
                detail: { message: 'Backend API indisponible - Fonctionnalités limitées' }
            });
            window.dispatchEvent(event);
        }
    }

    // =====================================
    // MÉTHODES PUBLIQUES POUR BASCULER
    // =====================================

    async switchToBackendApi(): Promise<boolean> {
        const isAvailable = await this.apiService.isApiAvailable();
        if (isAvailable) {
            this.dataSource = DataSource.BACKEND_API;
            localStorage.setItem('preferredDataSource', 'backend_api');
            console.log('✅ Basculé vers le backend API');
            return true;
        }
        console.warn('❌ Backend API non disponible');
        return false;
    }

    switchToAirtable(): void {
        this.dataSource = DataSource.AIRTABLE;
        localStorage.setItem('preferredDataSource', 'airtable');
        console.log('✅ Basculé vers Airtable');
    }

    getCurrentDataSource(): DataSource {
        return this.dataSource;
    }

    // =====================================
    // COMMANDES - Méthodes adaptées
    // =====================================

    async getCommandes(): Promise<CommandeMetier[]> {
        console.log(`📦 getCommandes() - Source actuelle: ${this.dataSource}`);

        try {
            // ✅ PRIORITÉ ABSOLUE au Backend API
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                console.log('🔄 Redirection vers simple-backend.service');
                const commandes = await this.simpleBackendService.getCommandes();
                
                // ✅ TRANSFORMATION CRITIQUE : Appliquer la transformation à toutes les commandes
                return commandes.map(commande => this.transformBackendCommandeData(commande));

            } else {
                console.log('📊 FALLBACK: Récupération via Airtable');
                return await this.dataService.getCommandes();
            }

        } catch (error) {
            console.error('❌ Erreur getCommandes:', error);

            // ✅ En cas d'erreur, utiliser données locales SANS basculer vers Airtable
            console.log('💾 RÉCUPÉRATION: Données locales (pas de basculement Airtable)');
            const localCommandes = await SafeDbService.getAll<CommandeMetier>('commandes');
            console.log(`📱 ${localCommandes.length} commandes locales récupérées`);
            return localCommandes;
        }
    }

    // ✅ Vérifier si on doit forcer Backend
    private shouldForceBackend(): boolean {
        const authMethod = localStorage.getItem('authMethod');
        const userSource = localStorage.getItem('userSource');
        const preferredSource = localStorage.getItem('preferredDataSource');

        const shouldForce = (
            authMethod === 'backend_api' ||
            userSource === 'backend' ||
            preferredSource === 'backend_api'
        );

        if (shouldForce) {
            this.dataSource = DataSource.BACKEND_API;
        }

        return shouldForce;
    }

    async getCommande(id: string): Promise<CommandeMetier | null> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const commande = await this.apiService.getCommande(id);

                // ✅ TRANSFORMATION CRITIQUE : Préserver le format misAJour attendu par le frontend
                const transformedCommande = this.transformBackendCommandeData(commande);

                // Mettre à jour la base locale avec les données transformées
                await SafeDbService.put('commandes', transformedCommande);

                return transformedCommande;
            } else {
                return await this.dataService.getCommande(id);
            }
        } catch (error) {
            console.error(`Erreur getCommande ${id}, fallback vers données locales:`, error);
            return await SafeDbService.getById<CommandeMetier>('commandes', id);
        }
    }

    async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const result = await this.apiService.createCommande(commande);

                // Synchroniser avec la base locale
                await SafeDbService.add('commandes', result);

                return result;
            } else {
                return await this.dataService.createCommande(commande);
            }
        } catch (error) {
            console.error('Erreur createCommande, stockage en mode hors-ligne:', error);

            // Créer temporairement en local en attendant la synchronisation
            const tempId = `temp_${uuidv4()}`;
            const tempCommande = {
                ...commande,
                id: tempId,
                numeroCommande: commande.numeroCommande || `TEMP_${Date.now()}`,
                statuts: {
                    commande: 'En attente',
                    livraison: 'EN ATTENTE'
                }
            } as CommandeMetier;

            await SafeDbService.add('commandes', tempCommande);

            // Ajouter aux changements en attente
            await SafeDbService.add('pendingChanges', {
                id: uuidv4(),
                entityType: 'commande',
                entityId: tempId,
                action: 'create',
                data: commande,
                timestamp: Date.now()
            });

            return tempCommande;
        }
    }

    public async createRapport(
        commandeId: string,
        rapportData: {
            message: string;
            type: 'ENLEVEMENT' | 'LIVRAISON';
            chauffeurId: string;
            photos?: Array<{ url: string; filename?: string }>;
            obligatoire?: boolean;
        }
    ): Promise<any> {
        try {
            console.log('📝 createRapport:', { commandeId, type: rapportData.type });

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                // ✅ ENDPOINT DÉDIÉ comme les autres fonctionnalités
                const result = await this.apiService.post(`/commandes/${commandeId}/rapports`, rapportData);

                console.log('✅ Rapport créé via endpoint dédié');

                // ✅ REFRESH CONTEXTE (pattern éprouvé)
                await this.invalidateCache();

                return result;
            } else {
                throw new Error('Création rapport impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur createRapport:', error);
            throw error;
        }
    }

    public async getRapportsCommande(commandeId: string): Promise<any> {
        try {
            console.log('📝 getRapportsCommande:', commandeId);

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const result = await this.apiService.get(`/commandes/${commandeId}/rapports`);

                console.log('✅ Rapports récupérés');

                return result;
            } else {
                throw new Error('Récupération rapports impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur getRapportsCommande:', error);
            throw error;
        }
    }

    public async isRapportObligatoire(commandeId: string, type: 'ENLEVEMENT' | 'LIVRAISON'): Promise<boolean> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const result = await this.apiService.get(`/commandes/${commandeId}/rapports/obligatoire?type=${type}`);
                return (result as { obligatoire?: boolean }).obligatoire || false;
            }
            return false;
        } catch (error) {
            console.error('❌ Erreur isRapportObligatoire:', error);
            return false;
        }
    }

    public async updateRapport(
        commandeId: string,
        rapportType: 'ENLEVEMENT' | 'LIVRAISON',
        updateData: {
            message?: string;
            newPhotos?: Array<{ url: string; filename?: string }>;
            photosToRemove?: string[];
        }
    ): Promise<any> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const result = await this.apiService.patch(
                    `/commandes/${commandeId}/rapports/${rapportType}`,
                    updateData
                );

                console.log('✅ Rapport mis à jour', { commandeId, rapportType });

                // ✅ REFRESH CONTEXTE
                await this.invalidateCache();

                return result;
            } else {
                throw new Error('Modification rapport impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur updateRapport:', error);
            throw error;
        }
    }

    public async deleteRapport(
        commandeId: string,
        rapportType: 'ENLEVEMENT' | 'LIVRAISON'
    ): Promise<void> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                await this.apiService.delete(`/commandes/${commandeId}/rapports/${rapportType}`);

                console.log('✅ Rapport supprimé', { commandeId, rapportType });

                // ✅ REFRESH CONTEXTE
                await this.invalidateCache();

            } else {
                throw new Error('Suppression rapport impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur deleteRapport:', error);
            throw error;
        }
    }

    public async assignChauffeursToCommande(commandeId: string, chauffeurIds: string[]): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                // ✅ UTILISER L'ENDPOINT DÉDIÉ /assign-chauffeurs (comme /photos)
                await this.apiService.patch<CommandeMetier>(`/commandes/${commandeId}/assign-chauffeurs`, {
                    chauffeurIds: chauffeurIds
                });
                await this.invalidateCache();

                // ✅ SOLUTION SIMPLE : Récupérer la commande fraîche (comme photos)
                const freshCommande = await this.getCommande(commandeId);

                if (!freshCommande) {
                    throw new Error(`Commande ${commandeId} non trouvée après assignation`);
                }

                return freshCommande;
            } else {
                throw new Error('Assignation chauffeurs impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur assignChauffeursToCommande:', error);
            throw error;
        }
    }

    public async replaceChauffeursToCommande(commandeId: string, chauffeurIds: string[]): Promise<CommandeMetier> {
        try {
            console.log('🔄 replaceChauffeursToCommande:', { commandeId, chauffeurIds });

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                // ✅ UTILISER L'ENDPOINT DÉDIÉ avec remplacement complet
                await this.apiService.patch<CommandeMetier>(`/commandes/${commandeId}/assign-chauffeurs`, {
                    chauffeurIds: chauffeurIds,
                    replaceAll: true // ✅ Indiquer le remplacement complet
                });

                console.log('✅ Chauffeurs remplacés via endpoint dédié');

                // ✅ RÉCUPÉRER COMMANDE FRAÎCHE
                const freshCommande = await this.getCommande(commandeId);

                if (!freshCommande) {
                    throw new Error(`Commande ${commandeId} non trouvée après remplacement`);
                }

                return freshCommande;
            } else {
                throw new Error('Remplacement chauffeurs impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur replaceChauffeursToCommande:', error);
            throw error;
        }
    }

    async updateCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        if (!commande.id) {
            throw new Error('ID de commande requis pour la mise à jour');
        }

        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                console.log('📝 updateCommande via Backend API, commande:', commande);

                // ✅ VÉRIFIER : Le champ chauffeurIds est-il passé correctement ?
                if (commande.chauffeurIds) {
                    console.log('🚛 Détection chauffeurIds dans updateCommande:', commande.chauffeurIds);
                }

                // ✅ CORRECTION : Structure différente pour modification vs création
                const updateData: any = {
                    id: commande.id
                };

                // ✅ Champs simples de commande
                if (commande.dates?.livraison) {
                    updateData.dateLivraison = commande.dates.livraison;
                }
                if (commande.livraison?.creneau) {
                    updateData.creneauLivraison = commande.livraison.creneau;
                }
                if (commande.livraison?.vehicule) {
                    updateData.categorieVehicule = commande.livraison.vehicule;
                }
                if (commande.livraison?.equipiers !== undefined) {
                    updateData.optionEquipier = Number(commande.livraison.equipiers);
                }
                if (commande.livraison?.reserve !== undefined) {
                    updateData.reserveTransport = commande.livraison.reserve;
                }
                if (commande.livraison?.remarques !== undefined) {
                    updateData.remarques = commande.livraison.remarques;
                }
                if (commande.financier?.tarifHT !== undefined) {
                    updateData.tarifHT = Number(commande.financier.tarifHT);
                }
                if (commande.articles?.photos && commande.articles.photos.length > 0) {
                    updateData.photos = commande.articles.photos;
                }
                if (commande.articles?.newPhotos && commande.articles.newPhotos.length > 0) {
                    updateData.newPhotos = commande.articles.newPhotos;
                }
                if (commande.articles?.autresArticles !== undefined) {
                    updateData.autresArticles = Number(commande.articles.autresArticles);
                }

                // ✅ CLIENT NESTED (pour modification)
                if (commande.client) {
                    updateData.client = {
                        nom: commande.client.nom,
                        prenom: commande.client.prenom,
                        telephone: commande.client.telephone?.principal || commande.client.telephone,
                        telephoneSecondaire: commande.client.telephone?.secondaire || '',
                        adresseLigne1: commande.client.adresse?.ligne1,
                        batiment: commande.client.adresse?.batiment || '',
                        etage: commande.client.adresse?.etage || '',
                        interphone: commande.client.adresse?.interphone || '',
                        ascenseur: commande.client.adresse?.ascenseur || false,
                        typeAdresse: commande.client.adresse?.type || 'Domicile'
                    };
                }

                // ✅ ARTICLES NESTED (pour modification)
                if (commande.articles) {
                    updateData.articles = {
                        nombre: Number(commande.articles.nombre),
                        details: commande.articles.details || '',
                        categories: commande.articles.categories || [],
                        dimensions: commande.articles.dimensions || [],
                        autresArticles: commande.articles.autresArticles || 0,
                        photos: commande.articles.photos || [],
                        newPhotos: commande.articles.newPhotos || [],
                        canBeTilted: commande.articles.canBeTilted || false,
                    };
                }

                // ✅ STATUTS
                if (commande.statuts?.commande) {
                    updateData.statutCommande = commande.statuts.commande;
                }
                if (commande.statuts?.livraison) {
                    updateData.statutLivraison = commande.statuts.livraison;
                }

                // ✅ CONDITIONS DE LIVRAISON NESTED
                if (commande.livraison?.details) {
                    updateData.deliveryDetails = {
                        hasElevator: commande.livraison.details?.hasElevator || false,
                        hasStairs: commande.livraison.details?.hasStairs || false,
                        stairCount: commande.livraison.details?.stairCount || 0,
                        parkingDistance: commande.livraison.details?.parkingDistance || 0,
                        needsAssembly: commande.livraison.details?.needsAssembly || false,
                        rueInaccessible: commande.livraison.details?.rueInaccessible || false,
                        paletteComplete: commande.livraison.details?.paletteComplete || false,
                        isDuplex: commande.livraison.details?.isDuplex || false,
                        deliveryToUpperFloor: commande.livraison.details?.deliveryToUpperFloor || false
                    };
                }

                console.log('📝 Données modification (structure nested):', updateData);

                // ✅ APPEL DIRECT PATCH sans transformation
                const result = await this.apiService.patch<CommandeMetier>(`/commandes/${commande.id}`, updateData);

                // Synchroniser avec la base locale
                await SafeDbService.update('commandes', commande.id, result);

                return result;
            } else {
                return await this.dataService.updateCommande(commande);
            }
        } catch (error) {
            console.error('Erreur updateCommande:', error);
            throw error;
        }
    }

    public async updateCommandeSimple(
        commandeId: string,
        updateData: any
    ): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                // ✅ APPEL DIRECT sans transformation
                const result = await this.apiService.patch<CommandeMetier>(`/commandes/${commandeId}`, updateData);

                console.log('✅ Modification directe réussie - Bypass transformation', updateData);

                const freshCommande = await this.getCommande(commandeId);
                return freshCommande || result;
            } else {
                throw new Error('Modification impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur updateCommandeSimple:', error);
            throw error;
        }
    }

    async deleteCommande(id: string): Promise<void> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                await this.apiService.deleteCommande(id);

                // Supprimer de la base locale
                await SafeDbService.delete('commandes', id);
            } else {
                await this.dataService.deleteCommande(id);
            }
        } catch (error) {
            console.error('Erreur deleteCommande:', error);
            throw error;
        }
    }

    // ✅ NOUVELLE MÉTHODE : Suppression multiple de commandes
    async deleteMultipleCommandes(ids: string[]): Promise<{ success: string[]; errors: { id: string; error: string }[] }> {
        console.log(`🗑️ Suppression multiple de ${ids.length} commandes:`, ids);
        
        const results = {
            success: [] as string[],
            errors: [] as { id: string; error: string }[]
        };

        // Traiter en parallèle pour performance
        await Promise.allSettled(
            ids.map(async (id) => {
                try {
                    await this.deleteCommande(id);
                    results.success.push(id);
                    console.log(`✅ Commande ${id} supprimée avec succès`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
                    results.errors.push({ id, error: errorMessage });
                    console.error(`❌ Échec suppression commande ${id}:`, errorMessage);
                }
            })
        );

        console.log(`📊 Résultats suppression: ${results.success.length} réussies, ${results.errors.length} échouées`);
        return results;
    }

    // =====================================
    // MAGASINS
    // =====================================

    async getMagasins(): Promise<MagasinInfo[]> {
        // console.log(`🏪 getMagasins() - Source: ${this.dataSource}`);

        if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
            try {
                const magasins = await this.apiService.getMagasins();
                await this.syncToLocalDb('magasins', magasins);
                return magasins;
            } catch (error) {
                console.error('❌ Erreur récupération magasins Backend:', error);

                // ✅ FALLBACK avec les VRAIS IDs créés
                return [
                    {
                        id: '76997d1d-2cc9-4144-96b9-4f3b181af0fc',
                        name: 'Truffaut Boulogne',  // ✅ 'name' au lieu de 'nom'
                        address: '33 Av. Edouard Vaillant, 92100 Boulogne',
                        phone: '01 23 45 67 89',
                        email: 'boulogne@truffaut.com',
                        status: 'actif'
                    },
                    {
                        id: '03705e9e-9af9-41ca-8e28-5046455b4b6f',
                        name: 'Truffaut Ivry',  // ✅ 'name' au lieu de 'nom'
                        address: '36 Rue Ernest Renan, 94200 Ivry',
                        phone: '01 98 76 54 32',
                        email: 'ivry@truffaut.com',
                        status: 'actif'
                    }
                ];
            }
        } else {
            console.log('📊 EXCLUSIF: Magasins via Airtable');
            return await this.dataService.getMagasins();
        }
    }

    // =====================================
    // PERSONNEL / CHAUFFEURS
    // =====================================

    async getPersonnel(): Promise<PersonnelInfo[]> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const personnel = await this.apiService.getPersonnel();

                await this.syncToLocalDb('personnel', personnel);

                return personnel;
            } else {
                return await this.dataService.getPersonnel();
            }
        } catch (error) {
            console.error('❌ Erreur getPersonnel:', error);
            try {
                return await SafeDbService.getAll<PersonnelInfo>('personnel');
            } catch (dbError) {
                console.error('❌ Erreur fallback DB personnel:', dbError);
                // ✅ DERNIER RECOURS : Retourner array vide
                console.log('🔄 Mode dégradé : personnel array vide');
                return [];
            }
        }
    }

    // =====================================
    // DOCUMENTS
    // =====================================

    // ✅ Ces méthodes doivent être ajoutées à la classe DataServiceAdapter

    public async generateBonCommande(commandeId: string): Promise<any> {
        try {
            console.log('📄 Génération bon de commande:', commandeId);

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const result = await this.apiService.post<any>(`/documents/commandes/${commandeId}/bon-commande`, {});

                console.log('✅ Bon de commande généré:', result);
                return result;
            } else {
                throw new Error('Génération documents impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur génération bon commande:', error);
            throw error;
        }
    }

    public async generateBonCommandeWithRefresh(commandeId: string): Promise<CommandeMetier> {
        try {
            console.log('📄 generateBonCommandeWithRefresh - Pattern chauffeurs');

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                // 1. Générer le document
                const result = await this.apiService.post<any>(`/documents/commandes/${commandeId}/bon-commande`, {});

                console.log('✅ Bon de commande généré:', result);

                // 2. Invalider cache (pattern chauffeurs)
                await this.invalidateCache();

                // 3. Récupérer commande fraîche (pattern éprouvé)
                const freshCommande = await this.getCommande(commandeId);

                if (!freshCommande) {
                    throw new Error(`Commande ${commandeId} non trouvée après génération document`);
                }

                return freshCommande;
            } else {
                throw new Error('Génération documents impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur generateBonCommandeWithRefresh:', error);
            throw error;
        }
    }

    public async generateDevis(commandeId: string, devisData: any): Promise<any> {
        try {
            console.log('📄 Génération devis:', commandeId, devisData);

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const result = await this.apiService.post<any>(`/documents/commandes/${commandeId}/devis`, devisData);

                console.log('✅ Devis généré:', result);
                return result;
            } else {
                throw new Error('Génération documents impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur génération devis:', error);
            throw error;
        }
    }

    public async generateFacture(commandeId: string, factureData: any): Promise<any> {
        try {
            console.log('📄 Génération facture:', commandeId, factureData);

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const result = await this.apiService.post<any>(`/documents/commandes/${commandeId}/facture`, factureData);

                console.log('✅ Facture générée:', result);
                return result;
            } else {
                throw new Error('Génération documents impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur génération facture:', error);
            throw error;
        }
    }

    public async downloadDocument(documentId: string): Promise<void> {
        try {
            console.log('📄 Téléchargement document:', documentId);

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const response = await this.apiService.get<any>(`/documents/${documentId}/download`);

                // Pour l'instant, ouvrir l'URL (en attendant Cloudinary)
                if (response.downloadUrl) {
                    window.open(response.downloadUrl, '_blank');
                }

                console.log('✅ Document téléchargé');
            } else {
                throw new Error('Téléchargement documents impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur téléchargement document:', error);
            throw error;
        }
    }

    public async deleteDocument(documentId: string): Promise<void> {
        try {
            console.log('🗑️ Suppression document:', documentId);

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                await this.apiService.delete(`/documents/${documentId}`);

                console.log('✅ Document supprimé avec succès');
            } else {
                throw new Error('Suppression documents impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur suppression document:', error);
            throw error;
        }
    }

    // =====================================
    // AUTHENTIFICATION
    // =====================================

    async login(email: string, password: string): Promise<any> {
        if (this.dataSource === DataSource.BACKEND_API) {
            try {
                const result = await this.apiService.login(email, password);

                // Adapter le format de retour pour compatibilité
                return {
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                        nom: result.user.nom,
                        prenom: result.user.prenom,
                        role: result.user.role,
                        status: result.user.status,
                        storeId: result.user.magasin?.id,
                        storeName: result.user.magasin?.nom,
                    },
                    token: result.access_token
                };
            } catch (error) {
                console.error('Échec login API, tentative avec système existant:', error);
                // Fallback vers le système d'auth existant si nécessaire
                throw error;
            }
        } else {
            // Utiliser le système d'authentification existant
            throw new Error('Authentification via Airtable non implémentée dans cet adaptateur');
        }
    }

    // =====================================
    // SYNCHRONISATION
    // =====================================

    async synchronize(change?: PendingChange): Promise<boolean> {
        if (this.dataSource === DataSource.BACKEND_API) {
            // ✅ CORRECTION : Gérer le cas où aucun change n'est fourni
            if (!change) {
                console.log('🔄 Synchronisation globale - récupération données Backend');
                try {
                    // Juste récupérer les dernières données sans sync de changes
                    await this.getCommandes(); // Force refresh des données
                    return true;
                } catch (error) {
                    console.error('❌ Erreur sync globale:', error);
                    return false;
                }
            }
            return await this.syncAllPendingChanges() !== undefined;
        } else {
            return await this.dataService.synchronize();
        }
    }

    // ✅ AJOUTER CETTE NOUVELLE MÉTHODE
    private async syncAllPendingChanges(): Promise<boolean> {
        try {
            const pendingChanges = await SafeDbService.getAll('pendingChanges');

            if (pendingChanges.length === 0) {
                console.log('✅ Aucun changement en attente à synchroniser');
                return true;
            }

            console.log(`🔄 Synchronisation de ${pendingChanges.length} changements en attente...`);

            for (const change of pendingChanges) {
                await this.transformToBackendFormat(change);
                await SafeDbService.delete('pendingChanges', (change as any).id);
            }

            return true;
        } catch (error) {
            console.error('❌ Erreur synchronisation globale:', error);
            return false;
        }
    }

    private transformToBackendFormat(frontendData: any): any {
        return {
            // ✅ Structure exacte attendue par Backend DTO
            magasinId: frontendData.magasin?.id,
            dateLivraison: frontendData.dates?.livraison,
            creneauLivraison: frontendData.livraison?.creneau,
            categorieVehicule: frontendData.livraison?.vehicule,
            optionEquipier: frontendData.livraison?.equipiers || 0,
            tarifHT: frontendData.financier?.tarifHT || 0,
            reserveTransport: frontendData.livraison?.reserve || false,
            remarques: frontendData.remarques || '',
            prenomVendeur: frontendData.prenomVendeur,

            // ✅ Client flat
            clientNom: frontendData.client?.nom || '',
            clientPrenom: frontendData.client?.prenom || '',
            clientTelephone: frontendData.client?.telephone?.principal || '',
            clientTelephoneSecondaire: frontendData.client?.telephone?.secondaire || '',
            clientAdresseLigne1: frontendData.client?.adresse?.ligne1 || '',
            clientTypeAdresse: frontendData.client?.adresse?.type || '',
            clientBatiment: frontendData.client?.adresse?.batiment || '',
            clientEtage: frontendData.client?.adresse?.etage || '',
            clientInterphone: frontendData.client?.adresse?.interphone || '',
            clientAscenseur: frontendData.client?.adresse?.ascenseur || false,

            // ✅ Articles flat
            nombreArticles: frontendData.articles?.nombre || 1,
            detailsArticles: frontendData.articles?.details || '',
            categoriesArticles: frontendData.articles?.categories || [],
            autresArticles: frontendData.articles?.autresArticles || 0,

            // ✅ Conditions de livraison
            rueInaccessible: frontendData.livraison?.conditions?.rueInaccessible || false,
            isDuplex: frontendData.livraison?.conditions?.isDuplex || false,
            deliveryToUpperFloor: frontendData.livraison?.conditions?.deliveryToUpperFloor || false,
            paletteComplete: frontendData.livraison?.conditions?.paletteComplete || false,
        };
    }

    // =====================================
    // UTILITAIRES PRIVÉS
    // =====================================

    private async syncToLocalDb(table: string, data: any[]): Promise<void> {
        try {
            await SafeDbService.transaction('rw', table, async () => {
                for (const item of data) {
                    await SafeDbService.put(table, item);
                }
            });
        } catch (error) {
            console.warn(`Erreur sync locale ${table}:`, error);
        }
    }

    // =====================================
    // STATISTIQUES ET MÉTRIQUES
    // =====================================

    async getMetrics(filters: any): Promise<any> {
        if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
            console.log('🚀 Récupération des statistiques via Backend API');
            try {
                return await this.apiService.getCommandesStats(filters.store);
            } catch (error) {
                console.warn('Erreur API stats, calcul local:', error);
            }
        }

        // Fallback vers le calcul local existant
        return await this.dataService.getMetrics(filters);
    }

    // =====================================
    // CONFIGURATION
    // =====================================

    setForcedOfflineMode(forced: boolean): void {
        if (forced) {
            this.dataSource = DataSource.AIRTABLE;
        }
        this.dataService.setForcedOfflineMode(forced);
    }

    getStatus(): { source: DataSource; apiAvailable: boolean; hasLocal: boolean } {
        const status = this.dataService.getStatus();
        return {
            ...status,
            source: status.source as DataSource
        };
    }

    async migrateAllCommandeImages(): Promise<void> {
        if (this.dataSource === DataSource.BACKEND_API) {
            console.log('[DataServiceAdapter] Migration d\'images non nécessaire avec le backend API');
            return;
        } else {
            // Déléguer à l'ancien système
            // Cast to any to access legacy Airtable method
            return await this.dataService.migrateAllCommandeImages();
        }
    }

    async migrateCommandeImages(commande: CommandeMetier): Promise<CommandeMetier> {
        if (this.dataSource === DataSource.BACKEND_API) {
            // Avec le backend API, les images sont gérées directement
            return commande;
        } else {
            // Déléguer à l'ancien système
            return await this.dataService.migrateCommandeImages(commande);
        }
    }

    // =====================================
    // MÉTHODES DE GESTION DES PHOTOS
    // =====================================

    public async addPhotosToCommande(commandeId: string, newPhotos: Array<{ url: string }>, existingPhotos: Array<{ url: string }> = []): Promise<CommandeMetier> {
        try {
            console.log('📸 addPhotosToCommande - Début:', { commandeId, newCount: newPhotos.length, existingCount: existingPhotos.length });

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const allPhotos = [...existingPhotos, ...newPhotos];

                const result = await this.apiService.patch<CommandeMetier>(`/commandes/${commandeId}/photos`, {
                    photos: allPhotos
                });

                console.log('✅ Photos ajoutées via endpoint dédié');
                console.log('📸 Résultat brut du Backend:', result);

                // ✅ SOLUTION SIMPLE : Récupérer la commande fraîche
                const freshCommande = await this.getCommande(commandeId);

                if (!freshCommande) {
                    throw new Error(`Commande fraîche non trouvée pour l'id: ${commandeId}`);
                }

                return freshCommande!;
            } else {
                throw new Error('Ajout photos impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur addPhotosToCommande détaillée:', error);
            throw error;
        }
    }

    public async deletePhotoFromCommande(commandeId: string, updatedPhotos: Array<{ url: string }>): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                await this.apiService.patch(`/commandes/${commandeId}/photos`, {
                    photos: updatedPhotos
                });

                // ✅ SOLUTION SIMPLE : Récupérer la commande fraîche
                const freshCommande = await this.getCommande(commandeId);

                if (!freshCommande) {
                    throw new Error(`Commande fraîche non trouvée pour l'id: ${commandeId}`);
                }

                return freshCommande!;
            } else {
                throw new Error('Suppression photos impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur deletePhotoFromCommande:', error);
            throw error;
        }
    }

    // =====================================
    // MÉTHODES UTILITAIRES DE CACHE
    // =====================================

    /**
     * Invalide le cache local des commandes.
     * Ici, on supprime toutes les commandes du SafeDbService.
     * Peut être adapté selon la logique de cache réelle.
     */
    private async invalidateCache(): Promise<void> {
        try {
            await SafeDbService.clear('commandes');
            console.log('🧹 Cache des commandes invalidé');
        } catch (error) {
            console.warn('Erreur lors de l\'invalidation du cache:', error);
        }
    }

    // =====================================
    // MÉTHODES DE MISE À JOUR SPÉCIFIQUES
    // =====================================

    async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                console.log('💰 updateTarif direct - Bypass transformation');

                // ✅ APPEL DIRECT sans transformation
                const result = await this.apiService.patch<CommandeMetier>(`/commandes/${commandeId}`, {
                    tarifHT: Number(tarif) // ✅ Structure directe
                });

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, result);

                return result;
            } else {
                return await this.dataService.updateTarif(commandeId, tarif);
            }
        } catch (error) {
            console.error('Erreur updateTarif:', error);
            return await this.dataService.updateTarif(commandeId, tarif);
        }
    }

    async updateChauffeurs(commandeId: string, chauffeurs: string[]): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const updatedCommande = await this.apiService.updateCommande(commandeId, {
                    chauffeurIds: chauffeurs
                });

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, updatedCommande);

                return updatedCommande;
            } else {
                return await this.dataService.updateChauffeurs(commandeId, chauffeurs);
            }
        } catch (error) {
            console.error('Erreur updateChauffeurs:', error);
            return await this.dataService.updateChauffeurs(commandeId, chauffeurs);
        }
    }

    async updateCommandeStatus(commandeId: string, status: {
        commande: StatutCommande;
        livraison: StatutLivraison;
    }): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const updatedCommande = await this.apiService.updateCommande(commandeId, {
                    statutCommande: status.commande,
                    statutLivraison: status.livraison
                });

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, updatedCommande);

                return updatedCommande;
            } else {
                return await this.dataService.updateCommandeStatus(commandeId, status);
            }
        } catch (error) {
            console.error('Erreur updateCommandeStatus:', error);
            return await this.dataService.updateCommandeStatus(commandeId, status);
        }
    }

    public async updateStatutsCommande(
        commandeId: string,
        statutCommande?: string,
        statutLivraison?: string,
        reason?: string
    ): Promise<CommandeMetier> {
        try {
            console.log('📊 updateStatutsCommande (Backend intelligent):', {
                commandeId, statutCommande, statutLivraison, reason
            });

            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                const user = this.getCurrentUserUnified();
                const isAdmin = isAdminRole(user?.role) || user?.role === 'direction';

                // ✅ APPEL ENDPOINT INTELLIGENT
                const result = await this.apiService.patch<CommandeMetier>(`/commandes/${commandeId}/statuts`, {
                    statutCommande,
                    statutLivraison,
                    reason,
                    forceUpdate: isAdmin // ✅ Admin peut forcer les transitions
                });

                console.log('✅ Statuts mis à jour via Backend intelligent');
                console.log('📊 Réponse:', result);

                // ✅ RÉCUPÉRER COMMANDE FRAÎCHE
                const freshCommande = await this.getCommande(commandeId);

                if (!freshCommande) {
                    throw new Error(`Commande ${commandeId} non trouvée après mise à jour statuts`);
                }

                return freshCommande;
            } else {
                throw new Error('Mise à jour statuts impossible hors ligne');
            }
        } catch (error) {
            console.error('❌ Erreur updateStatutsCommande:', error);
            throw error;
        }
    }

    // =====================================
    // MÉTHODES DE CALCUL DE DISTANCE
    // =====================================

    async calculateDistance(originAddress: string, destinationAddress: string): Promise<number> {
        // Cette méthode peut être utilisée indépendamment de la source de données
        return await this.dataService.calculateDistance(originAddress, destinationAddress);
    }

    // =====================================
    // MÉTHODES POUR LES FACTURES ET DEVIS
    // =====================================

    async addFactureToCommande(commande: CommandeMetier, facture: any): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                // TODO: Implémenter l'endpoint factures dans l'API
                console.warn('[DataServiceAdapter] Gestion des factures pas encore implémentée dans l\'API');
                return await this.dataService.addFactureToCommande(commande, facture);
            } else {
                return await this.dataService.addFactureToCommande(commande, facture);
            }
        } catch (error) {
            console.error('Erreur addFactureToCommande:', error);
            return await this.dataService.addFactureToCommande(commande, facture);
        }
    }

    async addDevisToCommande(commande: CommandeMetier, devis: any): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                // TODO: Implémenter l'endpoint devis dans l'API
                console.warn('[DataServiceAdapter] Gestion des devis pas encore implémentée dans l\'API');
                return await this.dataService.addDevisToCommande(commande, devis);
            } else {
                return await this.dataService.addDevisToCommande(commande, devis);
            }
        } catch (error) {
            console.error('Erreur addDevisToCommande:', error);
            return await this.dataService.addDevisToCommande(commande, devis);
        }
    }

    // =====================================
    // MÉTHODES D'OPTIONS DE CHAMPS
    // =====================================

    async getFieldOptions(field: string): Promise<string[]> {
        try {
            if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
                console.log(`🚀 Récupération options de champ ${field} via Backend API`);
                // Pour l'instant, utiliser les constantes locales
                // TODO: Implémenter un endpoint pour récupérer les options
                return await this.dataService.getFieldOptions(field);
            } else {
                return await this.dataService.getFieldOptions(field);
            }
        } catch (error) {
            console.error('Erreur getFieldOptions:', error);
            return await this.dataService.getFieldOptions(field);
        }
    }

    // =====================================
    // MÉTHODES POUR LES COMMANDES FILTRÉES
    // =====================================

    async getCommandesForCurrentUser(): Promise<CommandeMetier[]> {
        try {
            console.log('🔍 Récupération commandes pour utilisateur actuel...');

            const user = this.getCurrentUserUnified();

            if (!user) {
                console.warn('❌ Aucun utilisateur connecté');
                return [];
            }

            const allCommandes = await this.getCommandes();
            console.log(`📦 ${allCommandes.length} commandes totales récupérées`);

            const normalizedRole = this.normalizeUserRole(user);
            console.log(`👤 Utilisateur: ${user.email}, Rôle: ${normalizedRole}`);

            switch (normalizedRole) {
                case 'admin':
                    // ✅ CORRECTION: Admin voit TOUTES les commandes
                    console.log('🔑 Accès ADMIN - Toutes les commandes visibles');
                    return allCommandes;

                case 'magasin':
                    const storeId = this.extractStoreId(user);
                    if (!storeId) {
                        console.error(`❌ Magasin sans storeId:`, user);
                        return [];
                    }

                    const storeCommandes = allCommandes.filter(cmd => {
                        const cmdStoreId = this.extractCommandeStoreId(cmd);
                        return cmdStoreId === storeId;
                    });

                    console.log(`🏪 Magasin ${storeId}: ${storeCommandes.length}/${allCommandes.length} commandes`);
                    return storeCommandes;

                case 'chauffeur':
                    const driverId = this.extractDriverId(user);
                    if (!driverId) {
                        console.warn('⚠️ Chauffeur sans ID - retour liste vide');
                        return [];
                    }

                    console.log(`🚛 Récupération commandes pour chauffeur: ${driverId}`);

                    if (this.shouldForceBackend()) {
                        return await this.simpleBackendService.getCommandesByChauffeur(driverId);
                    } else {
                        const allCommandes = await this.dataService.getCommandes();
                        return allCommandes.filter(commande =>
                            commande.chauffeurs &&
                            commande.chauffeurs.some(chauffeur => chauffeur.id === driverId)
                        );
                    }

                default:
                    console.error(`❌ Rôle non reconnu: ${user.role}`);
                    return [];
            }

        } catch (error) {
            console.error('❌ Erreur filtrage commandes:', error);
            return [];
        }
    }

    private getCurrentUserUnified(): any | null {
        try {
            // 1. Priorité au contexte React si disponible
            if (typeof window !== 'undefined' && (window as any).currentAuthUser) {
                const contextUser = (window as any).currentAuthUser;
                console.log('✅ Utilisateur via contexte React');
                window.currentAuthUser = contextUser;
                return contextUser;
            }

            // 2. Format Backend (préféré)
            const backendUser = localStorage.getItem('user');
            if (backendUser) {
                try {
                    const user = JSON.parse(backendUser);
                    if (user && user.id) {
                        console.log('✅ Utilisateur Backend format');
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.nom || user.name,
                            role: user.role?.toLowerCase() || 'magasin',
                            storeId: user.magasin?.id,
                            storeName: user.magasin?.nom,
                            source: 'backend'
                        };
                    }
                } catch (e) {
                    console.warn('Format backend invalide');
                }
            }

            // 3. Format Legacy
            const legacyUser = localStorage.getItem('currentUser');
            if (legacyUser) {
                try {
                    const user = JSON.parse(legacyUser);
                    if (user && user.id) {
                        console.log('✅ Utilisateur Legacy format');
                        return {
                            ...user,
                            source: 'legacy'
                        };
                    }
                } catch (e) {
                    console.warn('Format legacy invalide');
                }
            }

            // 4. AuthService direct
            if (typeof AuthService !== 'undefined') {
                const authUser = AuthService.getCurrentUser();
                if (authUser) {
                    console.log('✅ Utilisateur via AuthService');
                    return {
                        ...authUser,
                        source: 'authservice'
                    };
                }
            }

            console.warn('❌ Aucun utilisateur trouvé');
            return null;

        } catch (error) {
            console.error('❌ Erreur getCurrentUserUnified:', error);
            return null;
        }
    }

    private normalizeUserRole(user: any): 'admin' | 'magasin' | 'chauffeur' | 'unknown' {
        if (!user || !user.role) {
            console.warn('⚠️ Utilisateur sans rôle:', user);
            return 'unknown';
        }

        const originalRole = user.role;
        const role = String(originalRole).toLowerCase().trim();

        // Mappings exhaustifs pour tous les formats possibles
        const roleMap: Record<string, 'admin' | 'magasin' | 'chauffeur'> = {
            // Variations Admin (Backend format)
            'admin': 'admin',
            'administrateur': 'admin',
            'direction': 'admin',
            'direction my truck': 'admin',

            // Variations Magasin (Backend + Legacy)
            'magasin': 'magasin',
            'interlocuteur': 'magasin',
            'interlocuteur magasin': 'magasin',
            'store': 'magasin',
            'manager': 'magasin',

            // Variations Chauffeur
            'chauffeur': 'chauffeur',
            'driver': 'chauffeur',
            'livreur': 'chauffeur'
        };

        // Correspondance exacte
        if (roleMap[role]) {
            const normalized = roleMap[role];
            console.log(`🎭 Rôle normalisé: "${originalRole}" → "${normalized}"`);
            return normalized;
        }

        // Correspondance partielle (patterns)
        if (role.includes('admin') || role.includes('direction')) {
            console.log(`🎭 Rôle pattern admin: "${originalRole}" → "admin"`);
            return 'admin';
        }

        if (role.includes('magasin') || role.includes('interlocuteur') || role.includes('store')) {
            console.log(`🎭 Rôle pattern magasin: "${originalRole}" → "magasin"`);
            return 'magasin';
        }

        if (role.includes('chauffeur') || role.includes('driver') || role.includes('livreur')) {
            console.log(`🎭 Rôle pattern chauffeur: "${originalRole}" → "chauffeur"`);
            return 'chauffeur';
        }

        console.error(`❌ Rôle non reconnu: "${originalRole}" (normalisé: "${role}")`);
        return 'unknown';
    }

    private extractStoreId(user: any): string | null {
        // Essayer toutes les variations possibles
        const candidates = [
            user.storeId,           // Legacy format
            user.store_id,          // Snake case
            user.magasin?.id,       // Backend nested
            user.magasin_id,        // Backend flat
            user.magasinId          // Camel case
        ];

        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'string') {
                console.log(`🏪 Store ID extrait: ${candidate}`);
                return candidate;
            }
        }

        console.error('❌ Aucun store ID trouvé dans:', user);
        return null;
    }

    private extractDriverId(user: any): string | null {
        // Essayer toutes les variations possibles
        const candidates = [
            user.driverId,          // Legacy format
            user.driver_id,         // Snake case
            user.chauffeur?.id,     // Backend nested
            user.chauffeur_id,      // Backend flat
            user.chauffeurId,       // Camel case
            user.id                 // Fallback: user ID = driver ID
        ];

        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'string') {
                console.log(`🚛 Driver ID extrait: ${candidate}`);
                return candidate;
            }
        }

        console.error('❌ Aucun driver ID trouvé dans:', user);
        return null;
    }

    private extractCommandeStoreId(commande: CommandeMetier): string | null {
        // Essayer toutes les variations dans une commande
        const candidates = [
            commande.magasin?.id,      // Structure nested
            commande.magasin_id,       // Flat
            commande.magasinId         // Camel case
        ];

        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'string') {
                return candidate;
            }
        }

        return null;
    }

    /**
     * Méthode de debug spécifique
     */

    async debugCommandeFiltering(): Promise<void> {
        console.group('🔍 DEBUG FILTRAGE COMMANDES');

        try {
            // 1. État utilisateur
            const user = this.getCurrentUserUnified();
            console.log('👤 Utilisateur actuel:', user);

            if (user) {
                console.log('🎭 Rôle original:', user.role);
                console.log('🎭 Rôle normalisé:', this.normalizeUserRole(user));

                if (this.normalizeUserRole(user) === 'magasin') {
                    console.log('🏪 Store ID extrait:', this.extractStoreId(user));
                }

                if (this.normalizeUserRole(user) === 'chauffeur') {
                    console.log('🚛 Driver ID extrait:', this.extractDriverId(user));
                }
            }

            // 2. Test récupération commandes
            const allCommandes = await this.getCommandes();
            console.log(`📦 Total commandes: ${allCommandes.length}`);

            // 3. Aperçu des magasins dans les commandes
            const storeIds = [...new Set(allCommandes.map(cmd => this.extractCommandeStoreId(cmd)).filter(Boolean))];
            console.log('🏪 Store IDs présents dans les commandes:', storeIds);

            // 4. Test filtrage
            const filteredCommandes = await this.getCommandesForCurrentUser();
            console.log(`✅ Commandes filtrées: ${filteredCommandes.length}`);

            if (filteredCommandes.length === 0 && allCommandes.length > 0) {
                console.error('❌ PROBLÈME: Filtrage retourne 0 commandes alors que des commandes existent !');
            }

        } catch (error) {
            console.error('❌ Erreur during debug:', error);
        }

        console.groupEnd();
    }

    // ==========================================
    // DIAGNOSTIC SPÉCIFIQUE PAGE DELIVERIES  
    // ==========================================

    // Ajout de méthode de debug spécifique
    async debugDeliversPage(): Promise<void> {
        console.group('🚛 DEBUG PAGE DELIVERIES');

        // 1. État utilisateur
        const user = this.getCurrentUserUnified();
        console.log('Utilisateur actuel:', user);

        if (user) {
            console.log('Rôle normalisé:', this.normalizeUserRole(user));
            console.log('Store ID:', user.storeId || user.magasin?.id || 'MANQUANT');
            console.log('Driver ID:', user.driverId || user.chauffeur_id || 'MANQUANT');
        }

        // 2. Test récupération commandes
        try {
            const commandes = await this.getCommandesForCurrentUser();
            console.log(`Commandes filtrées: ${commandes.length}`);

            if (commandes.length === 0) {
                console.warn('❌ AUCUNE COMMANDE - Vérifier filtrage');

                // Test sans filtrage
                const allCommandes = await this.getCommandes();
                console.log(`Total commandes disponibles: ${allCommandes.length}`);
            }

        } catch (error) {
            console.error('❌ Erreur récupération commandes:', error);
        }

        // 3. État des services
        console.log('Source de données:', this.getCurrentDataSource());
        console.log('Mode hors ligne forcé:', localStorage.getItem('forceOfflineMode'));

        console.groupEnd();
    }

    // =====================================
    // NETTOYAGE ET MAINTENANCE
    // =====================================

    async cleanupTempEntities(): Promise<void> {
        // Cette méthode s'applique surtout aux données locales
        return await this.dataService.cleanupTempEntities();
    }

    async cleanupFailedTransactions(): Promise<number> {
        // Cette méthode s'applique surtout aux données locales
        return await this.dataService.cleanupFailedTransactions();
    }

    // ==========================================
    // Debug mode offline
    // ==========================================

    async debugOfflineMode(): Promise<void> {
        console.group('🔍 DEBUG MODE OFFLINE');

        const user = this.getCurrentUserUnified();
        console.log('👤 Utilisateur:', user);

        if (user) {
            console.log('🎭 Rôle normalisé:', this.normalizeUserRole(user));
        }

        // Test données locales
        const localCommandes = await SafeDbService.getAll<CommandeMetier>('commandes');
        console.log(`📱 Commandes locales: ${localCommandes.length}`);

        // Test filtrage
        const filteredCommandes = await this.getCommandesForCurrentUser();
        console.log(`✅ Commandes filtrées: ${filteredCommandes.length}`);

        console.groupEnd();

        // Exposer pour debug
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            (window as any).debugOfflineMode = () => this.debugOfflineMode();
        }
    }

    // ==========================================
    // TRANSFORMATION DES DONNÉES BACKEND
    // =====================================

    // ✅ MÉTHODE CRITIQUE : Transformer les données backend pour préserver les dates indépendantes
    private transformBackendCommandeData(commande: any): CommandeMetier {
        if (!commande) return commande;

        // Conserver les données originales
        const transformedCommande = { ...commande };

        // ✅ TRANSFORMATION ESSENTIELLE : Préserver le format misAJour pour les dates indépendantes
        if (commande.dates?.misAJour) {
            // Si le backend renvoie un string (ancien format), ne pas l'écraser
            if (typeof commande.dates.misAJour === 'string') {
                // Laisser tel quel - notre système de cache local prendra le relais
                console.log('🔄 Backend format misAJour (string) préservé pour cache local');
            } else if (typeof commande.dates.misAJour === 'object') {
                // Nouveau format déjà correct, garder tel quel
                console.log('✅ Backend format misAJour (object) déjà correct');
            }
        }

        return transformedCommande as CommandeMetier;
    }

    // ==========================================
    // Variables d'environnement Vite
    // =====================================
} // <-- End of DataServiceAdapter class

// DIAGNOSTIC des variables d'environnement
function diagnoseEnvironmentVariables(): void {
    console.group('🔍 DIAGNOSTIC VARIABLES ENVIRONNEMENT');

    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
    console.log('DEV mode:', import.meta.env.DEV);
    console.log('PROD mode:', import.meta.env.PROD);

    // Toutes les variables VITE
    const viteVars = Object.keys(import.meta.env)
        .filter(key => key.startsWith('VITE_'))
        .reduce((obj, key) => {
            obj[key] = import.meta.env[key];
            return obj;
        }, {} as Record<string, any>);

    console.log('Toutes les variables VITE:', viteVars);

    console.groupEnd();
}

export async function runCompleteBackendDiagnostic(): Promise<void> {
    console.log('🔍 === DIAGNOSTIC BACKEND API COMPLET ===');

    // 1. Variables d'environnement
    diagnoseEnvironmentVariables();

    // 2. Test ApiService
    const apiService = new ApiService();
    const isAvailable = await apiService.testBackendConnection();

    // 3. Test direct fetch
    console.log('🧪 Test direct fetch...');
    try {
        const directResponse = await fetch(`${import.meta.env.VITE_API_URL}/health`);
        console.log('✅ Fetch direct réussi:', directResponse.status);
    } catch (error) {
        console.error('❌ Fetch direct échoué:', error);
    }

    // 4. Test avec curl simulation
    console.log('🧪 Test curl simulation...');
    try {
        const curlResponse = await fetch(`${import.meta.env.VITE_API_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        console.log('✅ Curl simulation réussie:', curlResponse.status);
        const data = await curlResponse.json();
        console.log('Données:', data);
    } catch (error) {
        console.error('❌ Curl simulation échouée:', error);
    }

    // 5. Résumé
    console.log('\n📋 RÉSUMÉ DIAGNOSTIC:');
    console.log(`API disponible via ApiService: ${isAvailable}`);
    console.log('Variables env OK:', !!import.meta.env.VITE_API_URL);

    // 6. Recommandations
    if (!isAvailable) {
        console.log('\n💡 ACTIONS RECOMMANDÉES:');
        console.log('1. Vérifier que le Backend est démarré');
        console.log('2. Vérifier les variables .env.local');
        console.log('3. Vérifier la configuration CORS');
        console.log('4. Redémarrer frontend et backend');
    }
}

// Exposer pour debug
if (typeof window !== 'undefined') {
    (window as any).runCompleteBackendDiagnostic = runCompleteBackendDiagnostic;
    (window as any).diagnoseEnvironmentVariables = diagnoseEnvironmentVariables;
}