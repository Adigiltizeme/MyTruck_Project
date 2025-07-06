import { useState, useEffect } from 'react';
import { CommandeMetier } from '../types/business.types';
import { simpleBackendService } from '../services/simple-backend.service';

export const useCommandes = () => {
    const [commandes, setCommandes] = useState<CommandeMetier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCommandes = async () => {
        try {
            setLoading(true);
            const data = await simpleBackendService.getCommandes();
            setCommandes(data);
            setError(null);
        } catch (err) {
            setError('Erreur lors du chargement');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCommandes();
    }, []);

    const createCommande = async (commande: Partial<CommandeMetier>) => {
        try {
            const newCommande = await simpleBackendService.createCommande(commande);
            setCommandes(prev => [...prev, newCommande]);
            return newCommande;
        } catch (err) {
            console.error('Erreur création commande:', err);
            throw err;
        }
    };

    return {
        commandes,
        loading,
        error,
        loadCommandes,
        createCommande
    };
};