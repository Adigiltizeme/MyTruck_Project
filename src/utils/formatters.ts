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

export const formatPhoneNumber = (value: string) => {
  // Supprime tout sauf les chiffres
  const cleaned = value.replace(/\D/g, '');

  // Format français : XX XX XX XX XX
  const match = cleaned.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);

  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
  }

  return value;
};

export const formatData = {
  commandeData: (data: Partial<CommandeMetier>): Partial<CommandeMetier> => {
    return {
      ...data,
      numeroCommande: data.numeroCommande || `CMD${Date.now()}`,
      dates: {
        commande: new Date().toISOString(),
        livraison: data.dates?.livraison || '',
        misAJour: new Date().toISOString()
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
