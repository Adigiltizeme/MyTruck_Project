// // Adaptateur pour migrer progressivement de Airtable vers le nouveau backend
// import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
// import { StatutCommande, StatutLivraison } from '../types/commande.types';
// import { DataService } from './data.service';
// import { ApiService } from './api.service';
// import { SafeDbService } from './safe-db.service';
// import { v4 as uuidv4 } from 'uuid';
// import { AuthService } from './authService';
// import { DbMonitor } from '../utils/db-repair';

// export enum DataSource {
//     AIRTABLE = 'airtable',
//     BACKEND_API = 'backend_api',
//     AUTO = 'auto' // Détermine automatiquement la meilleure source
// }

// export class DataServiceAdapter {
//     private dataService: DataService;
//     private apiService: ApiService;
//     private dataSource: DataSource;
//     private isApiAvailable: boolean = false;

//     constructor(airtableToken: string, dataSource: DataSource = DataSource.AUTO) {
//         this.dataService = new DataService(airtableToken);
//         this.apiService = new ApiService();
//         this.dataSource = DataSource.BACKEND_API;
//         this.isApiAvailable = false;

//         console.log('🚀 DataServiceAdapter: Backend API par DÉFAUT');

//         // Initialisation immédiate et synchrone
//         this.initializeDataSourceImmediate();

//     }

//     private initializeDataSourceImmediate(): void {
//         console.log('⚡ Initialisation IMMÉDIATE - Backend API prioritaire');

//         // 1. TOUJOURS essayer Backend API en premier
//         this.dataSource = DataSource.BACKEND_API;

//         // 2. Test asynchone en arrière-plan, mais on commence par Backend
//         this.testBackendAndFallback();

//         console.log('✅ Source par défaut: Backend API');
//     }

//     private async testBackendAndFallback(): Promise<void> {
//         try {
//             console.log('🧪 Test Backend API en arrière-plan...');

//             // Test simple et rapide
//             const response = await fetch('http://localhost:3000/api/v1/health', {
//                 method: 'GET',
//                 headers: { 'Content-Type': 'application/json' },
//                 signal: AbortSignal.timeout(3000) // Timeout 3s
//             });

//             if (response.ok) {
//                 this.isApiAvailable = true;
//                 this.dataSource = DataSource.BACKEND_API;
//                 console.log('✅ Backend API confirmé disponible');
//             } else {
//                 throw new Error(`HTTP ${response.status}`);
//             }

//         } catch (error) {
//             console.warn('⚠️ Backend API indisponible, fallback vers Airtable:', error);

//             // ✅ SEULEMENT en cas d'échec Backend, passer à Airtable
//             this.isApiAvailable = false;
//             this.dataSource = DataSource.AIRTABLE;

//             // Afficher un warning visible
//             this.showBackendUnavailableWarning();
//         }
//     }

//     private showBackendUnavailableWarning(): void {
//         console.warn('🔴 WARNING: Backend API indisponible - Utilisation Airtable (limité)');

//         // Notification utilisateur
//         if (typeof window !== 'undefined') {
//             const event = new CustomEvent('backend-unavailable', {
//                 detail: { message: 'Backend API indisponible - Fonctionnalités limitées' }
//             });
//             window.dispatchEvent(event);
//         }
//     }

//     // =====================================
//     // MÉTHODES PUBLIQUES POUR BASCULER
//     // =====================================

//     async switchToBackendApi(): Promise<boolean> {
//         const isAvailable = await this.apiService.isApiAvailable();
//         if (isAvailable) {
//             this.dataSource = DataSource.BACKEND_API;
//             localStorage.setItem('preferredDataSource', 'backend_api');
//             console.log('✅ Basculé vers le backend API');
//             return true;
//         }
//         console.warn('❌ Backend API non disponible');
//         return false;
//     }

//     switchToAirtable(): void {
//         this.dataSource = DataSource.AIRTABLE;
//         localStorage.setItem('preferredDataSource', 'airtable');
//         console.log('✅ Basculé vers Airtable');
//     }

//     getCurrentDataSource(): DataSource {
//         return this.dataSource;
//     }

//     // =====================================
//     // COMMANDES - Méthodes adaptées
//     // =====================================

//     async getCommandes(): Promise<CommandeMetier[]> {
//         console.log(`📦 getCommandes() - Source actuelle: ${this.dataSource}`);

//         try {
//             // ✅ PRIORITÉ ABSOLUE au Backend API
//             if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
//                 console.log('🚀 PRIORITÉ: Récupération via Backend API');

//                 const response = await this.apiService.getCommandes();
//                 await this.syncToLocalDb('commandes', response.data);

//                 console.log(`✅ ${response.data.length} commandes Backend API`);
//                 return response.data;

//             } else {
//                 console.log('📊 FALLBACK: Récupération via Airtable');
//                 return await this.dataService.getCommandes();
//             }

