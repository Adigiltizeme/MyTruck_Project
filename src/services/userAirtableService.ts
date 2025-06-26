import { UserRole } from '../types/roles';
import { AirtableService } from './airtable.service';
import { AuthService, AuthUser, UserSignupData } from './authService';

export class UserAirtableService {
    private airtableService: AirtableService;
    private baseId: string;
    private userTableId: string;

    constructor(apiToken: string) {
        this.airtableService = new AirtableService(apiToken);
        this.baseId = import.meta.env.VITE_AIRTABLE_BASE_ID as string;
        this.userTableId = import.meta.env.VITE_AIRTABLE_TABLE_USERS_ID as string || 'Users';
    }

    private shouldUseAirtable(): boolean {
        try {
            // Ne pas utiliser Airtable si utilisateur Backend API
            const userSource = localStorage.getItem('userSource');
            const preferredSource = localStorage.getItem('preferredDataSource');

            if (userSource === 'backend' || preferredSource === 'backend_api') {
                console.log('🚫 UserAirtableService: Backend API actif, Airtable désactivé');
                return false;
            }

            // Vérifier format utilisateur
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.nom && (user.magasin || user.chauffeur)) {
                        console.log('🚫 UserAirtableService: Format Backend détecté, Airtable désactivé');
                        return false;
                    }
                } catch (e) {
                    // Continue
                }
            }

            return true;
        } catch (error) {
            console.warn('Erreur vérification Airtable:', error);
            return true; // Par défaut, autoriser
        }
    }

    // Vérifier si l'utilisateur existe déjà
    async checkEmailExists(email: string): Promise<boolean> {
        if (!this.shouldUseAirtable()) {
            console.log('🔄 checkEmailExists: Airtable désactivé, retour false');
            return false;
        }

        try {
            // Utiliser les méthodes publiques de AirtableService
            const users = await this.fetchAllUsers();

            // Vérifier que users est un tableau et qu'il contient des objets avec la propriété email
            if (!Array.isArray(users) || users.length === 0) {
                return false; // Pas d'utilisateurs, donc l'email n'existe pas
            }

            return users.some(user => {
                // Vérifier que user et user.email existent avant d'appeler toLowerCase()
                return user && user.email && user.email.toLowerCase() === email.toLowerCase();
            });
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'email:', error);
            // En cas d'erreur, retourner false par prudence
            return false;
        }
    }

    // Récupérer tous les utilisateurs
    async fetchAllUsers(): Promise<AuthUser[]> {
        if (!this.shouldUseAirtable()) {
            console.log('🔄 fetchAllUsers: Airtable désactivé, retour tableau vide');
            return [];
        }

        try {
            console.log(`Récupération des utilisateurs depuis la table ${this.userTableId}`);
            const response = await fetch(
                `https://api.airtable.com/v0/${this.baseId}/${this.userTableId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('Table utilisateurs non trouvée dans Airtable, création d\'utilisateurs par défaut');
                    return []; // Retourner un tableau vide pour permettre la création d'utilisateurs par défaut
                }
                console.error(`Erreur HTTP ${response.status}: ${response.statusText}`);
                throw new Error(`Erreur Airtable: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Données reçues d'Airtable:`, data);

            if (!data || !data.records || !Array.isArray(data.records)) {
                console.warn('Format de réponse Airtable inattendu:', data);
                return [];
            }

            // Mapper les enregistrements avec vérification approfondie
            return data.records
                .filter((record: { id: string; fields: Record<string, any> }) => record && record.id && record.fields)
                .map((record: { id: string; fields: Record<string, any> }) => {
                    // Déterminer le rôle de l'application
                    let appRole: UserRole = 'magasin'; // Par défaut

                    // Récupérer le champ de rôle (qui peut être un array ou une string)
                    const airtableRoles = record.fields['RÔLE'] || [];
                    const roles = Array.isArray(airtableRoles) ? airtableRoles : [airtableRoles];

                    if (roles.some(r => r.includes('Direction'))) {
                        appRole = 'admin';
                    } else if (roles.some(r => r.includes('Chauffeur'))) {
                        appRole = 'chauffeur';
                    }

                    // Récupérer l'email et le nom
                    const email = record.fields['E-MAIL'] || '';
                    const name = record.fields['NOM D\'UTILISATEUR'] || '';

                    // Récupérer les infos magasin si disponibles
                    const storeIds = record.fields['ENTREPRISE/MAGASIN'] || [];
                    const storeId = Array.isArray(storeIds) && storeIds.length > 0 ? storeIds[0] : '';

                    return {
                        id: record.id,
                        email: email,
                        name: name,
                        role: appRole,
                        storeId: storeId,
                        storeName: '', // Ces informations devront être complétées ailleurs
                        storeAddress: '',
                        lastLogin: new Date()
                    };
                });
        } catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
            throw error;
        }
    }

    // Créer un nouvel utilisateur
    async createUser(userData: UserSignupData): Promise<AuthUser> {
        if (!this.shouldUseAirtable()) {
            throw new Error('Création utilisateur Airtable désactivée - Mode Backend API');
        }

        try {
            // Préparer les données au format attendu par Airtable selon la structure de table
            const fields: Record<string, any> = {
                // Utiliser les noms de champs exacts de la table Airtable
                'NOM D\'UTILISATEUR': userData.name,
                'E-MAIL': userData.email,
                // Ne pas stocker le mot de passe dans Airtable pour des raisons de sécurité
                // Le hachage sera stocké uniquement en local
            };

            // Pour le champ RÔLE, qui est un Multiple select
            let role: string[] = [];

            // Mapper les rôles de l'application aux rôles d'Airtable
            switch (userData.role) {
                case 'admin':
                    role = ['Direction My Truck'];
                    break;
                case 'magasin':
                    // Si le storeName est défini, créer un rôle d'interlocuteur approprié
                    if (userData.storeName) {
                        // Extraire le nom du magasin pour créer le rôle
                        const storeName = userData.storeName;
                        if (storeName.includes('Truffaut')) {
                            const location = storeName.replace('Truffaut ', '');
                            role = [`Interlocuteur Truffaut ${location}`];
                        } else if (storeName.includes('Leroy Merlin')) {
                            role = ['Interlocuteur Leroy Merlin'];
                        } else if (storeName.includes('Castorama')) {
                            role = ['Interlocuteur Castorama'];
                        } else if (storeName.includes('Jardiland')) {
                            role = ['Interlocuteur Jardiland'];
                        } else {
                            // Si aucun match, utiliser un format générique
                            role = [`Interlocuteur ${storeName}`];
                        }
                    } else {
                        // Valeur par défaut si pas de nom de magasin
                        role = ['Interlocuteur Magasin'];
                    }
                    break;
                case 'chauffeur':
                    role = ['Chauffeur'];
                    break;
                default:
                    role = ['Interlocuteur Magasin']; // Valeur par défaut
            }

            fields['RÔLE'] = role;

            // Lier l'entreprise/magasin si disponible
            if (userData.storeId) {
                fields['ENTREPRISE/MAGASIN'] = [userData.storeId];
            }

            // Afficher les données exactes envoyées à Airtable pour le débogage
            console.log('Données envoyées à Airtable pour création utilisateur:', fields);

            // Créer l'utilisateur dans Airtable via HTTP direct
            const response = await fetch(
                `https://api.airtable.com/v0/${this.baseId}/${this.userTableId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields,
                        typecast: true // Important pour créer des nouvelles valeurs de select si nécessaire
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Réponse d\'erreur Airtable:', errorData);
                throw new Error(`Erreur Airtable: ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();

            // Retourner l'utilisateur créé
            return {
                id: data.id,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                storeId: userData.storeId,
                storeName: userData.storeName,
                storeAddress: userData.storeAddress,
                driverId: userData.driverId,
                passwordHash: await AuthService.hashPassword(userData.password),
                lastLogin: new Date()
            };
        } catch (error) {
            console.error('Erreur lors de la création de l\'utilisateur:', error);
            throw error;
        }
    }

    // Mettre à jour un utilisateur existant
    async updateUser(userId: string, updates: Partial<AuthUser>): Promise<AuthUser> {
        if (!this.shouldUseAirtable()) {
            throw new Error('Mise à jour utilisateur Airtable désactivée - Mode Backend API');
        }

        try {
            // Préparer les données de mise à jour selon la structure réelle de votre table
            const fields: Record<string, any> = {};

            // Appliquer les mises à jour en utilisant les noms de champs exacts
            if (updates.name) fields['NOM D\'UTILISATEUR'] = updates.name;
            if (updates.email) fields['E-MAIL'] = updates.email;

            // Pour le rôle (seulement si spécifié dans les mises à jour)
            if (updates.role) {
                let role: string[] = [];

                // Mapper comme dans createUser
                switch (updates.role) {
                    case 'admin':
                        role = ['Direction My Truck'];
                        break;
                    case 'magasin':
                        if (updates.storeName) {
                            const storeName = updates.storeName;
                            if (storeName.includes('Truffaut')) {
                                const location = storeName.replace('Truffaut ', '');
                                role = [`Interlocuteur Truffaut ${location}`];
                            } else if (storeName.includes('Leroy Merlin')) {
                                role = ['Interlocuteur Leroy Merlin'];
                            } else if (storeName.includes('Castorama')) {
                                role = ['Interlocuteur Castorama'];
                            } else if (storeName.includes('Jardiland')) {
                                role = ['Interlocuteur Jardiland'];
                            } else {
                                role = [`Interlocuteur ${storeName}`];
                            }
                        } else {
                            role = ['Interlocuteur Magasin'];
                        }
                        break;
                    case 'chauffeur':
                        role = ['Chauffeur'];
                        break;
                    default:
                        role = ['Interlocuteur Magasin'];
                }

                fields['RÔLE'] = role;
            }

            // Mise à jour du magasin si nécessaire
            if (updates.storeId) {
                fields['ENTREPRISE/MAGASIN'] = [updates.storeId];
            }

            // Si aucun champ à mettre à jour, retourner immédiatement
            if (Object.keys(fields).length === 0) {
                console.log('Aucun champ à mettre à jour pour l\'utilisateur:', userId);
                // Récupérer l'utilisateur actuel
                const userData = await this.fetchUserById(userId);
                return userData;
            }

            console.log('Données envoyées à Airtable pour mise à jour utilisateur:', {
                userId,
                fields
            });

            // Mettre à jour l'utilisateur dans Airtable
            const response = await fetch(
                `https://api.airtable.com/v0/${this.baseId}/${this.userTableId}/${userId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields,
                        typecast: true
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Réponse d\'erreur Airtable:', errorData);
                throw new Error(`Erreur Airtable: ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();

            // Extraire l'email du résultat si disponible ou utiliser l'email existant
            const email = data.fields['E-MAIL'] || updates.email || '';

            // Retourner l'utilisateur mis à jour
            return {
                id: data.id,
                email: email,
                name: data.fields['NOM D\'UTILISATEUR'] || updates.name || '',
                role: updates.role as UserRole || 'magasin', // Garder le rôle de l'application
                storeId: updates.storeId || '',
                storeName: updates.storeName || '',
                storeAddress: updates.storeAddress || '',
                driverId: updates.driverId || '',
                lastLogin: new Date()
            };
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
            throw error;
        }
    }

    async fetchUserById(userId: string): Promise<AuthUser> {
        if (!this.shouldUseAirtable()) {
            throw new Error('Récupération utilisateur Airtable désactivée - Mode Backend API');
        }

        try {
            const response = await fetch(
                `https://api.airtable.com/v0/${this.baseId}/${this.userTableId}/${userId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                // Gérer les erreurs 404 gracieusement
                if (response.status === 404) {
                    console.warn(`Utilisateur ${userId} non trouvé dans Airtable`);
                    throw new Error(`Utilisateur ${userId} non trouvé dans Airtable`);
                }
                throw new Error(`Erreur lors de la récupération de l'utilisateur: ${response.statusText}`);
            }

            const data = await response.json();

            // Déterminer le rôle de l'application à partir du rôle Airtable
            let appRole: string = 'magasin'; // Par défaut
            const airtableRoles = data.fields['RÔLE'] || [];

            if (airtableRoles.includes('Direction My Truck')) {
                appRole = 'admin';
            } else if (airtableRoles.includes('Chauffeur')) {
                appRole = 'chauffeur';
            } else {
                appRole = 'magasin';
            }

            // Extraire le storeId si présent
            const storeIds = data.fields['ENTREPRISE/MAGASIN'] || [];
            const storeId = storeIds.length > 0 ? storeIds[0] : '';

            return {
                id: data.id,
                email: data.fields['E-MAIL'] || '',
                name: data.fields['NOM D\'UTILISATEUR'] || '',
                role: appRole as UserRole,
                storeId: storeId,
                storeName: '', // Ces informations ne sont pas directement dans la table utilisateur
                storeAddress: '',
                lastLogin: new Date()
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', error);
            throw new Error('Failed to fetch user by ID');
        }
    }

    async deleteUser(userId: string): Promise<boolean> {
        if (!this.shouldUseAirtable()) {
            throw new Error('Suppression utilisateur Airtable désactivée - Mode Backend API');
        }

        try {
            // Supprimer l'utilisateur dans Airtable via HTTP direct
            const response = await fetch(
                `https://api.airtable.com/v0/${this.baseId}/${this.userTableId}/${userId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.airtableService.getToken()}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Erreur Airtable: ${response.statusText}`);
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'utilisateur:', error);
            throw error;
        }
    }

    private getToken(): string {
        return import.meta.env.VITE_AIRTABLE_TOKEN as string;
    }
}