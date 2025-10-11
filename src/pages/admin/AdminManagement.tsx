import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    PlusIcon,
    TrashIcon,
    UserIcon,
    PhoneIcon,
    EnvelopeIcon,
    KeyIcon,
    ShieldCheckIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useApi } from '../../services/api.service';

interface AdminInfo {
    id: string;
    email: string;
    nom?: string;
    prenom?: string;
    telephone?: string;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface AdminFormData {
    nom: string;
    prenom?: string;
    email: string;
    telephone?: string;
    status: 'actif' | 'inactif';
    // Champs pour gestion du mot de passe
    password?: string;
    generatePassword?: boolean;
}

// Type temporaire pour gérer les données backend
interface BackendAdmin {
    id: string;
    email: string;
    nom?: string;
    prenom?: string;
    telephone?: string;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export default function AdminManagement() {
    const [searchParams] = useSearchParams();
    const [admins, setAdmins] = useState<AdminInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    // ✅ SUPPRIMÉ: editingAdmin - La modification se fait dans Profile.tsx
    // Variables d'état pour gestion modale suppression avec dépendances
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingAdmin, setDeletingAdmin] = useState<AdminInfo | null>(null);
    const [formData, setFormData] = useState<AdminFormData>({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        status: 'actif',
        password: '',
        generatePassword: false
    });

    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const apiService = useApi();

