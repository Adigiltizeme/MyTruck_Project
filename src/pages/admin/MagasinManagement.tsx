import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    BuildingStorefrontIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    UserIcon,
    ChartBarIcon,
    EyeIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useApi } from '../../services/api.service';
import { MagasinInfo, PersonnelInfo } from '../../types/business.types';
import { normalizeMagasin } from '../../utils/data-normalization';
import DependenciesModal from '../../components/DependenciesModal';
import { isValidPhone, isValidAddress } from '../../utils/contact-links';
import PhoneLink from '../../components/PhoneLink';
import AddressLink from '../../components/AddressLink';

interface MagasinFormData {
    nom: string;
    adresse: string;
    telephone?: string;
    email?: string;
    manager?: string;
    status: 'actif' | 'inactif' | 'maintenance';
    categories?: string[];
    // Champs pour gestion du compte utilisateur
    hasAccount?: boolean;
    password?: string;
    generatePassword?: boolean;
}

// Type temporaire pour gérer les données backend
interface BackendMagasin {
    id: string;
    nom: string;
    adresse: string;
    telephone?: string;
    email?: string;
    manager?: string;
    status: string;
    categories?: string[];
}

export default function MagasinManagement() {
    const [searchParams] = useSearchParams();
    const [magasins, setMagasins] = useState<MagasinInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMagasin, setEditingMagasin] = useState<MagasinInfo | null>(null);
    const [showStats, setShowStats] = useState<{ [key: string]: boolean }>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<{ [key: string]: any }>({});
    const [showDependenciesModal, setShowDependenciesModal] = useState(false);
    const [selectedMagasinForDependencies, setSelectedMagasinForDependencies] = useState<MagasinInfo | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'delete'>('view');
    const [formData, setFormData] = useState<MagasinFormData>({
        nom: '',
        adresse: '',
        telephone: '',
        email: '',
        manager: '',
        status: 'actif',
        categories: [],
        hasAccount: false,
        password: '',
        generatePassword: false
    });

    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const apiService = useApi();
    const categoriesDisponibles = [
        'Plantes d\'intérieur',
        'Plantes d\'extérieur',
        'Arbres et arbustes',
        'Mobilier de jardin',
        'Outillage',
        'Décoration extérieure'
    ];

    useEffect(() => {
        console.log('État selectedMagasinForDependencies changé:', selectedMagasinForDependencies);
        console.log('État showDependenciesModal changé:', showDependenciesModal);
    }, [selectedMagasinForDependencies, showDependenciesModal]);

    // Fonction pour transformer les données backend en format MagasinInfo
    const transformBackendMagasin = (backendData: BackendMagasin): MagasinInfo => {
        const normalized = normalizeMagasin({
            id: backendData.id,
            name: backendData.nom,
            address: backendData.adresse,
            phone: backendData.telephone ?? '',
            email: backendData.email,
            manager: backendData.manager,
            status: backendData.status || 'inactif',
            categories: backendData.categories || [],
            photo: ''
        });
        return normalized;
    };

    useEffect(() => {
        loadMagasins();
    }, []);

    // Initialiser la recherche depuis l'URL
    useEffect(() => {
        const searchFromUrl = searchParams.get('search');
        if (searchFromUrl) {
            setSearchTerm(searchFromUrl);
        }
    }, [searchParams]);

    const loadMagasins = async () => {
        try {
            setLoading(true);
            console.log('🏪 Chargement des magasins...');

            // Même structure que chauffeurs - appel direct au service API
            const rawData = await apiService.get('/magasins') as { data: BackendMagasin[] };

            // Transformation des données backend → frontend
            const transformedMagasins = rawData.data.map(transformBackendMagasin);
            console.log('✅ Magasins transformés:', transformedMagasins.length);

            setMagasins(transformedMagasins);
        } catch (error) {
            console.error('❌ Erreur chargement magasins:', error);
            // Fallback avec données vides pour éviter crashes
            setMagasins([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMagasinStats = async (magasinId: string) => {
        try {
            const response = await apiService.get(`/magasins/${magasinId}/stats`);
            console.log('📊 Stats reçues du backend:', response);

            // Le backend retourne déjà le total HT dans financier.chiffreAffairesTotalHT
            setStats(prev => ({
                ...prev,
                [magasinId]: typeof response === 'object' ? response : {}
            }));
        } catch (error) {
            console.error('Erreur chargement statistiques:', error);
        }
    };

    const toggleStats = async (magasinId: string) => {
        const isCurrentlyShowing = showStats[magasinId];

        setShowStats(prev => ({
            ...prev,
            [magasinId]: !isCurrentlyShowing
        }));

        if (!isCurrentlyShowing && !stats[magasinId]) {
            await loadMagasinStats(magasinId);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Confirmation avant soumission
        const action = editingMagasin ? 'modifier' : 'créer';
        
        let confirmMessage = `Confirmer l'action : ${action} le magasin "${formData.nom}" ?\n\n`;
        confirmMessage += `• Adresse: ${formData.adresse}\n`;
        confirmMessage += `• Status: ${formData.status}\n`;
        if (formData.telephone) confirmMessage += `• Téléphone: ${formData.telephone}\n`;
        if (formData.email) confirmMessage += `• Email: ${formData.email}\n`;
        if (formData.manager) confirmMessage += `• Responsable: ${formData.manager}\n`;
        if (formData.categories && formData.categories.length > 0) {
            confirmMessage += `• Catégories: ${formData.categories.join(', ')}\n`;
        }
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
            console.log('💾 Sauvegarde magasin...');
            console.log('📝 Données formulaire:', formData);

            if (editingMagasin) {
                // Mise à jour - même structure que chauffeurs
                console.log('🔄 Mise à jour magasin:', editingMagasin.id);
                await apiService.patch(`/magasins/${editingMagasin.id}`, {
                    nom: formData.nom,
                    adresse: formData.adresse,
                    telephone: formData.telephone,
                    email: formData.email,
                    manager: formData.manager,
                    status: formData.status,
                    categories: formData.categories || []
                });

                // Gestion du compte utilisateur
                if (formData.hasAccount && formData.email && formData.password) {
                    await apiService.post(`/magasins/${editingMagasin.id}/account`, {
                        email: formData.email,
                        password: formData.password,
                        generatePassword: formData.generatePassword
                    });
                }
            } else {
                // Création - même structure que chauffeurs
                console.log('➕ Création nouveau magasin');
                const response = await apiService.post<{ id: string } | { data: { id: string } }>('/magasins', {
                    nom: formData.nom,
                    adresse: formData.adresse,
                    telephone: formData.telephone,
                    email: formData.email,
                    manager: formData.manager,
                    status: formData.status,
                    categories: formData.categories || []
                });

                // Gestion du compte utilisateur pour nouveau magasin
                if (formData.hasAccount && formData.email && formData.password) {
                    const magasinId = (response as any)?.id || (response as any)?.data?.id;
                    if (magasinId) {
                        await apiService.post(`/magasins/${magasinId}/account`, {
                            email: formData.email,
                            password: formData.password,
                            generatePassword: formData.generatePassword
                        });
                    }
                }
            }

            console.log('✅ Sauvegarde réussie, rechargement...');
            await loadMagasins();
            closeModal();
        } catch (error) {
            console.error('❌ Erreur sauvegarde magasin complète:', error);
            if (error instanceof Error) {
                console.error('❌ Message d\'erreur:', error.message);
            } else {
                console.error('❌ Message d\'erreur inconnue:', error);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Confirmer la suppression de ce magasin ?')) {
            return;
        }
        try {
            await apiService.delete(`/magasins/${id}`);
            await loadMagasins();
        } catch (error: any) {
            if (error.message.includes('données liées') || error.message.includes('400')) {
                const magasin = magasins.find(m => m.id === id);
                if (magasin) {
                    setSelectedMagasinForDependencies(magasin);
                    setModalMode('delete');
                    setShowDependenciesModal(true);
                }
            }
        }
    };

    const handleForceDelete = async () => {
        console.log('🔥 handleForceDelete appelé, selectedMagasin:', selectedMagasinForDependencies);

        if (!selectedMagasinForDependencies) {
            console.log('❌ Pas de magasin sélectionné');
            return;
        }

        const confirmMessage = `⚠️ SUPPRESSION FORCÉE ⚠️\n\n` +
            `Vous êtes sur le point de supprimer définitivement le magasin "${selectedMagasinForDependencies.name}" et TOUTES ses données liées.\n\n` +
            `Cette action est IRRÉVERSIBLE !\n\n` +
            `Tapez "SUPPRIMER" pour confirmer:`;

        const confirmation = prompt(confirmMessage);

        if (confirmation === 'SUPPRIMER') {
            try {
                console.log('🔥 Suppression forcée demandée pour:', selectedMagasinForDependencies.id);
                await apiService.delete(`/magasins/${selectedMagasinForDependencies.id}?force=true`);
                console.log('✅ Suppression forcée réussie, rechargement...');
                await loadMagasins();
                setSelectedMagasinForDependencies(null);
            } catch (forceError: any) {
                console.error('❌ Erreur suppression forcée:', forceError);
                alert('Erreur lors de la suppression forcée: ' + forceError.message);
            }
        }
    };

    const handleViewDependencies = (magasin: MagasinInfo) => {
        setSelectedMagasinForDependencies(magasin);
        setModalMode('view');
        setShowDependenciesModal(true);
    };

    const openModal = (magasin?: MagasinInfo) => {
        if (magasin) {
            setEditingMagasin(magasin);
            setFormData({
                nom: magasin.name,
                adresse: magasin.address,
                telephone: magasin.phone || '',
                email: magasin.email || '',
                manager: magasin.manager || '',
                status: (magasin.status as 'actif' | 'inactif' | 'maintenance') || 'actif',
                categories: magasin.categories || [],
                hasAccount: !!magasin.email,
                password: '',
                generatePassword: false
            });
            setShowPasswordFields(!!magasin.email);
        } else {
            setEditingMagasin(null);
            setFormData({
                nom: '',
                adresse: '',
                telephone: '',
                email: '',
                manager: '',
                status: 'actif',
                categories: [],
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
        setEditingMagasin(null);
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
            case 'actif': return 'bg-green-100 text-green-800';
            case 'inactif': return 'bg-red-100 text-red-800';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'actif': return '🟢';
            case 'inactif': return '🔴';
            case 'maintenance': return '🟡';
            default: return '⚪';
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
                    <h1 className="text-3xl font-bold text-gray-900">Gestion des Magasins</h1>
                    <p className="text-gray-600 mt-1">{magasins.length} magasin(s) partenaire(s)</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Nouveau magasin
                </button>
            </div>

            {/* Statistiques globales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <BuildingStorefrontIcon className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Magasins actifs</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {magasins.filter(m => m.status === 'actif').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <MapPinIcon className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Avec adresse</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {magasins.filter(m => m.address && m.address.length > 0).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <UserIcon className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Avec vendeur</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {magasins.filter(m => m.manager && m.manager.length > 0).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <PhoneIcon className="h-8 w-8 text-orange-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Avec téléphone</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {magasins.filter(m => m.phone && m.phone.length > 0).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Liste des magasins */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Magasins partenaires</h3>
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
                            placeholder="Rechercher par nom, email ou adresse..."
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

                {magasins.filter((magasin) => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                        magasin.name?.toLowerCase().includes(search) ||
                        magasin.email?.toLowerCase().includes(search) ||
                        magasin.address?.toLowerCase().includes(search) ||
                        magasin.manager?.toLowerCase().includes(search)
                    );
                }).length === 0 ? (
                    <div className="text-center py-12">
                        <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {searchTerm ? 'Aucun résultat trouvé' : 'Aucun magasin'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm
                                ? `Aucun magasin ne correspond à "${searchTerm}"`
                                : 'Commencez par ajouter un nouveau magasin partenaire.'
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
                                    Nouveau magasin
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {magasins
                            .filter((magasin) => {
                                if (!searchTerm) return true;
                                const search = searchTerm.toLowerCase();
                                return (
                                    magasin.name?.toLowerCase().includes(search) ||
                                    magasin.email?.toLowerCase().includes(search) ||
                                    magasin.address?.toLowerCase().includes(search) ||
                                    magasin.manager?.toLowerCase().includes(search)
                                );
                            })
                            .map((magasin) => (
                            <div key={magasin.id}>
                                <div className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0 h-14 w-14 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg">
                                                {magasin.name?.charAt(0) || 'M'}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center space-x-3">
                                                    <h4 className="text-lg font-bold text-gray-900 truncate">
                                                        {magasin.name || 'Nom non défini'}
                                                    </h4>
                                                    <span className="text-lg">
                                                        {getStatusIcon(magasin.status)}
                                                    </span>
                                                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${getStatusColor(magasin.status)}`}>
                                                        {magasin.status === 'actif' ? 'Actif' :
                                                            magasin.status === 'inactif' ? 'Inactif' :
                                                                'Maintenance'}
                                                    </span>
                                                </div>

                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                                                        {isValidAddress(magasin.address) ? (
                                                            <AddressLink
                                                                address={magasin.address!}
                                                                className="truncate"
                                                                showIcon={false}
                                                            />
                                                        ) : (
                                                            <span className="truncate">{magasin.address || 'Adresse non définie'}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                                                        {magasin.phone && (
                                                            <div className="flex items-center">
                                                                <PhoneIcon className="h-4 w-4 mr-1" />
                                                                {isValidPhone(magasin.phone) ? (
                                                                    <PhoneLink
                                                                        phone={magasin.phone!}
                                                                        showIcon={false}
                                                                    />
                                                                ) : (
                                                                    magasin.phone
                                                                )}
                                                            </div>
                                                        )}
                                                        {magasin.email && (
                                                            <div className="flex items-center">
                                                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                                                {magasin.email}
                                                            </div>
                                                        )}
                                                        {magasin.manager && (
                                                            <div className="flex items-center">
                                                                <UserIcon className="h-4 w-4 mr-1" />
                                                                {magasin.manager}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => toggleStats(magasin.id)}
                                                className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"
                                                title="Voir statistiques"
                                            >
                                                <ChartBarIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleViewDependencies(magasin)}
                                                className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"
                                                title="Voir les dépendances"
                                            >
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => openModal(magasin)}
                                                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                                                title="Modifier"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(magasin.id)}
                                                className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"
                                                title="Supprimer"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Statistiques détaillées */}
                                {showStats[magasin.id] && (
                                    <div className="px-6 py-4 bg-gray-50 border-t">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                <p className="text-sm font-medium text-gray-500">Commandes totales</p>
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {stats[magasin.id]?.totaux?.commandesOrigine || 0}
                                                </p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                <p className="text-sm font-medium text-gray-500">Factures</p>
                                                <p className="text-2xl font-bold text-purple-600">
                                                    {stats[magasin.id]?.totaux?.factures || 0}
                                                </p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                <p className="text-sm font-medium text-gray-500">Devis</p>
                                                <p className="text-2xl font-bold text-orange-600">
                                                    {stats[magasin.id]?.totaux?.devis || 0}
                                                </p>
                                            </div>
                                            {/* 💰 Total HT */}
                                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg shadow-sm border-2 border-green-300">
                                                <p className="text-sm font-medium text-green-700">💰 Total HT</p>
                                                <p className="text-2xl font-bold text-green-700">
                                                    {stats[magasin.id]?.financier?.chiffreAffairesTotalHT !== undefined && stats[magasin.id]?.financier?.chiffreAffairesTotalHT !== null
                                                        ? `${Number(stats[magasin.id].financier.chiffreAffairesTotalHT).toFixed(2)}€`
                                                        : '0.00€'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de création/édition */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                                {editingMagasin ? 'Modifier le magasin' : 'Nouveau magasin'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Informations de base */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-md font-medium text-gray-800 mb-3">Informations générales</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Nom du magasin *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.nom}
                                                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                                                placeholder="ex: Truffaut Boulogne"
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Adresse complète *
                                            </label>
                                            <textarea
                                                required
                                                rows={2}
                                                value={formData.adresse}
                                                onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                                                placeholder="ex: 33 Av. Edouard Vaillant, 92100 Boulogne-Billancourt"
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
                                                <option value="actif">🟢 Actif</option>
                                                <option value="inactif">🔴 Inactif</option>
                                                <option value="maintenance">🟡 Maintenance</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Vendeur/Responsable
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.manager}
                                                onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                                                placeholder="ex: Marie Dupont"
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h4 className="text-md font-medium text-gray-800 mb-3">Informations de contact</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Téléphone
                                            </label>
                                            <input
                                                type="tel"
                                                value={formData.telephone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                                                placeholder="ex: 01 23 45 67 89"
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
                                                placeholder="ex: boulogne@truffaut.com"
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Catégories */}
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h4 className="text-md font-medium text-gray-800 mb-3">Catégories de produits</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {categoriesDisponibles.map((categorie) => (
                                            <label key={categorie} className="flex items-center space-x-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.categories?.includes(categorie)}
                                                    onChange={(e) => {
                                                        const categories = formData.categories || [];
                                                        if (e.target.checked) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                categories: [...categories, categorie]
                                                            }));
                                                        } else {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                categories: categories.filter(c => c !== categorie)
                                                            }));
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span>{categorie}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Gestion du compte utilisateur */}
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <h4 className="text-md font-medium text-gray-800 mb-3">Compte utilisateur</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                id="hasAccount"
                                                checked={formData.hasAccount}
                                                onChange={(e) => handleAccountToggle(e.target.checked)}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <label htmlFor="hasAccount" className="text-sm font-medium text-gray-700">
                                                Créer/modifier un compte de connexion pour ce magasin
                                            </label>
                                        </div>

                                        {showPasswordFields && (
                                            <>
                                                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                                                    <p className="font-medium">ℹ️ Information importante :</p>
                                                    <p>L'email renseigné ci-dessus sera utilisé comme identifiant de connexion.</p>
                                                    {editingMagasin && (
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

                                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
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
                                        {editingMagasin ? 'Modifier' : 'Créer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <DependenciesModal
                isOpen={showDependenciesModal}
                onClose={() => {
                    setShowDependenciesModal(false);
                    setSelectedMagasinForDependencies(null);
                }}
                entityType="magasin"
                entityId={selectedMagasinForDependencies?.id || ''}
                entityName={selectedMagasinForDependencies?.name || ''}
                onForceDelete={handleForceDelete}
                showDeleteButton={modalMode === 'delete'}
                title={modalMode === 'delete' ? "Suppression du magasin" : "Dépendances du magasin"}
                mode={modalMode}
            />
        </div>
    );
}