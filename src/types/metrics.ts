import { CommandeMetier } from "./business.types";

export interface HistoriqueData {
    date: string;
    totalLivraisons: number;
    performance: number;
    chiffreAffaires: number;
    enCours: number;
    enAttente: number;
    chauffeursActifs?: number;
    store?: string;
    driver?: string;
}

export interface MetricVariation {
    livraisons: number;
    performance: number;
    chiffreAffaires: number;
    enCours: number;
}

export interface StatutsDistribution {
    enAttente: number;
    enCours: number;
    termine: number;
    echec: number;
}

export interface MetricData {
    totalLivraisons: number;
    enCours: number;
    enAttente: number;
    performance: number;
    chiffreAffaires: number;
    chauffeursActifs: number;
    historique: HistoriqueData[];
    variation?: MetricVariation;
    statutsDistribution: StatutsDistribution;
    commandes: CommandeMetier[];
}

export interface OptimizedMetrics {
    totalLivraisons: number;
    enCours: number;
    enAttente: number;
    performance: number;
    chiffreAffaires: number;
    chauffeursActifs: number;
    variation?: {
        livraisons: number;
        enCours: number;
        performance: number;
        chiffreAffaires: number;
    };
}

export interface OptimizedChartData {
    evolution: Array<{
        date: string;
        livraisons: number;
        performance: number;
        chiffreAffaires: number;
    }>;
    distribution: Array<{
        enAttente: number;
        enCours: number;
        termine: number;
        echec: number;
    }>;
    performance: Array<{
        date: string;
        value: number;
    }>;
}

export interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    subtitleColor?: string;
    variation: number;
    chartData: HistoriqueData[];
    renderChart: (data: HistoriqueData[]) => JSX.Element;
}

export interface ChartProps {
    data: any[]; // À typer selon le composant spécifique
    height?: number;
}

export interface MetricsSectionProps {
    selectedPeriod: string;
    data: MetricData | null;
    loading: boolean;
    error: string | null;
}

export interface FilterOptions {
    dateRange: 'day' | 'week' | 'month' | 'year';
    store?: string;
    driver?: string;
    selctedPeriod?: string;
    startDate?: string;
    endDate?: string;
}