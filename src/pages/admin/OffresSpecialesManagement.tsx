import React, { useEffect, useState } from 'react';
import {
    offresSpecialesService, OffreSpeciale, OffreSpecialeInput, PalierOffre, libellesPaliers,
} from '../../services/offres-speciales.service';

const jourParis = (d: string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
const jourAffiche = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
// Liste saisie « 08h00, 15h30 » ↔ tableau
const versListe = (v: string) => v.split(',').map(x => x.trim()).filter(Boolean);
const messageErreur = (e: unknown, defaut: string) => (e instanceof Error && e.message) || defaut;

const FORMULAIRE_VIDE: OffreSpecialeInput = {
    code: '',
    nom: '',
    description: '',
    actif: true,
    dateDebut: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }),
    dateFin: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }),
    paliers: [{ hauteurMaxCm: null, tarifHT: 0 }],
    articlesMax: 1,
    rayonMaxKm: 10,
    hauteurMaxArticleCm: null,
    nomArticle: '',
    heuresRetrait: [],
    creneauxLivraison: [],
};

/** Offres saisonnières (ex. sapins de Noël) : tarifs, période, créneaux et conditions. */
const OffresSpecialesManagement: React.FC = () => {
    const [offres, setOffres] = useState<OffreSpeciale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<OffreSpecialeInput>(FORMULAIRE_VIDE);
    const [heuresTexte, setHeuresTexte] = useState('');
    const [creneauxTexte, setCreneauxTexte] = useState('');
    const [saving, setSaving] = useState(false);

    const charger = async () => {
        setLoading(true);
        try {
            setOffres(await offresSpecialesService.getAll());
            setError(null);
        } catch (e) {
            setError(messageErreur(e, 'Impossible de charger les offres'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { charger(); }, []);

    const ouvrir = (offre?: OffreSpeciale) => {
        const base: OffreSpecialeInput = offre
            ? {
                code: offre.code, nom: offre.nom, description: offre.description || '', actif: offre.actif,
                dateDebut: jourParis(offre.dateDebut), dateFin: jourParis(offre.dateFin), paliers: offre.paliers,
                articlesMax: offre.articlesMax, rayonMaxKm: offre.rayonMaxKm,
                hauteurMaxArticleCm: offre.hauteurMaxArticleCm ?? null, nomArticle: offre.nomArticle || '',
                heuresRetrait: offre.heuresRetrait, creneauxLivraison: offre.creneauxLivraison,
            }
            : FORMULAIRE_VIDE;
        setForm(base);
        setHeuresTexte(base.heuresRetrait.join(', '));
        setCreneauxTexte(base.creneauxLivraison.join(', '));
        setEditingId(offre?.id ?? null);
        setFormOpen(true);
        setError(null);
    };

    const majPalier = (index: number, patch: Partial<PalierOffre>) =>
        setForm(f => ({ ...f, paliers: f.paliers.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));

    const enregistrer = async () => {
        setSaving(true);
        try {
            const payload: OffreSpecialeInput = {
                ...form,
                code: form.code.trim().toUpperCase(),
                // Jours à Paris : du début de la journée de début à la fin de la journée de fin
                dateDebut: new Date(`${form.dateDebut}T00:00:00`).toISOString(),
                dateFin: new Date(`${form.dateFin}T23:59:59`).toISOString(),
                heuresRetrait: versListe(heuresTexte),
                creneauxLivraison: versListe(creneauxTexte),
                paliers: form.paliers.map(p => ({
                    hauteurMaxCm: p.hauteurMaxCm ? Number(p.hauteurMaxCm) : null,
                    tarifHT: Number(p.tarifHT),
                })),
            };
            if (editingId) {
                // Le code identifie l'offre : il n'est pas modifiable
                await offresSpecialesService.update(editingId, { ...payload, code: undefined });
            } else {
                await offresSpecialesService.create(payload);
            }
            setFormOpen(false);
            await charger();
        } catch (e) {
            setError(messageErreur(e, 'Enregistrement impossible'));
        } finally {
            setSaving(false);
        }
    };

    const basculer = async (offre: OffreSpeciale) => {
        try {
            await offresSpecialesService.update(offre.id, { actif: !offre.actif });
            await charger();
        } catch (e) {
            setError(messageErreur(e, 'Modification impossible'));
        }
    };

    const supprimer = async (offre: OffreSpeciale) => {
        if (!window.confirm(`Supprimer « ${offre.nom} » ?`)) return;
        try {
            await offresSpecialesService.remove(offre.id);
            await charger();
        } catch (e) {
            setError(messageErreur(e, 'Suppression impossible'));
        }
    };

    const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500';

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Offres spéciales</h1>
                <button
                    onClick={() => (formOpen ? setFormOpen(false) : ouvrir())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    {formOpen ? 'Annuler' : '+ Nouvelle offre'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">{error}</div>
            )}

            {formOpen && (
                <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4">{editingId ? "Modifier l'offre" : 'Nouvelle offre'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom affiché</label>
                            <input className={input} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Offre sapin de Noël" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Code (unique)</label>
                            <input className={input} value={form.code} disabled={!!editingId} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="SAPIN_NOEL_2026" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Conditions affichées aux vendeurs</label>
                            <textarea className={input} rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                            <input type="date" className={input} value={form.dateDebut} onChange={e => setForm({ ...form, dateDebut: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fin (incluse)</label>
                            <input type="date" className={input} value={form.dateFin} onChange={e => setForm({ ...form, dateFin: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heures de retrait (séparées par des virgules)</label>
                            <input className={input} value={heuresTexte} onChange={e => setHeuresTexte(e.target.value)} placeholder="08h00, 15h30" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Créneaux de livraison (séparés par des virgules)</label>
                            <input className={input} value={creneauxTexte} onChange={e => setCreneauxTexte(e.target.value)} placeholder="08h-15h, 15h-20h" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'articles maximum</label>
                            <input type="number" min={1} className={input} value={form.articlesMax} onChange={e => setForm({ ...form, articlesMax: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rayon maximum (km)</label>
                            <input type="number" min={0} step="0.5" className={input} value={form.rayonMaxKm} onChange={e => setForm({ ...form, rayonMaxKm: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hauteur maximale de l'article (cm, incluse)</label>
                            <input
                                type="number" min={1} className={input} placeholder="sans limite"
                                value={form.hauteurMaxArticleCm ?? ''}
                                onChange={e => setForm({ ...form, hauteurMaxArticleCm: e.target.value ? Number(e.target.value) : null })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'article proposé (modifiable par le magasin)</label>
                            <input className={input} value={form.nomArticle || ''} onChange={e => setForm({ ...form, nomArticle: e.target.value })} placeholder="Sapin" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tarifs selon la hauteur de l'article</label>
                            <div className="space-y-2">
                                {form.paliers.map((p, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <span className="w-28 text-gray-600">Moins de</span>
                                        <input
                                            type="number" min={1} className={`${input} w-28`}
                                            value={p.hauteurMaxCm ?? ''} placeholder="sans limite"
                                            onChange={e => majPalier(i, { hauteurMaxCm: e.target.value ? Number(e.target.value) : null })}
                                        />
                                        <span className="text-gray-600">cm :</span>
                                        <input
                                            type="number" min={0} step="0.01" className={`${input} w-28`}
                                            value={p.tarifHT}
                                            onChange={e => majPalier(i, { tarifHT: Number(e.target.value) })}
                                        />
                                        <span className="text-gray-600">€ HT</span>
                                        {form.paliers.length > 1 && (
                                            <button type="button" className="text-red-600 hover:underline ml-2" onClick={() => setForm(f => ({ ...f, paliers: f.paliers.filter((_, j) => j !== i) }))}>
                                                Retirer
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" className="text-blue-600 hover:underline text-sm" onClick={() => setForm(f => ({ ...f, paliers: [{ hauteurMaxCm: null, tarifHT: 0 }, ...f.paliers] }))}>
                                    + Ajouter un palier
                                </button>
                                <p className="text-xs text-gray-500">Laissez la hauteur vide sur le dernier palier (sans limite).</p>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.actif} onChange={e => setForm({ ...form, actif: e.target.checked })} />
                            Offre active
                        </label>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={enregistrer}
                            disabled={saving || !form.nom || !form.code}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <p className="text-gray-500">Chargement…</p>
            ) : offres.length === 0 ? (
                <p className="text-gray-500">Aucune offre spéciale.</p>
            ) : (
                <div className="space-y-4">
                    {offres.map(offre => (
                        <div key={offre.id} className="p-5 bg-white rounded-lg shadow border border-gray-200">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {offre.nom}
                                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${offre.actif ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                            {offre.actif ? 'Active' : 'Désactivée'}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {offre.code} · du {jourAffiche(offre.dateDebut)} au {jourAffiche(offre.dateFin)}
                                    </p>
                                    <ul className="text-sm text-gray-700 mt-2 list-disc pl-5">
                                        {libellesPaliers(offre).map(l => <li key={l}>{l}</li>)}
                                    </ul>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {offre.articlesMax} article(s) max{offre.hauteurMaxArticleCm != null && ` · ${offre.hauteurMaxArticleCm} cm max`} · rayon {offre.rayonMaxKm} km · retraits {offre.heuresRetrait.join(' / ')} · créneaux {offre.creneauxLivraison.join(' / ')}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 text-sm whitespace-nowrap">
                                    <button onClick={() => ouvrir(offre)} className="text-blue-600 hover:underline">Modifier</button>
                                    <button onClick={() => basculer(offre)} className="text-gray-700 hover:underline">
                                        {offre.actif ? 'Désactiver' : 'Activer'}
                                    </button>
                                    <button onClick={() => supprimer(offre)} className="text-red-600 hover:underline">Supprimer</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OffresSpecialesManagement;
