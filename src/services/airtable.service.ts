import {
    format,
    startOfDay,
    startOfWeek,
    startOfMonth,
    startOfYear,
    addHours,
    addDays,
    addMonths,
    isSameHour,
    isSameDay,
    isSameMonth,
    subDays,
    subMonths
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { FilterOptions, HistoriqueData, MetricData } from '../types/metrics';
import { CommandeMetier, transformCommande } from '../types/business.types';
import { AirtableDelivery } from '../types/airtable.types';

export class AirtableService {
    private token: string;
    private currentFilter?: FilterOptions;
    private initialized: boolean = false;

    constructor(token: string) {
        this.token = token;
        if (!this.initialized) {
            console.log('Service Airtable initialisé');
            this.initialized = true;
        }
    }

    async getCommandes() {
        try {
            const baseId = 'apprk0i4Hqqq3Cmg6';
            const tableId = 'tbl75HakJKQ2KWyGF';
            const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

            console.log('Test connexion avec URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Détails de l\'erreur:', errorData);
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // Log pour débugger la structure des données
            console.log('Données reçues:', data);

            // Transformation des données avant reduce
            return data.records.map((record: AirtableDelivery) => transformCommande(record));

        } catch (error) {
            console.error('Erreur de récupération:', error);
            throw error;
        }
    }

    async getMetrics(filters?: FilterOptions): Promise<MetricData> {
        this.currentFilter = filters;  // Sauvegarder les filtres
        try {
            const commandes = await this.getCommandes();
            console.log('Commandes reçues:', commandes);

            // Filtrer les commandes si un magasin est sélectionné
            const filteredCommandes = filters?.store
                ? commandes.filter((cmd: CommandeMetier) =>
                    cmd.store?.name?.toLocaleLowerCase() === filters.store?.toLocaleLowerCase()
                )
                : commandes;
            console.log('Commandes après filtrage:', filteredCommandes);

            // Vérifier qu'on a des commandes après filtrage
            if (!filteredCommandes.length) {
                const emptyMetrics = {
                    totalLivraisons: 0,
                    enCours: 0,
                    enAttente: 0,
                    performance: 0,
                    chiffreAffaires: 0,
                    chauffeursActifs: 0,
                    historique: [],
                    statutsDistribution: {
                        enAttente: 0,
                        enCours: 0,
                        termine: 0,
                        echec: 0
                    },
                    commandes: []
                };
                console.log('Retour de métriques vides:', emptyMetrics);
                return emptyMetrics;
            }

            // Calculer les totaux avec les types corrects
            const totals = filteredCommandes.reduce((acc: {
                totalLivraisons: number;
                enCours: number;
                enAttente: number;
                chiffreAffaires: number;
            }, commande: CommandeMetier) => ({
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
            const historique = this.calculateHistorique(filteredCommandes);
            const statutsDistribution = this.calculateStatutsDistribution(filteredCommandes);

            const result = {
                ...totals,
                performance: this.calculatePerformance(filteredCommandes),
                chauffeursActifs: this.getChauffeursActifs(filteredCommandes).length,
                historique,
                statutsDistribution,
                enCours: statutsDistribution.enCours,
                enAttente: statutsDistribution.enAttente,
                chiffreAffaires: totals.chiffreAffaires,
                totalLivraisons: totals.totalLivraisons,
                commandes: filteredCommandes
            };
            console.log('Métriques calculées:', result);
            return result;

        } catch (error) {
            console.error('Erreur détaillée lors de la récupération des métriques:', error);
            throw error;
        }
    }

    private calculateTotals(commandes: CommandeMetier[]): { totalLivraisons: number; chiffreAffaires: number } {
        const totalLivraisons = commandes.length;
        const chiffreAffaires = commandes.reduce((acc, commande) => acc + commande.financier.tarifHT, 0);
        return { totalLivraisons, chiffreAffaires };
    }

    private calculateHistorique(commandes: CommandeMetier[]): HistoriqueData[] {
        if (!commandes.length) return [];

        // Générer les points selon la période
        const now = new Date();
        let points: Date[] = [];

        switch (this.currentFilter?.dateRange) {
            case 'week':
                // 7 derniers jours
                for (let i = 6; i >= 0; i--) {
                    points.push(subDays(now, i));
                }
                break;
            case 'month':
                // 30 derniers jours
                for (let i = 29; i >= 0; i--) {
                    points.push(subDays(now, i));
                }
                break;
            case 'year':
                // 12 derniers mois
                for (let i = 11; i >= 0; i--) {
                    points.push(subMonths(now, i));
                }
                break;
            default:
                // Aujourd'hui par tranches de 3 heures
                for (let i = 0; i < 8; i++) {
                    points.push(addHours(startOfDay(now), i * 3));
                }
        }

        return points.map(date => {
            // Filtrer les commandes pour ce point selon la période
            const commandesDuPoint = commandes.filter(cmd => {
                const cmdDate = new Date(cmd.dates.livraison);
                switch (this.currentFilter?.dateRange) {
                    case 'week':
                    case 'month':
                        return isSameDay(cmdDate, date);
                    case 'year':
                        return isSameMonth(cmdDate, date);
                    default:
                        return isSameHour(cmdDate, date);
                }
            });

            // Formater la date selon la période
            const formattedDate = this.currentFilter?.dateRange === 'year'
                ? format(date, 'MMM yyyy', { locale: fr })
                : this.currentFilter?.dateRange === 'month' || this.currentFilter?.dateRange === 'week'
                    ? format(date, 'dd MMM', { locale: fr })
                    : format(date, 'HH:mm', { locale: fr });

            return {
                date: formattedDate,
                totalLivraisons: commandesDuPoint.length,
                enCours: commandesDuPoint.filter(c => c.statuts.livraison === 'EN COURS DE LIVRAISON').length,
                enAttente: commandesDuPoint.filter(c => c.statuts.livraison === 'EN ATTENTE').length,
                performance: this.calculatePerformance(commandesDuPoint),
                chiffreAffaires: commandesDuPoint.reduce((acc, c) => acc + c.financier.tarifHT, 0)
            };
        });
    }

    private getDateRangeForFilter(dateRange: 'day' | 'week' | 'month' | 'year'): { startDate: Date, endDate: Date } {
        const now = new Date();
        const endDate = now;
        let startDate: Date;

        switch (dateRange) {
            case 'day':
                startDate = startOfDay(now);
                break;
            case 'week':
                startDate = startOfWeek(now, { weekStartsOn: 1 }); // Semaine commence le lundi
                break;
            case 'month':
                startDate = startOfMonth(now);
                break;
            case 'year':
                startDate = startOfYear(now);
                break;
            default:
                startDate = startOfDay(now);
        }

        return { startDate, endDate };
    }

    private generateDataPoints(startDate: Date, endDate: Date, period: 'day' | 'week' | 'month' | 'year'): Date[] {
        const points: Date[] = [];
        let currentDate = startDate;

        while (currentDate <= endDate) {
            points.push(new Date(currentDate));

            switch (period) {
                case 'day':
                    currentDate = addHours(currentDate, 3); // Points toutes les 3 heures
                    break;
                case 'week':
                    currentDate = addDays(currentDate, 1); // Points journaliers
                    break;
                case 'month':
                    currentDate = addDays(currentDate, 2); // Points tous les 2 jours
                    break;
                case 'year':
                    currentDate = addMonths(currentDate, 1); // Points mensuels
                    break;
            }
        }

        return points;
    }

    private isInSamePeriod(date1: Date, date2: Date, period: 'day' | 'week' | 'month' | 'year'): boolean {
        switch (period) {
            case 'day':
                return isSameHour(date1, date2);
            case 'week':
                return isSameDay(date1, date2);
            case 'month':
                return isSameDay(date1, date2);
            case 'year':
                return isSameMonth(date1, date2);
            default:
                return false;
        }
    }

    private formatDateForPeriod(date: Date, period: 'day' | 'week' | 'month' | 'year'): string {
        switch (period) {
            case 'day':
                return format(date, 'HH:mm');
            case 'week':
                return format(date, 'EEE', { locale: fr });
            case 'month':
                return format(date, 'd MMM', { locale: fr });
            case 'year':
                return format(date, 'MMM', { locale: fr });
            default:
                return format(date, 'P', { locale: fr });
        }
    }

    private calculatePerformance(commandes: CommandeMetier[]): number {
        if (commandes.length === 0) return 0;
        const livrees = commandes.filter(c => c.statuts.livraison === 'LIVREE').length;
        return Math.round((livrees / commandes.length) * 100);
    }

    private getChauffeursActifs(commandes: CommandeMetier[]): string[] {
        return [...new Set(
            commandes
                .filter(c => ['EN COURS DE LIVRAISON', 'CONFIRMEE', 'ENLEVEE']
                    .includes(c.statuts.livraison))
                .flatMap(c => c.livraison.chauffeurs.map(chauffeur => chauffeur.nom))
        )];
    }

    private calculateStatutsDistribution(commandes: CommandeMetier[]): {
        enAttente: number;
        enCours: number;
        termine: number;
        echec: number;
    } {
        const total = commandes.length || 1;
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
}