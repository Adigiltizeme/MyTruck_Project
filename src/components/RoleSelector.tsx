import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/roles';
import { useOffline } from '../contexts/OfflineContext';
import { useDraftStorage } from '../hooks/useDraftStorage';
import { normalizeMagasin } from '../utils/data-normalization';



export const RoleSelector = () => {
    const { user, setRole } = useAuth();
    const { dataService } = useOffline();
    const [stores, setStores] = useState<any[]>([]); // ✅ Initialiser avec tableau vide
    const [selectedStore, setSelectedStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chauffeurs, setChauffeurs] = useState<any[]>([]);
    const [selectedChauffeur, setSelectedChauffeur] = useState<any>(null);

    // Mettre à jour le brouillon si existant
    const { updateDraftStoreInfo } = useDraftStorage();

    // console.log('Utilisateur actuel:', user); // Pour déboguer

    useEffect(() => {
        // Si le rôle ou le magasin change, mettre à jour l'état local
        if (user?.role === 'magasin' && user.storeId && stores.length > 0) {
            const store = stores.find(s => s.id === user.storeId);
            if (store) {
                console.log("Mise à jour du magasin sélectionné:", store.name);
                setSelectedStore(store);
            }
        }
    }, [user?.role, user?.storeId, stores]);

    // Charger les magasins depuis le service
    useEffect(() => {
        const loadStores = async () => {
            try {
                setLoading(true);

                // ✅ VÉRIFICATION DES PERMISSIONS : Ne charger les magasins que si l'utilisateur en a le droit
                if (user?.role !== 'admin' && user?.role !== 'magasin') {
                    setLoading(false);
                    return;
                }

                // ✅ CORRECTION : Utiliser getMagasins() du Backend
                const magasins = await dataService.getMagasins();

                if (magasins && magasins.length > 0) {
                    // ✅ TRANSFORMATION : Adapter la structure si nécessaire
                    const storesFormatted = magasins.map(m => {
                        const normalized = normalizeMagasin(m);
                        return {
                            id: m.id,
                            name: normalized.name,
                            address: normalized.address || 'Adresse non renseignée'
                        };
                    });

                    setStores(storesFormatted);

                    // Sélectionner le magasin de l'utilisateur ou le premier
                    if (user?.role === 'magasin' && user.storeId) {
                        const userStore = storesFormatted.find(s => s.id === user.storeId);
                        setSelectedStore(userStore || storesFormatted[0]);
                    } else {
                        setSelectedStore(storesFormatted[0]);
                    }
                } else {
                    console.warn('⚠️ Aucun magasin trouvé dans le Backend');
                    setError('Aucun magasin disponible');
                }

                // ✅ PROTECTION : Charger chauffeurs avec gestion d'erreur séparée
                if (user?.role === 'admin') {
                    try {
                        const personnelData = await dataService.getPersonnel();
                        const driversData = personnelData.filter((p: any) => p.role === 'Chauffeur');
                        setChauffeurs(driversData);
                    } catch (personnelError) {
                        console.error('❌ Erreur chargement personnel dans loadStores:', personnelError);
                        setChauffeurs([]); // Fallback liste vide
                    }
                }

            } catch (error) {
                console.error('❌ Erreur chargement magasins:', error);
                setError('Impossible de charger la liste des magasins depuis le Backend');
                // ✅ FALLBACK : Magasins par défaut pour continuer l'interface
                setStores([{
                    id: 'maintenance',
                    name: 'Service en maintenance',
                    address: 'Reconnexion en cours...'
                }]);
                setSelectedStore({
                    id: 'maintenance',
                    name: 'Service en maintenance',
                    address: 'Reconnexion en cours...'
                });
            } finally {
                setLoading(false);
            }
        };

        loadStores();
    }, [dataService, user?.storeId, user?.role, user?.driverId]);

    useEffect(() => {
        const loadChauffeurs = async () => {
            // ✅ VÉRIFICATION DES PERMISSIONS : Seuls les admins peuvent charger la liste complète des chauffeurs
            if (user?.role === 'admin') {
                try {
                    const personnelData = await dataService.getPersonnel();
                    const chauffeursData = personnelData.filter((p: any) => 
                        p.role === 'Chauffeur' || p.role === 'chauffeur'
                    );
                    setChauffeurs(chauffeursData);

                    // Sélectionner le chauffeur actuel si en mode chauffeur
                    if (user?.driverId) {
                        const currentChauffeur = chauffeursData.find(c => c.id === user.driverId);
                        // Adapt status to match Personnel type
                        if (currentChauffeur) {
                            setSelectedChauffeur({
                                ...currentChauffeur,
                                status: currentChauffeur.status === 'Actif' || currentChauffeur.status === 'Inactif'
                                    ? currentChauffeur.status
                                    : 'Actif' // or 'Inactif', depending on your logic
                            });
                        } else {
                            setSelectedChauffeur(null);
                        }
                    }
                } catch (error) {
                    console.error('❌ Erreur chargement chauffeurs:', error);
                    // ✅ FALLBACK : Créer une liste vide plutôt que planter
                    setChauffeurs([]);
                    setSelectedChauffeur(null);
                    console.log('🔄 Mode dégradé : liste chauffeurs vide');
                }
            } else if (user?.role === 'chauffeur' && user?.driverId) {
                // ✅ CAS SPÉCIAL : Si c'est un chauffeur connecté, créer son propre profil dans la liste
                const chauffeurProfile = {
                    id: user.driverId,
                    nom: user.name.split(' ').pop() || user.name,
                    prenom: user.name.split(' ').shift() || '',
                    email: user.email,
                    role: 'Chauffeur',
                    status: 'Actif'
                };
                setChauffeurs([chauffeurProfile]);
                setSelectedChauffeur(chauffeurProfile);
            }
        };

        loadChauffeurs();
    }, [dataService, user?.role, user?.driverId]);

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const role = e.target.value as UserRole;

        switch (role) {
            case 'magasin':
                if (selectedStore) {
                    console.log('Changement vers rôle magasin:', selectedStore.name);
                    setRole(role, {
                        storeId: selectedStore.id,
                        storeName: selectedStore.name,
                        storeAddress: selectedStore.address
                    });

                    // Réinitialiser l'état de proposition de brouillon
                    localStorage.setItem('draftProposed', 'false');

                    // Déclencher un événement personnalisé
                    window.dispatchEvent(new CustomEvent('rolechange', {
                        detail: { role, storeId: selectedStore.id }
                    }));
                } else {
                    console.warn('Aucun magasin sélectionné');
                }
                break;
            case 'chauffeur':
                const chauffeurToSelect = selectedChauffeur || (chauffeurs.length > 0 ? chauffeurs[0] : null);

                if (chauffeurToSelect) {
                    console.log('Changement vers rôle chauffeur:', chauffeurToSelect.nom);

                    // Mettre à jour la sélection locale
                    setSelectedChauffeur(chauffeurToSelect);

                    // Appliquer le rôle
                    setRole(role, {
                        driverId: chauffeurToSelect.id,
                        driverName: `${chauffeurToSelect.prenom} ${chauffeurToSelect.nom}`,
                    });

                    // Déclencher événement
                    window.dispatchEvent(new CustomEvent('rolechange', {
                        detail: { role, driverId: chauffeurToSelect.id }
                    }));
                } else {
                    console.warn('Aucun chauffeur disponible');
                    // Rester en admin si pas de chauffeur
                    return;
                }
                break;
            default:
                setRole('admin');
        }
    };

    const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const storeId = e.target.value;
        console.log('Sélection du magasin avec ID:', storeId);

        const store = stores.find(s => s.id === storeId);
        if (store) {
            // Stocker aussi dans localStorage pour plus de robustesse
            localStorage.setItem('currentStoreInfo', JSON.stringify({
                id: store.id,
                name: store.name,
                address: store.address
            }));

            setSelectedStore(store);

            // Si déjà en rôle magasin, mettre à jour
            if (user?.role === 'magasin') {
                setRole('magasin', {
                    storeId: store.id,
                    storeName: store.name,
                    storeAddress: store.address
                });

                updateDraftStoreInfo(store.id, store.name, store.address);

                // Déclencher un événement personnalisé pour informer les autres composants
                window.dispatchEvent(new CustomEvent('storechange', {
                    detail: {
                        id: store.id,
                        name: store.name,
                        address: store.address
                    }
                }));
                // setTimeout(() => {
                //     refreshUserContext();
                // }, 100);
                console.log('Magasin changé:', store.name, store.address);
            }
        } else {
            console.error('Magasin non trouvé pour ID:', storeId);
        }
    };

    const handleChauffeurChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const chauffeurId = e.target.value;
        const chauffeur = chauffeurs.find(c => c.id === chauffeurId);

        if (chauffeur) {
            setSelectedChauffeur(chauffeur);

            // Si déjà en rôle chauffeur, mettre à jour
            if (user?.role === 'chauffeur') {
                setRole('chauffeur', {
                    driverId: chauffeur.id,
                    driverName: `${chauffeur.prenom} ${chauffeur.nom}`,
                });
            }
        }
    };

    if (loading) {
        return (
            <div className="mb-4 flex items-center">
                <div className="mr-2">Chargement des données...</div>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mb-4 text-red-600">
                {error}
            </div>
        );
    }

    return (
        <div className="mb-4 flex items-center gap-4 flex-wrap">
            <div>
                <label className="text-sm font-medium mr-2">Rôle test :</label>
                <select
                    value={user?.role || 'admin'}
                    onChange={handleRoleChange}
                    disabled={user?.role === 'chauffeur'} // ✅ Empêcher les chauffeurs de changer de rôle
                    className="border rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {user?.role === 'chauffeur' ? (
                        <option value="chauffeur">Chauffeur</option>
                    ) : (
                        <>
                            <option value="admin">Admin</option>
                            <option value="magasin">Magasin</option>
                            <option value="chauffeur">Chauffeur</option>
                        </>
                    )}
                </select>
            </div>

            {user?.role === 'magasin' && (
                <div>
                    <label className="text-sm font-medium mr-2">Magasin :</label>
                    <select
                        value={selectedStore.id}
                        onChange={handleStoreChange}
                        className="border rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    >
                        {stores.map(store => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {user?.role === 'chauffeur' && (
                <div>
                    <label className="text-sm font-medium mr-2">Chauffeur :</label>
                    <select
                        value={selectedChauffeur?.id || ''}
                        onChange={handleChauffeurChange}
                        disabled={true} // ✅ Les chauffeurs ne peuvent pas changer d'identité
                        className="border rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {chauffeurs.map(chauffeur => (
                            <option key={chauffeur.id} value={chauffeur.id}>
                                {chauffeur.prenom} {chauffeur.nom} ({chauffeur.status})
                            </option>
                        ))}
                    </select>
                </div>
            )}


            <span className="text-sm text-gray-500">
                {user?.role === 'magasin' && `(${selectedStore.address})`}
                {user?.role === 'chauffeur' && user?.driverName && `(${user.driverName})`}
            </span>
        </div>
    );
};