    // Gérer le paramètre search de l'URL
    useEffect(() => {
        const searchFromUrl = searchParams.get('search');
        if (searchFromUrl) {
            setSearchTerm(searchFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        loadAdmins();
    }, []);

    const loadAdmins = async () => {
        try {
            setLoading(true);
            console.log('🔑 Chargement des admins...');

            // Appel à l'endpoint users avec filtre role=ADMIN
            const rawData = await apiService.get('/users?role=ADMIN');
            console.log('🔍 Réponse API brute:', rawData);

            // ✅ Gestion robuste des différents formats de réponse
            let adminsList: BackendAdmin[] = [];

            if (Array.isArray(rawData)) {
                // Format direct : tableau d'admins
                adminsList = rawData;
                console.log('📋 Format direct détecté:', adminsList.length, 'admins');
            } else if (
                rawData &&
                typeof rawData === 'object' &&
                'data' in rawData &&
                Array.isArray((rawData as { data?: unknown }).data)
            ) {
                // Format avec wrapper : { data: [...] }
                adminsList = (rawData as { data: BackendAdmin[] }).data;
                console.log('📦 Format wrapper détecté:', adminsList.length, 'admins');
            } else {
                console.warn('⚠️ Format de réponse non reconnu:', rawData);
                adminsList = [];
            }

            // Transformation des données backend → frontend
            const transformedAdmins = adminsList.map(transformBackendAdmin);
            console.log('✅ Admins transformés:', transformedAdmins.length);

            setAdmins(transformedAdmins);
        } catch (error) {
            console.error('❌ Erreur chargement admins:', error);
            // Fallback avec données vides pour éviter crashes
            setAdmins([]);
        } finally {
            setLoading(false);
        }
    };

    const transformBackendAdmin = (backendAdmin: BackendAdmin): AdminInfo => {
        return {
            id: backendAdmin.id,
            email: backendAdmin.email,
            nom: backendAdmin.nom || 'Non renseigné',
            prenom: backendAdmin.prenom || '',
            telephone: backendAdmin.telephone || '',
            role: backendAdmin.role,
            status: backendAdmin.status,
            createdAt: backendAdmin.createdAt,
            updatedAt: backendAdmin.updatedAt
        };
    };

    const generatePassword = () => {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    };

    const handleGeneratePassword = () => {
        const newPassword = generatePassword();
        setGeneratedPassword(newPassword);
        setFormData(prev => ({ ...prev, password: newPassword }));
    };

    const handleSubmit = async () => {
        try {
            // Nettoyer les données - supprimer les champs non acceptés par le backend
            const { generatePassword, ...cleanFormData } = formData;
            const adminData = {
                ...cleanFormData,
                role: 'ADMIN'
            };

            // Seule la création est gérée ici - Modification dans Profile.tsx
            await apiService.post('/users', adminData);
            console.log('✅ Admin créé');

            await loadAdmins();
            closeModal();
        } catch (error) {
            console.error('❌ Erreur sauvegarde admin:', error);
        }
    };

    const handleDelete = async (id: string) => {
        // Confirmation de suppression
        const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer cet administrateur ?');
        if (!confirmDelete) return;

        try {
            await apiService.delete(`/users/${id}`);
            await loadAdmins();
        } catch (error: any) {
            if (error.message.includes('données liées') || error.message.includes('400')) {
                const admin = admins.find(a => a.id === id);
                if (admin) {
                    setDeletingAdmin(admin);
                    setShowDeleteConfirm(true);
                }
            }
        }
    };

    const handleForceDelete = async () => {
        if (deletingAdmin) {
            try {
                await apiService.delete(`/users/${deletingAdmin.id}?force=true`);
                setShowDeleteConfirm(false);
                await loadAdmins();
                setDeletingAdmin(null);
            } catch (forceError: any) {
                console.error('❌ Erreur suppression forcée:', forceError);
                alert('Erreur lors de la suppression forcée: ' + forceError.message);
            }
        }
    };

    // ✅ SUPPRIMÉ: handleViewDependencies - Les admins n'ont pas de dépendances à consulter

    const openModal = () => {
        // Seulement pour création - modification via Profile.tsx
        setFormData({
            nom: '',
            prenom: '',
            email: '',
            telephone: '',
            status: 'actif',
            password: '',
            generatePassword: false
        });
        setShowPasswordFields(true);
        setGeneratedPassword('');
        setPasswordConfirmation('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData({
            nom: '',
            prenom: '',
            email: '',
            telephone: '',
            status: 'actif',
            password: '',
            generatePassword: false
        });
        setShowPasswordFields(false);
        setGeneratedPassword('');
        setPasswordConfirmation('');
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Administrateurs</h1>
                <button
                    onClick={() => openModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Nouvel Administrateur
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Barre de recherche */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher par nom, prénom ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center">
                                        <ShieldCheckIcon className="h-4 w-4 mr-2" />
                                        Administrateur
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center">
                                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                                        Contact
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Statut
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Créé le
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {admins
                                .filter((admin) => {
                                    if (!searchTerm) return true;
                                    const search = searchTerm.toLowerCase();
                                    return (
                                        admin.nom?.toLowerCase().includes(search) ||
                                        admin.prenom?.toLowerCase().includes(search) ||
                                        admin.email?.toLowerCase().includes(search) ||
                                        `${admin.prenom} ${admin.nom}`.toLowerCase().includes(search)
                                    );
                                })
                                .map((admin) => (
                                <tr key={admin.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <UserIcon className="h-6 w-6 text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {admin.nom} {admin.prenom}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    ID: {admin.id.slice(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{admin.email}</div>
                                        {admin.telephone && (
                                            <div className="text-sm text-gray-500 flex items-center">
                                                <PhoneIcon className="h-4 w-4 mr-1" />
                                                {admin.telephone}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            admin.status === 'actif'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {admin.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(admin.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            {/* ✅ SUPPRIMÉ: Bouton dépendances - Non applicable pour les admins */}
                                            {/* ✅ SUPPRIMÉ: Bouton modifier - Utiliser Profile.tsx pour les modifications */}
                                            <button
                                                onClick={() => handleDelete(admin.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Supprimer"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {admins.filter((admin) => {
                        if (!searchTerm) return true;
                        const search = searchTerm.toLowerCase();
                        return (
                            admin.nom?.toLowerCase().includes(search) ||
                            admin.prenom?.toLowerCase().includes(search) ||
                            admin.email?.toLowerCase().includes(search) ||
                            `${admin.prenom} ${admin.nom}`.toLowerCase().includes(search)
                        );
                    }).length === 0 && (
                        <div className="text-center py-12">
                            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                {searchTerm ? 'Aucun résultat trouvé' : 'Aucun administrateur'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm
                                    ? `Aucun administrateur ne correspond à "${searchTerm}"`
                                    : 'Commencez par créer un nouveau compte administrateur.'
                                }
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Effacer la recherche
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal de création/édition */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Nouvel administrateur
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nom}
                                        onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Prénom
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.prenom}
                                        onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Téléphone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.telephone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Statut
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'actif' | 'inactif' }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                    </select>
                                </div>

                                {/* Gestion mot de passe */}
                                {showPasswordFields && (
                                    <div className="border-t pt-4">
                                        <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                                            <KeyIcon className="h-4 w-4 mr-2" />
                                            Mot de passe
                                        </h4>

                                        <div className="flex items-center space-x-2 mb-3">
                                            <button
                                                type="button"
                                                onClick={handleGeneratePassword}
                                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                                            >
                                                Générer un mot de passe
                                            </button>
                                        </div>

                                        {generatedPassword && (
                                            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                                <p className="text-sm text-yellow-800">
                                                    <strong>Mot de passe généré :</strong> {generatedPassword}
                                                </p>
                                                <p className="text-xs text-yellow-600 mt-1">
                                                    ⚠️ Notez ce mot de passe, il ne sera plus affiché.
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Mot de passe *
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                                placeholder="Saisissez le mot de passe"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ✅ SUPPRIMÉ: Section modification mot de passe - Seulement création */}
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                                >
                                    Créer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmation suppression */}
            {showDeleteConfirm && deletingAdmin && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Confirmer la suppression
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Êtes-vous sûr de vouloir supprimer l'administrateur {deletingAdmin.nom} {deletingAdmin.prenom} ?
                                Cette action est irréversible.
                            </p>
                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleForceDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}