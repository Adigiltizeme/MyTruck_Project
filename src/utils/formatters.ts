import { format, parse } from "date-fns";
import { CommandeMetier } from "../types/business.types";

export const formatVariation = (value: number | undefined): number => {
  return value ?? 0;
};

export const dateFormatter = {
  forDisplay: (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  },

  forStorage: (dateString: string) => {
    try {
      return new Date(dateString).toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  },

  forSearch: (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        display: format(date, 'dd/MM/yyyy'),
        searchable: [
          format(date, 'dd/MM/yyyy'),
          format(date, 'yyyy-MM-dd'),
          dateString
        ]
      };
    } catch (e) {
      return {
        display: dateString,
        searchable: [dateString]
      };
    }
  },

  convertSearchDate: (searchValue: string) => {
    // Si le format est dd/MM/yyyy
    const parts = searchValue.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return searchValue;
  }
};

/**
 * Formate un numéro de téléphone en format français standard
 * @param value Le numéro de téléphone à formater
 * @returns Le numéro formaté
 */
export const formatPhoneNumber = (value: string): string => {
  if (!value) return '';

  // Supprimer tous les caractères non numériques
  const numericValue = value.replace(/\D/g, '');

  // Si le numéro commence par 33 (code pays France), le garder intact
  if (numericValue.startsWith('33') && numericValue.length > 9) {
    // Format +33 X XX XX XX XX
    return numericValue
      .replace(/^33/, '+33 ')
      .replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');
  }

  // Format 0X XX XX XX XX pour les numéros français standard
  if (numericValue.length === 10) {
    return numericValue.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  // Si le format ne correspond pas, retourner tel quel par groupes de 2
  return numericValue.replace(/(\d{2})/g, '$1 ').trim();
};

export const formatData = {
  commandeData: (data: Partial<CommandeMetier>): Partial<CommandeMetier> => {
    return {
      ...data,
      numeroCommande: data.numeroCommande || `CMD${Date.now()}`,
      dates: {
        commande: new Date().toISOString(),
        livraison: data.dates?.livraison || '',
        misAJour: {
          commande: new Date().toISOString(),
          livraison: ''
        }
      },
      client: {
        nom: data.client?.nom?.trim() || '',
        prenom: data.client?.prenom?.trim() || '',
        nomComplet: `${data.client?.prenom?.trim() || ''} ${data.client?.nom?.trim() || ''}`,
        telephone: {
          principal: data.client?.telephone?.principal?.replace(/\D/g, '') || '',
          secondaire: data.client?.telephone?.secondaire?.replace(/\D/g, '') || ''
        },
        adresse: {
          type: data.client?.adresse?.type || 'Domicile',
          ligne1: data.client?.adresse?.ligne1?.trim() || '',
          batiment: data.client?.adresse?.batiment?.trim() || '',
          etage: data.client?.adresse?.etage?.trim() || '',
          ascenseur: Boolean(data.client?.adresse?.ascenseur),
          interphone: data.client?.adresse?.interphone?.trim() || ''
        }
      },
      articles: {
        nombre: Number(data.articles?.nombre) || 0,
        details: data.articles?.details?.trim() || '',
        photos: data.articles?.photos?.map(photo => ({
          url: photo.url,
          file: photo.file
        })) || []
      },
      livraison: {
        creneau: data.livraison?.creneau || '',
        vehicule: data.livraison?.vehicule || '',
        equipiers: Number(data.livraison?.equipiers) || 0,
        reserve: Boolean(data.livraison?.reserve),
        remarques: data.livraison?.remarques?.trim() || '',
        chauffeurs: data.livraison?.chauffeurs || []
      }
    };
  },

  price: (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }
};

export const formatPrice = (price: number) => {
  return price.toFixed(2) + ' €';
};

/**
 * Formate un texte en limitant sa longueur
 * @param text Texte à formater
 * @param maxLength Longueur maximale
 * @returns Texte tronqué avec "..." si nécessaire
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Convertit un statut en texte lisible
 * @param status Statut à convertir
 * @returns Statut formaté
 */
export const formatStatus = (status: string): string => {
  // Mapper les statuts techniques vers des libellés plus lisibles
  const statusMap: Record<string, string> = {
    'EN_ATTENTE': 'En attente',
    'EN ATTENTE': 'En attente',
    'CONFIRMEE': 'Confirmée',
    'ENLEVEE': 'Enlevée',
    'EN_COURS_DE_LIVRAISON': 'En cours',
    'EN COURS DE LIVRAISON': 'En cours',
    'LIVREE': 'Livrée',
    'ANNULEE': 'Annulée',
    'ECHEC': 'Échec'
  };

  return statusMap[status] || status;
}

// Fonction utilitaire pour formater les dates avec heures
export const formatDate = (date: string | Date): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(date).toLocaleDateString('fr-FR', options);
};