import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    MapPinIcon,
    PhoneIcon,
    EnvelopeIcon,
    TruckIcon,
    EyeIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useApi } from '../../services/api.service';
import { PersonnelInfo, ChauffeurStatus, MagasinInfo } from '../../types/business.types';
import DependenciesModal from '../../components/DependenciesModal';

interface ChauffeurFormData {
    nom: string;
    prenom: string;
    telephone?: string;
    email?: string;
    status: ChauffeurStatus;
    notes?: number;
    longitude?: number;
    latitude?: number;
    // Champs pour gestion du compte utilisateur
    hasAccount?: boolean;
    password?: string;
    generatePassword?: boolean;
}

// Type temporaire pour gérer les données backend
interface BackendChauffeur {
    id: string;
    nom: string;
    prenom?: string;
    telephone?: string;
    email?: string;
    status: string;
    role: string;
    longitude?: number;
    latitude?: number;
    notes?: number;
}

export default function ChauffeurManagement() {
    const [searchParams] = useSearchParams();
    const [chauffeurs, setChauffeurs] = useState<PersonnelInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingChauffeur, setEditingChauffeur] = useState<PersonnelInfo | null>(null);
    const [showDependenciesModal, setShowDependenciesModal] = useState(false);
    const [selectedChauffeurForDependencies, setSelectedChauffeurForDependencies] = useState<PersonnelInfo | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'delete'>('view');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<ChauffeurFormData>({
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        status: 'Actif',
        notes: 5,
        longitude: undefined,
        latitude: undefined,
        hasAccount: false,
        password: '',
        generatePassword: false
    });

    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const apiService = useApi();

    // Fonction pour transformer les données backend en format PersonnelInfo
    const transformBackendChauffeur = (backendData: BackendChauffeur): PersonnelInfo => {
        return {
            id: backendData.id,
            nom: backendData.nom,
            prenom: backendData.prenom || '',
            telephone: backendData.telephone || '',
            email: backendData.email || '',
            role: (['Chauffeur', 'Direction', 'Section IT', 'Dispatcher'].includes(backendData.role)
                ? backendData.role
                : 'Chauffeur') as 'Chauffeur' | 'Direction' | 'Section IT' | 'Dispatcher',
            status: (formData.status.includes(backendData.status)
                ? backendData.status
                : 'Actif') as ChauffeurStatus,
            location: backendData.latitude && backendData.longitude ? {
                latitude: backendData.latitude,
                longitude: backendData.longitude
            } : undefined
        };
    };

    useEffect(() => {
        loadChauffeurs();
    }, []);

    // Initialiser la recherche depuis l'URL
    useEffect(() => {
        const searchFromUrl = searchParams.get('search');
        if (searchFromUrl) {
            setSearchTerm(searchFromUrl);
        }
    }, [searchParams]);

    const loadChauffeurs = async () => {
        try {
            setLoading(true);
            const rawData = await apiService.get('/chauffeurs') as { data: BackendChauffeur[] } | BackendChauffeur[];

            // Gestion flexible du format de réponse
            const backendChauffeurs = Array.isArray(rawData) ? rawData : rawData.data;

            // Transformation des données backend → frontend
            const transformedChauffeurs = backendChauffeurs.map(transformBackendChauffeur);

            setChauffeurs(transformedChauffeurs);
        } catch (error) {
            console.error('Erreur chargement chauffeurs:', error);
            // Fallback avec données vides pour éviter crashes
            setChauffeurs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Confirmation avant soumission
        const action = editingChauffeur ? 'modifier' : 'créer';
        const nom = `${formData.prenom} ${formData.nom}`.trim();
        
        let confirmMessage = `Confirmer l'action : ${action} le chauffeur "${nom}" ?\n\n`;
        confirmMessage += `• Status: ${formData.status}\n`;
        if (formData.telephone) confirmMessage += `• Téléphone: ${formData.telephone}\n`;
        if (formData.email) confirmMessage += `• Email: ${formData.email}\n`;
        if (formData.hasAccount && formData.password) {
            confirmMessage += `• Compte utilisateur: OUI (mot de passe défini)\n`;
        }
        
        // Validation de la confirmation du mot de passe
        if (formData.hasAccount && formData.password && formData.password !== passwordConfirmation) {
            alert('❌ Erreur : Les mots de passe ne correspondent pas !\n\nVeuillez vérifier la saisie dans les deux champs.');
            return;
        }
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            if (editingChauffeur) {
                // Mise à jour - utiliser le format backend
                await apiService.patch(`/chauffeurs/${editingChauffeur.id}`, {
                    nom: formData.nom,
                    prenom: formData.prenom,
                    telephone: formData.telephone,
                    email: formData.email,
                    status: formData.status,
                    notes: formData.notes,
                    longitude: formData.longitude,
                    latitude: formData.latitude
                });

                // Gestion du compte utilisateur
                if (formData.hasAccount && formData.email && formData.password) {
                    await apiService.patch(`/chauffeurs/${editingChauffeur.id}/password`, {
                        password: formData.password
                    });
                }
            } else {
                // Création - utiliser le format backend
                const response = await apiService.post('/chauffeurs', {
                    nom: formData.nom,
                    prenom: formData.prenom,
                    telephone: formData.telephone,
                    email: formData.email,
                    status: formData.status,
                    notes: formData.notes,
                    longitude: formData.longitude,
                    latitude: formData.latitude
                }) as { id?: string; data?: { id?: string } };

                // Gestion du compte utilisateur pour nouveau chauffeur
                if (formData.hasAccount && formData.email && formData.password) {
                    const chauffeurId = response?.id || response?.data?.id;
                    if (chauffeurId) {
                        await apiService.patch(`/chauffeurs/${chauffeurId}/password`, {
                            password: formData.password
                        });
                    }
                }
            }

            await loadChauffeurs();
            closeModal();
        } catch (error) {
            console.error('Erreur sauvegarde chauffeur:', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            console.log('🗑️ Première tentative de suppression chauffeur:', id);
            await apiService.delete(`/chauffeurs/${id}`);
            console.log('✅ Suppression réussie, rechargement...');
            await loadChauffeurs();
        } catch (error: any) {
            console.error('❌ Erreur suppression chauffeur:', error);

            // Si l'erreur indique des assignations actives, proposer d'afficher les détails
            if (error.message.includes('assignation') || error.message.includes('active') || error.message.includes('données liées') || error.message.includes('400')) {
                const chauffeur = chauffeurs.find(c => c.id === id);
                if (chauffeur) {
                    setSelectedChauffeurForDependencies(chauffeur);
                    setModalMode('delete');
                    setShowDependenciesModal(true);
                }
            } else {
                // Autres types d'erreur
                alert('Erreur lors de la suppression: ' + error.message);
            }
        }
    };

    const handleForceDelete = async () => {
        if (!selectedChauffeurForDependencies) return;

        const confirmMessage = `⚠️ SUPPRESSION FORCÉE ⚠️\n\n` +
            `Vous êtes sur le point de supprimer définitivement le chauffeur "${selectedChauffeurForDependencies.prenom} ${selectedChauffeurForDependencies.nom}" et TOUTES ses données liées.\n\n` +
            `Cette action est IRRÉVERSIBLE !\n\n` +
            `Tapez "SUPPRIMER" pour confirmer:`;

        const confirmation = prompt(confirmMessage);

        if (confirmation === 'SUPPRIMER') {
            try {
                console.log('🔥 Suppression forcée demandée pour:', selectedChauffeurForDependencies.id);
                await apiService.delete(`/chauffeurs/${selectedChauffeurForDependencies.id}?force=true`);
                console.log('✅ Suppression forcée réussie, rechargement...');
                await loadChauffeurs();
                setSelectedChauffeurForDependencies(null);
            } catch (forceError: any) {
                console.error('❌ Erreur suppression forcée:', forceError);
                alert('Erreur lors de la suppression forcée: ' + forceError.message);
            }
        }
    };

    const handleViewDependencies = (chauffeur: PersonnelInfo) => {
        setSelectedChauffeurForDependencies(chauffeur);
        setModalMode('view');
        setShowDependenciesModal(true);
    };

    const openModal = (chauffeur?: PersonnelInfo) => {
        if (chauffeur) {
            setEditingChauffeur(chauffeur);
            setFormData({
                nom: chauffeur.nom,
                prenom: chauffeur.prenom || '',
                telephone: chauffeur.telephone || '',
                email: chauffeur.email || '',
                status: chauffeur.status as ChauffeurStatus,
                notes: 5,
                longitude: chauffeur.location?.longitude,
                latitude: chauffeur.location?.latitude,
                hasAccount: !!chauffeur.email,
                password: '',
                generatePassword: false
            });
            setShowPasswordFields(!!chauffeur.email);
        } else {
            setEditingChauffeur(null);
            setFormData({
                nom: '',
                prenom: '',
                telephone: '',
                email: '',
                status: 'Actif',
                notes: 5,
                longitude: undefined,
                latitude: undefined,
                hasAccount: false,
                password: '',
                generatePassword: false
            });
            setShowPasswordFields(false);
            setGeneratedPassword('');
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingChauffeur(null);
        setShowPasswordFields(false);
        setGeneratedPassword('');
        setPasswordConfirmation('');
    };

    const handleGeneratePassword = () => {
        // Génération de mot de passe côté frontend
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        setFormData(prev => ({ ...prev, password, generatePassword: false }));
        setGeneratedPassword(password);
        setPasswordConfirmation(password); // Auto-remplir la confirmation
    };

    const handleAccountToggle = (hasAccount: boolean) => {
        setFormData(prev => ({ ...prev, hasAccount }));
        setShowPasswordFields(hasAccount);
        if (!hasAccount) {
            setFormData(prev => ({ ...prev, password: '', generatePassword: false }));
            setGeneratedPassword('');
            setPasswordConfirmation('');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Actif': return 'bg-green-100 text-green-800';
            case 'Inactif': return 'bg-red-100 text-red-800';
            case 'En route vers magasin': return 'bg-blue-100 text-blue-800';
            case 'En route vers client': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestion des Chauffeurs</h1>
                    <p className="text-gray-600 mt-1">{chauffeurs.length} chauffeur(s) enregistré(s)</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Nouveau chauffeur
                </button>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <TruckIcon className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Chauffeurs actifs</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {chauffeurs.filter(c => c.status === 'Actif').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <MapPinIcon className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Avec géolocalisation</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {chauffeurs.filter(c => c.location?.latitude && c.location?.longitude).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <PhoneIcon className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Avec téléphone</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {chauffeurs.filter(c => c.telephone).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Liste des chauffeurs */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Liste des chauffeurs</h3>
                </div>

                {/* Barre de recherche */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher par nom, prénom ou email..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {chauffeurs.filter((chauffeur) => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                        chauffeur.nom?.toLowerCase().includes(search) ||
                        chauffeur.prenom?.toLowerCase().includes(search) ||
                        chauffeur.email?.toLowerCase().includes(search) ||
                        `${chauffeur.nom} ${chauffeur.prenom}`.toLowerCase().includes(search)
                    );
                }).length === 0 ? (
                    <div className="text-center py-12">
                        <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {searchTerm ? 'Aucun résultat trouvé' : 'Aucun chauffeur'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm
                                ? `Aucun chauffeur ne correspond à "${searchTerm}"`
                                : 'Commencez par ajouter un nouveau chauffeur.'
                            }
                        </p>
                        {searchTerm ? (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                Effacer la recherche
                            </button>
                        ) : (
                            <div className="mt-6">
                                <button
                                    onClick={() => openModal()}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                                >
                                    <PlusIcon className="h-5 w-5 mr-2" />
                                    Nouveau chauffeur
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {chauffeurs
                            .filter((chauffeur) => {
                                if (!searchTerm) return true;
                                const search = searchTerm.toLowerCase();
                                return (
                                    chauffeur.nom?.toLowerCase().includes(search) ||
                                    chauffeur.prenom?.toLowerCase().includes(search) ||
                                    chauffeur.email?.toLowerCase().includes(search) ||
                                    `${chauffeur.nom} ${chauffeur.prenom}`.toLowerCase().includes(search)
                                );
                            })
                            .map((chauffeur) => (
                            <div key={chauffeur.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0 h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                                            {chauffeur.nom.charAt(0)}{chauffeur.prenom?.charAt(0)}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="text-lg font-bold text-gray-900 truncate">
                                                    {chauffeur.prenom} {chauffeur.nom}
                                                </h4>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(chauffeur.status)}`}>
                                                    {chauffeur.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                                {chauffeur.telephone && (
                                                    <div className="flex items-center">
                                                        <PhoneIcon className="h-4 w-4 mr-1" />
                                                        {chauffeur.telephone}
                                                    </div>
                                                )}
                                                {chauffeur.email && (
                                                    <div className="flex items-center">
                                                        <EnvelopeIcon className="h-4 w-4 mr-1" />
                                                        {chauffeur.email}
                                                    </div>
                                                )}
                                                {chauffeur.location?.latitude && chauffeur.location?.longitude && (
                                                    <div className="flex items-center">
                                                        <MapPinIcon className="h-4 w-4 mr-1" />
                                                        GPS activé
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleViewDependencies(chauffeur)}
                                            className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"
                                            title="Voir les dépendances"
                                        >
                                            <EyeIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => openModal(chauffeur)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        {/* <button
                                            onClick={() => {
                                                setSelectedChauffeurForDependencies(chauffeur);
                                                setShowDependenciesModal(true);
                                            }}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button> */}
                                        <button
                                            onClick={() => handleDelete(chauffeur.id)}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de création/édition */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                                {editingChauffeur ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nom *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nom}
                                            onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Prénom
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.prenom}
                                            onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Téléphone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.telephone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Statut
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                        >
                                            <option value="Actif">Actif</option>
                                            <option value="Inactif">Inactif</option>
                                            <option value="En route vers magasin">En route vers magasin</option>
                                            <option value="En route vers client">En route vers client</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Note (1-5)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={formData.notes || 5}
                                            onChange={(e) => setFormData(prev => ({ ...prev, notes: parseInt(e.target.value) }))}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                </div>

                                {/* Gestion du compte utilisateur */}
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <h4 className="text-md font-medium text-gray-800 mb-3">Compte utilisateur</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                id="hasAccountChauffeur"
                                                checked={formData.hasAccount}
                                                onChange={(e) => handleAccountToggle(e.target.checked)}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <label htmlFor="hasAccountChauffeur" className="text-sm font-medium text-gray-700">
                                                Créer/modifier un compte de connexion pour ce chauffeur
                                            </label>
                                        </div>

                                        {showPasswordFields && (
                                            <>
                                                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                                                    <p className="font-medium">ℹ️ Information importante :</p>
                                                    <p>L'email renseigné ci-dessus sera utilisé comme identifiant de connexion.</p>
                                                    {editingChauffeur && (
                                                        <p className="mt-1 text-amber-600">
                                                            ⚠️ Modification du mot de passe d'un compte existant.
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Mot de passe
                                                        </label>
                                                        <div className="flex space-x-2">
                                                            <input
                                                                type="password"
                                                                value={formData.password}
                                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                                placeholder="Saisir un mot de passe ou générer automatiquement"
                                                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleGeneratePassword}
                                                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                                                                title="Générer automatiquement"
                                                            >
                                                                🎲 Auto
                                                            </button>
                                                        </div>
                                                        {generatedPassword && (
                                                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                                                <p className="text-green-800 font-medium">✅ Mot de passe généré :</p>
                                                                <p className="font-mono text-green-900 bg-green-100 p-1 rounded">
                                                                    {generatedPassword}
                                                                </p>
                                                                <p className="text-green-700 text-xs mt-1">
                                                                    Notez ce mot de passe, il ne sera plus affiché.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Confirmer le mot de passe
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={passwordConfirmation}
                                                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                                                            placeholder="Ressaisir le mot de passe"
                                                            className={`block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary ${
                                                                formData.password && passwordConfirmation && formData.password !== passwordConfirmation
                                                                    ? 'border-red-300 bg-red-50'
                                                                    : 'border-gray-300'
                                                            }`}
                                                        />
                                                        {formData.password && passwordConfirmation && formData.password !== passwordConfirmation && (
                                                            <p className="mt-1 text-sm text-red-600">
                                                                ❌ Les mots de passe ne correspondent pas
                                                            </p>
                                                        )}
                                                        {formData.password && passwordConfirmation && formData.password === passwordConfirmation && (
                                                            <p className="mt-1 text-sm text-green-600">
                                                                ✅ Les mots de passe correspondent
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
                                    >
                                        {editingChauffeur ? 'Modifier' : 'Créer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal des dépendances */}
            <DependenciesModal
                isOpen={showDependenciesModal}
                onClose={() => {
                    setShowDependenciesModal(false);
                    setSelectedChauffeurForDependencies(null);
                }}
                title={modalMode === 'delete' ? 'Confirmation de suppression' : 'Dépendances du chauffeur'}
                mode={modalMode}
                entityType="chauffeur"
                entityId={selectedChauffeurForDependencies?.id || ''}
                entityName={
                    selectedChauffeurForDependencies
                        ? `${selectedChauffeurForDependencies.prenom} ${selectedChauffeurForDependencies.nom}`.trim()
                        : ''
                }
                onForceDelete={handleForceDelete}
                showDeleteButton={modalMode === 'delete'}
            />
        </div>
    );
}