import { SecureStorageService } from './secureStorage';
import { NotificationService } from './notificationService';
import { UserRole } from '../types/dashboard.types';
import { db } from './offline-db.service';
import { v4 as uuidv4 } from 'uuid';
import { UserAirtableService } from './userAirtableService';
import { AirtableService } from './airtable.service';
import { handleStorageError } from '../utils/error-handler';
import { SafeDbService } from './safe-db.service';

export interface UserSignupData {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    role: UserRole;
    storeId?: string;
    storeName?: string;
    storeAddress?: string;
    driverId?: string;
    phone?: string;
}

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    storeId?: string;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeStatus?: string;
    driverId?: string;
    passwordHash?: string;
    token?: string;
    lastLogin?: Date;
    source?: string;
}

export const SPECIAL_ACCOUNTS = [
    'admin@mytruck.com',
    'test@admin.com',
    'adama.digiltizeme@gmail.com',
    'mytruck.transport@gmail.com'
];

export class AuthService {
    // Collection simulée d'utilisateurs pour le MVP
    private static users: AuthUser[] = [
        {
            id: '1',
            email: 'admin@mytruck.com',
            name: 'Admin User',
            role: 'admin',
            token: 'mock-token-admin',
            lastLogin: new Date()
        },
        {
            id: '2',
            email: 'store@mytruck.com',
            name: 'Store Manager',
            role: 'magasin',
            storeId: 'store123',
            storeName: 'Truffaut Boulogne',
            storeAddress: '33 Av. Edouard Vaillant, 92100 Boulogne-Billancourt',
            token: 'mock-token-store',
            lastLogin: new Date()
        },
        {
            id: '3',
            email: 'driver@mytruck.com',
            name: 'Driver User',
            role: 'chauffeur',
            driverId: 'driver123',
            token: 'mock-token-driver',
            lastLogin: new Date()
        }
    ];

    private static userAirtableService = new UserAirtableService(
        import.meta.env.VITE_AIRTABLE_TOKEN
    );

    // private static airtableService = new AirtableService(
    //     import.meta.env.VITE_AIRTABLE_TOKEN,
    //     import.meta.env.VITE_AIRTABLE_BASE_ID
    // );

    // Vérifier si le mode hors ligne est activé
    private static isOfflineMode(): boolean {
        return localStorage.getItem('forceOfflineMode') === 'true';
    }

