// import {
//     startOfDay,
//     startOfWeek,
//     startOfMonth,
//     startOfYear,
//     addHours,
//     addDays,
//     addMonths,
//     subDays,
//     subMonths,
//     isSameDay,
//     isSameMonth,
//     isSameHour,
//     format
//   } from 'date-fns';
//   import { fr } from 'date-fns/locale';
//   import { CommandeMetier } from '../types/business.types';
//   import { HistoriqueData, StatutsDistribution, FilterOptions } from '../types/metrics';

//   export class MetricsCalculator {
//     private currentFilter: FilterOptions;

//     constructor(filters: FilterOptions) {
//       this.currentFilter = filters;
//     }

//     calculateHistorique(commandes: CommandeMetier[]): HistoriqueData[] {
//       if (!commandes.length) return [];

//       const datePoints = this.generateDatePoints();
//       const commandesMap = this.groupCommandesByDate(commandes);

//       return datePoints.map(date => {
//         const formattedDate = this.formatDateForPeriod(date);
//         const commandesDuPoint = this.getCommandesForDate(commandesMap, date);

//         return {
//           date: formattedDate,
//           totalLivraisons: commandesDuPoint.length,
//           enCours: this.countByStatus(commandesDuPoint, 'EN COURS DE LIVRAISON'),
//           enAttente: this.countByStatus(commandesDuPoint, 'EN ATTENTE'),
//           performance: this.calculatePerformance(commandesDuPoint),
//           chiffreAffaires: this.calculateChiffreAffaires(commandesDuPoint)
//         };
//       });
//     }

//     private generateDatePoints(): Date[] {
//       const now = new Date();
//       this.getDateRange();
//       const points: Date[] = [];

//       switch (this.currentFilter.dateRange) {
//         case 'week':
//           for (let i = 6; i >= 0; i--) points.push(subDays(now, i));
//           break;
//         case 'month':
//           for (let i = 29; i >= 0; i--) points.push(subDays(now, i));
//           break;
//         case 'year':
//           for (let i = 11; i >= 0; i--) points.push(subMonths(now, i));
//           break;
//         default: // day
//           for (let i = 0; i < 8; i++) {
//             points.push(addHours(startOfDay(now), i * 3));
//           }
//       }

//       return points;
//     }

//     private groupCommandesByDate(commandes: CommandeMetier[]): Map<string, CommandeMetier[]> {
//       const map = new Map<string, CommandeMetier[]>();

//       commandes.forEach(cmd => {
//         const dateKey = this.getDateKey(new Date(cmd.dates.livraison));
//         const existing = map.get(dateKey) || [];
//         map.set(dateKey, [...existing, cmd]);
//       });

//       return map;
//     }

//     private getDateKey(date: Date): string {
//       switch (this.currentFilter.dateRange) {
//         case 'week':
//         case 'month':
//           return format(date, 'yyyy-MM-dd');
//         case 'year':
//           return format(date, 'yyyy-MM');
//         default:
//           return format(date, 'yyyy-MM-dd-HH');
//       }
//     }

//     private getCommandesForDate(
//       commandesMap: Map<string, CommandeMetier[]>, 
//       date: Date
//     ): CommandeMetier[] {
//       const dateKey = this.getDateKey(date);
//       return commandesMap.get(dateKey) || [];
//     }

//     private formatDateForPeriod(date: Date): string {
//       switch (this.currentFilter.dateRange) {
//         case 'year':
//           return format(date, 'MMM yyyy', { locale: fr });
//         case 'month':
//         case 'week':
//           return format(date, 'dd MMM', { locale: fr });
//         default:
//           return format(date, 'HH:mm', { locale: fr });
//       }
//     }

//     private countByStatus(commandes: CommandeMetier[], status: string): number {
//       return commandes.filter(c => c.statuts.livraison === status).length;
//     }

//     private calculatePerformance(commandes: CommandeMetier[]): number {
//       if (commandes.length === 0) return 0;
//       const livrees = this.countByStatus(commandes, 'LIVREE');
//       return Math.round((livrees / commandes.length) * 100);
//     }

//     private calculateChiffreAffaires(commandes: CommandeMetier[]): number {
//       return commandes.reduce((acc, c) => acc + (c.financier?.tarifHT || 0), 0);
//     }

//     private getDateRange() {
//       const now = new Date();
//       const endDate = now;
//       let startDate: Date;

//       switch (this.currentFilter.dateRange) {
//         case 'week':
//           startDate = startOfWeek(now, { weekStartsOn: 1 });
//           break;
//         case 'month':
//           startDate = startOfMonth(now);
//           break;
//         case 'year':
//           startDate = startOfYear(now);
//           break;
//         default:
//           startDate = startOfDay(now);
//       }

//       return { startDate, endDate };
//     }

//     calculateStatutsDistribution(commandes: CommandeMetier[]): StatutsDistribution {
//       const total = commandes.length || 1;

//       if (total === 0) {
//         return { enAttente: 0, enCours: 0, termine: 0, echec: 0 };
//       }

