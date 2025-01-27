import { BasicCommandeMetier } from "./metrics";

export type DeliveryStatus = 'En cours' | 'En attente' | 'Terminée';
export type DeliveryPriority = 'Urgent' | 'Normal';

export interface Driver {
    id: string;
    firstName: string;
    lastName: string;
}

export interface Store {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    photo: string;
    status: 'Ouvert' | 'Fermé';
    manager: string;
}

export interface DeliveryItem {
    id: string;
    name: string;
    quantity: number;
}

export interface Delivery {
    id: string;
    ref: string;
    status: DeliveryStatus;
    eta: string;
    startTime?: string; // Optional car pas toujours défini
    priority: DeliveryPriority;
    items: DeliveryItem[];
    driver: Driver;
    store: Store;
}

export interface DeliveriesTableProps {
    deliveries: Delivery[];
    commandes: BasicCommandeMetier[];
}