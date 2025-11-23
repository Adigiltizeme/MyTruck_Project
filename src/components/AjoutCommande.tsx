import React, { useEffect, useState } from 'react';
import { CommandeMetier } from '../types/business.types';
import { motion, AnimatePresence } from 'framer-motion';
import { CRENEAUX_LIVRAISON, VEHICULES } from './constants/options';
import { useDraftStorage } from '../hooks/useDraftStorage';
import { useCommandeForm } from '../hooks/useCommandeForm';
import { ClientForm } from './forms/ClientForm';
import { MagasinDestinationForm } from './forms/MagasinDestinationForm';
import { ArticlesForm } from './forms/ArticlesForm';
import { LivraisonForm } from './forms/LivraisonForm';
import { RecapitulatifForm } from './forms/RecapitulatifForm';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';


interface AjoutCommandeProps {
    onSubmit: (commande: Partial<CommandeMetier>) => Promise<void>;
    onCancel: () => void;
    commande: CommandeMetier;
    isEditing: boolean;
    initialData: CommandeMetier;
    disabledFields?: string[];
    isCession?: boolean; // Mode cession inter-magasins
}

const AjoutCommande: React.FC<AjoutCommandeProps> = ({
    onSubmit,
    onCancel,
    isEditing,
    initialData,
    isCession = false
}) => {
    const { user } = useAuth();
    // Préparer les données initiales avec l'adresse du magasin si disponible
    const getInitialData = () => {
        const data = initialData || {
            commande: {
                numeroCommande: '',
                dates: {
                    commande: new Date().toISOString(),
                    livraison: '',
                    misAJour: {
                        commande: new Date().toISOString(),
                        livraison: ''
                    }
                },
            },
            client: {
                nom: '',
                prenom: '',
                nomComplet: '',
                telephone: {
                    principal: '',
                    secondaire: ''
                },
                adresse: {
                    type: 'Domicile', // ou 'Professionnelle'
                    ligne1: '',
                    batiment: '',
                    etage: '',
                    ascenseur: false, // ou true
                    interphone: ''
                }
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
            vendeur: {
                prenom: '',
            },
            magasin: {
                id: user?.storeId || '',
                name: user?.storeName || '',
                address: user?.storeAddress || '',
                phone: '',
                email: '',
                manager: '',
                status: '',
                photo: ''
            }
        };

        // Si nous sommes en mode magasin, ajouter les informations du magasin
        if (user?.role === 'magasin' && user.storeId) {
            data.magasin = {
                ...data.magasin,
                id: user.storeId,
                name: user.storeName || '',
                address: user.storeAddress || ''
            };

            // console.log('Données initiales avec magasin:', data.magasin);
        }

        return data;
    };
    const [formData, setFormData] = useState(getInitialData());
    const [creneaux, setCreneaux] = useState(CRENEAUX_LIVRAISON);
    const [vehicules, setVehicules] = useState<{ [key: string]: string }>(VEHICULES);

    const { loading } = useDraftStorage();

    const { dataService } = useOffline();

    const {
        state,               // Contient formData, errors, step, etc.
        handleInputChange: originalHandleInputChange,   // Pour gérer les changements de champs
        handleNext,          // Navigation suivant
        handlePrev,         // Navigation précédent
        handleSubmit,       // Soumission du formulaire
        isSubmitting,       // En cours de soumission
        progress,           // Progression (pourcentages, étapes)
        stepsConfig,       // Configuration des étapes
        handleAddressSearch, // Recherche d'adresse
        handleAddressSelect, // Sélection d'adresse
        addressSuggestions,  // Suggestions d'adresse
        setAddressSuggestions, // Met à jour les suggestions d'adresse
    } = useCommandeForm(async (data) => {
        await onSubmit(data);
        onCancel(); // Ferme le modal après soumission réussie
    }, isCession);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: any; } }) => {
        if ('target' in e && 'name' in e.target && 'value' in e.target) {
            const event = {
                ...e,
                target: {
                    ...e.target,
                    value: e.target.value,
                    name: e.target.name,
                },
                currentTarget: e.target,
                nativeEvent: {} as any,
                bubbles: true,
                cancelable: true,
                defaultPrevented: false,
                eventPhase: 0,
                isTrusted: true,
                preventDefault: () => { },
                isDefaultPrevented: () => false,
                stopPropagation: () => { },
                isPropagationStopped: () => false,
                persist: () => { },
                timeStamp: Date.now(),
                type: 'change',
            } as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
            originalHandleInputChange(event);
        } else {
            originalHandleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>);
        }
    };

    const renderStep = () => {
        switch (state.step) {
            case 1:
                return (
                    <ArticlesForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                        isEditing={isEditing}
                        initialCanBeTilted={state.data.articles?.canBeTilted || false}
                    />
                );
            case 2:
                console.log("Rendu de ClientForm/MagasinDestinationForm avec isEditing:", isEditing, "isCession:", isCession);
                return isCession ? (
                    <MagasinDestinationForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                        isEditing={isEditing}
                        magasinOrigineId={user?.storeId}
                    />
                ) : (
                    <ClientForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                        handleAddressSearch={handleAddressSearch}
                        handleAddressSelect={handleAddressSelect}
                        addressSuggestions={addressSuggestions}
                        setAddressSuggestions={setAddressSuggestions}
                        isEditing={isEditing}
                    />
                );
            case 3:
                return (
                    <LivraisonForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                        showErrors={state.showErrors}
                        isEditing={isEditing}
                        isCession={isCession}
                    />
                );
            case 4:
                return (
                    <RecapitulatifForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                        showErrors={state.showErrors}
                        isCession={isCession}
                    />
                )
            default:
                return null;
        }
    };

    // Assurez-vous d'initialiser les données avec le magasin actuel
    useEffect(() => {
        if (!isEditing && user?.role === 'magasin') {
            // Mettre à jour le formulaire avec les données du magasin actuel
            setFormData(prev => ({
                ...prev,
                magasin: {
                    ...prev.magasin, // Preserve existing properties, including 'id'
                    name: user.storeName || '',
                    address: user.storeAddress || '',
                    phone: prev.magasin?.phone || '',
                    email: prev.magasin?.email || '',
                    manager: prev.magasin?.manager || '',
                    status: prev.magasin?.status || '',
                    photo: prev.magasin?.photo || ''
                }
            }));

            console.log('Données du magasin initialisées dans AjoutCommande:', {
                id: user.storeId,
                name: user.storeName,
                address: user.storeAddress
            });
        }
    }, [isEditing, user?.storeId, user?.storeName, user?.storeAddress]);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [creneauxData, vehiculesData] = await Promise.all([
                    dataService.getFieldOptions('CRENEAU DE LIVRAISON'),
                    dataService.getFieldOptions('CATEGORIE DE VEHICULE')
                ]);

                if (creneauxData.length > 0) setCreneaux(creneauxData);
                if (vehiculesData.length > 0) {
                    const vehiculesMap = vehiculesData.reduce((acc: { [key: string]: string }, vehicule: string) => {
                        acc[vehicule] = vehicule;
                        return acc;
                    }, {});
                    setVehicules(vehiculesMap);
                }
            } catch (error) {
                console.error('Erreur chargement options:', error);
                // En cas d'erreur, on garde les valeurs par défaut des constantes
            }
        };
        loadOptions();
    }, []);

    useEffect(() => {
        console.log("Mode édition:", isEditing); // Debug
    }, [isEditing]);

    // Pour détecter et réagir aux changements de magasin
    useEffect(() => {
        if (user?.role === 'magasin' && user.storeAddress) {
            const magasin = {
                id: user.storeId || '',
                name: user.storeName || '',
                address: user.storeAddress || '',
                phone: '',
                email: '',
                manager: '',
                status: '',
                photo: ''
            };

            // Log de vérification
            console.log('Initialisation des données magasin dans AjoutCommande:', JSON.stringify(magasin, null, 2));

            setFormData(prev => ({
                ...prev,
                magasin: magasin
            }));
        }
    }, [user?.storeId, user?.storeAddress]);

    if (loading) {
        return <div className='secondary'>Chargement...</div>;
    }

    // Pour les transitions entre les étapes
    const slideVariants = {
        enter: (direction: 'left' | 'right') => ({
            x: direction === 'right' ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        },
        exit: (direction: 'left' | 'right') => ({
            x: direction === 'right' ? -1000 : 1000,
            opacity: 0,
            scale: 0.8
        })
    };

    return (
        <div className="space-y-6 p-6">
            {/* En-tête avec bordure */}
            <div className="border-b mb-6">
                <h2 className="text-xl font-medium text-center pb-4">
                    {isCession ? 'Nouvelle cession inter-magasins' : 'Nouvelle commande'}
                </h2>
            </div>
            {/* En-tête avec étapes */}
            <div className="flex justify-between items-center mb-8">
                {(isCession
                    ? ['Articles', 'Magasin', 'Livraison', 'Confirmer']
                    : ['Articles', 'Client', 'Livraison', 'Confirmer']
                ).map((step, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                ${state.step === index + 1
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-gray-400 border'}`}
                        >
                            {index + 1}
                        </div>
                        <span className={`mt-2 text-sm ${state.step === index + 1 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                            {step}
                        </span>
                    </div>
                ))}
            </div>
            {/* En-tête avec progression */}
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-medium">{stepsConfig[state.step]?.title || ''}</h2>
                <div className="w-64 bg-gray-200 h-2 rounded-full">
                    <div
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
            </div>

            {/* Formulaire avec animation */}
            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={state.step}
                        custom={state.direction}
                        variants={slideVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className='block border-t'>
                    <div className="flex justify-between mt-8">
                        {!progress.isFirstStep && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Précédent
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Annuler
                        </button>

                        {progress.isLastStep ? (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!progress.canProceed || isSubmitting}
                                className={`px-4 py-2 text-white rounded-lg ${!progress.canProceed || isSubmitting
                                    ? 'bg-red-300 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center">
                                        Enregistrement... &nbsp;
                                        <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                                    </div>
                                ) : (
                                    'Enregistrer'
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!progress.canProceed}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                            >
                                Suivant
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AjoutCommande;