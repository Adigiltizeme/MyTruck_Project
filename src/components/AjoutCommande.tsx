import React, { useEffect, useState } from 'react';
import { CommandeMetier } from '../types/business.types';
import { motion, AnimatePresence } from 'framer-motion';
import { AirtableService } from '../services/airtable.service';
import { CRENEAUX_LIVRAISON, VEHICULES } from './constants/options';
import { useDraftStorage } from '../hooks/useDraftStorage';
import { useCommandeForm } from '../hooks/useCommandeForm';
import { ClientForm } from './forms/ClientForm';
import { ArticlesForm } from './forms/ArticlesForm';
import { LivraisonForm } from './forms/LivraisonForm';
import { RecapitulatifForm } from './forms/RecapitulatifForm';


interface AjoutCommandeProps {
    onSubmit: (commande: Partial<CommandeMetier>) => Promise<void>;
    onCancel: () => void;
    commande: CommandeMetier;
    isEditing: boolean;
    initialData: CommandeMetier;
    disabledFields?: string[];
}

const AjoutCommande: React.FC<AjoutCommandeProps> = ({
    onSubmit,
    onCancel,
    commande,
    isEditing,
    disabledFields = [],
    initialData
}) => {
    const [formData, setFormData] = useState<Partial<CommandeMetier>>(
        initialData || {
            commande: {
                numeroCommande: '',
                dates: {
                    commande: new Date().toISOString(),
                    livraison: '',
                    misAJour: new Date().toISOString()
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
                id: '',
                name: '',
                address: '',
                phone: '',
                email: '',
                manager: '',
                status: '',
                photo: ''
            }
        }

    )
    const [creneaux, setCreneaux] = useState(CRENEAUX_LIVRAISON);
    const [vehicules, setVehicules] = useState<{ [key: string]: string }>(VEHICULES);

    const { loading } = useDraftStorage();

    const {
        state,               // Contient formData, errors, step, etc.
        handleInputChange,   // Pour gérer les changements de champs
        handleNext,          // Navigation suivant
        handlePrev,         // Navigation précédent
        handleSubmit,       // Soumission du formulaire
        isSubmitting,       // En cours de soumission
        progress,           // Progression (pourcentages, étapes)
        stepsConfig,
        displayErrors,
        stepTransition,      // Animations entre étapes
        handleAddressSearch, // Recherche d'adresse
        handleAddressSelect, // Sélection d'adresse
        addressSuggestions,  // Suggestions d'adresse
    } = useCommandeForm(async (data) => {
        await onSubmit(data);
        onCancel(); // Ferme le modal après soumission réussie
    });

    const renderStep = () => {
        switch (state.step) {
            case 1:
                return (
                    <ClientForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                        handleAddressSearch={handleAddressSearch}
                        handleAddressSelect={handleAddressSelect}
                        addressSuggestions={addressSuggestions}
                    />
                );
            case 2:
                return (
                    <ArticlesForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                    />
                );
            case 3:
                return (
                    <LivraisonForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                        showErrors={state.showErrors}
                    />
                );
            case 4:
                return (
                    <RecapitulatifForm
                        data={state.data}
                        errors={state.errors}
                        onChange={handleInputChange}
                        showErrors={state.showErrors}
                    />
                )
            default:
                return null;
        }
    };

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
                const [creneauxData, vehiculesData] = await Promise.all([
                    airtableService.getFieldOptions('CRENEAU DE LIVRAISON'),
                    airtableService.getFieldOptions('CATEGORIE DE VEHICULE')
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
                    Nouvelle commande
                </h2>
            </div>
            {/* En-tête avec étapes */}
            <div className="flex justify-between items-center mb-8">
                {['Client', 'Articles', 'Livraison', 'Confirmer'].map((step, index) => (
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
                                className="px-4 py-2 text-gray-600"
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

// import React, { useCallback, useEffect, useState } from 'react';
// import { CommandeMetier, ArticlesType } from '../types/business.types';
// import { FormState } from '../types/form.types';
// import { ValidationErrors } from '../types/validation.types';
// import { motion, AnimatePresence } from 'framer-motion';
// import { AirtableService } from '../services/airtable.service';
// import FormInput from './forms/FormInput';
// import { CRENEAUX_LIVRAISON, VEHICULES } from './constants/options';
// import { formatPhoneNumber } from '../utils/formatters';
// import { debounce } from 'lodash';
// import { ERROR_MESSAGES } from './constants/errorMessages';
// import { format } from 'date-fns';
// import PhotoUploader from './PhotoUploader';
// import { useDraftStorage } from '../hooks/useDraftStorage';
// import { useStepManagement } from '../hooks/useStepManagement';
// import { useFormValidation } from '../hooks/useFormValidation';
// import { useCommandeForm } from '../hooks/useCommandeForm';
// import { ArticlesForm, ClientForm, LivraisonForm } from './forms';

// interface AjoutCommandeProps {
//     onSubmit: (commande: Partial<CommandeMetier>) => Promise<void>;
//     onCancel: () => void;
// }

// interface SubmitStatus {
//     isSubmitting: boolean;
//     error: string | null;
//     success: boolean;
// }

// interface AddressSuggestion {
//     properties: {
//         id: string;
//         label: string;
//         name: string;
//         postcode: string;
//         city: string;
//     };
// }

// const validateEquipiers = (value: number) => {
//     if (value > 2) {
//         return {
//             isValid: false,
//             message: ERROR_MESSAGES.equipiers.max
//         };
//     }
//     return { isValid: true, message: "" };
// };


// const AjoutCommande: React.FC<AjoutCommandeProps> = ({ onSubmit, onCancel }) => {
//     const [activeStep, setActiveStep] = useState(1);
//     const [errors, setErrors] = useState<ValidationErrors>({});
//     const [formData, setFormData] = useState<Partial<CommandeMetier & { [key: string]: any }>>({
//         commande: {
//             numeroCommande: '',
//             dates: {
//                 commande: new Date().toISOString(),
//                 livraison: '',
//                 misAJour: new Date().toISOString()
//             },
//         },
//         client: {
//             nom: '',
//             prenom: '',
//             nomComplet: '',
//             telephone: {
//                 principal: '',
//                 secondaire: ''
//             },
//             adresse: {
//                 type: 'Domicile', // ou 'Professionnelle'
//                 ligne1: '',
//                 batiment: '',
//                 etage: '',
//                 ascenseur: false, // ou true
//                 interphone: ''
//             }
//         },
//         articles: {
//             nombre: 0,
//             details: '',
//             photos: []
//         },
//         livraison: {
//             creneau: '',
//             vehicule: '',
//             equipiers: 0,
//             reserve: false,
//             remarques: '',
//             chauffeurs: []
//         },
//         vendeur: {
//             prenom: '',
//         },
//         magasin: {
//             id: '',
//             name: '',
//             address: '',
//             phone: '',
//             email: '',
//             manager: '',
//             status: '',
//             photo: ''
//         }
//     });
//     const [isValid, setIsValid] = useState<boolean>(false);
//     const [direction, setDirection] = useState<'left' | 'right'>('right');
//     const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
//     const [submitStatus, setSubmitStatus] = useState<{
//         isSubmitting: boolean;
//         error: string | null;
//         success: boolean;
//     }>({
//         isSubmitting: false,
//         error: null,
//         success: false
//     });
//     const [creneaux, setCreneaux] = useState(CRENEAUX_LIVRAISON);
//     const [vehicules, setVehicules] = useState<{ [key: string]: string }>(VEHICULES);
//     const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
//     const [formState, setFormState] = useState<FormState>({
//         data: formData,
//         errors: {},
//         isValid: false,
//         isDirty: false,
//         isSubmitting: false,
//         step: 1,
//         direction: 'right'
//     });

//     const updateFormState = useCallback((updates: Partial<FormState>) => {
//         setFormState(prev => ({ ...prev, ...updates }));
//     }, []);

//     const { draftData, loading, error, saveDraft, clearDraft, hasDraft } = useDraftStorage();
//     const { validateStep, validateForm } = useFormValidation(formState.data);
//     // const {
//     //     handleNextStep,
//     //     handlePrevStep,
//     //     handleSubmit,
//     //     progress,
//     //     stepTransition,
//     //     currentStepConfig
//     // } = useStepManagement(formState, updateFormState, onSubmit);

//     const {
//         state,
//         handleInputChange,
//         handleNext,
//         handlePrev,
//         handleSubmit,
//         progress,
//         stepTransition,
//         currentStepConfig
//     } = useCommandeForm(onSubmit);

//     const renderStep = () => {
//         switch (state.step) {
//             case 1:
//                 return <ClientForm
//                     data={state.data}
//                     errors={state.errors}
//                     onChange={handleInputChange}
//                 />;
//             case 2:
//                 return <ArticlesForm
//                     data={state.data}
//                     errors={state.errors}
//                     onChange={handleInputChange}
//                 />;
//             case 3:
//                 return <LivraisonForm
//                     data={state.data}
//                     errors={state.errors}
//                     onChange={handleInputChange}
//                 />;
//             default:
//                 return null;
//         }
//     };

//     useEffect(() => {
//         const loadOptions = async () => {
//             try {
//                 const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
//                 const [creneauxData, vehiculesData] = await Promise.all([
//                     airtableService.getFieldOptions('CRENEAU DE LIVRAISON'),
//                     airtableService.getFieldOptions('CATEGORIE DE VEHICULE')
//                 ]);

//                 if (creneauxData.length > 0) setCreneaux(creneauxData);
//                 if (vehiculesData.length > 0) {
//                     const vehiculesMap = vehiculesData.reduce((acc: { [key: string]: string }, vehicule: string) => {
//                         acc[vehicule] = vehicule;
//                         return acc;
//                     }, {});
//                     setVehicules(vehiculesMap);
//                 }
//             } catch (error) {
//                 console.error('Erreur chargement options:', error);
//                 // En cas d'erreur, on garde les valeurs par défaut des constantes
//             }
//         };
//         loadOptions();
//     }, []);

//     // Chargement initial du brouillon
//     useEffect(() => {
//         if (!loading && hasDraft && draftData) {
//             const shouldRestore = window.confirm(
//                 'Un brouillon de commande existe. Voulez-vous le restaurer ?'
//             );
//             if (shouldRestore) {
//                 setFormData(draftData);
//             } else {
//                 clearDraft();
//             }
//         }
//     }, [loading, hasDraft, draftData, clearDraft]);

//     // Effet pour la sauvegarde automatique
//     useEffect(() => {
//         const debouncedSave = debounce(() => {
//             if (Object.keys(formData).length > 0) {
//                 saveDraft(formData);
//             }
//         }, 2000);

//         debouncedSave();
//         return () => debouncedSave.cancel();
//     }, [formData, saveDraft]);

//     // Valider le formulaire à chaque changement
//     useEffect(() => {
//         validateForm();
//     }, [formData]);

//     useEffect(() => {
//         if (error) {
//             console.error('Erreur avec le service de brouillons:', error);
//             // Gérer l'erreur de manière appropriée
//         }
//     }, [error]);

//     // Vérifier les équipiers à chaque changement d'étape
//     useEffect(() => {
//         if (activeStep === 3 && (formData.livraison?.equipiers ?? 0) > 2) {
//             setErrors(prev => ({
//                 ...prev,
//                 livraison: {
//                     ...prev?.livraison,
//                     equipiers: ERROR_MESSAGES.equipiers.max
//                 }
//             }));
//         }
//     }, [activeStep, formData.livraison?.equipiers]);

//     const updateFormData = (path: string, value: any) => {
//         setFormData(prev => {
//             // Créer une copie profonde de l'état précédent
//             const newData = JSON.parse(JSON.stringify(prev));

//             // Séparer le chemin en tableau (ex: 'client.nom' => ['client', 'nom'])
//             const keys = path.split('.');

//             // Pointer vers l'objet à modifier
//             let current = newData;
//             for (let i = 0; i < keys.length - 1; i++) {
//                 if (!current[keys[i]]) {
//                     current[keys[i]] = {};
//                 }
//                 current = current[keys[i]];
//             }

//             // Mettre à jour la valeur
//             current[keys[keys.length - 1]] = value;

//             return newData;
//         });
//     };

//     const handleDateChange = (date: string) => {
//         setFormData(prev => ({
//             ...prev,
//             dates: {
//                 ...prev.dates,
//                 livraison: date
//             }
//         }));
//     };

//     const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//         const files = e.target.files;
//         if (!files) return;

//         const validatePhotos = (files: FileList) => {
//             const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
//             const MAX_SIZE = 10 * 1024 * 1024; // 10MB
//             const MAX_FILES = 5;

//             if (files.length > MAX_FILES) {
//                 throw new Error(`Maximum ${MAX_FILES} photos autorisées`);
//             }

//             Array.from(files).forEach(file => {
//                 if (!ALLOWED_TYPES.includes(file.type)) {
//                     throw new Error('Format de fichier non supporté');
//                 }
//                 if (file.size > MAX_SIZE) {
//                     throw new Error('Fichier trop volumineux');
//                 }
//             });
//         };

//         // Format attendu par Airtable pour les attachements
//         const attachments = await Promise.all(
//             Array.from(files).map(async (file) => {
//                 // Vérification du type de fichier
//                 if (!file.type.startsWith('image/')) {
//                     throw new Error('Le fichier doit être une image');
//                 }

//                 // Conversion en base64
//                 const base64 = await new Promise<string>((resolve) => {
//                     const reader = new FileReader();
//                     reader.onload = () => {
//                         const base64 = reader.result as string;
//                         // On ne garde que la partie données du base64
//                         const base64Data = base64.split(',')[1];
//                         resolve(base64Data);
//                     };
//                     reader.readAsDataURL(file);
//                 });

//                 // Structure attendue par Airtable
//                 return {
//                     filename: file.name,
//                     type: file.type,
//                     content: base64
//                 };
//             })
//         );

//         // Mise à jour du state avec le bon format
//         updateFormData('articles.photos', attachments.map((attachment, index) => ({
//             url: URL.createObjectURL(files[index]),
//             file: attachment
//         })));
//     };

//     const removePhoto = (index: number) => {
//         const photos = formData.articles?.photos || [];
//         // Libérer l'URL de l'aperçu
//         if (photos[index]?.url) {
//             URL.revokeObjectURL(photos[index].url);
//         }
//         const newPhotos = [...photos];
//         newPhotos.splice(index, 1);
//         updateFormData('articles.photos', newPhotos);
//     };

//     const resetForm = useCallback(() => {
//         setFormData({
//             commande: {
//                 numeroCommande: '',
//                 dates: {
//                     commande: new Date().toISOString(),
//                     livraison: new Date().toISOString(),
//                     misAJour: new Date().toISOString()
//                 },
//             },
//             client: {
//                 nom: '',
//                 prenom: '',
//                 nomComplet: '',
//                 telephone: {
//                     principal: '',
//                     secondaire: ''
//                 },
//                 adresse: {
//                     type: 'Domicile',
//                     ligne1: '',
//                     batiment: '',
//                     etage: '',
//                     ascenseur: false,
//                     interphone: ''
//                 }
//             },
//             articles: {
//                 nombre: 0,
//                 details: '',
//                 photos: []
//             },
//             livraison: {
//                 creneau: '',
//                 vehicule: '',
//                 equipiers: 0,
//                 reserve: false,
//                 remarques: '',
//                 chauffeurs: []
//             },
//             vendeur: {
//                 prenom: '',
//             },
//             magasin: {
//                 id: '',
//                 name: '',
//                 address: '',
//                 phone: '',
//                 email: '',
//                 manager: '',
//                 status: '',
//                 photo: ''
//             }
//         });
//         setActiveStep(1);
//         setErrors({});
//         setIsValid(false);
//     }, []);

//     if (loading) {
//         return <div>Chargement...</div>;
//     }

//     // const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     //     const { name, value } = e.target;
//     //     const [parent, child, subChild] = name.split('.');
//     //     // Formatage spécial pour les numéros de téléphone
//     //     if (name.includes('telephone')) {
//     //         const formattedValue = formatPhoneNumber(value);
//     //         updateFormField(name, formattedValue);
//     //         return;
//     //     }
//     //     updateFormField(name, value);

//     //     setFormData(prev => ({
//     //         ...prev,
//     //         [parent]: {
//     //             ...prev[parent],
//     //             ...(!subChild
//     //                 ? { [child]: value }
//     //                 : {
//     //                     [child]: {
//     //                         ...prev[parent]?.[child],
//     //                         [subChild]: value
//     //                     }
//     //                 }
//     //             )
//     //         }
//     //     }));

//     //     // Pour l'adresse, traitement spécial
//     //     if (name === 'client.adresse.ligne1') {
//     //         // Efface immédiatement les suggestions si le champ est vide
//     //         if (!value || value.trim() === '') {
//     //             setAddressSuggestions([]);
//     //             updateFormData(name, value);
//     //             return;
//     //         }

//     //         // Sinon, lance la recherche si plus de 3 caractères
//     //         if (value.length > 3) {
//     //             handleAddressSearch(value);
//     //         }
//     //     }

//     //     // Pour les équipiers, validation spéciale
//     //     if (name === 'livraison.equipiers') {
//     //         const numValue = parseInt(value);
//     //         const validation = validateEquipiers(numValue);
//     //         if (!validation.isValid) {
//     //             setErrors(prev => ({
//     //                 ...prev,
//     //                 livraison: {
//     //                     ...prev.livraison,
//     //                     equipiers: validation.message
//     //                 }
//     //             }));
//     //         }
//     //     }

//     //     // Mise à jour du champ
//     //     updateFormData(name, value);
//     // }, []);

//     const updateFormField = (path: string, value: any) => {
//         const keys = path.split('.');
//         setFormData(prev => {
//             const newData = { ...prev };
//             let current = newData;
//             for (let i = 0; i < keys.length - 1; i++) {
//                 current[keys[i]] = { ...current[keys[i]] };
//                 current = current[keys[i]];
//             }
//             current[keys[keys.length - 1]] = value;

//             // Sauvegarde automatique en brouillon
//             localStorage.setItem('commandeDraft', JSON.stringify(newData));
//             return newData;
//         });
//     };
//     // Gestion de l'adresse avec autocomplétion
//     const handleAddressSearch = async (query: string) => {
//         // Double vérification pour le champ vide
//         if (!query || query.trim() === '') {
//             setAddressSuggestions([]);
//             return;
//         }

//         try {
//             const response = await fetch(
//                 `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
//             );
//             const data = await response.json();
//             setAddressSuggestions(data.features || []);
//         } catch (error) {
//             console.error('Erreur lors de la recherche d\'adresse:', error);
//             setAddressSuggestions([]);
//         }
//     };

//     // Si une suggestion est sélectionnée
//     const handleAddressSelect = (suggestion: any) => {
//         const { properties } = suggestion;

//         // Mise à jour de l'adresse complète
//         setFormData(prev => ({
//             ...prev,
//             client: {
//                 ...prev.client,
//                 adresse: {
//                     ...prev.client?.adresse,
//                     ligne1: properties.label, // Adresse complète
//                     codePostal: properties.postcode,
//                     ville: properties.city
//                 }
//             }
//         }));

//         setAddressSuggestions([]); // Ferme les suggestions
//     };

//     const handlePhotoChange = (photos: Array<{ url: string, file: File }>) => {
//         updateFormData('articles.photos', photos);
//     };

//     // Pour les transitions entre les étapes
//     const slideVariants = {
//         enter: (direction: 'left' | 'right') => ({
//             x: direction === 'right' ? 1000 : -1000,
//             opacity: 0,
//             scale: 0.8
//         }),
//         center: {
//             x: 0,
//             opacity: 1,
//             scale: 1,
//             transition: {
//                 duration: 0.5,
//                 ease: "easeOut"
//             }
//         },
//         exit: (direction: 'left' | 'right') => ({
//             x: direction === 'right' ? -1000 : 1000,
//             opacity: 0,
//             scale: 0.8
//         })
//     };

//     const CreneauxSelect = () => (
//         <select
//             name="livraison.creneau"
//             value={formData.livraison?.creneau || ''}
//             onChange={handleInputChange}
//             required
//             className="mt-1 block w-full rounded-md border border-gray-300"
//         >
//             <option value="">Sélectionner un créneau</option>
//             {creneaux.map(creneau => (
//                 <option key={creneau} value={creneau}>{creneau}</option>
//             ))}
//         </select>
//     );

//     const VehiculesSelect = () => (
//         <select
//             name="livraison.vehicule"
//             value={formData.livraison?.vehicule || ''}
//             onChange={handleInputChange}
//             required
//             className="mt-1 block w-full rounded-md border border-gray-300"
//         >
//             <option value="">Sélectionner un véhicule</option>
//             {Object.entries(VEHICULES).map(([full, short]) => (
//                 <option key={full} value={full}>{full}</option>
//             ))}
//         </select>
//     );

//     return (
//         <div className="space-y-6 p-6">
//             {/* En-tête avec progression */}
//             <div className="flex justify-between items-center mb-8">
//                 <h2 className="text-xl font-medium">
//                     {currentStepConfig.title}
//                 </h2>
//                 <div className="w-64 bg-gray-200 h-2 rounded-full">
//                     <div
//                         className="bg-red-600 h-2 rounded-full transition-all duration-300"
//                         style={{ width: `${progress.percentage}%` }}
//                     />
//                 </div>
//             </div>
//             {/* En-tête avec bordure */}
//             <div className="border-b mb-6">
//                 <h2 className="text-xl font-medium text-center pb-4">
//                     Nouvelle commande
//                 </h2>
//             </div>
//             {/* En-tête avec étapes */}
//             <div className="flex justify-between items-center mb-8">
//                 {['Client', 'Articles', 'Livraison'].map((step, index) => (
//                     <div key={index} className="flex flex-col items-center">
//                         <div className={`w-8 h-8 rounded-full flex items-center justify-center
//                 ${activeStep === index + 1
//                                 ? 'bg-red-600 text-white'
//                                 : 'bg-white text-gray-400 border'}`}
//                         >
//                             {index + 1}
//                         </div>
//                         <span className={`mt-2 text-sm ${activeStep === index + 1 ? 'text-red-600' : 'text-gray-500'
//                             }`}>
//                             {step}
//                         </span>
//                     </div>
//                 ))}
//             </div>

//             {/* Contenu des étapes avec animation */}
//             <AnimatePresence mode="wait">
//                 <motion.div
//                     key={formState.step}
//                     custom={formState.direction}
//                     variants={slideVariants}
//                     initial="initial"
//                     animate="animate"
//                     exit="exit"
//                     transition={{ duration: 0.3 }}
//                 >
//                     <form onSubmit={handleSubmit} className="space-y-6">
//                         {/* Contenu de chaque étape */}
//                         {activeStep === 1 && (
//                             <div className="space-y-4">
//                                 <h3 className="text-lg font-medium">Informations client</h3>
//                                 <div className='grid grid-cols-2 gap-4'>
//                                     <FormInput
//                                         label="Numéro de commande"
//                                         name="commande.numeroCommande"
//                                         value={formData.commande?.numeroCommande || ''}
//                                         onChange={handleInputChange}
//                                         error={errors.commande?.numeroCommande}
//                                         required
//                                     />
//                                 </div>
//                                 <div className="grid grid-cols-2 gap-4">
//                                     <FormInput
//                                         label="Nom"
//                                         name="client.nom"
//                                         value={formData.client?.nom || ''}
//                                         onChange={handleInputChange}
//                                         error={errors.client?.nom}
//                                         required
//                                     />
//                                     <FormInput
//                                         label="Prénom"
//                                         name="client.prenom"
//                                         value={formData.client?.prenom || ''}
//                                         onChange={handleInputChange}
//                                         error={errors.client?.prenom}
//                                     />
//                                     <FormInput
//                                         label="Téléphone principal"
//                                         name="client.telephone.principal"
//                                         value={formData.client?.telephone?.principal || ''}
//                                         onChange={handleInputChange}
//                                         error={errors.client?.telephone?.principal}
//                                         required
//                                         type='tel'
//                                     />
//                                     <FormInput
//                                         label="Téléphone secondaire"
//                                         name="client.telephone.secondaire"
//                                         value={formData.client?.telephone?.secondaire || ''}
//                                         onChange={handleInputChange}
//                                         type='tel'
//                                     />
//                                 </div>
//                                 <div className="space-y-4">
//                                     {/* <div className="relative"> */}
//                                     <FormInput
//                                         label="Adresse de livraison"
//                                         name="client.adresse.ligne1"
//                                         value={formData.client?.adresse?.ligne1 || ''}
//                                         onChange={(e) => {
//                                             handleInputChange(e);
//                                             if (e.target.value.length > 3) {
//                                                 handleAddressSearch(e.target.value);
//                                             }
//                                         }}
//                                         error={errors.client?.adresse?.ligne1}
//                                         required
//                                     />
//                                     <AnimatePresence>
//                                         {addressSuggestions.length > 0 && (
//                                             <motion.div
//                                                 initial={{ opacity: 0, y: -10 }}
//                                                 animate={{ opacity: 1, y: 0 }}
//                                                 exit={{ opacity: 0, y: -10 }}
//                                                 className="absolute z-10 w-full bg-white shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto"
//                                             >
//                                                 {addressSuggestions.map((suggestion, index) => (
//                                                     <div
//                                                         key={index}
//                                                         className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
//                                                         onClick={() => handleAddressSelect(suggestion)}
//                                                     >
//                                                         {suggestion.properties.label}
//                                                     </div>
//                                                 ))}
//                                             </motion.div>
//                                         )}
//                                     </AnimatePresence>
//                                     {/* </div> */}

//                                     <div className="grid grid-cols-2 gap-4">
//                                         <div>
//                                             <label className='block text-sm font-bold text-gray-700'>Type d'adresse</label>
//                                             <select
//                                                 className='mt-1 border border-gray-300 rounded-md'
//                                                 name="client.adresse.type"
//                                                 value={formData.client?.adresse?.type || 'Domicile'}
//                                                 onChange={handleInputChange}
//                                             >
//                                                 <option value="Domicile">Domicile</option>
//                                                 <option value="Professionnelle">Professionnelle</option>
//                                             </select>
//                                         </div>

//                                         <FormInput
//                                             label="Bâtiment"
//                                             name="client.adresse.batiment"
//                                             value={formData.client?.adresse?.batiment || ''}
//                                             onChange={handleInputChange}
//                                         />

//                                         <FormInput
//                                             label="Interphone/Code"
//                                             subLabel='Si aucun, le préciser'
//                                             name="client.adresse.interphone"
//                                             value={formData.client?.adresse?.interphone || ''}
//                                             onChange={handleInputChange}
//                                             error={errors.client?.adresse?.interphone}
//                                             required
//                                         />

//                                         <FormInput
//                                             label="Étage"
//                                             name="client.adresse.etage"
//                                             value={formData.client?.adresse?.etage || ''}
//                                             onChange={handleInputChange}
//                                             error={errors.client?.adresse?.etage}
//                                             required
//                                         />

//                                         <div>
//                                             <label className='mt-1 block text-sm font-bold text-gray-700'>Ascenseur</label>
//                                             <select
//                                                 className='border border-gray-300 rounded-md'
//                                                 name="client.adresse.ascenseur"
//                                                 value={formData.client?.adresse?.ascenseur ? 'Oui' : 'Non'}
//                                                 onChange={handleInputChange}
//                                             >
//                                                 <option value="Non">Non</option>
//                                                 <option value="Oui">Oui</option>
//                                             </select>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}

//                         {activeStep === 2 && (
//                             <div className="space-y-4">
//                                 <h3 className="text-lg font-medium">Articles</h3>
//                                 <div className="grid grid-cols-1 gap-4">
//                                     <FormInput
//                                         label="Nombre d'articles"
//                                         name="articles.nombre"
//                                         type="number"
//                                         value={String(formData.articles?.nombre || '')}
//                                         min={0}
//                                         onChange={handleInputChange}
//                                         error={errors.articles?.nombre}
//                                         required
//                                     />

//                                     <div className="space-y-1">
//                                         <label className="block text-sm font-bold text-gray-700">
//                                             Détails des articles
//                                         </label>
//                                         <textarea
//                                             name="articles.details"
//                                             value={formData.articles?.details || ''}
//                                             onChange={(e) => handleInputChange(e as any)}
//                                             className={`mt-1 block w-full rounded-md border 'border-gray-300'
//                                                 }`}
//                                             rows={4}
//                                         />
//                                     </div>

//                                     <div className="space-y-2">
//                                         <label className="block text-sm font-medium text-gray-700">
//                                             Photos des articles (max 5)
//                                         </label>
//                                         <PhotoUploader
//                                             onUpload={handlePhotoChange}
//                                             maxPhotos={5}
//                                             existingPhotos={formData.articles?.photos?.filter(photo => photo.file) as { url: string, file: File }[] || []}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                         )}

//                         {activeStep === 3 && (
//                             <div className="space-y-4">
//                                 <h3 className="text-lg font-medium">Informations de livraison</h3>
//                                 <div className="grid grid-cols-2 gap-4">
//                                     <div className="space-y-1">
//                                         <label className='block text-sm font-bold text-gray-700'>Date de livraison <span className="text-red-500">*</span></label>
//                                         <p className="text-sm text-gray-500">Majoration les dimanches et jours fériés</p>
//                                         <input
//                                             type="date"
//                                             name="commande.dates.livraison"
//                                             value={formData.dates?.livraison || ''}
//                                             onChange={(e) => {
//                                                 setFormData(prev => ({
//                                                     ...prev,
//                                                     dates: {
//                                                         ...prev.dates,
//                                                         livraison: e.target.value // Utiliser directement la valeur sélectionnée
//                                                     }
//                                                 }));
//                                             }}
//                                             className="mt-1 block w-full rounded-md border border-gray-300"
//                                             required
//                                         />
//                                     </div>
//                                     <div className="space-y-1">
//                                         <label className="block text-sm font-bold text-gray-700">
//                                             Créneau de livraison <span className="text-red-500">*</span>
//                                         </label>
//                                         <p className="text-sm text-gray-500">De 2 heures, du lundi au dimanche, de 07h à 20h</p>
//                                         <CreneauxSelect />
//                                         {errors.livraison?.creneau && (
//                                             <p className="text-red-500 text-sm">{errors.livraison.creneau}</p>
//                                         )}
//                                     </div>

//                                     <div className="space-y-1">
//                                         <label className="block text-sm font-bold text-gray-700">
//                                             Type de véhicule <span className="text-red-500">*</span>
//                                         </label>
//                                         <VehiculesSelect />
//                                         {errors.livraison?.vehicule && (
//                                             <p className="text-red-500 text-sm">{errors.livraison.vehicule}</p>
//                                         )}
//                                     </div>

//                                     <div className="space-y-1">
//                                         <label className="block text-sm font-bold text-gray-700">
//                                             Option équipier de manutention (en plus du transporteur)
//                                         </label>
//                                         <span className="ml-1 text-sm text-gray-500" title={ERROR_MESSAGES.equipiers.contact}>
//                                             {ERROR_MESSAGES.equipiers.info}
//                                         </span>
//                                         <div className="relative">
//                                             <input
//                                                 type="number"
//                                                 name="livraison.equipiers"
//                                                 min="0"
//                                                 max="3"
//                                                 value={formData.livraison?.equipiers || 0}
//                                                 onChange={(e) => {
//                                                     const value = parseInt(e.target.value);
//                                                     handleInputChange(e);
//                                                     const validation = validateEquipiers(value);
//                                                     if (!validation.isValid) {
//                                                         setErrors(prev => ({
//                                                             ...prev,
//                                                             livraison: {
//                                                                 ...prev.livraison,
//                                                                 equipiers: validation.message
//                                                             }
//                                                         }));
//                                                     }
//                                                 }}
//                                                 className={`mt-1 block w-full rounded-md border ${errors.livraison?.equipiers ? 'border-red-500' : 'border-gray-300'
//                                                     }`}
//                                             />
//                                             {errors.livraison?.equipiers && (
//                                                 <div className="mt-1 flex items-center">
//                                                     <span className="text-red-500 text-sm">{errors.livraison.equipiers}</span>
//                                                     <button
//                                                         type="button"
//                                                         onClick={() => window.location.href = 'mailto:commercial@mytruck.fr'}
//                                                         className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
//                                                     >
//                                                         Contacter le service commercial
//                                                     </button>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>

//                                     <div className="space-y-1">
//                                         <label className="block text-sm font-bold text-gray-700">
//                                             Autres remarques
//                                         </label>
//                                         <p className="text-sm text-gray-500">Précisions nécessaires au bon fonctionnement de la livraison</p>
//                                         <textarea
//                                             name="livraison.remarques"
//                                             value={formData.livraison?.remarques || ''}
//                                             onChange={(e) => handleInputChange(e as any)}
//                                             className={`mt-1 block w-full rounded-md border 'border-gray-300'
//                                                 }`}
//                                             rows={4}
//                                         />
//                                     </div>
//                                 </div>
//                                 <div className="border-t mt-6 py-4 bg-white flex justify-between">
//                                     <p className="text-red-500 font-bold text-center px-4">TOUTE ABSENCE LORS DE LA LIVRAISON VOUS ENGAGE

//                                         A REGLER LE RETOUR AINSI QUE LA NOUVELLE LIVRAISON</p>
//                                 </div>
//                                 <div className="border-t mt-6 py-4 bg-white flex justify-between">
//                                     <FormInput
//                                         label="Manager magasin"
//                                         name="magasin.manager"
//                                         value={formData.magasin?.manager || ''}
//                                         onChange={handleInputChange}
//                                         error={errors.magasin?.manager}
//                                         required
//                                     />
//                                 </div>
//                             </div>
//                         )}

//                         {submitStatus.error && (
//                             <motion.div
//                                 initial={{ opacity: 0, y: -20 }}
//                                 animate={{ opacity: 1, y: 0 }}
//                                 className="bg-red-50 text-red-600 p-4 rounded-lg mb-4"
//                             >
//                                 {submitStatus.error}
//                             </motion.div>
//                         )}

//                         {submitStatus.success && (
//                             <motion.div
//                                 initial={{ opacity: 0, y: -20 }}
//                                 animate={{ opacity: 1, y: 0 }}
//                                 className="bg-green-50 text-green-600 p-4 rounded-lg mb-4"
//                             >
//                                 Commande créée avec succès !
//                             </motion.div>
//                         )}
//                     </form>
//                     {/* Étapes suivantes à implémenter */}
//                 </motion.div>
//             </AnimatePresence>


//             {/* Boutons de navigation */}
//             <div className="flex justify-between mt-8">
//                 <button
//                     type="button"
//                     onClick={handlePrev}
//                     disabled={progress.isFirstStep}
//                     className="px-4 py-2 text-gray-600 disabled:opacity-50"
//                 >
//                     Précédent
//                 </button>

//                 {progress.isLastStep ? (
//                     <button
//                         type="submit"
//                         onClick={handleSubmit}
//                         className="px-4 py-2 bg-red-600 text-white rounded-lg"
//                     >
//                         Enregistrer
//                     </button>
//                 ) : (
//                     <button
//                         type="button"
//                         onClick={handleNext}
//                         disabled={!progress.canProceed}
//                         className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
//                     >
//                         Suivant
//                     </button>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default AjoutCommande;