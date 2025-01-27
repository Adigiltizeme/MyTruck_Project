import { Personnel } from "./airtable.types";
import { CommandeMetier } from "./business.types";

export interface HistoriqueData {
    date: string;
    index?: number;
    totalLivraisons: number;
    performance: number;
    chiffreAffaires: number;
    enCours: number;
    enAttente: number;
    chauffeursActifs?: number;
    store?: string;
    driver?: string;
    rawDate?: number; // Pour le tri si nécessaire
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
    // commandes: BasicCommandeMetier[];
    store?: string[]; // Added magasins property
    chauffeurs: PersonnelInfo[];
}

export interface MetricsCalculatorResult {
    date: string;
    index: number;
    totalLivraisons: number;
    enCours: number;
    enAttente: number;
    chiffreAffaires: number;
    performance: number;
}

// Une version simplifiée de CommandeMetier pour MetricData
export interface BasicCommandeMetier {
    id: string;
    numeroCommande: string;
    dates: {
        commande: Date;
        livraison: Date;
        misAJour: Date;
    };
    statuts: {
        commande: string;
        livraison: string;
    };
    financier: {
        tarifHT: number;
    };
    magasin: MagasinInfo | null;
    chauffeurs: PersonnelInfo[];
}

export interface MagasinInfo {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    photo: string;
}

export interface PersonnelInfo {
    id: string;
    nom: string;
    prenom: string;
    role: string;
    telephone: string;
    email: string;
    status: 'Actif' | 'Inactif';
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
    value: number | string;
    subtitle: string;
    subtitleColor?: string;
    variation?: number;
    chartData: HistoriqueData[];
    // renderChart: (data: HistoriqueData[]) => JSX.Element;
    color?: string;
}

export interface ChartProps {
    data: any[]; // À typer selon le composant spécifique
    height?: number;
}

export interface MetricsSectionProps {
    selectedPeriod: PeriodType;
    data: MetricData | null;
    loading: boolean;
    error: string | null;
    onPeriodChange?: () => void;  // Ajout de la propriété optionnelle
}

export type PeriodType = 'day' | 'week' | 'month' | 'year';

export interface EmptyStateProps {
    period: PeriodType;
    onChangePeriod?: () => void;
}

export interface DeliveriesTableProps {
    commandes?: CommandeMetier[];
    userRole?: UserRole;
}

export type UserRole = 'magasin' | 'chauffeur' | 'admin';

export interface FilterOptions {
    dateRange: PeriodType;
    store?: string;
    driver?: string;
    selctedPeriod?: string;
    startDate?: string;
    endDate?: string;
}

export interface ChartDataPoint {
    date: string;
    totalLivraisons: number;
    enCours: number;
    enAttente: number;
}