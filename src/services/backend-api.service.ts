import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';
import { StatutCommande, StatutLivraison } from '../types/commande.types';
import { apiService } from './api.service';

export class BackendApiService {
    constructor() {
        console.log('🔧 Initialisation Backend API Service');
    }

    // ✅ GARDER LA MÊME INTERFACE que AirtableService
    async getCommandes(filters: any = {}): Promise<CommandeMetier[]> {
        return apiService.getCommandes(filters).then(response => {
            if (Array.isArray(response)) {
                return response;
            }
            return response.data as CommandeMetier[] || [];
        });
    }

    async getCommande(id: string): Promise<CommandeMetier> {
        return apiService.getCommande(id);
    }

    async createCommande(commandeData: any): Promise<CommandeMetier> {
        return apiService.createCommande(commandeData);
    }

    async updateCommande(id: string, updates: any): Promise<CommandeMetier> {
        return apiService.updateCommande(id, updates);
    }

    async deleteCommande(id: string): Promise<void> {
        return apiService.deleteCommande(id);
    }

    // ✅ PERSONNEL
    async getPersonnel(): Promise<PersonnelInfo[]> {
        return apiService.getPersonnel();
    }

    async getChauffeur(id: string): Promise<PersonnelInfo> {
        return apiService.getChauffeur(id);
    }

    async getChauffeursDisponibles(dateLivraison: string): Promise<PersonnelInfo[]> {
        return apiService.getChauffeursDisponibles(dateLivraison);
    }

    // ✅ MAGASINS
    async getMagasins(): Promise<MagasinInfo[]> {
        return apiService.getMagasins();
    }

    async getMagasin(id: string): Promise<MagasinInfo> {
        return apiService.getMagasin(id);
    }

    // ✅ MÉTHODES UTILITAIRES pour compatibilité
    async getFieldValues(field: string): Promise<string[]> {
        console.log(`📋 Récupération valeurs pour champ: ${field}`);

        // ✅ Retourner les valeurs statiques ou dynamiques selon le champ
        switch (field) {
            case 'CRENEAU DE LIVRAISON':
                return [
                    "07h-09h", "08h-10h", "09h-11h", "10h-12h",
                    "11h-13h", "12h-14h", "13h-15h", "14h-16h",
                    "15h-17h", "16h-18h", "17h-19h", "18h-20h"
                ];
            case 'CATEGORIE DE VEHICULE':
                return ["1M3", "6M3", "10M3", "20M3"];
            default:
                return [];
        }
    }

    // ✅ COMPATIBILITÉ avec l'authentification
    async authenticate(): Promise<boolean> {
        // Utiliser AuthContext/AuthService pour l'auth Backend
        return true;
    }
}