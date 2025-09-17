import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CommandeMetier, PersonnelInfo } from '../types/business.types';
import { UserRole } from '../types/dashboard.types';
import { useAuth } from '../contexts/AuthContext';

// ✅ FONCTIONS HELPER : Mêmes que dans CommandeDetails.tsx pour cohérence
const getStatusDatesCache = () => {
    const cached = localStorage.getItem('statusDatesCache');
    return cached ? JSON.parse(cached) : {};
};

const getStatusDateFromCache = (commandeId: string, statusType: 'commande' | 'livraison', status: string): string | null => {
    const cache = getStatusDatesCache();
    return cache[commandeId]?.[statusType]?.[status] || null;
};

const getUpdateDateForStatus = (commande: CommandeMetier, statusType: 'commande' | 'livraison'): string | null => {
    const misAJour = commande?.dates?.misAJour;

    if (!misAJour) {
        return null;
    }

    // Nouveau format (objet avec commande/livraison séparées)
    if (typeof misAJour === 'object' && misAJour !== null) {
        return statusType === 'commande' ? misAJour.commande || null : misAJour.livraison || null;
    }

    // Ancien format (string)
    return typeof misAJour === 'string' ? misAJour : null;
};

const getSmartStatusDate = (commande: CommandeMetier, statusType: 'commande' | 'livraison', currentStatus: string): Date => {
    // 1. D'abord essayer depuis le cache local
    const cachedDate = getStatusDateFromCache(commande.id, statusType, currentStatus);
    if (cachedDate) {
        return new Date(cachedDate);
    }

    // 2. Si pas dans le cache, logique intelligente selon le statut
    if (statusType === 'commande') {
        const isDefaultStatus = !currentStatus || currentStatus === 'En attente';
        if (isDefaultStatus) {
            return commande?.dates?.commande ? new Date(commande.dates.commande) : new Date();
        } else {
            const updateDate = getUpdateDateForStatus(commande, 'commande');
            return updateDate ? new Date(updateDate) :
                (commande?.dates?.commande ? new Date(commande.dates.commande) : new Date());
        }
    } else { // livraison
        const isDefaultStatus = !currentStatus || currentStatus === 'EN ATTENTE';
        if (isDefaultStatus) {
            return commande?.dates?.commande ? new Date(commande.dates.commande) : new Date();
        } else {
            const updateDate = getUpdateDateForStatus(commande, 'livraison');
            return updateDate ? new Date(updateDate) : new Date();
        }
    }
};

interface DeliveriesTableProps {
    commandes: CommandeMetier[];  // Type explicite ici
    userRole: UserRole;
}

export const DeliveriesTable: React.FC<DeliveriesTableProps> = ({
    commandes,
    userRole
}) => {
    const { user } = useAuth();

    const STATUS_STYLES = {
        'EN ATTENTE': 'bg-blue-300 text-blue-1000',
        'CONFIRMEE': 'bg-indigo-300 text-indigo-1000',
        'ENLEVEE': 'bg-purple-300 text-purple-1000',
        'EN COURS DE LIVRAISON': 'bg-yellow-300 text-yellow-1000',
        'LIVREE': 'bg-green-300 text-green-1000',
        'ANNULEE': 'bg-red-300 text-red-1000',
        'ECHEC': 'bg-red-200 text-red-900'
    };

    const formatChauffeurInfo = (chauffeurs: PersonnelInfo[]) => {
        if (!chauffeurs?.length) return 'N/A';
        const chauffeur = chauffeurs[0];
        return `${chauffeur.prenom || ''} ${chauffeur.nom || ''}`.trim() || 'N/A';
    };

    // ✅ SUPPRESSION DU DOUBLE FILTRAGE
    // Les commandes reçues en props sont déjà filtrées par le dashboard parent
    // Pas besoin de re-filtrer ici, ça créerait des incohérences

    const recentDeliveries = (commandes || []).slice(0, 10).map(commande => {
        // ✅ HEURE RÉELLE : Utiliser la même logique que CommandeDetails.tsx
        const currentLivraisonStatus = commande?.statuts?.livraison || 'EN ATTENTE';
        const livraisonSmartDate = getSmartStatusDate(commande, 'livraison', currentLivraisonStatus);

        return {
            reference: commande.numeroCommande,
            magasin: commande.magasin?.name || 'Non spécifié',
            chauffeur: commande.chauffeurs?.[0]
                ? `${commande.chauffeurs[0].prenom} ${commande.chauffeurs[0].nom}`.trim()
                : 'Non spécifié',
            status: commande.statuts.livraison,
            statusDate: livraisonSmartDate,
            realTime: format(livraisonSmartDate, 'HH:mm'), // Heure réelle du statut
        };
    });

    if (recentDeliveries.length === 0) {
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
            <h2 className="text-lg font-semibold mb-6">Livraisons récentes</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            {/* Colonnes conditionnelles selon le rôle */}
                            <th className="text-left">Référence</th>
                            {userRole !== 'magasin' && <th className="text-left">Magasin</th>}
                            <th className="text-left">Chauffeur</th>
                            <th className="text-left">Statut</th>
                            <th className="text-left">Date/Heure</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentDeliveries.map((delivery, index) => (
                            <tr key={`delivery-${index}`} className="border-b">
                                <td className="py-4 text-sm">{delivery.reference}</td>
                                {userRole !== 'magasin' && (
                                    <td className="py-4 text-sm">{delivery.magasin}</td>
                                )}
                                <td className="py-4 text-sm">{delivery.chauffeur}</td>
                                <td className="py-4">
                                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[delivery.status as keyof typeof STATUS_STYLES] || 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {delivery.status}
                                    </span>
                                </td>
                                <td className="py-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-500">
                                            {format(delivery.statusDate, 'dd/MM')}
                                        </span>
                                        <span className="font-medium">{delivery.realTime}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeliveriesTable;