import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CommandeMetier, PersonnelInfo } from '../types/business.types';
import { UserRole } from '../types/dashboard.types';
import { useAuth } from '../contexts/AuthContext';

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

    const recentDeliveries = (commandes || []).slice(0, 5).map(commande => ({
        reference: commande.numeroCommande,
        magasin: commande.magasin?.name || 'Non spécifié',
        chauffeur: commande.chauffeurs?.[0]
            ? `${commande.chauffeurs[0].prenom} ${commande.chauffeurs[0].nom}`.trim()
            : 'Non spécifié',
        status: commande.statuts.livraison,
        eta: format(new Date(commande.dates.livraison), 'HH:mm', { locale: fr })
    }));

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
                            <th className="text-left">ETA</th>
                        </tr>
                    </thead>
                    <tbody>
                    {(commandes || []).slice(0, 5).map((commande) => (
                            <tr key={commande.id} className="border-b">
                                <td className="py-4 text-sm">{commande.numeroCommande}</td>
                                {userRole !== 'magasin' && (
                                    <td className="py-4 text-sm">{commande.magasin?.name || 'N/A'}</td>
                                )}
                                <td className="py-4 text-sm">
                                    {commande.chauffeurs.length > 0 
                                        ? `${commande.chauffeurs[0].prenom} ${commande.chauffeurs[0].nom}`
                                        : 'N/A'}
                                </td>
                                <td className="py-4">
                                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                        STATUS_STYLES[commande.statuts.livraison as keyof typeof STATUS_STYLES] || 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {commande.statuts.livraison}
                                    </span>
                                </td>
                                <td className="py-4 text-sm">
                                    {format(new Date(commande.dates.livraison), 'HH:mm')}
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