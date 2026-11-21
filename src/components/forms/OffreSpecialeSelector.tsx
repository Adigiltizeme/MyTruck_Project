import React, { useEffect, useState } from 'react';
import { AlertTriangle, Gift } from 'lucide-react';
import {
    OffreSpeciale, libellesPaliers, palierPour, raisonArticlesHorsOffre,
} from '../../services/offres-speciales.service';

interface OffreFormData {
    livraison?: { offreSpecialeId?: string | null; offreSpecialeNom?: string | null };
    articles?: { dimensions?: Array<{ quantite?: number; hauteur?: number }>; autresArticles?: number };
}

interface OffreSpecialeSelectorProps {
    offres: OffreSpeciale[];
    data: OffreFormData;
    onChange: (e: { target: { name: string; value: unknown } }) => void;
}

const formatJour = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });

/**
 * Choix d'une offre spéciale (ex. sapin de Noël) à l'étape Articles.
 * Si les articles ne respectent plus l'offre, elle est retirée : la tarification classique s'applique.
 */
const OffreSpecialeSelector: React.FC<OffreSpecialeSelectorProps> = ({ offres, data, onChange }) => {
    const [notice, setNotice] = useState<string | null>(null);
    const selectedId: string | null = data.livraison?.offreSpecialeId || null;
    const selected = offres.find(o => o.id === selectedId);
    const dimensions = data.articles?.dimensions || [];
    const autres = data.articles?.autresArticles || 0;

    const setOffre = (offre: OffreSpeciale | null) => {
        onChange({ target: { name: 'livraison.offreSpecialeId', value: offre?.id ?? null } });
        onChange({ target: { name: 'livraison.offreSpecialeNom', value: offre?.nom ?? null } });
        if (!offre) onChange({ target: { name: 'livraison.heureRetrait', value: null } });
    };

    // Un article de plus (quantité, 2e article, « autres articles ») ou une hauteur hors limite annule l'offre
    useEffect(() => {
        if (!selected) return;
        const raison = raisonArticlesHorsOffre(selected, dimensions, autres);
        if (raison) {
            setOffre(null);
            setNotice(`${selected.nom} annulée (${raison}) : la tarification classique s'applique.`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id, JSON.stringify(dimensions.map(d => [d.quantite, d.hauteur])), dimensions.length, autres]);

    const toggle = (offre: OffreSpeciale) => {
        if (selectedId === offre.id) {
            setOffre(null);
            return;
        }
        const raison = raisonArticlesHorsOffre(offre, dimensions, autres);
        if (raison) {
            setNotice(`${offre.nom} impossible : ${raison}.`);
            return;
        }
        setNotice(null);
        setOffre(offre);
    };

    // Commande modifiée avec une offre qui n'est plus proposée : on l'indique sans pouvoir la rechoisir
    if (offres.length === 0) {
        return selectedId && data.livraison?.offreSpecialeNom ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
                <Gift className="w-4 h-4 inline mr-1" />
                {data.livraison.offreSpecialeNom} appliquée à cette commande.
            </div>
        ) : null;
    }

    const hauteur = Number(dimensions[0]?.hauteur) || 0;

    return (
        <div className="space-y-3 mb-4">
            {offres.map((offre) => {
                const actif = selectedId === offre.id;
                const palier = actif ? palierPour(offre, hauteur) : undefined;
                return (
                    <label
                        key={offre.id}
                        className={`block border rounded-lg p-4 cursor-pointer transition ${actif ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'}`}
                    >
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={actif}
                                onChange={() => toggle(offre)}
                                className="mt-1 h-4 w-4 text-green-600"
                            />
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900">
                                    <Gift className="w-4 h-4 inline mr-1 text-green-600" />
                                    {offre.nom}
                                    <span className="ml-2 text-xs font-normal text-gray-500">
                                        du {formatJour(offre.dateDebut)} au {formatJour(offre.dateFin)}
                                    </span>
                                </p>
                                <ul className="text-sm text-gray-700 mt-1 list-disc pl-5">
                                    {libellesPaliers(offre).map(l => <li key={l}>{l}</li>)}
                                </ul>
                                <p className="text-xs text-gray-600 mt-2">
                                    {offre.articlesMax === 1 ? '1 seul article' : `${offre.articlesMax} articles maximum`}, aucun autre article
                                    {offre.hauteurMaxArticleCm != null && ` · ${offre.hauteurMaxArticleCm} cm maximum`}
                                    {' · '}rayon {offre.rayonMaxKm} km
                                    {' · '}retraits {offre.heuresRetrait.join(' / ')}
                                    {' · '}créneaux {offre.creneauxLivraison.join(' / ')}
                                </p>
                                {!!offre.description && <p className="text-xs text-gray-500 mt-1">{offre.description}</p>}
                                {actif && (
                                    <p className="text-sm font-medium mt-2 text-green-800">
                                        {palier
                                            ? `Tarif appliqué : ${palier.tarifHT} € HT (hauteur ${hauteur} cm)`
                                            : 'Renseignez la hauteur de l\'article pour connaître le tarif.'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </label>
                );
            })}
            {notice && (
                <div className="bg-orange-50 border border-orange-300 text-orange-800 rounded-lg px-3 py-2 text-sm flex items-start">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    {notice}
                </div>
            )}
        </div>
    );
};

export default OffreSpecialeSelector;
