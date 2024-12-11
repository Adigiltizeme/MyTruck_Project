import { useMemo } from 'react';
import { CommandeMetier } from '../types/business.types';
import { formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';
import { format } from 'date-fns';

interface DeliveriesTableProps {
    commandes?: CommandeMetier[];
    store?: string;
}

type StatutLivraison = 'LIVREE' | 'ENLEVEE' | 'EN COURS DE LIVRAISON' | 'ANNULEE' | 'EN ATTENTE' | 'CONFIRMEE' | 'ECHEC';

interface LivraisonStatusProps {
    status: StatutLivraison;
}

const LivraisonStatus: React.FC<LivraisonStatusProps> = ({ status }) => {
    const getStatusStyle = () => {
        const baseStyle = 'px-2 py-1 rounded-full text-sm font-medium';

        switch (status) {
            case 'EN ATTENTE':
                return `${baseStyle} bg-blue-100 text-blue-800`;
            case 'CONFIRMEE':
                return `${baseStyle} bg-indigo-100 text-indigo-800`;
            case 'ENLEVEE':
                return `${baseStyle} bg-purple-100 text-purple-800`;
            case 'EN COURS DE LIVRAISON':
                return `${baseStyle} bg-yellow-100 text-yellow-800`;
            case 'LIVREE':
                return `${baseStyle} bg-green-100 text-green-800`;
            case 'ANNULEE':
                return `${baseStyle} bg-red-100 text-red-800`;
            case 'ECHEC':
                return `${baseStyle} bg-red-200 text-red-900`;
            default:
                return baseStyle;
        }
    };

    return (
        <span className={getStatusStyle()}>
            {status}
        </span>
    );
};

const getFormattedDate = (dateStr: string, format?: string) => {
    const date = new Date(dateStr);
    return format
        ? formatDate(date, format, { locale: fr })
        : formatDate(date, 'dd/MM/yyyy HH:mm', { locale: fr });
};

// Filtrer les livraisons selon le magasin sélectionné
const DeliveriesTable: React.FC<DeliveriesTableProps> = ({ commandes = [] }) => { // Valeur par défaut
    const recentDeliveries = useMemo(() => {
    if (!commandes || !commandes.length) return [];

    return [...commandes]
        .sort((a, b) => new Date(b.dates.livraison).getTime() - new Date(a.dates.livraison).getTime())
        .slice(0, 5)
        .map(commande => ({
            reference: commande.numeroCommande,
            magasin: commande.store?.name || 'Non spécifié',
            // Accéder au nom du chauffeur plutôt qu'à l'ID
            chauffeur: commande.livraison?.chauffeurs.map(chauffeur => chauffeur.nom).join(', ') || 'Non spécifié',
            status: commande.statuts.livraison,
            eta: format(new Date(commande.dates.livraison), 'HH:mm', { locale: fr })
        }));
}, [commandes]);

    if (!commandes?.length) {
        return (
            <div className="bg-white rounded-xl p-6">
                <div className="text-center text-gray-500">
                    Aucune livraison à afficher
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Livraisons récentes</h2>
            </div>
            <table className="min-w-full">
                <thead>
                    <tr>
                        <th className="text-left text-sm font-medium text-gray-500 pb-3">Référence</th>
                        <th className="text-left text-sm font-medium text-gray-500 pb-3">Magasin</th>
                        <th className="text-left text-sm font-medium text-gray-500 pb-3">Chauffeur</th>
                        <th className="text-left text-sm font-medium text-gray-500 pb-3">Statut</th>
                        <th className="text-left text-sm font-medium text-gray-500 pb-3">ETA</th>
                    </tr>
                </thead>
                <tbody>
                    {recentDeliveries.map((delivery) => (
                        <tr key={delivery.reference} className="border-b last:border-0">
                            <td className="py-4 text-sm">{delivery.reference}</td>
                            <td className="py-4 text-sm">{delivery.magasin}</td>
                            <td className="py-4 text-sm">{delivery.chauffeur}</td>
                            <td className="py-4">
                                <LivraisonStatus status={delivery.status} />
                            </td>
                            <td className="py-4 text-sm">{delivery.eta}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default DeliveriesTable;