// import api from './api';
// import { 
//   DeliveryMetrics, 
//   Delivery, 
//   DriverStats, 
//   DeliveryData 
// } from '../types/dashboard';

// export const DashboardService = {
//   getMetrics: async (): Promise<DeliveryMetrics> => {
//     const response = await api.get('/dashboard/metrics');
//     return response.data;
//   },

//   getDeliveries: async (): Promise<Delivery[]> => {
//     const response = await api.get('/dashboard/deliveries');
//     return response.data;
//   },

//   getDriverStats: async (): Promise<DriverStats[]> => {
//     const response = await api.get('/dashboard/driver-stats');
//     return response.data;
//   },

//   getDeliveryData: async (): Promise<DeliveryData[]> => {
//     const response = await api.get('/dashboard/delivery-data');
//     return response.data;
//   },
// };
import { CommandeMetier } from '../types/business.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DeliveryMetrics, Delivery, DriverStats, DeliveryData } from '../types/dashboard';
import { HistoriqueData, MetricData } from '../types/metrics';
import { ApiService } from './api.service';
// Données mockées
const mockMetrics: DeliveryMetrics = {
    total: 45,
    enCours: 12,
    performance: 92,
    chiffreAffaires: 15780,
    satisfactionClient: 4.8
};

const mockDeliveries: Delivery[] = [
    {
        id: "DEL-001",
        store: "Truffaut Rosny",
        driver: "Jean D.",
        status: "En cours",
        startTime: "09:30",
        eta: "10:15",
        items: 3,
        priority: "Urgent"
    },
    {
        id: "DEL-002",
        store: "Truffaut Ivry",
        driver: "Sophie M.",
        status: "En attente",
        startTime: "10:00",
        eta: "10:45",
        items: 2,
        priority: "Normal"
    },
    {
        id: "DEL-003",
        store: "Truffaut Bry",
        driver: "Marc L.",
        status: "Terminée",
        startTime: "08:30",
        eta: "09:15",
        items: 4,
        priority: "Normal"
    }
];

const mockDeliveryData: DeliveryData[] = [
    { date: '8:00', completed: 4, inProgress: 2, pending: 3, satisfaction: 4.8 },
    { date: '10:00', completed: 6, inProgress: 3, pending: 2, satisfaction: 4.6 },
    { date: '12:00', completed: 8, inProgress: 4, pending: 4, satisfaction: 4.9 },
    { date: '14:00', completed: 5, inProgress: 6, pending: 2, satisfaction: 4.7 },
    { date: '16:00', completed: 7, inProgress: 3, pending: 5, satisfaction: 4.8 }
];

// Service avec gestion de l'environnement
const isDevEnvironment = true; // À changer selon l'environnement

export class DashboardService {
    private apiService: ApiService;

    constructor() {
        this.apiService = new ApiService();
    }

    private calculateHistorique(commandes: CommandeMetier[]): HistoriqueData[] {
        // Grouper les commandes par date
        const groupedByDate = commandes.reduce((acc, commande) => {
            const date = format(commande.dates.livraison, 'EEE', { locale: fr });
            if (!acc[date]) {
                acc[date] = {
                    totalLivraisons: 0,
                    enCours: 0,
                    enAttente: 0,
                    performance: 0,
                    chiffreAffaires: 0
                };
            }

            acc[date].totalLivraisons += 1;
            acc[date].chiffreAffaires += commande.financier.tarifHT;
            acc[date].enCours += commande.statuts.livraison === 'EN COURS DE LIVRAISON' ? 1 : 0;
            acc[date].enAttente += commande.statuts.livraison === 'EN ATTENTE' ? 1 : 0;

            return acc;
        }, {} as Record<string, Omit<HistoriqueData, 'date'>>);

        // Convertir en tableau et calculer la performance
        return Object.entries(groupedByDate).map(([date, data]) => ({
            date,
            ...data,
            performance: this.calculatePerformance([...commandes].filter(c =>
                format(c.dates.livraison, 'EEE', { locale: fr }) === date
            ))
        }));
    }

    private calculatePerformance(commandes: CommandeMetier[]): number {
        if (commandes.length === 0) return 0;

        const livrees = commandes.filter(c => c.statuts.livraison === 'LIVREE').length;
        return Math.round((livrees / commandes.length) * 100);
    }

    private getChauffeursActifs(commandes: CommandeMetier[]): string[] {
        // Obtenir une liste unique des chauffeurs des commandes en cours
        return [...new Set(
            commandes
                .filter(c => ['EN COURS DE LIVRAISON', 'CONFIRMEE', 'ENLEVEE']
                    .includes(c.statuts.livraison))
                .flatMap(c => c.chauffeurs.map(chauffeur => chauffeur.nom)) // Assuming 'nom' is the string representation
        )];
    }

    private calculateStatutsDistribution(commandes: CommandeMetier[]): {
        enAttente: number;
        enCours: number;
        termine: number;
        echec: number;
    } {
        const total = commandes.length;
        if (total === 0) return { enAttente: 0, enCours: 0, termine: 0, echec: 0 };

        return {
            enAttente: commandes.filter(c => c.statuts.livraison === 'EN ATTENTE').length / total,
            enCours: commandes.filter(c => ['EN COURS DE LIVRAISON', 'CONFIRMEE', 'ENLEVEE']
                .includes(c.statuts.livraison)).length / total,
            termine: commandes.filter(c => c.statuts.livraison === 'LIVREE').length / total,
            echec: commandes.filter(c => ['ANNULEE', 'ECHEC']
                .includes(c.statuts.livraison)).length / total
        };
    }

    async getMetrics(): Promise<MetricData> {
        try {
            const commandes = await this.apiService.getCommandes();

            // Calcul des métriques
            interface Totals {
                totalLivraisons: number;
                enCours: number;
                enAttente: number;
                chiffreAffaires: number;
            }

            const totals: Totals = commandes.data.reduce((acc: Totals, commande: CommandeMetier) => ({
                totalLivraisons: acc.totalLivraisons + 1,
                enCours: acc.enCours + (commande.statuts.livraison === 'EN COURS DE LIVRAISON' ? 1 : 0),
                enAttente: acc.enAttente + (commande.statuts.livraison === 'EN ATTENTE' ? 1 : 0),
                chiffreAffaires: acc.chiffreAffaires + commande.financier.tarifHT
            }), {
                totalLivraisons: 0,
                enCours: 0,
                enAttente: 0,
                chiffreAffaires: 0
            });

            // Calcul de l'historique
            const historique = this.calculateHistorique(commandes.data);

            return {
                ...totals,
                performance: this.calculatePerformance(commandes.data),
                chauffeursActifs: this.getChauffeursActifs(commandes.data).length,
                historique,
                statutsDistribution: this.calculateStatutsDistribution(commandes.data),
                commandes: commandes.data,
                chauffeurs: this.getChauffeursActifs(commandes.data).map(chauffeur => ({
                    id: '', // Provide appropriate id
                    nom: chauffeur, // Assuming chauffeur is the name
                    prenom: '', // Provide appropriate prenom
                    role: 'Chauffeur', // Set to a valid role
                    telephone: '', // Provide appropriate telephone
                    email: '', // Provide appropriate email
                    status: 'Actif', // Assuming the default status is 'Actif'
                    location: { latitude: 0, longitude: 0 } // Provide appropriate location
                })),
                totalCommandes: commandes.data.length,
                magasins: Array.from(new Set(commandes.data.map((c: CommandeMetier) => c.magasin))) // assuming 'magasin' is a property
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des métriques:', error);
            throw error;
        }
    }
}