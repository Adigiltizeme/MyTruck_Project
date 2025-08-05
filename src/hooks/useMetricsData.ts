// import { useState, useEffect, useMemo } from 'react';
// import { format, startOfDay, endOfDay } from 'date-fns';
// import { FilterOptions, MetricData } from '../types/metrics';
// import { AirtableService } from '../services/airtable.service';

// export class OptimizedAirtableService extends AirtableService {
//   private cache: Map<string, {
//     data: MetricData;
//     timestamp: number;
//   }> = new Map();
//   private cacheTimeout = 5 * 60 * 1000; // 5 minutes

//   private getCacheKey(filters: FilterOptions): string {
//     return JSON.stringify(filters);
//   }

//   private isCacheValid(cacheKey: string): boolean {
//     const cached = this.cache.get(cacheKey);
//     return cached ? Date.now() - cached.timestamp < this.cacheTimeout : false;
//   }

//   async getMetricsOptimized(filters: FilterOptions): Promise<MetricData> {
//     const cacheKey = this.getCacheKey(filters);

//     if (this.isCacheValid(cacheKey)) {
//       return this.cache.get(cacheKey)!.data;
//     }

//     const data = await super.getMetrics(filters);
//     this.cache.set(cacheKey, {
//       data,
//       timestamp: Date.now()
//     });

//     return data;
//   }
// }

// export const useMetricsData = (filters: FilterOptions) => {
//   const [data, setData] = useState<MetricData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const service = useMemo(() => 
//     new OptimizedAirtableService(import.meta.env.VITE_AIRTABLE_TOKEN), 
//     []
//   );

//   const dateRange = useMemo(() => ({
//     start: format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
//     end: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss")
//   }), []);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const metrics = await service.getMetricsOptimized({
//           ...filters,
//           startDate: dateRange.start,
//           endDate: dateRange.end
//         });
//         setData(metrics);
//       } catch (err) {
//         setError(err instanceof Error ? err.message : 'Une erreur est survenue');
//       } finally {
//         setLoading(false);
//       }
//     };

//     const debounce = setTimeout(fetchData, 300);
//     return () => clearTimeout(debounce);
//   }, [filters, service, dateRange]);

//   return { data, loading, error };
// };
import { useState, useEffect } from 'react';
import { FilterOptions, MetricData } from '../types/metrics';
import { AirtableService } from '../services/airtable.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useOffline } from '../contexts/OfflineContext';
import { ApiService } from '../services/api.service';

interface UseMetricsDataResult {
  data: MetricData | null;
  loading: boolean;
  error: string | null;
}

export const useMetricsData = (filters: FilterOptions): UseMetricsDataResult => {
  const [data, setData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiService = new ApiService();
        // const { dataService, isOnline } = useOffline();

        // Attendre l'initialisation
        apiService.initialize();

        const metrics = await apiService.getMetrics(filters);
        console.log('Metrics fetched:', {
          totalLivraisons: metrics.totalLivraisons,
          historique: metrics.historique.map(h => ({
            date: h.date,
            total: h.totalLivraisons,
            enCours: h.enCours,
            enAttente: h.enAttente
          }))
        });

        // S'assurer que l'historique est trié chronologiquement
        if (metrics.historique) {
          metrics.historique = metrics.historique.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
          });
        }

        setData(metrics);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return { data, loading, error };
};