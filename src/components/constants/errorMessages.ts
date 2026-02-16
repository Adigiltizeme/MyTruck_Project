export const ERROR_MESSAGES = {
    required: 'Ce champ est requis',
    minLength: (min: number) => `Minimum ${min} caractères requis`,
    equipiers: {
        max: 'Un devis est obligatoire. Veuillez contacter le service commercial.',
        info: 'Max 2 équipiers. Au-delà, devis obligatoire.',
        contact: 'Service commercial : 01 23 45 67 89 - commercial@mytruck.fr'
    },
    articles: 'Le nombre d\'articles doit être supérieur à 0',
    adresse: {
        required: 'L\'adresse est requise',
        etage: 'L\'étage est requis',
        interphone: 'L\'interphone/code est requis'
    },
    frenchHoliday: 'Majoration les dimanches et jours fériés',
};

export const errorMessageStyles = {
    container: 'mt-1',
    text: 'text-sm text-red-600',
    icon: 'mr-1 inline-block h-4 w-4'
};

export const VALIDATION_RULES = {
    required: {
        required: true
    },
    minLength: (min: number) => ({
        minLength: min
    }),
    equipiers: {
        custom: (value: string) => parseInt(value) <= 2
    },
    articles: {
        custom: (value: string) => parseInt(value) > 0
    },
    adresse: {
        required: {
            required: true
        },
        etage: {
            required: true
        },
        interphone: {
            required: true
        }
    }
};