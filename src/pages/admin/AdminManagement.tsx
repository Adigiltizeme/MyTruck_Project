import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    UserIcon,
    PhoneIcon,
    EnvelopeIcon,
    EyeIcon,
    KeyIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useApi } from '../../services/api.service';
import DependenciesModal from '../../components/DependenciesModal';

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
    const [admins, setAdmins] = useState<AdminInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminInfo | null>(null);
    const [showDependenciesModal, setShowDependenciesModal] = useState(false);
    const [selectedAdminForDependencies, setSelectedAdminForDependencies] = useState<AdminInfo | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'delete'>('view');
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

    useEffect(() => {
        loadAdmins();
    }, []);

    const loadAdmins = async () => {
        try {
            setLoading(true);
            console.log('🔑 Chargement des admins...');

            // Appel à l'endpoint users avec filtre role=ADMIN
            const rawData = await apiService.get('/users?role=ADMIN') as { data: BackendAdmin[] };

            // Transformation des données backend → frontend
            const transformedAdmins = rawData.data.map(transformBackendAdmin);
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
            const adminData = {
                ...formData,
                role: 'ADMIN'
            };

            if (editingAdmin) {
                await apiService.put(`/users/${editingAdmin.id}`, adminData);
                console.log('✅ Admin mis à jour');
            } else {
                await apiService.post('/users', adminData);
                console.log('✅ Admin créé');
            }

            await loadAdmins();
            closeModal();
        } catch (error) {
            console.error('❌ Erreur sauvegarde admin:', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiService.delete(`/users/${id}`);
            await loadAdmins();
        } catch (error: any) {
            if (error.message.includes('données liées') || error.message.includes('400')) {
                const admin = admins.find(a => a.id === id);
                if (admin) {
                    setSelectedAdminForDependencies(admin);
                    setModalMode('delete');
                    setShowDependenciesModal(true);
                }
            }
        }
    };

    const handleForceDelete = async () => {
        if (selectedAdminForDependencies) {
            try {
                await apiService.delete(`/users/${selectedAdminForDependencies.id}?force=true`);
                setShowDependenciesModal(false);
                await loadAdmins();
                setSelectedAdminForDependencies(null);
            } catch (forceError: any) {
                console.error('❌ Erreur suppression forcée:', forceError);
                alert('Erreur lors de la suppression forcée: ' + forceError.message);
            }
        }
    };

    const handleViewDependencies = (admin: AdminInfo) => {
        setSelectedAdminForDependencies(admin);
        setModalMode('view');
        setShowDependenciesModal(true);
    };

    const openModal = (admin?: AdminInfo) => {
        if (admin) {
            setEditingAdmin(admin);
            setFormData({
                nom: admin.nom || '',
                prenom: admin.prenom || '',
                email: admin.email,
                telephone: admin.telephone || '',
                status: admin.status as 'actif' | 'inactif',
                password: '',
                generatePassword: false
            });
            setShowPasswordFields(false);
        } else {
            setEditingAdmin(null);
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
        }
        setGeneratedPassword('');
        setPasswordConfirmation('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAdmin(null);
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
                            {admins.map((admin) => (
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
                                            <button
                                                onClick={() => handleViewDependencies(admin)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="Voir les dépendances"
                                            >
                                                <EyeIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => openModal(admin)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Modifier"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
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

                    {admins.length === 0 && (
                        <div className="text-center py-12">
                            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun administrateur</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Commencez par créer un nouveau compte administrateur.
                            </p>
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
                                    {editingAdmin ? 'Modifier l\'administrateur' : 'Nouvel administrateur'}
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
                                                Mot de passe {!editingAdmin && '*'}
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required={!editingAdmin}
                                                placeholder={editingAdmin ? "Laissez vide pour ne pas changer" : ""}
                                            />
                                        </div>
                                    </div>
                                )}

                                {editingAdmin && (
                                    <div className="border-t pt-4">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={showPasswordFields}
                                                onChange={(e) => setShowPasswordFields(e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                Changer le mot de passe
                                            </span>
                                        </label>
                                    </div>
                                )}
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
                                    {editingAdmin ? 'Mettre à jour' : 'Créer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de dépendances */}
            {showDependenciesModal && selectedAdminForDependencies && (
                <DependenciesModal
                    isOpen={showDependenciesModal}
                    onClose={() => setShowDependenciesModal(false)}
                    title={modalMode === 'delete' ?
                        `Supprimer l'administrateur ${selectedAdminForDependencies.nom}` :
                        `Dépendances de ${selectedAdminForDependencies.nom}`
                    }
                    entityId={selectedAdminForDependencies.id}
                    entityType="admin"
                    entityName={`${selectedAdminForDependencies.nom} ${selectedAdminForDependencies.prenom}`}
                    onForceDelete={modalMode === 'delete' ? handleForceDelete : undefined}
                    mode={modalMode}
                />
            )}
        </div>
    );
}