//         } catch (error) {
//             console.error('❌ Erreur getCommandes:', error);

//             // ✅ En cas d'erreur, utiliser données locales SANS basculer vers Airtable
//             console.log('💾 RÉCUPÉRATION: Données locales (pas de basculement Airtable)');
//             const localCommandes = await SafeDbService.getAll<CommandeMetier>('commandes');
//             console.log(`📱 ${localCommandes.length} commandes locales récupérées`);
//             return localCommandes;
//         }
//     }

//     // ✅ Vérifier si on doit forcer Backend
//     private shouldForceBackend(): boolean {
//         const authMethod = localStorage.getItem('authMethod');
//         const userSource = localStorage.getItem('userSource');
//         const preferredSource = localStorage.getItem('preferredDataSource');

//         const shouldForce = (
//             authMethod === 'backend_api' ||
//             userSource === 'backend' ||
//             preferredSource === 'backend_api'
//         );

//         if (shouldForce) {
//             console.log('🔒 FORÇAGE Backend détecté via marqueurs');
//             this.dataSource = DataSource.BACKEND_API;
//         }

//         return shouldForce;
//     }

//     async getCommande(id: string): Promise<CommandeMetier | null> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
//                 console.log(`🚀 Récupération commande ${id} via Backend API`);
//                 const commande = await this.apiService.getCommande(id);

//                 // Mettre à jour la base locale
//                 await SafeDbService.put('commandes', commande);

//                 console.log(`✅ Commande ${id} récupérée via Backend API`);
//                 return commande;
//             } else {
//                 return await this.dataService.getCommande(id);
//             }
//         } catch (error) {
//             console.error(`Erreur getCommande ${id}, fallback vers données locales:`, error);
//             return await SafeDbService.getById<CommandeMetier>('commandes', id);
//         }
//     }

//     async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 const result = await this.apiService.createCommande(commande);

//                 // Synchroniser avec la base locale
//                 await SafeDbService.add('commandes', result);

//                 return result;
//             } else {
//                 return await this.dataService.createCommande(commande);
//             }
//         } catch (error) {
//             console.error('Erreur createCommande, stockage en mode hors-ligne:', error);

//             // Créer temporairement en local en attendant la synchronisation
//             const tempId = `temp_${uuidv4()}`;
//             const tempCommande = {
//                 ...commande,
//                 id: tempId,
//                 numeroCommande: commande.numeroCommande || `TEMP_${Date.now()}`,
//                 statuts: {
//                     commande: 'En attente',
//                     livraison: 'EN ATTENTE'
//                 }
//             } as CommandeMetier;

//             await SafeDbService.add('commandes', tempCommande);

//             // Ajouter aux changements en attente
//             await SafeDbService.add('pendingChanges', {
//                 id: uuidv4(),
//                 entityType: 'commande',
//                 entityId: tempId,
//                 action: 'create',
//                 data: commande,
//                 timestamp: Date.now()
//             });

//             return tempCommande;
//         }
//     }

//     async updateCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
//         if (!commande.id) {
//             throw new Error('ID de commande requis pour la mise à jour');
//         }

//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 const result = await this.apiService.updateCommande(commande.id, commande);

//                 // Synchroniser avec la base locale
//                 await SafeDbService.update('commandes', commande.id, result);

//                 return result;
//             } else {
//                 return await this.dataService.updateCommande(commande);
//             }
//         } catch (error) {
//             console.error('Erreur updateCommande, mise à jour locale:', error);

//             // Mise à jour locale et ajout aux changements en attente
//             const existingCommande = await SafeDbService.getById<CommandeMetier>('commandes', commande.id);
//             if (!existingCommande) throw new Error('Commande non trouvée');

//             const updatedCommande = { ...existingCommande, ...commande };
//             await SafeDbService.update('commandes', commande.id, updatedCommande);

//             // Ajouter aux changements en attente
//             await SafeDbService.add('pendingChanges', {
//                 id: uuidv4(),
//                 entityType: 'commande',
//                 entityId: commande.id,
//                 action: 'update',
//                 data: commande,
//                 timestamp: Date.now()
//             });

//             return updatedCommande;
//         }
//     }

//     async deleteCommande(id: string): Promise<void> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 await this.apiService.deleteCommande(id);

//                 // Supprimer de la base locale
//                 await SafeDbService.delete('commandes', id);
//             } else {
//                 await this.dataService.deleteCommande(id);
//             }
//         } catch (error) {
//             console.error('Erreur deleteCommande:', error);
//             throw error;
//         }
//     }

//     // =====================================
//     // MAGASINS
//     // =====================================

//     async getMagasins(): Promise<MagasinInfo[]> {
//         console.log(`🏪 getMagasins() - Source: ${this.dataSource}`);

//         try {
//             if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
//                 console.log('🚀 EXCLUSIF: Magasins via Backend API');
//                 const magasins = await this.apiService.getMagasins();
//                 await this.syncToLocalDb('magasins', magasins);

