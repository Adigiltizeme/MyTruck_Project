import { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { FilterOptions, MetricData } from '../types/metrics';
import { AirtableService } from '../services/airtable.service';

export class OptimizedAirtableService extends AirtableService {
  private cache: Map<string, {
    data: MetricData;
    timestamp: number;
  }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(filters: FilterOptions): string {
    return JSON.stringify(filters);
  }

  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    return cached ? Date.now() - cached.timestamp < this.cacheTimeout : false;
  }

  async getMetricsOptimized(filters: FilterOptions): Promise<MetricData> {
    const cacheKey = this.getCacheKey(filters);
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    const data = await super.getMetrics(filters);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }
}

export const useMetricsData = (filters: FilterOptions) => {
  const [data, setData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => 
    new OptimizedAirtableService(import.meta.env.VITE_AIRTABLE_TOKEN), 
    []
  );

  const dateRange = useMemo(() => ({
    start: format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
    end: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss")
  }), []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const metrics = await service.getMetricsOptimized({
          ...filters,
          startDate: dateRange.start,
          endDate: dateRange.end
        });
        setData(metrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [filters, service, dateRange]);

  return { data, loading, error };
};