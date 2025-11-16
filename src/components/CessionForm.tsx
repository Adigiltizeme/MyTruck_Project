import React from 'react';
import { CommandeMetier } from '../types/business.types';
import AjoutCommande from './AjoutCommande';

interface CessionFormProps {
    onSubmit: (data: Partial<CommandeMetier>) => Promise<void>;
    onCancel: () => void;
    initialData?: CommandeMetier;
    isEditing?: boolean;
}

/**
 * Formulaire de cession inter-magasins
 * Utilise le même formulaire que les commandes normales avec le mode cession activé
 */
const CessionForm: React.FC<CessionFormProps> = ({
    onSubmit,
    onCancel,
    initialData,
    isEditing = false
}) => {
    // Préparer les données initiales spécifiques aux cessions
    const getCessionInitialData = (): CommandeMetier => {
        if (initialData) {
            return initialData;
        }

        // Données par défaut pour une nouvelle cession
        return {
            id: '',
            numeroCommande: '',
            dates: {
                commande: new Date().toISOString(),
                livraison: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                misAJour: {
                    commande: new Date().toISOString(),
                    livraison: ''
                }
            },
            type: 'INTER_MAGASIN',
            statuts: {
                commande: "En attente",
                livraison: "EN ATTENTE"
            },
            magasinDestination: {
                id: '',
                name: '',
                address: '',
                phone: '',
                email: '',
                manager: '',
                status: '',
                photo: ''
            },
            articles: {
                nombre: 0,
                details: '',
                photos: []
            },
            livraison: {
                creneau: '',
                vehicule: '',
                equipiers: 0,
                reserve: false,
                remarques: '',
                chauffeurs: []
            },
            cession: {
                motif: '',
                priorite: 'Normale',
                commentaires: ''
            },
            vendeur: {
                prenom: '',
            },
            magasin: {
                id: '',
                name: '',
                address: '',
                phone: '',
                email: '',
                manager: '',
                status: '',
                photo: ''
            },
            client: {
                nom: '',
                prenom: '',
                nomComplet: '',
                telephone: { principal: '', secondaire: '' },
                adresse: {
                    type: 'Domicile',
                    ligne1: '',
                    batiment: '',
                    etage: '',
                    ascenseur: false,
                    interphone: ''
                }
            },
            financier: {
                tarifHT: 0,
                factures: [],
                devis: [],
                devisObligatoire: false,
                tarifDetails: {
                    vehicleCost: 0,
                    crewCost: 0,
                    distanceCost: 0,
                    breakdown: []
                }
            },
            chauffeurs: []
        };
    };

    return (
        <AjoutCommande
            onSubmit={onSubmit}
            onCancel={onCancel}
            commande={getCessionInitialData()}
            isEditing={isEditing}
            initialData={getCessionInitialData()}
            isCession={true} // Active le mode cession
        />
    );
};

export default CessionForm;