//                 console.log(`✅ ${magasins.length} magasins récupérés via Backend API`);
//                 return magasins;
//             } else {
//                 console.log('📊 EXCLUSIF: Magasins via Airtable');
//                 return await this.dataService.getMagasins();
//             }
//         } catch (error) {
//             console.error('❌ Erreur getMagasins:', error);
//             return await SafeDbService.getAll<MagasinInfo>('magasins');
//         }
//     }

//     // =====================================
//     // PERSONNEL / CHAUFFEURS
//     // =====================================

//     async getPersonnel(): Promise<PersonnelInfo[]> {
//         console.log(`👥 getPersonnel() - Source: ${this.dataSource}`);

//         try {
//             if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
//                 console.log('🚀 EXCLUSIF: Personnel via Backend API');
//                 const personnel = await this.apiService.getPersonnel();
//                 await this.syncToLocalDb('personnel', personnel);

//                 console.log(`✅ ${personnel.length} personnels récupérés via Backend API`);
//                 return personnel;
//             } else {
//                 console.log('📊 EXCLUSIF: Personnel via Airtable');
//                 return await this.dataService.getPersonnel();
//             }
//         } catch (error) {
//             console.error('❌ Erreur getPersonnel:', error);
//             // En cas d'erreur, récupérer les données locales
//             console.warn('🔄 Récupération des données locales pour le personnel');
//             return await SafeDbService.getAll<PersonnelInfo>('personnel');
//         }
//     }

//     // =====================================
//     // AUTHENTIFICATION
//     // =====================================

//     async login(email: string, password: string): Promise<any> {
//         if (this.dataSource === DataSource.BACKEND_API) {
//             try {
//                 const result = await this.apiService.login(email, password);

//                 // Adapter le format de retour pour compatibilité
//                 return {
//                     user: {
//                         id: result.user.id,
//                         email: result.user.email,
//                         nom: result.user.nom,
//                         prenom: result.user.prenom,
//                         role: result.user.role,
//                         status: result.user.status,
//                         storeId: result.user.magasin?.id,
//                         storeName: result.user.magasin?.nom,
//                     },
//                     token: result.access_token
//                 };
//             } catch (error) {
//                 console.error('Échec login API, tentative avec système existant:', error);
//                 // Fallback vers le système d'auth existant si nécessaire
//                 throw error;
//             }
//         } else {
//             // Utiliser le système d'authentification existant
//             throw new Error('Authentification via Airtable non implémentée dans cet adaptateur');
//         }
//     }

//     // =====================================
//     // SYNCHRONISATION
//     // =====================================

//     async synchronize(): Promise<boolean> {
//         if (this.dataSource === DataSource.BACKEND_API) {
//             // Synchroniser les changements en attente avec l'API
//             return await this.syncPendingChangesToApi();
//         } else {
//             // Utiliser la synchronisation Airtable existante
//             return await this.dataService.synchronize();
//         }
//     }

//     private async syncPendingChangesToApi(): Promise<boolean> {
//         try {
//             const pendingChanges = await SafeDbService.getAll('pendingChanges');

//             for (const change of pendingChanges) {
//                 try {
//                     // Type guard to ensure 'change' is an object with expected properties
//                     if (
//                         typeof change === 'object' &&
//                         change !== null &&
//                         'entityType' in change &&
//                         'action' in change &&
//                         'entityId' in change &&
//                         'data' in change &&
//                         'id' in change
//                     ) {
//                         if ((change as any).entityType === 'commande') {
//                             switch ((change as any).action) {
//                                 case 'create':
//                                     await this.apiService.createCommande((change as any).data);
//                                     break;
//                                 case 'update':
//                                     await this.apiService.updateCommande((change as any).entityId, (change as any).data);
//                                     break;
//                                 case 'delete':
//                                     await this.apiService.deleteCommande((change as any).entityId);
//                                     break;
//                             }
//                         }

//                         // Supprimer le changement traité
//                         await SafeDbService.delete('pendingChanges', (change as any).id);
//                     }
//                 } catch (error) {
//                     console.error(`Erreur sync changement ${(change as any).id}:`, error);
//                 }
//             }

//             return true;
//         } catch (error) {
//             console.error('Erreur synchronisation générale:', error);
//             return false;
//         }
//     }

//     // =====================================
//     // UTILITAIRES PRIVÉS
//     // =====================================

//     private async syncToLocalDb(table: string, data: any[]): Promise<void> {
//         try {
//             await SafeDbService.transaction('rw', table, async () => {
//                 for (const item of data) {
//                     await SafeDbService.put(table, item);
//                 }
//             });
//         } catch (error) {
//             console.warn(`Erreur sync locale ${table}:`, error);
//         }
//     }

//     // =====================================
//     // STATISTIQUES ET MÉTRIQUES
//     // =====================================

