import { apiService } from './api.service';

/** Palier de prix : hauteur maximale exclue (cm), null = sans limite */
export interface PalierOffre {
    hauteurMaxCm?: number | null;
    tarifHT: number;
}

export interface OffreSpeciale {
    id: string;
    code: string;
    nom: string;
    description?: string | null;
    actif: boolean;
    dateDebut: string;
    dateFin: string;
    paliers: PalierOffre[];
    articlesMax: number;
    /** Hauteur maximale de l'article (cm, incluse) ; null = sans limite */
    hauteurMaxArticleCm?: number | null;
    /** Nom d'article proposé par défaut (modifiable) */
    nomArticle?: string | null;
    rayonMaxKm: number;
    heuresRetrait: string[];
    creneauxLivraison: string[];
}

export type OffreSpecialeInput = Omit<OffreSpeciale, 'id'>;

class OffresSpecialesService {
    private activesCache: Promise<OffreSpeciale[]> | null = null;

    /** Offres proposables aujourd'hui (mises en cache le temps de la session de saisie) */
    getActives(refresh = false): Promise<OffreSpeciale[]> {
        if (!this.activesCache || refresh) {
            this.activesCache = apiService.get<OffreSpeciale[]>('/offres-speciales/actives').catch((error) => {
                this.activesCache = null;
                console.warn('⚠️ Offres spéciales indisponibles:', error);
                return [];
            });
        }
        return this.activesCache;
    }

    /** Offre portée par une commande existante, même désactivée ou hors période */
    getById(id: string): Promise<OffreSpeciale> {
        return apiService.get<OffreSpeciale>(`/offres-speciales/${id}`);
    }

    getAll(): Promise<OffreSpeciale[]> {
        return apiService.get<OffreSpeciale[]>('/offres-speciales');
    }

    async create(dto: OffreSpecialeInput): Promise<OffreSpeciale> {
        const created = await apiService.post<OffreSpeciale>('/offres-speciales', dto);
        this.activesCache = null;
        return created;
    }

    async update(id: string, dto: Partial<OffreSpecialeInput>): Promise<OffreSpeciale> {
        const updated = await apiService.patch<OffreSpeciale>(`/offres-speciales/${id}`, dto);
        this.activesCache = null;
        return updated;
    }

    async remove(id: string): Promise<void> {
        await apiService.delete(`/offres-speciales/${id}`);
        this.activesCache = null;
    }
}

export const offresSpecialesService = new OffresSpecialesService();

// ─── Règles partagées (le serveur refait les mêmes contrôles et fixe le tarif) ───

/** Palier applicable : premier dont la hauteur maximale (exclue) dépasse la hauteur. */
export function palierPour(offre: OffreSpeciale, hauteurCm?: number | null): PalierOffre | undefined {
    if (!hauteurCm || hauteurCm <= 0) return undefined;
    return [...offre.paliers]
        .sort((a, b) => (a.hauteurMaxCm ?? Infinity) - (b.hauteurMaxCm ?? Infinity))
        .find(p => p.hauteurMaxCm == null || hauteurCm < p.hauteurMaxCm);
}

/** Libellés des paliers, ex. « moins de 175 cm : 15 € HT » / « 175 cm et plus : 30 € HT » */
export function libellesPaliers(offre: OffreSpeciale): string[] {
    const tries = [...offre.paliers].sort((a, b) => (a.hauteurMaxCm ?? Infinity) - (b.hauteurMaxCm ?? Infinity));
    return tries.map((p, i) => {
        const min = i > 0 ? tries[i - 1].hauteurMaxCm : null;
        const max = offre.hauteurMaxArticleCm;
        const tranche = p.hauteurMaxCm == null
            ? (min
                ? (max ? `de ${min} à ${max} cm` : `${min} cm et plus`)
                : (max ? `jusqu'à ${max} cm` : 'toute hauteur'))
            : (min ? `de ${min} à moins de ${p.hauteurMaxCm} cm` : `moins de ${p.hauteurMaxCm} cm`);
        return `${tranche} : ${p.tarifHT} € HT`;
    });
}

/** Raison pour laquelle les articles ne respectent pas l'offre, ou null s'ils la respectent. */
export function raisonArticlesHorsOffre(
    offre: OffreSpeciale,
    dimensions: Array<{ quantite?: number; hauteur?: number }> = [],
    autresArticles = 0,
): string | null {
    const quantite = dimensions.reduce((sum, d) => sum + (Number(d.quantite) || 0), 0);
    if (autresArticles > 0 || dimensions.length > offre.articlesMax || quantite > offre.articlesMax) {
        return offre.articlesMax === 1
            ? 'un seul article par livraison, sans aucun autre article'
            : `${offre.articlesMax} articles maximum, sans aucun autre article`;
    }
    const hauteur = Number(dimensions[0]?.hauteur) || 0;
    if (offre.hauteurMaxArticleCm != null && hauteur > offre.hauteurMaxArticleCm) {
        return `hauteur de ${hauteur} cm, au-delà de ${offre.hauteurMaxArticleCm} cm`;
    }
    return null;
}

/** La date (AAAA-MM-JJ ou ISO) est-elle dans la période de l'offre ? */
export function dateDansPeriode(offre: OffreSpeciale, date?: string | null): boolean {
    if (!date) return true;
    const jour = (d: string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    const j = date.length === 10 ? date : jour(date);
    return j >= jour(offre.dateDebut) && j <= jour(offre.dateFin);
}
