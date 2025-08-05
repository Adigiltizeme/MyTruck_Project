import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/roles';
import { useOffline } from '../contexts/OfflineContext';
import { storeService } from '../services/store.service';
import { useDraftStorage } from '../hooks/useDraftStorage';


const STORES = [
    { id: 'recc1nE9KB0WVIuF2', name: 'Truffaut Bry-Sur-Marne', address: '19 bis Boulevard Jean Monnet, Bry-sur-Marne' },
    { id: 'recBNwZhysFhXstCN', name: 'Truffaut Boulogne', address: '33 Av. Edouard Vaillant, 92100 Boulogne-Billancourt' },
    { id: 'recZDxpbQfUw8HYNH', name: 'Truffaut Ivry', address: '36 Rue Ernest Renan, 94200 Ivry-sur-Seine' },
    { id: 'recxf8YHVGGmcvbkL', name: 'Truffaut Arcueil', address: '232 Avenue Aristide Briand, 94230 Cachan' },
    { id: 'recQNm5vFPfAWW2jA', name: 'Truffaut Paris Rive Gauche', address: '85 Quai d\'Austerlitz, 75013 Paris' },
    { id: 'recHw72XGm8PfUkV8', name: 'Truffaut Batignolles', address: '65 boulevard de Courcelles, 75008 Paris' }
];

export const RoleSelector = () => {
    const { user, setRole } = useAuth();
    const { dataService } = useOffline();
    const [stores, setStores] = useState<any[]>([]); // ✅ Initialiser avec tableau vide
    const [selectedStore, setSelectedStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

                // ✅ CORRECTION : Utiliser getMagasins() du Backend
                const magasins = await dataService.getMagasins();
                console.log('🏪 Magasins chargés depuis Backend:', magasins);

                if (magasins && magasins.length > 0) {
                    // ✅ TRANSFORMATION : Adapter la structure si nécessaire
                    const storesFormatted = magasins.map(m => ({
                        id: m.id,
                        name: m.nom || m.name,
                        address: m.adresse || m.address || 'Adresse non renseignée'
                    }));

                    console.log('🏪 Magasins formatés:', storesFormatted);
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
            } catch (error) {
                console.error('❌ Erreur chargement magasins:', error);
                setError('Impossible de charger la liste des magasins depuis le Backend');
            } finally {
                setLoading(false);
            }
        };

        loadStores();
    }, [dataService, user?.storeId, user?.role]);

    // useEffect(() => {
    //     const loadStores = async () => {
    //         try {
    //             setLoading(true);
    //             const magasins = await dataService.getMagasins();

    //             if (magasins && magasins.length > 0) {
    //                 setStores(magasins);

    //                 // Si l'utilisateur a un storeId, sélectionner le magasin correspondant
    //                 if (user?.role === 'magasin' && user.storeId) {
    //                     const userStore = magasins.find(m => m.id === user.storeId);
    //                     if (userStore) {
    //                         setSelectedStore(userStore);
    //                     } else {
    //                         // Si le magasin n'est pas trouvé, sélectionner le premier
    //                         setSelectedStore(magasins[0]);
    //                     }
    //                 } else {
    //                     // Par défaut, sélectionner le premier magasin
    //                     setSelectedStore(magasins[0]);
    //                 }
    //             }
    //         } catch (error) {
    //             console.error('Erreur lors du chargement des magasins:', error);
    //             setError('Impossible de charger la liste des magasins');
    //         } finally {
    //             setLoading(false);
    //         }
    //     };

    //     loadStores();
    // }, [dataService, user?.storeId, user?.role]);

    // useEffect(() => {
    //     refreshUserContext();
    // }, []);

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
                setRole(role, { driverId: 'recOJXIE0zjz0nqP9' });
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
                    className="border rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                >
                    <option value="admin">Admin</option>
                    <option value="magasin">Magasin</option>
                    <option value="chauffeur">Chauffeur</option>
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

            <span className="text-sm text-gray-500">
                {user?.role === 'magasin' && `(${selectedStore.address})`}
                {user?.role === 'chauffeur' && `(Driver ID: ${user.driverId})`}
            </span>
        </div>
    );
};