//     async getMetrics(filters: any): Promise<any> {
//         if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
//             console.log('🚀 Récupération des statistiques via Backend API');
//             try {
//                 return await this.apiService.getCommandesStats(filters.store);
//             } catch (error) {
//                 console.warn('Erreur API stats, calcul local:', error);
//             }
//         }

//         // Fallback vers le calcul local existant
//         return await this.dataService.getMetrics(filters);
//     }

//     // =====================================
//     // CONFIGURATION
//     // =====================================

//     setForcedOfflineMode(forced: boolean): void {
//         if (forced) {
//             this.dataSource = DataSource.AIRTABLE;
//         }
//         this.dataService.setForcedOfflineMode(forced);
//     }

//     getStatus(): { source: DataSource; apiAvailable: boolean; hasLocal: boolean } {
//         return {
//             source: this.dataSource,
//             apiAvailable: this.isApiAvailable,
//             hasLocal: true // On a toujours des données locales
//         };
//     }

//     async migrateAllCommandeImages(): Promise<void> {
//         if (this.dataSource === DataSource.BACKEND_API) {
//             console.log('[DataServiceAdapter] Migration d\'images non nécessaire avec le backend API');
//             return;
//         } else {
//             // Déléguer à l'ancien système
//             return await this.dataService.migrateAllCommandeImages();
//         }
//     }

//     async migrateCommandeImages(commande: CommandeMetier): Promise<CommandeMetier> {
//         if (this.dataSource === DataSource.BACKEND_API) {
//             // Avec le backend API, les images sont gérées directement
//             return commande;
//         } else {
//             // Déléguer à l'ancien système
//             return await this.dataService.migrateCommandeImages(commande);
//         }
//     }

//     // =====================================
//     // MÉTHODES DE GESTION DES PHOTOS
//     // =====================================

//     async addPhotosToCommande(commandeId: string, newPhotos: Array<{ url: string }>, existingPhotos: Array<{ url: string }> = []): Promise<CommandeMetier> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 // Pour l'instant, on utilise l'API simple de mise à jour
//                 // TODO: Implémenter un endpoint spécifique pour les photos
//                 const commande = await this.apiService.getCommande(commandeId);

//                 // Ajouter les nouvelles photos
//                 const allPhotos = [...existingPhotos, ...newPhotos];

//                 const updatedCommande = await this.apiService.updateCommande(commandeId, {
//                     articles: {
//                         ...commande.articles,
//                         photos: allPhotos
//                     }
//                 });

//                 // Mettre à jour la base locale
//                 await SafeDbService.update('commandes', commandeId, updatedCommande);

//                 return updatedCommande;
//             } else {
//                 return await this.dataService.addPhotosToCommande(commandeId, newPhotos, existingPhotos);
//             }
//         } catch (error) {
//             console.error('Erreur addPhotosToCommande:', error);
//             return await this.dataService.addPhotosToCommande(commandeId, newPhotos, existingPhotos);
//         }
//     }

//     async deletePhotoFromCommande(commandeId: string, updatedPhotos: Array<{ url: string }>): Promise<CommandeMetier> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 const commande = await this.apiService.getCommande(commandeId);

//                 const updatedCommande = await this.apiService.updateCommande(commandeId, {
//                     articles: {
//                         ...commande.articles,
//                         photos: updatedPhotos
//                     }
//                 });

//                 // Mettre à jour la base locale
//                 await SafeDbService.update('commandes', commandeId, updatedCommande);

//                 return updatedCommande;
//             } else {
//                 return await this.dataService.deletePhotoFromCommande(commandeId, updatedPhotos);
//             }
//         } catch (error) {
//             console.error('Erreur deletePhotoFromCommande:', error);
//             return await this.dataService.deletePhotoFromCommande(commandeId, updatedPhotos);
//         }
//     }

//     // =====================================
//     // MÉTHODES DE MISE À JOUR SPÉCIFIQUES
//     // =====================================

//     async updateTarif(commandeId: string, tarif: number): Promise<CommandeMetier> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 const updatedCommande = await this.apiService.updateCommande(commandeId, {
//                     tarifHT: tarif
//                 });

//                 // Mettre à jour la base locale
//                 await SafeDbService.update('commandes', commandeId, updatedCommande);

//                 return updatedCommande;
//             } else {
//                 return await this.dataService.updateTarif(commandeId, tarif);
//             }
//         } catch (error) {
//             console.error('Erreur updateTarif:', error);
//             return await this.dataService.updateTarif(commandeId, tarif);
//         }
//     }

//     async updateChauffeurs(commandeId: string, chauffeurs: string[]): Promise<CommandeMetier> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 const updatedCommande = await this.apiService.updateCommande(commandeId, {
//                     chauffeurIds: chauffeurs
//                 });

//                 // Mettre à jour la base locale
//                 await SafeDbService.update('commandes', commandeId, updatedCommande);

