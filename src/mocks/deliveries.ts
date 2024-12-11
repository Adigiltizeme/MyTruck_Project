import { Delivery } from '../types/delivery';

export const mockDeliveries: Delivery[] = [
  {
    id: '1',
    ref: "DEL-001",
    store: {
      id: '1',
      name: "Truffaut Rosny"
    },
    driver: {
      id: '1',
      firstName: "Jean",
      lastName: "D."
    },
    status: "En cours",
    eta: "10:15",
    priority: "Normal",
    items: [
      { id: '1', name: 'Plante A', quantity: 2 },
      { id: '2', name: 'Plante B', quantity: 1 }
    ]
  },
  {
    id: '2',
    ref: "DEL-002",
    store: {
      id: '2',
      name: "Truffaut Ivry"
    },
    driver: {
      id: '2',
      firstName: "Sophie",
      lastName: "M."
    },
    status: "En attente",
    eta: "10:45",
    priority: "Urgent",
    items: [
      { id: '3', name: 'Plante C', quantity: 3 }
    ]
  },
  {
    id: '3',
    ref: "DEL-003",
    store: {
      id: '3',
      name: "Truffaut Bry"
    },
    driver: {
      id: '3',
      firstName: "Marc",
      lastName: "L."
    },
    status: "Terminée",
    eta: "09:15",
    priority: "Normal",
    items: [
      { id: '4', name: 'Plante D', quantity: 2 }
    ]
  }
];