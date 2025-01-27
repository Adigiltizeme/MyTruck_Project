import { useMemo } from 'react';
import { MetricData, OptimizedChartData } from '../types/metrics';
import { CommandeMetier } from '../types/business.types';

export const useOptimizedMetrics = (data: MetricData | null) => {
  return useMemo(() => {
    if (!data) return null;

    return {
      ...data,
      performance: calculatePerformance(data.commandes as CommandeMetier[]),
      historique: data.historique.map(h => ({
        ...h,
        performance: Number(h.performance.toFixed(1)),
        chiffreAffaires: Math.round(h.chiffreAffaires)
      }))
    };
  }, [data]);
};

export const useOptimizedCharts = (metrics: MetricData | null): OptimizedChartData | null => {
  return useMemo(() => {
    if (!metrics) return null;

    return {
      evolution: metrics.historique.map(h => ({
        date: h.date,
        livraisons: h.totalLivraisons,
        performance: h.performance,
        chiffreAffaires: h.chiffreAffaires
      })),
      distribution: [{
        enAttente: metrics.statutsDistribution.enAttente,
        enCours: metrics.statutsDistribution.enCours,
        termine: metrics.statutsDistribution.termine,
        echec: metrics.statutsDistribution.echec
      }],
      performance: metrics.historique.map(h => ({
        date: h.date,
        value: h.performance
      }))
    };
  }, [metrics]);
};

const calculatePerformance = (commandes: CommandeMetier[]): number => {
  const total = commandes.length;
  if (total === 0) return 0;
  const completed = commandes.filter(c => c.statuts.livraison === 'LIVREE').length;
  return Math.round((completed / total) * 100);
};