import { CommandeMetier } from "../types/business.types";

export const getStatutCommandeStyle = (statut: CommandeMetier['statuts']['commande']) => {
        const baseStyle = 'px-2 py-1 rounded-full text-sm font-medium';

        switch (statut) {
            case 'En attente':
                return `${baseStyle} bg-blue-100 text-blue-800`;
            case 'Confirmée':
                return `${baseStyle} bg-green-100 text-green-800`;
            case 'Annulée':
                return `${baseStyle} bg-red-100 text-red-800`;
            case 'Modifiée':
                return `${baseStyle} bg-yellow-100 text-yellow-800`;
            default:
                return baseStyle;
        }
    };

    export const getStatutLivraisonStyle = (statut: CommandeMetier['statuts']['livraison']) => {
        const baseStyle = 'px-2 py-1 rounded-full text-sm font-medium';

        switch (statut) {
            case 'EN ATTENTE':
                return `${baseStyle} bg-blue-300 text-blue-1000`;
            case 'CONFIRMEE':
                return `${baseStyle} bg-indigo-300 text-indigo-1000`;
            case 'ENLEVEE':
                return `${baseStyle} bg-purple-300 text-purple-1000`;
            case 'EN COURS DE LIVRAISON':
                return `${baseStyle} bg-yellow-300 text-yellow-1000`;
            case 'LIVREE':
                return `${baseStyle} bg-green-300 text-green-1000`;
            case 'ANNULEE':
                return `${baseStyle} bg-red-300 text-red-1000`;
            case 'ECHEC':
                return `${baseStyle} bg-red-300 text-red-1000`;
            default:
                return baseStyle;
        }
    };