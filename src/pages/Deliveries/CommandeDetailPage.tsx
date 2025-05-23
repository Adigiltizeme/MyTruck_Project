import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CommandeMetier } from '../../types/business.types';
import CommandeDetails from '../../components/CommandeDetails';
import { useOffline } from '../../contexts/OfflineContext';

const CommandeDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { dataService, isOnline } = useOffline();
    const [commande, setCommande] = useState<CommandeMetier | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCommande = async () => {
            if (!id) return;
            
            try {
                setLoading(true);
                const data = await dataService.getCommande(id);
                if (data) {
                    setCommande(data);
                } else {
                    setError('Commande non trouvée');
                }
            } catch (err) {
                console.error('Erreur lors du chargement de la commande:', err);
                setError('Erreur lors du chargement de la commande');
            } finally {
                setLoading(false);
            }
        };

        fetchCommande();
    }, [id, dataService]);

    const handleUpdate = (updatedCommande: CommandeMetier) => {
        setCommande(updatedCommande);
    };

    if (loading) {
        return <div className="p-6 text-center">Chargement...</div>;
    }

    if (error || !commande) {
        return (
            <div className="p-6">
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                    {error || 'Commande non trouvée'}
                </div>
                <button 
                    onClick={() => navigate(-1)} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                    Retour
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            {!isOnline && (
                <div className="mb-4 bg-yellow-100 text-yellow-800 p-3 rounded">
                    Vous êtes en mode hors ligne. Les modifications seront synchronisées ultérieurement.
                </div>
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Commande #{commande.numeroCommande}</h1>
                <button 
                    onClick={() => navigate(-1)} 
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                    Retour à la liste
                </button>
            </div>
            
            <CommandeDetails commande={commande} onUpdate={handleUpdate} />
        </div>
    );
};

export default CommandeDetailPage;