//       const statusCounts = {
//         enAttente: this.countByStatus(commandes, 'EN ATTENTE'),
//         enCours: commandes.filter(c => 
//           ['EN COURS DE LIVRAISON', 'CONFIRMEE', 'ENLEVEE'].includes(c.statuts.livraison)
//         ).length,
//         termine: this.countByStatus(commandes, 'LIVREE'),
//         echec: commandes.filter(c => 
//           ['ANNULEE', 'ECHEC'].includes(c.statuts.livraison)
//         ).length
//       };

//       return {
//         enAttente: statusCounts.enAttente / total,
//         enCours: statusCounts.enCours / total,
//         termine: statusCounts.termine / total,
//         echec: statusCounts.echec / total
//       };
//     }
//   }

import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  addHours, addDays, addMonths, format, getDaysInMonth,
  isSameDay, isSameMonth, isSameHour
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CommandeMetier } from '../types/business.types';
import { HistoriqueData } from '../types/metrics';

export class MetricsCalculator {
  constructor(private filters: { dateRange: 'day' | 'week' | 'month' | 'year' }) {}

  private getDateRangeAndFormat() {
    const now = new Date();
    
    switch (this.filters.dateRange) {
      case 'day':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
          format: 'HH:mm',
          interval: 2, // heures
          ticks: 12
        };
      case 'week': {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return {
          start: weekStart,
          end: endOfWeek(now, { locale: fr }),
          format: 'EEE',
          interval: 1, // jours
          ticks: 7,
          formatDisplay: (date: Date) => format(date, 'EEE dd/MM', { locale: fr })
        };
      }
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          format: 'dd MMM',
          interval: 1, // jours
          ticks: getDaysInMonth(now)
        };
      case 'year': {
        const yearStart = startOfYear(now);
        return {
          start: yearStart,
          end: endOfYear(now),
          format: 'MMM',
          interval: 1, // mois
          ticks: 12,
          formatDisplay: (date: Date) => format(date, 'MMM yyyy', { locale: fr })
        };
      }
    }
  }

  public generatePoints() {
    const { start, end, format: dateFormat, interval, ticks, formatDisplay } = this.getDateRangeAndFormat();
    const points = [];

    // Créer des points régulièrement espacés
    for (let i = 0; i < ticks; i++) {
      let date;
      switch (this.filters.dateRange) {
        case 'day':
          date = addHours(start, i * interval);
          break;
        case 'week':
          date = addDays(start, i);
          break;
        case 'month':
          date = addDays(start, i);
          break;
        case 'year':
          date = addMonths(start, i);
          break;
      }

      if (date <= end) {
        points.push({
          date: formatDisplay ? formatDisplay(date) : format(date, dateFormat, { locale: fr }),
          actualDate: date,
          index: i, // pour l'ordre
          rawDate: date.getTime() // pour le tri
        });
      }
    }

    // Trier les points par date
    return points.sort((a, b) => a.rawDate - b.rawDate);
  }

  private getCommandesForPoint(commandes: any[], point: { actualDate: Date }) {
    return commandes.filter(cmd => {
      if (!cmd.dates?.livraison) {
        return false;
      }

      const cmdDate = new Date(cmd.dates.livraison);
      const pointDate = point.actualDate;

      switch (this.filters.dateRange) {
        case 'day':
          return isSameHour(cmdDate, pointDate);
        case 'week':
        case 'month':
          return isSameDay(cmdDate, pointDate);
        case 'year':
          return isSameMonth(cmdDate, pointDate);
        default:
          return false;
      }
    });
  }

  public calculateHistorique(commandes: CommandeMetier[]): HistoriqueData[] {
    const points = this.generatePoints();
    
    return points.map(point => {
        const commandesPoint = this.getCommandesForPoint(commandes, point);
        
        const result: HistoriqueData = {
            date: point.date,
            index: point.index,
            totalLivraisons: commandesPoint.length,
            enCours: commandesPoint.filter(c => c.statuts.livraison === 'EN COURS DE LIVRAISON').length,
            enAttente: commandesPoint.filter(c => c.statuts.livraison === 'EN ATTENTE').length,
            chiffreAffaires: commandesPoint.reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0),
            performance: this.calculatePerformance(commandesPoint),
            rawDate: point.rawDate
        };

        return result;
    });
}

private calculatePerformance(commandes: CommandeMetier[]): number {
    if (!commandes.length) return 0;
    const completed = commandes.filter(c => c.statuts.livraison === 'LIVREE').length;
    return Math.round((completed / commandes.length) * 100);
}

  public calculateStatutsDistribution(commandes: any[]) {
    if (!commandes?.length) {
      return {
        enAttente: 0,
        enCours: 0,
        termine: 0,
        echec: 0
      };
    }

    const total = commandes.length;

    return {
      enAttente: Math.round((commandes.filter(c => c.statuts.livraison === 'EN ATTENTE').length / total) * 100),
      enCours: Math.round((commandes.filter(c => c.statuts.livraison === 'EN COURS DE LIVRAISON').length / total) * 100),
      termine: Math.round((commandes.filter(c => c.statuts.livraison === 'LIVREE').length / total) * 100),
      echec: Math.round((commandes.filter(c => ['ANNULEE', 'ECHEC'].includes(c.statuts.livraison)).length / total) * 100)
    };
  }
}