//                 return updatedCommande;
//             } else {
//                 return await this.dataService.updateChauffeurs(commandeId, chauffeurs);
//             }
//         } catch (error) {
//             console.error('Erreur updateChauffeurs:', error);
//             return await this.dataService.updateChauffeurs(commandeId, chauffeurs);
//         }
//     }

//     async updateCommandeStatus(commandeId: string, status: {
//         commande: StatutCommande;
//         livraison: StatutLivraison;
//     }): Promise<CommandeMetier> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 const updatedCommande = await this.apiService.updateCommande(commandeId, {
//                     statutCommande: status.commande,
//                     statutLivraison: status.livraison
//                 });

//                 // Mettre à jour la base locale
//                 await SafeDbService.update('commandes', commandeId, updatedCommande);

//                 return updatedCommande;
//             } else {
//                 return await this.dataService.updateCommandeStatus(commandeId, status);
//             }
//         } catch (error) {
//             console.error('Erreur updateCommandeStatus:', error);
//             return await this.dataService.updateCommandeStatus(commandeId, status);
//         }
//     }

//     // =====================================
//     // MÉTHODES DE CALCUL DE DISTANCE
//     // =====================================

//     async calculateDistance(originAddress: string, destinationAddress: string): Promise<number> {
//         // Cette méthode peut être utilisée indépendamment de la source de données
//         return await this.dataService.calculateDistance(originAddress, destinationAddress);
//     }

//     // =====================================
//     // MÉTHODES POUR LES FACTURES ET DEVIS
//     // =====================================

//     async addFactureToCommande(commande: CommandeMetier, facture: any): Promise<CommandeMetier> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 // TODO: Implémenter l'endpoint factures dans l'API
//                 console.warn('[DataServiceAdapter] Gestion des factures pas encore implémentée dans l\'API');
//                 return await this.dataService.addFactureToCommande(commande, facture);
//             } else {
//                 return await this.dataService.addFactureToCommande(commande, facture);
//             }
//         } catch (error) {
//             console.error('Erreur addFactureToCommande:', error);
//             return await this.dataService.addFactureToCommande(commande, facture);
//         }
//     }

//     async addDevisToCommande(commande: CommandeMetier, devis: any): Promise<CommandeMetier> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API) {
//                 // TODO: Implémenter l'endpoint devis dans l'API
//                 console.warn('[DataServiceAdapter] Gestion des devis pas encore implémentée dans l\'API');
//                 return await this.dataService.addDevisToCommande(commande, devis);
//             } else {
//                 return await this.dataService.addDevisToCommande(commande, devis);
//             }
//         } catch (error) {
//             console.error('Erreur addDevisToCommande:', error);
//             return await this.dataService.addDevisToCommande(commande, devis);
//         }
//     }

//     // =====================================
//     // MÉTHODES D'OPTIONS DE CHAMPS
//     // =====================================

//     async getFieldOptions(field: string): Promise<string[]> {
//         try {
//             if (this.dataSource === DataSource.BACKEND_API || this.shouldForceBackend()) {
//                 console.log(`🚀 Récupération options de champ ${field} via Backend API`);
//                 // Pour l'instant, utiliser les constantes locales
//                 // TODO: Implémenter un endpoint pour récupérer les options
//                 return await this.dataService.getFieldOptions(field);
//             } else {
//                 return await this.dataService.getFieldOptions(field);
//             }
//         } catch (error) {
//             console.error('Erreur getFieldOptions:', error);
//             return await this.dataService.getFieldOptions(field);
//         }
//     }

//     // =====================================
//     // MÉTHODES POUR LES COMMANDES FILTRÉES
//     // =====================================

//     async getCommandesForCurrentUser(): Promise<CommandeMetier[]> {
//         try {
//             console.log('🔍 Récupération commandes pour utilisateur actuel...');

//             const user = this.getCurrentUserUnified();

//             if (!user) {
//                 console.warn('❌ Aucun utilisateur connecté');
//                 return [];
//             }

//             const allCommandes = await this.getCommandes();
//             console.log(`📦 ${allCommandes.length} commandes totales récupérées`);

//             const normalizedRole = this.normalizeUserRole(user);
//             console.log(`👤 Utilisateur: ${user.email}, Rôle: ${normalizedRole}`);

//             switch (normalizedRole) {
//                 case 'admin':
//                     // ✅ CORRECTION: Admin voit TOUTES les commandes
//                     console.log('🔑 Accès ADMIN - Toutes les commandes visibles');
//                     return allCommandes;

//                 case 'magasin':
//                     const storeId = this.extractStoreId(user);
//                     if (!storeId) {
//                         console.error(`❌ Magasin sans storeId:`, user);
//                         return [];
//                     }

//                     const storeCommandes = allCommandes.filter(cmd => {
//                         const cmdStoreId = this.extractCommandeStoreId(cmd);
//                         return cmdStoreId === storeId;
//                     });

