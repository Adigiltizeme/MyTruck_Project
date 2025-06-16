// Adaptateur pour migrer progressivement de Airtable vers le nouveau backend
import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
import { StatutCommande, StatutLivraison } from '../types/commande.types';
import { DataService } from './data.service';
import { ApiService } from './api.service';
import { SafeDbService } from './safe-db.service';
import { v4 as uuidv4 } from 'uuid';

export enum DataSource {
    AIRTABLE = 'airtable',
    BACKEND_API = 'backend_api',
    AUTO = 'auto' // Détermine automatiquement la meilleure source
}

export class DataServiceAdapter {
    private dataService: DataService;
    private apiService: ApiService;
    private dataSource: DataSource;
    private isApiAvailable: boolean = false;

    constructor(airtableToken: string, dataSource: DataSource = DataSource.AUTO) {
        this.dataService = new DataService(airtableToken);
        this.apiService = new ApiService();
        this.dataSource = dataSource;

        this.initializeDataSource();
    }

    private async initializeDataSource() {
        if (this.dataSource === DataSource.AUTO) {
            // Vérifier la disponibilité de l'API
            this.isApiAvailable = await this.apiService.isApiAvailable();

            // Préférer l'API si disponible, sinon fallback sur Airtable
            const preferredSource = localStorage.getItem('preferredDataSource');

            if (preferredSource === 'backend_api' && this.isApiAvailable) {
                this.dataSource = DataSource.BACKEND_API;
                console.log('🚀 Utilisation du backend API');
            } else {
                this.dataSource = DataSource.AIRTABLE;
                console.log('📊 Utilisation d\'Airtable (fallback)');
            }
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
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const response = await this.apiService.getCommandes();

                // Synchroniser avec la base locale pour le mode hors-ligne
                await this.syncToLocalDb('commandes', response.data);

                return response.data;
            } else {
                return await this.dataService.getCommandes();
            }
        } catch (error) {
            console.error('Erreur getCommandes, fallback vers données locales:', error);
            return await SafeDbService.getAll<CommandeMetier>('commandes');
        }
    }

    async getCommande(id: string): Promise<CommandeMetier | null> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const commande = await this.apiService.getCommande(id);

                // Mettre à jour la base locale
                await SafeDbService.put('commandes', commande);

                return commande;
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

    async updateCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        if (!commande.id) {
            throw new Error('ID de commande requis pour la mise à jour');
        }

        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const result = await this.apiService.updateCommande(commande.id, commande);

                // Synchroniser avec la base locale
                await SafeDbService.update('commandes', commande.id, result);

                return result;
            } else {
                return await this.dataService.updateCommande(commande);
            }
        } catch (error) {
            console.error('Erreur updateCommande, mise à jour locale:', error);

            // Mise à jour locale et ajout aux changements en attente
            const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commande.id);
            if (!existingCommande) throw new Error('Commande non trouvée');

            const updatedCommande = { ...existingCommande, ...commande };
            await SafeDbService.update('commandes', commande.id, updatedCommande);

            // Ajouter aux changements en attente
            await SafeDbService.add('pendingChanges', {
                id: uuidv4(),
                entityType: 'commande',
                entityId: commande.id,
                action: 'update',
                data: commande,
                timestamp: Date.now()
            });

            return updatedCommande;
        }
    }

    async deleteCommande(id: string): Promise<void> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
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

    // =====================================
    // MAGASINS
    // =====================================

    async getMagasins(): Promise<MagasinInfo[]> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const magasins = await this.apiService.getMagasins();

                // Synchroniser avec la base locale
                await this.syncToLocalDb('magasins', magasins);

                return magasins;
            } else {
                return await this.dataService.getMagasins();
            }
        } catch (error) {
            console.error('Erreur getMagasins, fallback vers données locales:', error);
            return await SafeDbService.getAll<MagasinInfo>('magasins');
        }
    }

    // =====================================
    // PERSONNEL / CHAUFFEURS
    // =====================================

    async getPersonnel(): Promise<PersonnelInfo[]> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const personnel = await this.apiService.getPersonnel();

                // Synchroniser avec la base locale
                await this.syncToLocalDb('personnel', personnel);

                return personnel;
            } else {
                return await this.dataService.getPersonnel();
            }
        } catch (error) {
            console.error('Erreur getPersonnel, fallback vers données locales:', error);
            return await SafeDbService.getAll<PersonnelInfo>('personnel');
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

    async synchronize(): Promise<boolean> {
        if (this.dataSource === DataSource.BACKEND_API) {
            // Synchroniser les changements en attente avec l'API
            return await this.syncPendingChangesToApi();
        } else {
            // Utiliser la synchronisation Airtable existante
            return await this.dataService.synchronize();
        }
    }

    private async syncPendingChangesToApi(): Promise<boolean> {
        try {
            const pendingChanges = await SafeDbService.getAll('pendingChanges');

            for (const change of pendingChanges) {
                try {
                    // Type guard to ensure 'change' is an object with expected properties
                    if (
                        typeof change === 'object' &&
                        change !== null &&
                        'entityType' in change &&
                        'action' in change &&
                        'entityId' in change &&
                        'data' in change &&
                        'id' in change
                    ) {
                        if ((change as any).entityType === 'commande') {
                            switch ((change as any).action) {
                                case 'create':
                                    await this.apiService.createCommande((change as any).data);
                                    break;
                                case 'update':
                                    await this.apiService.updateCommande((change as any).entityId, (change as any).data);
                                    break;
                                case 'delete':
                                    await this.apiService.deleteCommande((change as any).entityId);
                                    break;
                            }
                        }

                        // Supprimer le changement traité
                        await SafeDbService.delete('pendingChanges', (change as any).id);
                    }
                } catch (error) {
                    console.error(`Erreur sync changement ${(change as any).id}:`, error);
                }
            }

            return true;
        } catch (error) {
            console.error('Erreur synchronisation générale:', error);
            return false;
        }
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
        if (this.dataSource === DataSource.BACKEND_API) {
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
        return {
            source: this.dataSource,
            apiAvailable: this.isApiAvailable,
            hasLocal: true // On a toujours des données locales
        };
    }

    async migrateAllCommandeImages(): Promise<void> {
        if (this.dataSource === DataSource.BACKEND_API) {
            console.log('[DataServiceAdapter] Migration d\'images non nécessaire avec le backend API');
            return;
        } else {
            // Déléguer à l'ancien système
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

    async addPhotosToCommande(commandeId: string, newPhotos: Array<{ url: string }>, existingPhotos: Array<{ url: string }> = []): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                // Pour l'instant, on utilise l'API simple de mise à jour
                // TODO: Implémenter un endpoint spécifique pour les photos
                const commande = await this.apiService.getCommande(commandeId);

                // Ajouter les nouvelles photos
                const allPhotos = [...existingPhotos, ...newPhotos];

                const updatedCommande = await this.apiService.updateCommande(commandeId, {
                    articles: {
                        ...commande.articles,
                        photos: allPhotos
                    }
                });

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, updatedCommande);

                return updatedCommande;
            } else {
                return await this.dataService.addPhotosToCommande(commandeId, newPhotos, existingPhotos);
            }
        } catch (error) {
            console.error('Erreur addPhotosToCommande:', error);
            return await this.dataService.addPhotosToCommande(commandeId, newPhotos, existingPhotos);
        }
    }

    async deletePhotoFromCommande(commandeId: string, updatedPhotos: Array<{ url: string }>): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const commande = await this.apiService.getCommande(commandeId);

                const updatedCommande = await this.apiService.updateCommande(commandeId, {
                    articles: {
                        ...commande.articles,
                        photos: updatedPhotos
                    }
                });

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, updatedCommande);

                return updatedCommande;
            } else {
                return await this.dataService.deletePhotoFromCommande(commandeId, updatedPhotos);
            }
        } catch (error) {
            console.error('Erreur deletePhotoFromCommande:', error);
            return await this.dataService.deletePhotoFromCommande(commandeId, updatedPhotos);
        }
    }

    // =====================================
    // MÉTHODES DE MISE À JOUR SPÉCIFIQUES
    // =====================================

    async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
        try {
            if (this.dataSource === DataSource.BACKEND_API) {
                const updatedCommande = await this.apiService.updateCommande(commandeId, {
                    tarifHT: tarif
                });

                // Mettre à jour la base locale
                await SafeDbService.update('commandes', commandeId, updatedCommande);

                return updatedCommande;
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
            if (this.dataSource === DataSource.BACKEND_API) {
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
            if (this.dataSource === DataSource.BACKEND_API) {
                // L'API gère automatiquement le filtrage par utilisateur
                const response = await this.apiService.getCommandes();
                return response.data;
            } else {
                return await this.dataService.getCommandesForCurrentUser();
            }
        } catch (error) {
            console.error('Erreur getCommandesForCurrentUser:', error);
            return await this.dataService.getCommandesForCurrentUser();
        }
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
}