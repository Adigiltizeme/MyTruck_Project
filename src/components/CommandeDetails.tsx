import React, { useEffect, useState } from 'react';
import { CommandeMetier } from '../types/business.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { dateFormatter } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import CommandeActions from './CommandeActions';
import AdminActions from './AdminActions';
import { AirtableService } from '../services/airtable.service';
import { Personnel } from '../types/airtable.types';
import { getStatutCommandeStyle, getStatutLivraisonStyle } from '../styles/getStatus';
import PhotoUploader from './PhotoUploader';
import { Upload, XCircle } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';
import { SecureImage } from './SecureImage';
import DocumentViewer from './DocumentViewer';
import { ArticleDimension } from './forms/ArticleDimensionForm';

interface CommandeDetailsProps {
    commande: CommandeMetier;
    onStatusChange?: (newStatus: string) => void;
    onUpdate: (updatedCommande: CommandeMetier) => void;
}

const CommandeDetails: React.FC<CommandeDetailsProps> = ({ commande, onUpdate }) => {
    // Vérification de sécurité - si commande est undefined ou null, afficher un message
    if (!commande) {
        return <div className="p-4 bg-red-100 text-red-700 rounded">Données de commande indisponibles.</div>;
    }

    const [activeTab, setActiveTab] = useState('informations');
    const [chauffeurs, setChauffeurs] = useState<Personnel[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
    const { dataService } = useOffline();

    // Chargement des chauffeurs pour l'admin
    useEffect(() => {
        const loadChauffeurs = async () => {
            if (user?.role === 'admin') {
                const airtableService = new AirtableService(import.meta.env.VITE_AIRTABLE_TOKEN);
                const personnelData = await dataService.getPersonnel();
                setChauffeurs(personnelData.filter((p: any) => p.role === 'Chauffeur').map((p: any) => ({
                    ...p,
                    status: p.status === 'En route vers magasin' ? 'Actif' : p.status
                })));
            }
        };

        loadChauffeurs();
    }, [user]);

    // Vérification sécurisée des dates
    const timelineEvents = [
        {
            date: commande?.dates?.commande ? new Date(commande.dates.commande) : new Date(),
            status: commande?.statuts?.commande || 'Non spécifié',
            type: 'commande'
        },
        {
            date: commande.dates?.livraison ? new Date(commande.dates.livraison) : new Date(),
            status: commande.statuts?.livraison || 'Non spécifié',
            type: 'livraison'
        }
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Helper pour formatter les dates de manière sécurisée
    const formatDate = (date: Date | string | undefined) => {
        if (!date) return 'Non spécifiée';
        try {
            return format(new Date(date), 'Pp', { locale: fr });
        } catch {
            return 'Date invalide';
        }
    };

    const showImageInSameWindow = (url: string) => {
        window.open(url, '_blank', 'toolbar=0,location=0,menubar=0')
            ?.focus();
    }

    const addArticlePhoto = () => {
        console.log('Ajouter photo article');
    }

    const tabs = [
        { id: 'informations', label: 'Informations' },
        { id: 'photos-articles', label: 'Photos articles' },
        { id: 'photos-commentaires', label: 'Photos commentaires' },
        { id: 'chronologie', label: 'Chronologie' },
        { id: 'historique', label: 'Historique' },
        { id: 'documents', label: 'Documents' },
        ...(user?.role === 'magasin' || user?.role === 'admin' ? [{ id: 'actions', label: 'Actions' }] : []),
    ];

    // Gestion des photos
    const handlePhotoUpload = async (uploadedPhotos: Array<{ url: string; file: File }>) => {
        try {
            const existingPhotos = commande.articles?.photos || [];
            const newPhotos = uploadedPhotos.map(photo => ({ url: photo.url }));

            const updatedCommande = await dataService.addPhotosToCommande(
                commande.id,
                newPhotos,
                existingPhotos
            );

            onUpdate(updatedCommande);
        } catch (error) {
            setError('Erreur lors de l\'ajout des photos');
            console.error('Erreur lors de l\'ajout des photos:', error);
        }
    };

    const handlePhotoDelete = async (indexToDelete: number) => {
        try {
            if (!commande.articles?.photos) return;

            const updatedPhotos = commande.articles.photos.filter((_, index) => index !== indexToDelete);

            const updatedCommande = await dataService.deletePhotoFromCommande(
                commande.id,
                updatedPhotos
            );

            onUpdate(updatedCommande);
        } catch (error) {
            setError('Erreur lors de la suppression de la photo');
            console.error('Erreur lors de la suppression de la photo:', error);
        }
    };

    const renderContent = () => {
        // Vérification des propriétés nécessaires avant le switch
        if (!commande) {
            return <div>Données manquantes</div>;
        }
        switch (activeTab) {
            case 'informations':
                return (
                    // Section Informations existante
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Magasin */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Magasin</h3>
                            <div className="space-y-2">
                                <p><span className="text-gray-500">Nom:</span> {commande.magasin?.name || 'Non spécifié'}</p>
                                {/* <p><span className="text-gray-500">Téléphone:</span> {commande.magasin?.phone || 'Non spécifié'}</p>
                                    <p><span className="text-gray-500">Adresse:</span> {commande.magasin?.address || 'Non spécifiée'}</p> */}
                            </div>
                        </div>

                        {/* Client */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Client</h3>
                            <div className="space-y-2">
                                <p><span className="text-gray-500">Nom:</span> {commande.client?.nom.toUpperCase() || 'Non spécifié'} {commande.client?.prenom}</p>
                                {/* <p><span className="text-gray-500">Nom:</span> {commande.client?.nomComplet || 'Non spécifié'}</p> */}
                                <p><span className="text-gray-500">Téléphone:</span> {commande.client?.telephone?.principal || 'Non spécifié'}</p>
                                <p><span className="text-gray-500">Adresse:</span> {commande.client?.adresse?.ligne1 || 'Non spécifiée'}</p>
                            </div>
                        </div>

                        {/* Livraison */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Livraison</h3>
                            <div className="space-y-2">
                                <p><span className="text-gray-500">Date:</span> {dateFormatter.forDisplay(commande.dates?.livraison)}</p>
                                <p><span className="text-gray-500">Créneau:</span> {commande.livraison?.creneau || 'Non spécifié'}</p>
                                <p><span className="text-gray-500">Véhicule:</span> {commande.livraison?.vehicule || 'Non spécifié'}</p>
                                <p><span className="text-gray-500">Équipiers:</span> {commande.livraison?.equipiers || '0'}</p>
                            </div>
                        </div>

                        {/* Articles */}
                        {commande.articles && (
                            <div className="space-y-4">
                                <h3 className="font-medium text-lg">Articles</h3>
                                <div className="space-y-2">
                                    <p><span className="text-gray-500">Nombre total:</span> {commande.articles.nombre || '0'}</p>
                                    <p><span className="text-gray-500">Détails:</span> {commande.articles.details || 'Aucun détail'}</p>
                                </div>
                                {(commande.articles?.photos && Array.isArray(commande.articles.photos)) && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {commande.articles.photos.map((photo: string | { url: string }, index) => {
                                            // Vérifier si l'URL de la photo est un URL valide
                                            const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                                            return (
                                                <div key={index} className="relative group">
                                                    {photoUrl && (
                                                        <SecureImage
                                                            src={photoUrl}
                                                            alt={`Photo ${index + 1}`}
                                                            className="rounded-lg w-full h-48 object-cover"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {commande.articles?.dimensions && commande.articles.dimensions.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Dimensions des articles</h4>
                                        <div className="space-y-3">
                                            {commande.articles.dimensions.map((article: ArticleDimension, index: number) => (
                                                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                                                    <p className="font-medium">{article.nom} (x{article.quantite})</p>
                                                    <div className="grid grid-cols-2 text-sm text-gray-600 mt-1">
                                                        {article.longueur && (
                                                            <p>Longueur: {article.longueur} cm</p>
                                                        )}
                                                        {article.largeur && (
                                                            <p>Largeur: {article.largeur} cm</p>
                                                        )}
                                                        {article.hauteur && (
                                                            <p>Hauteur: {article.hauteur} cm</p>
                                                        )}
                                                        {article.poids && (
                                                            <p>Poids: {article.poids} kg</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Chauffeur(s)</h3>
                            {commande?.chauffeurs?.length ?? 0 > 0 ? (
                                commande.chauffeurs.map((chauffeur, index) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded">
                                        <p>{chauffeur.prenom} {chauffeur.nom}</p>
                                        <p className="text-sm text-gray-600">{chauffeur.telephone}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500">Aucun chauffeur assigné</p>
                            )}
                        </div>

                        {/* Autres remarques */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Autres remarques</h3>

                            {commande.livraison?.remarques ? (
                                <div className="space-y-2">
                                    <p>{commande.livraison.remarques}</p>
                                </div>
                            ) : (
                                <p className="text-gray-500">Aucune remarque</p>
                            )}
                        </div>

                        {/* Commentaires */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Commentaires</h3>
                            <div className="space-y-2">
                                {(commande.livraison?.commentaireEnlevement || commande.livraison?.commentaireLivraison) ? (
                                    <>
                                        {commande.livraison?.commentaireEnlevement && (
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-sm font-medium text-gray-700">À l'enlèvement:</p>
                                                <p className="text-sm mt-1">{commande.livraison.commentaireEnlevement}</p>
                                            </div>
                                        )}

                                        {commande.livraison?.commentaireLivraison && (
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-sm font-medium text-gray-700">À la livraison:</p>
                                                <p className="text-sm mt-1">{commande.livraison.commentaireLivraison}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-gray-500">Aucun commentaire</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'photos-articles':
                // Calcul sécurisé des photos existantes
                const articles = commande.articles || {};
                const photos = Array.isArray(articles.photos) ? articles.photos : [];
                const totalPhotos = photos.length;
                const remainingPhotos = 5 - totalPhotos;

                return (
                    <div className="space-y-4">
                        {/* Photos existantes */}
                        {totalPhotos > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {photos.map((photo, index) => {
                                    // Vérification et extraction sécurisée de l'URL
                                    const photoUrl = typeof photo === 'string'
                                        ? photo
                                        : (photo && typeof photo === 'object' && 'url' in photo)
                                            ? photo.url
                                            : null;

                                    if (!photoUrl) return null;

                                    return (
                                        <div key={index} className="relative group">
                                            <SecureImage
                                                src={photoUrl}
                                                alt={`Photo ${index + 1}`}
                                                className="rounded-lg w-full h-48 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                                <button
                                                    className="text-white bg-red-600 px-4 py-2 rounded-lg"
                                                    onClick={() => typeof showImageInSameWindow === 'function' && showImageInSameWindow(photoUrl)}
                                                >
                                                    Voir
                                                </button>
                                                <button
                                                    onClick={() => typeof handlePhotoDelete === 'function' && handlePhotoDelete(index)}
                                                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }).filter(Boolean)} {/* Filtrer les photos nulles */}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500">Aucune photo d'article disponible</p>
                        )}

                        {/* Zone d'upload */}
                        <div className="flex flex-col items-center">
                            <PhotoUploader
                                onUpload={handlePhotoUpload}
                                maxPhotos={remainingPhotos}
                                existingPhotos={photos.map(photo => ({ url: photo.url, file: new File([], '') }))}
                                MAX_SIZE={10 * 1024 * 1024}
                            />
                        </div>
                    </div>
                );
            case 'photos-commentaires':
                return (
                    <div className="space-y-4">
                        {(commande.livraison?.photosEnlevement && Array.isArray(commande.livraison?.photosEnlevement) && (commande?.livraison?.photosEnlevement?.length ?? 0) > 0)
                            || (commande.livraison?.photosLivraison && Array.isArray(commande.livraison?.photosLivraison) && (commande?.livraison?.photosLivraison?.length ?? 0) > 0) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {commande.livraison?.photosEnlevement && commande.livraison.photosEnlevement.map((photo: string | { url: string }, index) => {
                                    // Vérifier si l'URL de la photo est un URL valide
                                    const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                                    return (
                                        <div key={`enlèvement-${index}`}>
                                            <p className="text-sm font-medium text-gray-700">Photo(s) à l'enlèvement :</p>
                                            <div className="relative group">

                                                {photoUrl && (
                                                    <SecureImage
                                                        src={photoUrl}
                                                        alt={`Photo ${index + 1}`}
                                                        className="rounded-lg w-full h-48 object-cover"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                    <button className="text-white bg-red-600 px-4 py-2 rounded-lg"
                                                        onClick={() => showImageInSameWindow(typeof photo === 'string' ? photo : photo.url)}
                                                    >
                                                        Voir
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {commande.livraison?.photosLivraison?.map((photo: string | { url: string }, index) => {
                                    // Vérifier si l'URL de la photo est un URL valide
                                    const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                                    return (
                                        <div key={`livraison-${index}`}>
                                            <p className="text-sm font-medium text-gray-700">Photo(s) à la livraison :</p>
                                            <div className="relative group">

                                                {photoUrl && (
                                                    <SecureImage
                                                        src={photoUrl}
                                                        alt={`Photo ${index + 1}`}
                                                        className="rounded-lg w-full h-48 object-cover"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                    <button className="text-white bg-red-600 px-4 py-2 rounded-lg"
                                                        onClick={() => showImageInSameWindow(typeof photo === 'string' ? photo : photo.url)}
                                                    >
                                                        Voir
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500">Aucune photo de commentaire disponible</p>
                        )}
                        {user?.role === 'admin' && (
                            <div className="flex justify-center mt-4">
                                <button className="bg-red-600 text-white px-4 py-2 rounded-lg">
                                    Ajouter photo
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'chronologie':
                return (
                    <div className="max-w-3xl mx-auto">
                        <div className="flow-root">
                            <ul className="-mb-8">
                                {timelineEvents.map((event, index) => (
                                    <li key={index}>
                                        <div className="relative pb-8">
                                            {index !== (timelineEvents?.length ?? 0) - 1 && (
                                                <span
                                                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                                                            ${event.type === 'commande' ? 'bg-blue-500' : 'bg-green-500'}`}>
                                                        {/* Icon based on type */}
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <div>
                                                        <p className="text-sm text-gray-500">
                                                            {event.type === 'commande' ? 'Commande' : 'Livraison'} : {event.status}
                                                        </p>
                                                    </div>
                                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                                        {formatDate(event.date)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            case 'historique':
                return (
                    <div className="space-y-4">
                        {commande.dates?.misAJour ? (
                            <div className="flow-root">
                                <ul className="-mb-8">
                                    <li>
                                        <div className="relative pb-8">
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                                                        {/* Icon */}
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <div>
                                                        <p className="text-sm text-gray-500">
                                                            Dernière modification
                                                        </p>
                                                    </div>
                                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                                        {formatDate(commande.dates.misAJour)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500">Aucun historique disponible</p>
                        )}
                    </div>
                );
            case 'documents':
                return (
                    <DocumentViewer
                        commande={commande}
                        onUpdate={onUpdate}
                    />
                );
            case 'actions':
                return (
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                        {user?.role === 'magasin' && (
                            <CommandeActions
                                commande={commande}
                                onUpdate={onUpdate}
                            />
                        )}
                        {user?.role === 'admin' && (
                            <AdminActions
                                commande={commande}
                                chauffeurs={chauffeurs}
                                onUpdate={onUpdate}
                            />
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* En-tête avec informations principales */}
            <div className="bg-gray-50 p-4 border-b">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                        Commande #{commande.numeroCommande || 'Non spécifiée'}
                    </h2>
                    <span className={`ml-2 ${getStatutCommandeStyle(commande.statuts.commande)}`}>
                        {commande.statuts?.commande || 'Non spécifié'}
                    </span>
                    <span className={`ml-2 ${getStatutLivraisonStyle(commande.statuts.livraison)}`}>
                        {commande.statuts?.livraison || 'Non spécifié'}
                    </span>
                </div>
            </div>

            {/* Navigation par onglets */}
            <div className="border-b">
                <nav className="flex">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                                ${activeTab === tab.id
                                    ? 'border-red-600 text-red-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenu dynamique selon l'onglet */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-4"
                >
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default CommandeDetails;