//                     console.log(`🏪 Magasin ${storeId}: ${storeCommandes.length}/${allCommandes.length} commandes`);
//                     return storeCommandes;

//                 case 'chauffeur':
//                     const driverId = this.extractDriverId(user);
//                     if (!driverId) {
//                         console.error(`❌ Chauffeur sans driverId:`, user);
//                         return [];
//                     }

//                     const driverCommandes = allCommandes.filter(cmd =>
//                         cmd.chauffeurs?.some(chauffeur =>
//                             chauffeur.id === driverId || chauffeur.id === driverId
//                         )
//                     );

//                     console.log(`🚛 Chauffeur ${driverId}: ${driverCommandes.length}/${allCommandes.length} commandes`);
//                     return driverCommandes;

//                 default:
//                     console.error(`❌ Rôle non reconnu: ${user.role}`);
//                     return [];
//             }

//         } catch (error) {
//             console.error('❌ Erreur filtrage commandes:', error);
//             return [];
//         }
//     }

//     private getCurrentUserUnified(): any | null {
//         try {
//             // 1. Priorité au contexte React si disponible
//             if (typeof window !== 'undefined' && (window as any).currentAuthUser) {
//                 const contextUser = (window as any).currentAuthUser;
//                 console.log('✅ Utilisateur via contexte React');
//                 return contextUser;
//             }

//             // 2. Format Backend (préféré)
//             const backendUser = localStorage.getItem('user');
//             if (backendUser) {
//                 try {
//                     const user = JSON.parse(backendUser);
//                     if (user && user.id) {
//                         console.log('✅ Utilisateur Backend format');
//                         return {
//                             id: user.id,
//                             email: user.email,
//                             name: user.nom || user.name,
//                             role: user.role?.toLowerCase() || 'magasin',
//                             storeId: user.magasin?.id,
//                             storeName: user.magasin?.nom,
//                             source: 'backend'
//                         };
//                     }
//                 } catch (e) {
//                     console.warn('Format backend invalide');
//                 }
//             }

//             // 3. Format Legacy
//             const legacyUser = localStorage.getItem('currentUser');
//             if (legacyUser) {
//                 try {
//                     const user = JSON.parse(legacyUser);
//                     if (user && user.id) {
//                         console.log('✅ Utilisateur Legacy format');
//                         return {
//                             ...user,
//                             source: 'legacy'
//                         };
//                     }
//                 } catch (e) {
//                     console.warn('Format legacy invalide');
//                 }
//             }

//             // 4. AuthService direct
//             if (typeof AuthService !== 'undefined') {
//                 const authUser = AuthService.getCurrentUser();
//                 if (authUser) {
//                     console.log('✅ Utilisateur via AuthService');
//                     return {
//                         ...authUser,
//                         source: 'authservice'
//                     };
//                 }
//             }

//             console.warn('❌ Aucun utilisateur trouvé');
//             return null;

//         } catch (error) {
//             console.error('❌ Erreur getCurrentUserUnified:', error);
//             return null;
//         }
//     }

//     private normalizeUserRole(user: any): 'admin' | 'magasin' | 'chauffeur' | 'unknown' {
//         if (!user || !user.role) {
//             console.warn('⚠️ Utilisateur sans rôle:', user);
//             return 'unknown';
//         }

//         const originalRole = user.role;
//         const role = String(originalRole).toLowerCase().trim();

//         // Mappings exhaustifs pour tous les formats possibles
//         const roleMap: Record<string, 'admin' | 'magasin' | 'chauffeur'> = {
//             // Variations Admin (Backend format)
//             'admin': 'admin',
//             'administrateur': 'admin',
//             'direction': 'admin',
//             'direction my truck': 'admin',

//             // Variations Magasin (Backend + Legacy)
//             'magasin': 'magasin',
//             'interlocuteur': 'magasin',
//             'interlocuteur magasin': 'magasin',
//             'store': 'magasin',
//             'manager': 'magasin',

//             // Variations Chauffeur
//             'chauffeur': 'chauffeur',
//             'driver': 'chauffeur',
//             'livreur': 'chauffeur'
//         };

//         // Correspondance exacte
//         if (roleMap[role]) {
//             const normalized = roleMap[role];
//             console.log(`🎭 Rôle normalisé: "${originalRole}" → "${normalized}"`);
//             return normalized;
//         }

//         // Correspondance partielle (patterns)
//         if (role.includes('admin') || role.includes('direction')) {
//             console.log(`🎭 Rôle pattern admin: "${originalRole}" → "admin"`);
//             return 'admin';
//         }

//         if (role.includes('magasin') || role.includes('interlocuteur') || role.includes('store')) {
//             console.log(`🎭 Rôle pattern magasin: "${originalRole}" → "magasin"`);
//             return 'magasin';
//         }

