import React, { useState, useEffect } from 'react';
import { announcementService, Announcement, CreateAnnouncementDto } from '../../services/announcement.service';

const AnnouncementManagement: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateAnnouncementDto>({
        title: '',
        message: '',
        type: 'NEW_FEATURE',
        icon: '🚀',
        ctaText: '',
        ctaLink: '',
        targetRoles: ['all'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 2,
        isActive: true,
    });

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await announcementService.getAllAnnouncements();
            setAnnouncements(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des annonces';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            setError(null);
            await announcementService.createAnnouncement(formData);
            await loadAnnouncements();
            resetForm();
            setIsCreating(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
            setError(errorMessage);
        }
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        try {
            setError(null);
            await announcementService.updateAnnouncement(editingId, formData);
            await loadAnnouncements();
            resetForm();
            setEditingId(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
            setError(errorMessage);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
        try {
            setError(null);
            await announcementService.deleteAnnouncement(id);
            await loadAnnouncements();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
            setError(errorMessage);
        }
    };

    const handleToggleActive = async (id: string) => {
        try {
            setError(null);
            await announcementService.toggleActive(id);
            await loadAnnouncements();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la modification du statut';
            setError(errorMessage);
        }
    };

    const startEdit = (announcement: Announcement) => {
        setFormData({
            title: announcement.title,
            message: announcement.message,
            type: announcement.type,
            icon: announcement.icon,
            ctaText: announcement.ctaText,
            ctaLink: announcement.ctaLink,
            targetRoles: announcement.targetRoles,
            startDate: announcement.startDate.split('T')[0],
            endDate: announcement.endDate.split('T')[0],
            priority: announcement.priority,
            isActive: announcement.isActive,
        });
        setEditingId(announcement.id);
        setIsCreating(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            message: '',
            type: 'NEW_FEATURE',
            icon: '🚀',
            ctaText: '',
            ctaLink: '',
            targetRoles: ['all'],
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 2,
            isActive: true,
        });
        setEditingId(null);
        setIsCreating(false);
    };

    const toggleRole = (role: string) => {
        setFormData(prev => {
            const newRoles = prev.targetRoles.includes(role)
                ? prev.targetRoles.filter(r => r !== role)
                : [...prev.targetRoles, role];
            return { ...prev, targetRoles: newRoles };
        });
    };

    const typeColors = {
        NEW_FEATURE: 'bg-blue-100 text-blue-800 border-blue-300',
        IMPROVEMENT: 'bg-green-100 text-green-800 border-green-300',
        MAINTENANCE: 'bg-orange-100 text-orange-800 border-orange-300',
        INFO: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    const typeLabels = {
        NEW_FEATURE: 'Nouvelle fonctionnalité',
        IMPROVEMENT: 'Amélioration',
        MAINTENANCE: 'Maintenance',
        INFO: 'Information',
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Gestion des Annonces</h1>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    {isCreating ? 'Annuler' : '+ Nouvelle Annonce'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Form for creating/editing */}
            {isCreating && (
                <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingId ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Titre de l'annonce"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Message de l'annonce"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'NEW_FEATURE' | 'IMPROVEMENT' | 'MAINTENANCE' | 'INFO' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="NEW_FEATURE">Nouvelle fonctionnalité</option>
                                <option value="IMPROVEMENT">Amélioration</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="INFO">Information</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Icône (emoji)</label>
                            <input
                                type="text"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="🚀"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Texte du bouton (optionnel)</label>
                            <input
                                type="text"
                                value={formData.ctaText || ''}
                                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Voir maintenant"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lien du bouton (optionnel)</label>
                            <input
                                type="text"
                                value={formData.ctaLink || ''}
                                onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="/deliveries"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priorité (1-5)</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rôles ciblés</label>
                            <div className="flex flex-wrap gap-2">
                                {['all', 'admin', 'direction', 'magasin', 'chauffeur'].map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => toggleRole(role)}
                                        className={`px-3 py-1 rounded-lg border transition ${
                                            formData.targetRoles.includes(role)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                                        }`}
                                    >
                                        {role === 'all' ? 'Tous' : role.charAt(0).toUpperCase() + role.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-2 flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label className="text-sm font-medium text-gray-700">Annonce active</label>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                        <button
                            onClick={editingId ? handleUpdate : handleCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            {editingId ? 'Mettre à jour' : 'Créer'}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* List of announcements */}
            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        Aucune annonce pour le moment
                    </div>
                ) : (
                    announcements.map((announcement) => (
                        <div
                            key={announcement.id}
                            className={`p-6 rounded-lg border-2 shadow-sm ${
                                announcement.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-start gap-3">
                                    <span className="text-3xl">{announcement.icon}</span>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {announcement.title}
                                        </h3>
                                        <span className={`inline-block px-2 py-1 text-xs rounded border mt-1 ${typeColors[announcement.type]}`}>
                                            {typeLabels[announcement.type]}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleToggleActive(announcement.id)}
                                        className={`px-3 py-1 text-sm rounded ${
                                            announcement.isActive
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {announcement.isActive ? 'Actif' : 'Inactif'}
                                    </button>
                                    <button
                                        onClick={() => startEdit(announcement)}
                                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                    >
                                        Modifier
                                    </button>
                                    <button
                                        onClick={() => handleDelete(announcement.id)}
                                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>

                            <p className="text-gray-700 whitespace-pre-wrap mb-3">{announcement.message}</p>

                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <span>📅 {new Date(announcement.startDate).toLocaleDateString()} - {new Date(announcement.endDate).toLocaleDateString()}</span>
                                <span>🎯 Rôles: {announcement.targetRoles.join(', ')}</span>
                                <span>⭐ Priorité: {announcement.priority}</span>
                                {announcement.ctaText && announcement.ctaLink && (
                                    <span>🔗 Lien: {announcement.ctaLink}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AnnouncementManagement;