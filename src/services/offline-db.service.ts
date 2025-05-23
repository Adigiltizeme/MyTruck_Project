import Dexie from 'dexie';
import { CommandeMetier, DevisInfo, FactureInfo } from '../types/business.types';
import { PersonnelInfo } from '../types/business.types';
import { MagasinInfo } from '../types/business.types';
import { AuthUser } from './authService';
import { Cession } from '../types/cession.types';

export interface PendingChange {
    id: string;
    entityType: 'commande' | 'personnel' | 'magasin' | 'user';
    entityId: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    error?: string;        // Ajout du champ error optionnel
    retryCount?: number;   // Ajout du champ retryCount optionnel
}

export class MyTruckDB extends Dexie {
    commandes: Dexie.Table<CommandeMetier, string>;
    personnel: Dexie.Table<PersonnelInfo, string>;
    magasins: Dexie.Table<MagasinInfo, string>;
    users: Dexie.Table<AuthUser, string>;
    pendingChanges: Dexie.Table<PendingChange, string>;
    cessions: Dexie.Table<Cession, string>;
    factures!: Dexie.Table<FactureInfo, string>;
    devis!: Dexie.Table<DevisInfo, string>;

    constructor() {
        super('MyTruckDB');

        this.version(4).stores({
            commandes: 'id, numeroCommande, dates.livraison, statuts.livraison, statuts.commande',
            personnel: 'id, nom, prenom, role, status',
            magasins: 'id, name, address, status',
            users: 'id, email, role, storeId, passwordHash',
            pendingChanges: '++id, entityType, entityId, action, timestamp, error, retryCount',
            cessions: 'id, date, montant, magasinId, statut',
            factures: 'id, commandeId, montant, dateEmission, statut',
            devis: 'id, commandeId, montant, dateEmission, statut'
        });

        this.commandes = this.table('commandes');
        this.personnel = this.table('personnel');
        this.magasins = this.table('magasins');
        this.users = this.table('users');
        this.pendingChanges = this.table('pendingChanges');
        this.cessions = this.table('cessions');
        this.factures = this.table('factures');
        this.devis = this.table('devis');
    }
}

export const db = new MyTruckDB();