//         if (role.includes('chauffeur') || role.includes('driver') || role.includes('livreur')) {
//             console.log(`🎭 Rôle pattern chauffeur: "${originalRole}" → "chauffeur"`);
//             return 'chauffeur';
//         }

//         console.error(`❌ Rôle non reconnu: "${originalRole}" (normalisé: "${role}")`);
//         return 'unknown';
//     }

//     private extractStoreId(user: any): string | null {
//         // Essayer toutes les variations possibles
//         const candidates = [
//             user.storeId,           // Legacy format
//             user.store_id,          // Snake case
//             user.magasin?.id,       // Backend nested
//             user.magasin_id,        // Backend flat
//             user.magasinId          // Camel case
//         ];

//         for (const candidate of candidates) {
//             if (candidate && typeof candidate === 'string') {
//                 console.log(`🏪 Store ID extrait: ${candidate}`);
//                 return candidate;
//             }
//         }

//         console.error('❌ Aucun store ID trouvé dans:', user);
//         return null;
//     }

//     private extractDriverId(user: any): string | null {
//         // Essayer toutes les variations possibles
//         const candidates = [
//             user.driverId,          // Legacy format
//             user.driver_id,         // Snake case
//             user.chauffeur?.id,     // Backend nested
//             user.chauffeur_id,      // Backend flat
//             user.chauffeurId,       // Camel case
//             user.id                 // Fallback: user ID = driver ID
//         ];

//         for (const candidate of candidates) {
//             if (candidate && typeof candidate === 'string') {
//                 console.log(`🚛 Driver ID extrait: ${candidate}`);
//                 return candidate;
//             }
//         }

//         console.error('❌ Aucun driver ID trouvé dans:', user);
//         return null;
//     }

//     private extractCommandeStoreId(commande: CommandeMetier): string | null {
//         // Essayer toutes les variations dans une commande
//         const candidates = [
//             commande.magasin?.id,      // Structure nested
//             commande.magasin_id,       // Flat
//             commande.magasinId         // Camel case
//         ];

//         for (const candidate of candidates) {
//             if (candidate && typeof candidate === 'string') {
//                 return candidate;
//             }
//         }

//         return null;
//     }

//     /**
//      * Méthode de debug spécifique
//      */

//     async debugCommandeFiltering(): Promise<void> {
//         console.group('🔍 DEBUG FILTRAGE COMMANDES');

//         try {
//             // 1. État utilisateur
//             const user = this.getCurrentUserUnified();
//             console.log('👤 Utilisateur actuel:', user);

//             if (user) {
//                 console.log('🎭 Rôle original:', user.role);
//                 console.log('🎭 Rôle normalisé:', this.normalizeUserRole(user));

//                 if (this.normalizeUserRole(user) === 'magasin') {
//                     console.log('🏪 Store ID extrait:', this.extractStoreId(user));
//                 }

//                 if (this.normalizeUserRole(user) === 'chauffeur') {
//                     console.log('🚛 Driver ID extrait:', this.extractDriverId(user));
//                 }
//             }

//             // 2. Test récupération commandes
//             const allCommandes = await this.getCommandes();
//             console.log(`📦 Total commandes: ${allCommandes.length}`);

//             // 3. Aperçu des magasins dans les commandes
//             const storeIds = [...new Set(allCommandes.map(cmd => this.extractCommandeStoreId(cmd)).filter(Boolean))];
//             console.log('🏪 Store IDs présents dans les commandes:', storeIds);

//             // 4. Test filtrage
//             const filteredCommandes = await this.getCommandesForCurrentUser();
//             console.log(`✅ Commandes filtrées: ${filteredCommandes.length}`);

//             if (filteredCommandes.length === 0 && allCommandes.length > 0) {
//                 console.error('❌ PROBLÈME: Filtrage retourne 0 commandes alors que des commandes existent !');
//             }

//         } catch (error) {
//             console.error('❌ Erreur during debug:', error);
//         }

//         console.groupEnd();
//     }

//     // ==========================================
//     // DIAGNOSTIC SPÉCIFIQUE PAGE DELIVERIES  
//     // ==========================================

//     // Ajout de méthode de debug spécifique
//     async debugDeliversPage(): Promise<void> {
//         console.group('🚛 DEBUG PAGE DELIVERIES');

//         // 1. État utilisateur
//         const user = this.getCurrentUserUnified();
//         console.log('Utilisateur actuel:', user);

//         if (user) {
//             console.log('Rôle normalisé:', this.normalizeUserRole(user));
//             console.log('Store ID:', user.storeId || user.magasin?.id || 'MANQUANT');
//             console.log('Driver ID:', user.driverId || user.chauffeur_id || 'MANQUANT');
//         }

//         // 2. Test récupération commandes
//         try {
//             const commandes = await this.getCommandesForCurrentUser();
//             console.log(`Commandes filtrées: ${commandes.length}`);

//             if (commandes.length === 0) {
//                 console.warn('❌ AUCUNE COMMANDE - Vérifier filtrage');

