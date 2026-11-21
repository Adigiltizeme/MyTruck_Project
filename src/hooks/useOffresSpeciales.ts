import { useEffect, useState } from 'react';
import { offresSpecialesService, OffreSpeciale } from '../services/offres-speciales.service';

/**
 * Offres spéciales proposables aujourd'hui (aucune pour une cession), plus l'offre déjà portée
 * par la commande modifiée si elle n'est plus proposée (désactivée ou hors période).
 */
export function useOffresSpeciales(enabled = true, offreIdCourante?: string | null): OffreSpeciale[] {
    const [offres, setOffres] = useState<OffreSpeciale[]>([]);

    useEffect(() => {
        if (!enabled) {
            setOffres([]);
            return;
        }
        let cancelled = false;
        (async () => {
            const actives = await offresSpecialesService.getActives();
            let liste = actives;
            if (offreIdCourante && !actives.some(o => o.id === offreIdCourante)) {
                const courante = await offresSpecialesService.getById(offreIdCourante).catch(() => null);
                if (courante) liste = [...actives, courante];
            }
            if (!cancelled) setOffres(liste);
        })();
        return () => { cancelled = true; };
    }, [enabled, offreIdCourante]);

    return offres;
}
