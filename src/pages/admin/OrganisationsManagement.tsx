import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    BuildingOfficeIcon,
    UsersIcon,
    BuildingStorefrontIcon,
    TruckIcon,
    CheckCircleIcon,
    XCircleIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useApi } from '../../services/api.service';

interface Organisation {
    id: string;
    nom: string;
    slug: string;
    logoUrl?: string;
    actif: boolean;
    createdAt: string;
    _count?: {
        users: number;
        magasins: number;
        chauffeurs: number;
        commandes: number;
    };
}

interface OrganisationDetail extends Organisation {
    users: {
        id: string;
        email: string;
        nom?: string;
        prenom?: string;
        role: string;
    }[];
}

interface CreateOrganisationFormData {
    nom: string;
    slug: string;
    logoUrl: string;
    adminEmail: string;
    adminNom: string;
    adminPrenom: string;
    adminPassword: string;
}

export default function OrganisationsManagement() {
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<OrganisationDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateOrganisationFormData>({
        nom: '',
        slug: '',
        logoUrl: '',
        adminEmail: '',
        adminNom: '',
        adminPrenom: '',
        adminPassword: '',
    });
    const [formErrors, setFormErrors] = useState<Partial<CreateOrganisationFormData>>({});
    const [submitting, setSubmitting] = useState(false);

    const apiService = useApi();

    const fetchOrganisations = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/organisations') as Organisation[];
            setOrganisations(data);
        } catch (err: any) {
            setError('Erreur lors du chargement des organisations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganisations();
    }, []);

    const handleViewDetail = async (org: Organisation) => {
        try {
            const detail = await apiService.get(`/organisations/${org.id}`) as OrganisationDetail;
            setSelectedOrg(detail);
            setShowDetailModal(true);
        } catch (err) {
            setError('Erreur lors du chargement des détails');
        }
    };

    const handleToggleActif = async (org: Organisation) => {
        try {
            await apiService.patch(`/organisations/${org.id}/toggle`, {});
            setSuccessMsg(`Organisation ${org.actif ? 'désactivée' : 'activée'} avec succès`);
            fetchOrganisations();
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err) {
            setError('Erreur lors de la modification');
        }
    };

    const autoSlug = (nom: string) =>
        nom.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const handleNomChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            nom: value,
            slug: prev.slug || autoSlug(value),
        }));
    };

    const validateForm = (): boolean => {
        const errors: Partial<CreateOrganisationFormData> = {};
        if (!formData.nom.trim()) errors.nom = 'Nom requis';
        if (!formData.slug.trim()) errors.slug = 'Slug requis';
        if (!/^[a-z0-9-]+$/.test(formData.slug)) errors.slug = 'Slug: lettres minuscules, chiffres et tirets uniquement';
        if (!formData.adminEmail.trim()) errors.adminEmail = 'Email admin requis';
        if (!formData.adminNom.trim()) errors.adminNom = 'Nom admin requis';
        if (!formData.adminPassword.trim()) errors.adminPassword = 'Mot de passe requis';
        if (formData.adminPassword.length < 8) errors.adminPassword = 'Minimum 8 caractères';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiService.post('/organisations', {
                nom: formData.nom,
                slug: formData.slug,
                logoUrl: formData.logoUrl || undefined,
                adminEmail: formData.adminEmail,
                adminNom: formData.adminNom,
                adminPrenom: formData.adminPrenom || undefined,
                adminPassword: formData.adminPassword,
            });
            setSuccessMsg(`Organisation "${formData.nom}" créée avec succès`);
            setShowCreateModal(false);
            setFormData({ nom: '', slug: '', logoUrl: '', adminEmail: '', adminNom: '', adminPrenom: '', adminPassword: '' });
            fetchOrganisations();
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de la création');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = organisations.filter(o =>
        o.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <BuildingOfficeIcon className="h-7 w-7 text-primary" />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Organisations</h1>
                        <p className="text-sm text-gray-500">Gestion des tenants My Truck</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchOrganisations}
                        className="p-2 text-gray-500 hover:text-primary rounded-lg transition-colors"
                        title="Actualiser"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Nouvelle organisation
                    </button>
                </div>
            </div>

            {/* Messages */}
            {successMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                    {successMsg}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center gap-2">
                    <XCircleIcon className="h-4 w-4 flex-shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">✕</button>
                </div>
            )}

            {/* Recherche */}
            <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rechercher une organisation..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
            </div>

            {/* Liste */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Aucune organisation trouvée</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(org => (
                        <div
                            key={org.id}
                            className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 transition-shadow hover:shadow-md ${
                                org.actif ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 dark:border-red-900 opacity-70'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {org.logoUrl ? (
                                        <img src={org.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <BuildingOfficeIcon className="h-4 w-4 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{org.nom}</p>
                                        <p className="text-xs text-gray-400 font-mono">/{org.slug}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    org.actif
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                    {org.actif ? 'Actif' : 'Inactif'}
                                </span>
                            </div>

                            {/* Compteurs */}
                            {org._count && (
                                <div className="grid grid-cols-4 gap-1 mb-3 text-center">
                                    {[
                                        { icon: UsersIcon, val: org._count.users, label: 'Users' },
                                        { icon: BuildingStorefrontIcon, val: org._count.magasins, label: 'Magasins' },
                                        { icon: TruckIcon, val: org._count.chauffeurs, label: 'Chauffeurs' },
                                        { icon: null, val: org._count.commandes, label: 'Commandes' },
                                    ].map(({ icon: Icon, val, label }) => (
                                        <div key={label} className="bg-gray-50 dark:bg-gray-700 rounded p-1">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{val}</p>
                                            <p className="text-xs text-gray-400">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* URL d'onboarding */}
                            <p className="text-xs text-gray-400 mb-3 truncate font-mono bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                                ?org={org.slug}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleViewDetail(org)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                >
                                    <EyeIcon className="h-3.5 w-3.5" />
                                    Détails
                                </button>
                                <button
                                    onClick={() => handleToggleActif(org)}
                                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                        org.actif
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                                            : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                                    }`}
                                >
                                    {org.actif ? (
                                        <><XCircleIcon className="h-3.5 w-3.5" /> Désactiver</>
                                    ) : (
                                        <><CheckCircleIcon className="h-3.5 w-3.5" /> Activer</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal création */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouvelle organisation</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Informations organisation</p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de l'entreprise *</label>
                                <input
                                    type="text"
                                    value={formData.nom}
                                    onChange={e => handleNomChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-white"
                                    placeholder="Transport Dupont"
                                />
                                {formErrors.nom && <p className="text-xs text-red-500 mt-1">{formErrors.nom}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug URL *</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400">?org=</span>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={e => setFormData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-white"
                                        placeholder="transport-dupont"
                                    />
                                </div>
                                {formErrors.slug && <p className="text-xs text-red-500 mt-1">{formErrors.slug}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Logo (optionnel)</label>
                                <input
                                    type="text"
                                    value={formData.logoUrl}
                                    onChange={e => setFormData(p => ({ ...p, logoUrl: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-white"
                                    placeholder="https://..."
                                />
                            </div>

                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide pt-2 border-t dark:border-gray-700">Compte administrateur</p>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                                    <input
                                        type="text"
                                        value={formData.adminNom}
                                        onChange={e => setFormData(p => ({ ...p, adminNom: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-white"
                                        placeholder="Dupont"
                                    />
                                    {formErrors.adminNom && <p className="text-xs text-red-500 mt-1">{formErrors.adminNom}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                                    <input
                                        type="text"
                                        value={formData.adminPrenom}
                                        onChange={e => setFormData(p => ({ ...p, adminPrenom: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-white"
                                        placeholder="Jean"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={formData.adminEmail}
                                    onChange={e => setFormData(p => ({ ...p, adminEmail: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-white"
                                    placeholder="admin@transport-dupont.fr"
                                />
                                {formErrors.adminEmail && <p className="text-xs text-red-500 mt-1">{formErrors.adminEmail}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mot de passe *</label>
                                <input
                                    type="password"
                                    value={formData.adminPassword}
                                    onChange={e => setFormData(p => ({ ...p, adminPassword: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-white"
                                    placeholder="Min. 8 caractères"
                                />
                                {formErrors.adminPassword && <p className="text-xs text-red-500 mt-1">{formErrors.adminPassword}</p>}
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    {submitting ? 'Création...' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal détail */}
            {showDetailModal && selectedOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <BuildingOfficeIcon className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedOrg.nom}</h2>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-400 text-xs">Slug</p>
                                    <p className="font-mono text-gray-800 dark:text-gray-200">{selectedOrg.slug}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Statut</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedOrg.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {selectedOrg.actif ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Créé le</p>
                                    <p className="text-gray-800 dark:text-gray-200">{new Date(selectedOrg.createdAt).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">URL d'accès</p>
                                    <p className="font-mono text-xs text-gray-600 dark:text-gray-400">?org={selectedOrg.slug}</p>
                                </div>
                            </div>

                            {selectedOrg.users?.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Utilisateurs ({selectedOrg.users.length})</p>
                                    <div className="space-y-1">
                                        {selectedOrg.users.map(u => (
                                            <div key={u.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">{u.prenom} {u.nom}</p>
                                                    <p className="text-xs text-gray-400">{u.email}</p>
                                                </div>
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                                    {u.role}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedOrg._count && (
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    {[
                                        { val: selectedOrg._count.magasins, label: 'Magasins' },
                                        { val: selectedOrg._count.chauffeurs, label: 'Chauffeurs' },
                                        { val: selectedOrg._count.commandes, label: 'Commandes' },
                                    ].map(({ val, label }) => (
                                        <div key={label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{val}</p>
                                            <p className="text-xs text-gray-400">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
