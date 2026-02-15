import React, { useEffect, useState, useRef } from 'react';
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
import { isAdminRole } from '../utils/role-helpers';
import { apiService } from '../services/api.service';


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
    commande,
    isEditing,
    initialData,
    isCession = false
}) => {
    const { user } = useAuth();
    // Préparer les données initiales avec l'adresse du magasin si disponible
    const getInitialData = () => {
        const baseData = initialData || {
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
                    type: 'Domicile',
                    ligne1: '',
                    batiment: '',
                    etage: '',
                    ascenseur: false,
                    interphone: ''
                }
            },
            articles: {
                nombre: 0,
                details: '',
                photos: [],
                dimensions: []
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
                enseigne: 'Truffaut',
                phone: '',
                email: '',
                manager: '',
                status: '',
                photo: ''
            }
        };

        // ✅ FUSIONNER avec les données pré-remplies depuis le contact
        if (commande && Object.keys(commande).length > 0) {
            console.log('📋 Fusion données contact dans getInitialData:', commande);

            // Fusionner client
            if (commande.client) {
                baseData.client = {
                    ...baseData.client,
                    ...(commande.client as any)
                };
            }

            // Fusionner articles
            if (commande.articles) {
                baseData.articles = {
                    ...baseData.articles,
                    ...(commande.articles as any)
                };
            }

            // Fusionner livraison
            if (commande.livraison) {
                baseData.livraison = {
                    ...baseData.livraison,
                    ...(commande.livraison as any)
                };
            }

            // Fusionner dates
            if ((commande as any).dates) {
                if (!baseData.commande) baseData.commande = { numeroCommande: '', dates: {} };
                baseData.commande.dates = {
                    ...(baseData.commande.dates || {}),
                    ...((commande as any).dates)
                };
            }

            // Fusionner magasin (depuis contact)
            if (commande.magasin) {
                baseData.magasin = {
                    ...baseData.magasin,
                    ...(commande.magasin as any)
                };
            }
        }

        // Si nous sommes en mode magasin, ajouter les informations du magasin
        if (user?.role === 'magasin' && user.storeId) {
            baseData.magasin = {
                ...baseData.magasin,
                id: user.storeId,
                name: user.storeName || '',
                address: user.storeAddress || ''
            };
        }

        return baseData;
    };
    const [formData, setFormData] = useState(getInitialData());
    const [creneaux, setCreneaux] = useState(CRENEAUX_LIVRAISON);
    const [vehicules, setVehicules] = useState<{ [key: string]: string }>(VEHICULES);
    const [selectedMagasinId, setSelectedMagasinId] = useState<string>('');
    const [magasins, setMagasins] = useState<Array<{ id: string; nom: string; adresse: string; enseigne: string }>>([]);
    const [loadingMagasins, setLoadingMagasins] = useState(false);

    const { loading } = useDraftStorage();

    const { dataService } = useOffline();

    const {
        state,               // Contient formData, errors, step, etc.
        dispatch,            // Dispatch pour actions du reducer
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
                        userRole={user?.role}
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
                        userRole={user?.role}
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

    // Charger la liste des magasins pour admin
    useEffect(() => {
        const loadMagasins = async () => {
            if (!isAdminRole(user?.role)) return;

            try {
                setLoadingMagasins(true);
                const response = await apiService.get('/magasins') as { data: Array<{ id: string; nom: string; adresse: string; enseigne: string }> };
                setMagasins(response.data || []);
            } catch (error) {
                console.error('Erreur chargement magasins:', error);
            } finally {
                setLoadingMagasins(false);
            }
        };

        loadMagasins();
    }, [user?.role]);

    // ✅ PRÉ-REMPLIR LE FORMULAIRE avec les données de commande (depuis contact/devis)
    const lastCommandeRef = useRef<any>(null);
    const skipMagasinUpdateRef = useRef(false);

    useEffect(() => {
        if (!commande || Object.keys(commande).length === 0) {
            return;
        }

        // ⚠️ ATTENDRE que les magasins soient chargés
        if (magasins.length === 0) {
            console.log('⏳ En attente du chargement des magasins...');
            return;
        }

        // Vérifier si c'est une nouvelle commande différente de la dernière traitée
        const commandeId = (commande as any).contactId || JSON.stringify(commande);
        if (lastCommandeRef.current === commandeId) {
            return;
        }

        console.log('✅ AjoutCommande - Pré-remplissage du formulaire avec:', commande);
        lastCommandeRef.current = commandeId;

        // 1. Trouver et sélectionner le magasin
        const magasinName = (commande.magasin as any)?.nom || commande.magasin?.name;
        console.log('🔍 DEBUG - Magasin name:', magasinName, 'Liste magasins:', magasins.map(m => m.nom));
        let selectedMagasin = null;
        if (magasinName) {
            selectedMagasin = magasins.find(m =>
                m.nom.toLowerCase() === magasinName.toLowerCase()
            );
            if (selectedMagasin) {
                console.log('✅ Pré-sélection magasin:', selectedMagasin.nom, 'ID:', selectedMagasin.id);
                setSelectedMagasinId(selectedMagasin.id);
            } else {
                console.warn('⚠️ Magasin non trouvé dans la liste:', magasinName);
            }
        }

        // 2. Convertir la date de livraison du format DD/MM/YYYY vers YYYY-MM-DD
        let livraisonDate = '';
        if ((commande as any).dates?.livraison) {
            const dateParts = (commande as any).dates.livraison.split('/');
            if (dateParts.length === 3) {
                // Format DD/MM/YYYY → YYYY-MM-DD
                livraisonDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            }
        }

        // 3. Construire l'objet de données complet pour RESTORE_DRAFT
        const restoredData: any = {
            numeroCommande: '',
            dates: {
                commande: new Date().toISOString(),
                livraison: livraisonDate,
                misAJour: {
                    commande: new Date().toISOString(),
                    livraison: ''
                }
            },
            client: {
                nom: (commande as any).client?.nom || '',
                prenom: (commande as any).client?.prenom || '',
                nomComplet: `${(commande as any).client?.nom || ''} ${(commande as any).client?.prenom || ''}`.trim(),
                telephone: {
                    principal: (commande as any).client?.telephone?.principal || '',
                    secondaire: ''
                },
                adresse: {
                    type: 'Domicile',
                    ligne1: (commande as any).client?.adresse?.ligne1 || '',
                    batiment: '',
                    etage: (commande as any).client?.adresse?.etage !== undefined ? String((commande as any).client.adresse.etage) : '',
                    ascenseur: (commande as any).client?.ascenseur || false,
                    interphone: (commande as any).client?.adresse?.interphone || ''
                }
            },
            articles: {
                nombre: (commande as any).articles?.nombre || 0,
                details: '',
                photos: [],
                dimensions: (commande as any).articles?.dimensions || [],
                autresArticles: (commande as any).articles?.autresArticles || 0
            },
            livraison: {
                creneau: (commande as any).livraison?.creneau || '',
                vehicule: (commande as any).livraison?.vehicule || '',
                equipiers: (commande as any).livraison?.equipiers || 0,
                reserve: false,
                remarques: '',
                details: {
                    hasElevator: (commande as any).client?.ascenseur || false,
                    hasStairs: false,
                    stairCount: 0,
                    parkingDistance: 0,
                    needsAssembly: (commande as any).livraison?.conditionsSpeciales?.montageInstallation || false,
                    rueInaccessible: (commande as any).livraison?.conditionsSpeciales?.rueInaccessible || false,
                    paletteComplete: (commande as any).livraison?.conditionsSpeciales?.paletteComplete || false,
                    isDuplex: (commande as any).livraison?.conditionsSpeciales?.appartementDuplex || false,
                    deliveryToUpperFloor: false
                }
            },
            magasin: selectedMagasin ? {
                id: selectedMagasin.id,
                name: selectedMagasin.nom,
                address: selectedMagasin.adresse,
                enseigne: selectedMagasin.enseigne || 'Truffaut',
                phone: '',
                email: '',
                manager: '',
                status: '',
                photo: ''
            } : undefined
        };

        console.log('📦 Dispatch RESTORE_DRAFT avec:', restoredData);

        // 3. Dispatch RESTORE_DRAFT pour restaurer toutes les données d'un coup
        setTimeout(() => {
            skipMagasinUpdateRef.current = true; // Éviter que le useEffect magasin écrase nos données

            dispatch({
                type: 'RESTORE_DRAFT',
                payload: {
                    data: restoredData,
                    isDirty: true
                }
            });
            console.log('✅ Formulaire restauré avec toutes les données du contact');
        }, 100);
    }, [commande, magasins, dispatch]);

    // Mettre à jour le magasin sélectionné dans les données du formulaire
    useEffect(() => {
        // Skip si on vient de faire un RESTORE_DRAFT
        if (skipMagasinUpdateRef.current) {
            skipMagasinUpdateRef.current = false;
            return;
        }

        // Skip si le formulaire a déjà un magasin (restauré depuis brouillon)
        if (state.data?.magasin?.id) {
            console.log('⏭️ Magasin déjà présent dans le formulaire (brouillon restauré), skip update');
            return;
        }

        if (selectedMagasinId && magasins.length > 0) {
            const selectedMagasin = magasins.find(m => m.id === selectedMagasinId);
            if (selectedMagasin) {
                handleInputChange({
                    target: {
                        name: 'magasin',
                        value: {
                            id: selectedMagasin.id,
                            name: selectedMagasin.nom,
                            address: selectedMagasin.adresse,
                            enseigne: selectedMagasin.enseigne || 'Truffaut',
                            phone: '',
                            email: '',
                            manager: '',
                            status: '',
                            photo: ''
                        }
                    }
                });
            }
        }
    }, [selectedMagasinId, magasins, state.data?.magasin?.id]);

    // Pour détecter et réagir aux changements de magasin
    useEffect(() => {
        if (user?.role === 'magasin' && user.storeAddress) {
            const magasin = {
                id: user.storeId || '',
                name: user.storeName || '',
                address: user.storeAddress || '',
                enseigne: 'Truffaut',
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

            {/* Sélecteur de magasin pour admin */}
            {isAdminRole(user?.role) && !isEditing && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                🏪 Créer cette {isCession ? 'cession' : 'commande'} pour le magasin :
                            </label>
                            {loadingMagasins ? (
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
                                    <span>Chargement des magasins...</span>
                                </div>
                            ) : (
                                <>
                                    <select
                                        value={selectedMagasinId}
                                        onChange={(e) => setSelectedMagasinId(e.target.value)}
                                        className="w-full border-2 border-gray-300 rounded-md px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                        required
                                    >
                                        <option value="">-- Sélectionner un magasin --</option>
                                        {magasins.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.nom} ({m.adresse})
                                            </option>
                                        ))}
                                    </select>

                                    {selectedMagasinId ? (
                                        <div className="mt-3 flex items-center space-x-2 text-sm">
                                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-green-700 font-medium">
                                                Privilèges admin activés : bypass devis obligatoire
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs text-gray-600 italic">
                                            ⚠️ Sélectionner un magasin pour activer les privilèges admin
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                disabled={!progress.canProceed || isSubmitting || (isAdminRole(user?.role) && !isEditing && !selectedMagasinId)}
                                className={`px-4 py-2 text-white rounded-lg ${!progress.canProceed || isSubmitting || (isAdminRole(user?.role) && !isEditing && !selectedMagasinId)
                                    ? 'bg-red-300 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                title={isAdminRole(user?.role) && !isEditing && !selectedMagasinId ? 'Veuillez sélectionner un magasin' : ''}
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
                                disabled={!progress.canProceed || (state.step === 1 && isAdminRole(user?.role) && !isEditing && !selectedMagasinId)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                                title={state.step === 1 && isAdminRole(user?.role) && !isEditing && !selectedMagasinId ? 'Veuillez sélectionner un magasin' : ''}
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