//                 // Test sans filtrage
//                 const allCommandes = await this.getCommandes();
//                 console.log(`Total commandes disponibles: ${allCommandes.length}`);
//             }

//         } catch (error) {
//             console.error('❌ Erreur récupération commandes:', error);
//         }

//         // 3. État des services
//         console.log('Source de données:', this.getCurrentDataSource());
//         console.log('Mode hors ligne forcé:', localStorage.getItem('forceOfflineMode'));

//         console.groupEnd();
//     }

//     // =====================================
//     // NETTOYAGE ET MAINTENANCE
//     // =====================================

//     async cleanupTempEntities(): Promise<void> {
//         // Cette méthode s'applique surtout aux données locales
//         return await this.dataService.cleanupTempEntities();
//     }

//     async cleanupFailedTransactions(): Promise<number> {
//         // Cette méthode s'applique surtout aux données locales
//         return await this.dataService.cleanupFailedTransactions();
//     }

//     // ==========================================
//     // Debug mode offline
//     // ==========================================

//     async debugOfflineMode(): Promise<void> {
//         console.group('🔍 DEBUG MODE OFFLINE');

//         const user = this.getCurrentUserUnified();
//         console.log('👤 Utilisateur:', user);

//         if (user) {
//             console.log('🎭 Rôle normalisé:', this.normalizeUserRole(user));
//         }

//         // Test données locales
//         const localCommandes = await SafeDbService.getAll<CommandeMetier>('commandes');
//         console.log(`📱 Commandes locales: ${localCommandes.length}`);

//         // Test filtrage
//         const filteredCommandes = await this.getCommandesForCurrentUser();
//         console.log(`✅ Commandes filtrées: ${filteredCommandes.length}`);

//         console.groupEnd();

//         // Exposer pour debug
//         if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
//             (window as any).debugOfflineMode = () => this.debugOfflineMode();
//         }
//     }

//     // ==========================================
//     // Variables d'environnement Vite
//     // =====================================
// } // <-- End of DataServiceAdapter class

// // DIAGNOSTIC des variables d'environnement
// function diagnoseEnvironmentVariables(): void {
//     console.group('🔍 DIAGNOSTIC VARIABLES ENVIRONNEMENT');

//     console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
//     console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
//     console.log('DEV mode:', import.meta.env.DEV);
//     console.log('PROD mode:', import.meta.env.PROD);

//     // Toutes les variables VITE
//     const viteVars = Object.keys(import.meta.env)
//         .filter(key => key.startsWith('VITE_'))
//         .reduce((obj, key) => {
//             obj[key] = import.meta.env[key];
//             return obj;
//         }, {} as Record<string, any>);

//     console.log('Toutes les variables VITE:', viteVars);

//     console.groupEnd();
// }

// export async function runCompleteBackendDiagnostic(): Promise<void> {
//     console.log('🔍 === DIAGNOSTIC BACKEND API COMPLET ===');

//     // 1. Variables d'environnement
//     diagnoseEnvironmentVariables();

//     // 2. Test ApiService
//     const apiService = new ApiService();
//     const isAvailable = await apiService.testBackendConnection();

//     // 3. Test direct fetch
//     console.log('🧪 Test direct fetch...');
//     try {
//         const directResponse = await fetch('http://localhost:3000/api/v1/health');
//         console.log('✅ Fetch direct réussi:', directResponse.status);
//     } catch (error) {
//         console.error('❌ Fetch direct échoué:', error);
//     }

//     // 4. Test avec curl simulation
//     console.log('🧪 Test curl simulation...');
//     try {
//         const curlResponse = await fetch('http://localhost:3000/api/v1/health', {
//             method: 'GET',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             }
//         });
//         console.log('✅ Curl simulation réussie:', curlResponse.status);
//         const data = await curlResponse.json();
//         console.log('Données:', data);
//     } catch (error) {
//         console.error('❌ Curl simulation échouée:', error);
//     }

//     // 5. Résumé
//     console.log('\n📋 RÉSUMÉ DIAGNOSTIC:');
//     console.log(`API disponible via ApiService: ${isAvailable}`);
//     console.log('Variables env OK:', !!import.meta.env.VITE_API_URL);

//     // 6. Recommandations
//     if (!isAvailable) {
//         console.log('\n💡 ACTIONS RECOMMANDÉES:');
//         console.log('1. Vérifier que le Backend est démarré');
//         console.log('2. Vérifier les variables .env.local');
//         console.log('3. Vérifier la configuration CORS');
//         console.log('4. Redémarrer frontend et backend');
//     }
// }

// // Exposer pour debug
// if (typeof window !== 'undefined') {
//     (window as any).runCompleteBackendDiagnostic = runCompleteBackendDiagnostic;
//     (window as any).diagnoseEnvironmentVariables = diagnoseEnvironmentVariables;
// }