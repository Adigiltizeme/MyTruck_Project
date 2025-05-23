export interface Store {
    id: string;
    name: string;
    address: string;
    phone?: string;
    email?: string;
}

// Liste des magasins avec leurs informations complètes
const STORES: Store[] = [
    {
        id: 'recc1nE9KB0WVIuF2',
        name: 'Truffaut Bry-Sur-Marne',
        address: '19 bis Boulevard Jean Monnet, Bry-sur-Marne'
    },
    {
        id: 'recBNwZhysFhXstCN',
        name: 'Truffaut Boulogne',
        address: '33 Av. Edouard Vaillant, 92100 Boulogne-Billancourt'
    },
    {
        id: 'recZDxpbQfUw8HYNH',
        name: 'Truffaut Ivry',
        address: '36 Rue Ernest Renan, 94200 Ivry-sur-Seine'
    },
    {
        id: 'recxf8YHVGGmcvbkL',
        name: 'Truffaut Arcueil',
        address: '232 Avenue Aristide Briand, 94230 Cachan'
    },
    {
        id: 'recQNm5vFPfAWW2jA',
        name: 'Truffaut Paris Rive Gauche',
        address: '85 Quai d\'Austerlitz, 75013 Paris'
    },
    {
        id: 'recHw72XGm8PfUkV8',
        name: 'Truffaut Batignolles',
        address: '65 boulevard de Courcelles, 75008 Paris'
    }
];

class StoreService {
    // Récupérer tous les magasins
    getStores(): Store[] {
        return STORES;
    }

    // Récupérer un magasin par son ID
    getStoreById(id: string): Store | undefined {
        return STORES.find(store => store.id === id);
    }

    // Récupérer un magasin par son nom
    getStoreByName(name: string): Store | undefined {
        return STORES.find(store => store.name.toLowerCase() === name.toLowerCase());
    }
}

// Exporter une instance singleton
export const storeService = new StoreService();