    // Méthode pour synchroniser les utilisateurs locaux avec Airtable
    static async syncUsers(): Promise<void> {
        if (this.isOfflineMode()) {
            console.log('Mode hors ligne actif - Synchronisation ignorée');
            return;
        }

        // ✅ NOUVEAU: Vérifier si on doit synchroniser avec Airtable
        const userSource = localStorage.getItem('userSource');
        const preferredSource = localStorage.getItem('preferredDataSource');

        if (userSource === 'backend' || preferredSource === 'backend_api') {
            console.log('🚫 syncUsers: Backend API actif, synchronisation Airtable ignorée');
            return;
        }

        // Vérifier format utilisateur Backend
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.nom && (user.magasin || user.chauffeur)) {
                    console.log('🚫 syncUsers: Format Backend détecté, synchronisation Airtable ignorée');
                    return;
                }
            } catch (e) {
                // Continue avec la synchronisation
            }
        }

        try {
            console.log('Synchronisation des utilisateurs depuis Airtable...');

            try {
                // Récupérer les utilisateurs d'Airtable
                const airtableService = new UserAirtableService(
                    import.meta.env.VITE_AIRTABLE_TOKEN as string
                );

                const airtableUsers = await airtableService.fetchAllUsers();
                console.log(`${airtableUsers.length} utilisateurs récupérés depuis Airtable`);

                // Vérifier que users est bien initialisé comme un tableau
                if (!Array.isArray(this.users)) {
                    console.log("Initialisation du tableau d'utilisateurs");
                    this.users = [];
                }

                // Fusionner avec les utilisateurs existants en mémoire pour éviter les doublons
                const existingEmails = new Set(
                    this.users
                        .filter(u => u && u.email && typeof u.email === 'string')
                        .map(u => u.email.toLowerCase())
                );

                for (const airtableUser of airtableUsers) {
                    if (airtableUser.email && typeof airtableUser.email === 'string' &&
                        !existingEmails.has(airtableUser.email.toLowerCase())) {
                        this.users.push(airtableUser);
                        existingEmails.add(airtableUser.email.toLowerCase());
                    }
                }

                // Mettre à jour la base de données locale
                try {
                    await db.transaction('rw', db.users, async () => {
                        // Ne pas vider la table pour conserver les utilisateurs locaux

                        // Mettre à jour ou ajouter les utilisateurs d'Airtable
                        for (const user of airtableUsers) {
                            const existingUser = await db.users.get(user.id);
                            if (existingUser) {
                                // Préserver le mot de passe local s'il existe
                                if (existingUser.passwordHash) {
                                    user.passwordHash = existingUser.passwordHash;
                                }
                                await db.users.update(user.id, user);
                            } else {
                                await db.users.add(user);
                            }
                        }
                    });

                    console.log('Utilisateurs synchronisés avec succès');
                } catch (dbError) {
                    console.error('Erreur lors de la mise à jour de la base locale:', dbError);
                    // Ne pas faire échouer la synchronisation pour un problème de base locale
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des utilisateurs depuis Airtable:', error);
                // Continuer avec les utilisateurs locaux
            }
        } catch (error) {
            console.error('Erreur lors de la synchronisation des utilisateurs:', error);
            throw error;
        }
    }

    // Charger les utilisateurs depuis la base de données locale
    static async loadUsersFromDB(): Promise<void> {
        try {
            const users = await db.users.toArray();
            if (users.length > 0) {
                this.users = users;
            }
        } catch (error) {
            if (!handleStorageError(error)) {
                console.error('Erreur lors du chargement des utilisateurs depuis la BD locale:', error);
            }
        }
    }

    // Méthode de login
    static async login(email: string, password: string): Promise<AuthUser> {
        try {
            // Vérifier si c'est un compte spécial (sans vérification de mot de passe)
            const isSpecialAccount = SPECIAL_ACCOUNTS.includes(email.toLowerCase());

            // Synchroniser depuis Airtable si possible
            if (!this.isOfflineMode()) {
                try {
                    await this.syncUsers();
                } catch (error) {
                    console.warn('Impossible de synchroniser les utilisateurs depuis Airtable:', error);
                }
            }

            if (this.users.length === 0) {
                await this.loadUsersFromDB();
            }

            // Trouver l'utilisateur par email
            const user = this.users.find(u =>
                u.email && email && u.email.toLowerCase() === email.toLowerCase()
            );

            // Gestion de l'utilisateur admin par défaut
            if (!user && ['admin@mytruck.com', 'test@admin.com'].includes(email.toLowerCase())) {
                try {
                    // Vérifier d'abord si un utilisateur avec cet ID existe déjà
                    const existingDefaultAdmin = await db.users.get('default-admin');

                    if (existingDefaultAdmin) {
                        // Si l'utilisateur existe déjà, utilisons-le
                        console.log('Utilisateur admin par défaut trouvé, utilisation de celui-ci');

                        // Mettre à jour le mot de passe si nécessaire
                        if (!existingDefaultAdmin.passwordHash) {
                            const hashedPassword = await this.hashPassword(password);
                            existingDefaultAdmin.passwordHash = hashedPassword;
                            await db.users.update('default-admin', { passwordHash: hashedPassword });
                        }

                        // Générer un token
                        const token = `mock-token-admin-${Date.now()}`;
                        const authenticatedUser = {
                            ...existingDefaultAdmin,
                            token
                        };

                        SecureStorageService.setAuthData(token, authenticatedUser);
                        return authenticatedUser;
                    } else {
                        // Créer un utilisateur admin par défaut avec un mot de passe haché
                        const hashedPassword = await this.hashPassword(password);
                        const defaultAdmin = {
                            id: 'default-admin',
                            email: email,
                            name: 'Administrateur',
                            role: 'admin' as UserRole,
                            passwordHash: hashedPassword,
                            lastLogin: new Date()
                        };

                        // Ajouter l'administrateur par défaut à la liste en mémoire
                        this.users.push(defaultAdmin);

                        // Stocker en base locale
                        try {
                            await db.users.put(defaultAdmin);
                        } catch (dbError) {
                            console.warn('Erreur lors de l\'enregistrement de l\'administrateur par défaut en base locale:', dbError);
                        }

                        // Générer un token
                        const token = `mock-token-admin-${Date.now()}`;
                        const authenticatedUser = {
                            ...defaultAdmin,
                            token
                        };

                        SecureStorageService.setAuthData(token, authenticatedUser);
                        return authenticatedUser;
                    }
                } catch (error) {
                    console.error('Erreur lors de la création de l\'utilisateur admin par défaut:', error);
                    throw new Error('Erreur lors de la connexion: ' + (error instanceof Error ? error.message : String(error)));
                }
            }

            if (!user) {
                throw new Error('Identifiants incorrects');
            }

            // Vérification du mot de passe pour les comptes non spéciaux
            if (!isSpecialAccount) {
                // Si l'utilisateur n'a pas de mot de passe haché (anciens comptes), il faut en créer un
                if (!user.passwordHash) {
                    // Pour les utilisateurs existants sans mot de passe, accepter n'importe quel mot de passe
                    // et mettre à jour le hash pour les connexions futures
                    user.passwordHash = await this.hashPassword(password);

                    // Mettre à jour dans la base locale
                    try {
                        await db.users.update(user.id, { passwordHash: user.passwordHash });
                    } catch (dbError) {
                        console.warn('Impossible de mettre à jour le hash de mot de passe:', dbError);
                    }
                } else {
                    // Vérification du mot de passe
                    const isPasswordValid = await this.verifyPassword(password, user.passwordHash);

                    if (!isPasswordValid) {
                        throw new Error('Identifiants incorrects');
                    }
                }
            }

            // Générer un token (simulé)
            const token = `mock-token-${user.role}-${Date.now()}`;

            // Enrichir les informations de l'utilisateur si c'est un magasin
            let authenticatedUser = {
                ...user,
                token,
                lastLogin: new Date()
            };

            // Si l'utilisateur est un magasin, vérifier et compléter ses informations
            if (user.role === 'magasin' && user.storeId) {
                try {
                    // Récupérer les informations à jour du magasin
                    let storeInfo;

                    // Essayer d'abord depuis la base de données locale
                    try {
                        storeInfo = await db.magasins.get(user.storeId);
                    } catch (dbError) {
                        console.warn('Erreur lors de la récupération des infos magasin depuis la BD locale:', dbError);
                    }

                    // Si non trouvé localement et en ligne, essayer via Airtable
                    if (!storeInfo && !this.isOfflineMode()) {
                        try {
                            // storeInfo = await this.airtableService.getMagasinById(user.storeId);
                        } catch (airtableError) {
                            console.warn('Erreur lors de la récupération des infos magasin depuis Airtable:', airtableError);
                        }
                    }

                    // Si on a trouvé les infos du magasin, compléter l'utilisateur
                    if (storeInfo) {
                        authenticatedUser = {
                            ...authenticatedUser,
                            storeName: storeInfo.name,
                            storeAddress: storeInfo.address,
                            storePhone: storeInfo.phone,
                            storeStatus: storeInfo.status
                        };

                        // Mettre à jour l'utilisateur dans la table locale des utilisateurs
                        try {
                            await db.users.update(user.id, {
                                storeName: storeInfo.name,
                                storeAddress: storeInfo.address,
                                storePhone: storeInfo.phone,
                                storeStatus: storeInfo.status
                            });
                        } catch (dbError) {
                            console.warn('Erreur lors de la mise à jour des infos utilisateur:', dbError);
                        }
                    }
                } catch (error) {
                    console.warn('Erreur lors de l\'enrichissement des données du magasin:', error);
                }
            }

            // Stocker les données d'authentification
            SecureStorageService.setAuthData(token, authenticatedUser);

            return authenticatedUser;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error;
        }
    }

    /**
 * Méthode pour rafraîchir le contexte utilisateur, notamment après un changement de magasin
 * @param userId ID de l'utilisateur à rafraîchir
 * @returns L'utilisateur mis à jour
 */
    static async refreshUserContext(userId: string): Promise<AuthUser | null> {
        try {
            // Récupérer l'utilisateur actuel
            const currentUser = this.getCurrentUser();
            if (!currentUser || currentUser.id !== userId) return null;

            // Si c'est un magasin, mettre à jour ses informations
            if (currentUser.role === 'magasin' && currentUser.storeId) {
                let storeInfo;

                // Récupérer les informations à jour du magasin
                try {
                    storeInfo = await db.magasins.get(currentUser.storeId);
                } catch (dbError) {
                    console.warn('Erreur lors de la récupération des infos magasin:', dbError);
                }

                // Si trouvé, mettre à jour
                if (storeInfo) {
                    const updatedUser = {
                        ...currentUser,
                        storeName: storeInfo.name,
                        storeAddress: storeInfo.address,
                        storePhone: storeInfo.phone,
                        storeStatus: storeInfo.status,
                        lastLogin: new Date()
                    };

                    // Mettre à jour dans le stockage sécurisé
                    SecureStorageService.setAuthData(currentUser.token || '', updatedUser);

                    // Mettre à jour dans la base de données
                    try {
                        await db.users.update(userId, {
                            storeName: storeInfo.name,
                            storeAddress: storeInfo.address,
                            storePhone: storeInfo.phone,
                            storeStatus: storeInfo.status
                        });
                    } catch (dbError) {
                        console.warn('Erreur lors de la mise à jour des infos utilisateur:', dbError);
                    }

                    return updatedUser;
                }
            }

            return currentUser;
        } catch (error) {
            console.error('Erreur lors du rafraîchissement du contexte utilisateur:', error);
            return null;
        }
    }

    static async signup(userData: UserSignupData): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
        try {
            // Vérifier si l'email existe déjà
            let emailExists = false;

            if (!this.isOfflineMode()) {
                try {
                    emailExists = await this.userAirtableService.checkEmailExists(userData.email);
                } catch (error) {
                    console.warn('Erreur lors de la vérification de l\'email sur Airtable:', error);
                }
            }

            // Vérification locale (en mode hors ligne ou comme double check)
            if (!emailExists && Array.isArray(this.users)) {
                emailExists = this.users.some(user =>
                    user && user.email && typeof user.email === 'string' &&
                    user.email.toLowerCase() === userData.email.toLowerCase()
                );
            }

            if (emailExists) {
                return {
                    success: false,
                    message: 'Cet email est déjà utilisé par un autre compte.'
                };
            }

            // Hachage du mot de passe
            const hashedPassword = await this.hashPassword(userData.password);

            // Générer un ID temporaire pour le mode hors ligne
            const userId = this.isOfflineMode() ? `offline-user-${uuidv4()}` : '';

            // Créer un nouvel utilisateur avec le mot de passe haché
            let newUser: AuthUser = {
                id: userId,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                storeId: userData.storeId,
                storeName: userData.storeName,
                storeAddress: userData.storeAddress,
                driverId: userData.driverId,
                passwordHash: hashedPassword,
                token: `mock-token-${userData.role}-${Date.now()}`,
                lastLogin: new Date()
            };

            // Si l'utilisateur est un magasin, ajouter l'entrée dans la table des magasins
            if (userData.role === 'magasin') {
                const storeData = {
                    id: userData.storeId || `store-${uuidv4()}`,
                    name: userData.storeName || userData.name, // Utiliser le nom de l'utilisateur si pas de nom de magasin
                    address: userData.storeAddress || '',
                    phone: userData.phone || '',
                    email: userData.email,
                    status: 'Actif'
                };

                // Mettre à jour le storeId de l'utilisateur
                if (!userData.storeId) {
                    newUser.storeId = storeData.id;
                    newUser.storeName = storeData.name;
                    newUser.storeAddress = storeData.address;
                }

                // En ligne : créer le magasin dans Airtable
                if (!this.isOfflineMode()) {
                    try {
                        // await this.airtableService.createMagasin(storeData);
                    } catch (error) {
                        console.error('Erreur lors de la création du magasin dans Airtable:', error);
                    }
                }

                // Ajouter à la table locale des magasins
                try {
                    await SafeDbService.add('magasins', storeData);
                } catch (dbError) {
                    console.error('Erreur lors de l\'ajout du magasin à la base locale:', dbError);
                }

                // Ajouter aux changements en attente en mode hors ligne
                if (this.isOfflineMode()) {
                    await SafeDbService.add('pendingChanges', {
                        id: uuidv4(),
                        entityType: 'magasin',
                        entityId: storeData.id,
                        action: 'create',
                        data: storeData,
                        timestamp: Date.now()
                    });
                }
            }

            // Si l'utilisateur est un chauffeur, ajouter l'entrée dans la table du personnel
            if (userData.role === 'chauffeur') {
                const driverData = {
                    id: userData.driverId || `driver-${uuidv4()}`,
                    nom: userData.name.split(' ').pop() || '', // Prendre le dernier mot comme nom de famille
                    prenom: userData.name.split(' ').shift() || '', // Prendre le premier mot comme prénom
                    telephone: userData.phone || '',
                    email: userData.email,
                    role: 'Chauffeur',
                    status: 'Actif'
                };

                // Mettre à jour le driverId de l'utilisateur
                if (!userData.driverId) {
                    newUser.driverId = driverData.id;
                }

                // En ligne : créer le chauffeur dans Airtable
                if (!this.isOfflineMode()) {
                    try {
                        // await this.airtableService.createPersonnel(driverData);
                    } catch (error) {
                        console.error('Erreur lors de la création du chauffeur dans Airtable:', error);
                    }
                }

                // Ajouter à la table locale du personnel
                try {
                    await SafeDbService.add('personnel', driverData);
                } catch (dbError) {
                    console.error('Erreur lors de l\'ajout du chauffeur à la base locale:', dbError);
                }

                // Ajouter aux changements en attente en mode hors ligne
                if (this.isOfflineMode()) {
                    await SafeDbService.add('pendingChanges', {
                        id: uuidv4(),
                        entityType: 'personnel',
                        entityId: driverData.id,
                        action: 'create',
                        data: driverData,
                        timestamp: Date.now()
                    });
                }
            }

            if (!this.isOfflineMode()) {
                try {
                    // Créer l'utilisateur dans Airtable
                    newUser = await this.userAirtableService.createUser(userData);
                } catch (error) {
                    console.error('Erreur lors de la création dans Airtable:', error);
                    // Continuer avec l'utilisateur local temporaire
                }
            }

            try {
                // En mode hors ligne, ajouter aux changements en attente
                if (this.isOfflineMode()) {
                    await db.pendingChanges.add({
                        id: uuidv4(),
                        entityType: 'user',
                        entityId: userId,
                        action: 'create',
                        data: userData,
                        timestamp: Date.now()
                    });
                }

                // Ajouter l'utilisateur à la base locale
                await db.users.add(newUser);

                // Ajouter l'utilisateur à notre liste en mémoire
                if (Array.isArray(this.users)) {
                    this.users.push(newUser);
                } else {
                    this.users = [newUser];
                }
            } catch (dbError) {
                console.error('Erreur lors de l\'ajout à la base locale:', dbError);
                // Ne pas bloquer l'inscription en cas d'erreur DB locale
            }

            // Enregistrer dans le stockage sécurisé
            SecureStorageService.setAuthData(newUser.token || '', newUser);

            return {
                success: true,
                user: newUser
            };
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            return {
                success: false,
                message: 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.'
            };
        }
    }

    static async hashPassword(password: string): Promise<string> {
        // Dans un environnement de production, bcrypt
        // Pour le MVP, nous utilisons une fonction simple (non sécurisée pour la production!)
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password + 'my-truck-salt-2025');
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.error('Erreur lors du hachage du mot de passe:', error);
            // Fallback pour les navigateurs qui ne supportent pas crypto.subtle
            return btoa(password + 'my-truck-salt-2025');
        }
    }

    static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
        // Hacher le mot de passe fourni et le comparer au mot de passe haché stocké
        const hashedInput = await this.hashPassword(password);
        return hashedInput === hashedPassword;
    }

    // Méthode pour mettre à jour un utilisateur
    static async updateUserInfo(userId: string, updates: Partial<AuthUser>): Promise<AuthUser | null> {
        const userIndex = this.users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return null;
        }

        // Mettre à jour l'utilisateur en mémoire
        const updatedUser = {
            ...this.users[userIndex],
            ...updates,
            lastLogin: new Date()
        };

        this.users[userIndex] = updatedUser;

        try {
            // Mettre à jour l'utilisateur en base locale
            if (userId) {
                await db.users.update(userId, {
                    name: updates.name,
                    email: updates.email,
                    storePhone: updates.storePhone
                });
            }

            // En mode connecté, mettre à jour dans Airtable
            if (!this.isOfflineMode()) {
                try {
                    await this.userAirtableService.updateUser(userId, {
                        name: updates.name,
                        email: updates.email,
                        storePhone: updates.storePhone
                    });
                } catch (error) {
                    console.error('Erreur lors de la mise à jour dans Airtable:', error);
                    // Ajouter aux changements en attente
                    await db.pendingChanges.add({
                        id: uuidv4(),
                        entityType: 'user',
                        entityId: userId,
                        action: 'update',
                        data: {
                            name: updates.name,
                            email: updates.email,
                            phone: updates.storePhone
                        },
                        timestamp: Date.now()
                    });
                }
            } else {
                // En mode hors ligne, ajouter aux changements en attente
                await db.pendingChanges.add({
                    id: uuidv4(),
                    entityType: 'user',
                    entityId: userId,
                    action: 'update',
                    data: {
                        name: updates.name,
                        email: updates.email,
                        phone: updates.storePhone
                    },
                    timestamp: Date.now()
                });
            }

            return updatedUser;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
            return updatedUser; // Retourner quand même l'utilisateur mis à jour en mémoire
        }
    }

    static async updateUserPassword(userId: string, newPasswordHash: string): Promise<AuthUser | null> {
        const userIndex = this.users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return null;
        }

        // Mettre à jour l'utilisateur en mémoire
        const updatedUser = {
            ...this.users[userIndex],
            passwordHash: newPasswordHash
        };

        this.users[userIndex] = updatedUser;

        try {
            // Mettre à jour l'utilisateur en base locale
            await db.users.update(userId, { passwordHash: newPasswordHash });

            // Note: Nous ne mettons pas à jour le mot de passe dans Airtable pour des raisons de sécurité
            // Les mots de passe sont gérés localement uniquement

            return updatedUser;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du mot de passe:', error);
            return updatedUser; // Retourner l'utilisateur mis à jour en mémoire malgré l'erreur
        }
    }

    // Méthode de déconnexion
    static logout(): void {
        SecureStorageService.clearAuthData();
    }

    // Méthode pour vérifier l'authentification actuelle
    static getCurrentUser(): AuthUser | null {
        return SecureStorageService.getUserData();
    }

    // Méthode pour rafraîchir le token
    static refreshToken(): AuthUser | null {
        const currentUser = this.getCurrentUser();

        if (!currentUser) {
            return null;
        }

        // Mettre à jour la date de dernière connexion
        currentUser.lastLogin = new Date();

        // Mettre à jour l'expiration
        SecureStorageService.updateExpiration();

        return currentUser;
    }

    static async deleteUser(userId: string): Promise<boolean> {
        try {
            const userIndex = this.users.findIndex(u => u.id === userId);

            if (userIndex === -1) {
                return false;
            }

            // Supprimer de la liste en mémoire
            this.users.splice(userIndex, 1);

            // Supprimer de la base locale
            await db.users.delete(userId);

            if (!this.isOfflineMode()) {
                // Supprimer dans Airtable
                await this.userAirtableService.deleteUser(userId);
            } else {
                // En mode hors ligne, ajouter aux changements en attente
                await db.pendingChanges.add({
                    id: uuidv4(),
                    entityType: 'user',
                    entityId: userId,
                    action: 'delete',
                    data: {},
                    timestamp: Date.now()
                });
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'utilisateur:', error);
            return false;
        }
    }
}