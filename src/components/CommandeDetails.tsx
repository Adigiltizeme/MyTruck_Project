// import { CommandeMetier } from '../types/business.types';
// import { useState } from 'react';

// interface CommandeDetailsProps {
//     commande: CommandeMetier;
// }

// const CommandeDetails: React.FC<CommandeDetailsProps> = ({ commande }) => {
//     const [activeTab, setActiveTab] = useState('infos');

//     const formatPrice = (price: number) => {
//         return new Intl.NumberFormat('fr-FR', {
//             style: 'currency',
//             currency: 'EUR'
//         }).format(price);
//     };

//     return (
//         <div className="p-4">
//             {/* Tabs Navigation */}
//             <div className="border-b mb-4">
//                 <nav className="flex gap-4">
//                     <button
//                         onClick={() => setActiveTab('infos')}
//                         className={`py-2 px-4 ${activeTab === 'infos' ? 'border-b-2 border-red-600' : ''}`}
//                     >
//                         Informations Générales
//                     </button>
//                     <button
//                         onClick={() => setActiveTab('articles')}
//                         className={`py-2 px-4 ${activeTab === 'articles' ? 'border-b-2 border-red-600' : ''}`}
//                     >
//                         Articles & Photos
//                     </button>
//                     <button
//                         onClick={() => setActiveTab('livraison')}
//                         className={`py-2 px-4 ${activeTab === 'livraison' ? 'border-b-2 border-red-600' : ''}`}
//                     >
//                         Détails Livraison
//                     </button>
//                     <button
//                         onClick={() => setActiveTab('historique')}
//                         className={`py-2 px-4 ${activeTab === 'historique' ? 'border-b-2 border-red-600' : ''}`}
//                     >
//                         Historique & Commentaires
//                     </button>
//                 </nav>
//             </div>

//             {/* Content Sections */}
//             <div className="space-y-4">
//             {/* Informations Client */}
//             <div className="bg-white p-4 rounded-lg shadow">
//                 <h3 className="font-medium text-lg mb-3">Informations Client</h3>
//                 <div className="space-y-2">
//                     <p><span className="font-medium">Nom complet:</span> {commande.client?.nomComplet || 'Non spécifié'}</p>
//                     <p><span className="font-medium">Téléphone principal:</span> {commande.client?.telephone?.principal || 'Non spécifié'}</p>
//                     {commande.client?.telephone?.secondaire && (
//                         <p><span className="font-medium">Téléphone secondaire:</span> {commande.client.telephone.secondaire}</p>
//                     )}
//                     <p><span className="font-medium">Adresse:</span> {commande.client?.adresse?.ligne1 || 'Non spécifiée'}</p>
//                     <p><span className="font-medium">Type:</span> {commande.client?.adresse?.type || 'Non spécifié'}</p>
//                 </div>
//             </div>

//             {/* Informations Livraison */}
//             <div className="bg-white p-4 rounded-lg shadow">
//                 <h3 className="font-medium text-lg mb-3">Informations Livraison</h3>
//                 <div className="space-y-2">
//                     <p><span className="font-medium">Créneau:</span> {commande.livraison?.creneau || 'Non spécifié'}</p>
//                     <p><span className="font-medium">Véhicule:</span> {commande.livraison?.vehicule || 'Non spécifié'}</p>
//                     <p><span className="font-medium">Équipiers:</span> {commande.livraison?.equipiers || '0'}</p>
//                     <p><span className="font-medium">Réserve transport:</span> {commande.livraison?.reserve ? 'Oui' : 'Non'}</p>
//                     {commande.livraison?.remarques && (
//                         <p><span className="font-medium">Notes:</span> {commande.livraison.remarques}</p>
//                     )}
//                 </div>
//             </div>

//             {/* Informations Commande */}
//             <div className="bg-white p-4 rounded-lg shadow">
//                 <h3 className="font-medium text-lg mb-3">Détails Commande</h3>
//                 <div className="space-y-2">
//                     <p><span className="font-medium">Numéro:</span> {commande.numeroCommande}</p>
//                     <p><span className="font-medium">Statut commande:</span> {commande.statuts?.commande || 'Non spécifié'}</p>
//                     <p><span className="font-medium">Statut livraison:</span> {commande.statuts?.livraison || 'Non spécifié'}</p>
//                     <p><span className="font-medium">Date commande:</span> {new Date(commande.dates?.commande).toLocaleDateString() || 'Non spécifiée'}</p>
//                     <p><span className="font-medium">Date livraison:</span> {new Date(commande.dates?.livraison).toLocaleDateString() || 'Non spécifiée'}</p>
//                     <p><span className="font-medium">Tarif HT:</span> {formatPrice(commande.financier?.tarifHT || 0)}</p>
//                 </div>
//             </div>

//             {/* Commentaires */}
//             {(commande.livraison?.commentaireEnlevement || commande.livraison?.commentaireLivraison) && (
//                 <div className="bg-white p-4 rounded-lg shadow">
//                     <h3 className="font-medium text-lg mb-3">Commentaires</h3>
//                     {commande.livraison.commentaireEnlevement && (
//                         <div className="mb-4">
//                             <p className="font-medium">À l'enlèvement:</p>
//                             <p className="mt-1 text-gray-700">{commande.livraison.commentaireEnlevement}</p>
//                         </div>
//                     )}
//                     {commande.livraison.commentaireLivraison && (
//                         <div>
//                             <p className="font-medium">À la livraison:</p>
//                             <p className="mt-1 text-gray-700">{commande.livraison.commentaireLivraison}</p>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//         </div>
//     );
// };
// export default CommandeDetails;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
import React, { useState } from 'react';
import { CommandeMetier } from '../types/business.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { dateFormatter } from '../utils/formatters';

interface CommandeDetailsProps {
    commande: CommandeMetier;
    onStatusChange?: (newStatus: string) => void;
}

const CommandeDetails: React.FC<CommandeDetailsProps> = ({ commande }) => {
    const [activeTab, setActiveTab] = useState('infos');

    // Vérification sécurisée des dates
    const timelineEvents = [
        {
            date: commande.dates?.commande ? new Date(commande.dates.commande) : new Date(),
            status: commande.statuts?.commande || 'Non spécifié',
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

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* En-tête avec informations principales */}
            <div className="bg-gray-50 p-4 border-b">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                        Commande #{commande.numeroCommande || 'Non spécifiée'}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium
                        ${commande.statuts?.livraison === 'LIVREE' ? 'bg-green-300 text-green-1000' :
                            commande.statuts?.livraison === 'EN COURS DE LIVRAISON' ? 'bg-blue-300 text-blue-1000' :
                                'bg-gray-300 text-gray-1000'}`}>
                        {commande.statuts?.livraison || 'Non spécifié'}
                    </span>
                </div>
            </div>

            {/* Navigation par onglets */}
            <div className="border-b">
                <nav className="flex">
                    {[
                        { id: 'infos', label: 'Informations' },
                        { id: 'photos-articles', label: 'Photos articles' },
                        { id: 'photos-commentaires', label: 'Photos commentaires' },
                        { id: 'timeline', label: 'Chronologie' },
                        { id: 'historique', label: 'Historique' },
                        { id: 'documents', label: 'Documents' },
                    ].map(tab => (
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
                    {activeTab === 'infos' && (
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
                                    <p><span className="text-gray-500">Nom:</span> {commande.client?.nomComplet || 'Non spécifié'}</p>
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
                                    {(commande.articles?.photos && Array.isArray(commande.articles.photos) && commande.articles.photos.length > 0) && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {commande.articles.photos.map((photo: string | { url: string }, index) => {
                                                // Vérifier si l'URL de la photo est un URL valide
                                                const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                                                return (
                                                    <div key={index} className="relative group">
                                                        {photoUrl && (
                                                            <img
                                                                src={photoUrl}
                                                                alt={`Photo article ${index + 1}`}
                                                                className="rounded-lg w-20 h-20 object-cover"
                                                                onError={(e) => {
                                                                    console.error('Erreur chargement image:', photoUrl);
                                                                    e.currentTarget.src = '/placeholder-image.jpg';
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="font-medium text-lg">Chauffeur(s)</h3>
                                {commande.chauffeurs.length > 0 ? (
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
                    )}

                    {activeTab === 'photos-articles' && (
                        <div className="space-y-4">
                            {(commande.articles?.photos && Array.isArray(commande.articles.photos) && commande.articles.photos.length > 0) ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {commande.articles.photos.map((photo: string | { url: string }, index) => {
                                        // Vérifier si l'URL de la photo est un URL valide
                                        const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                                        return (
                                            <div key={index} className="relative group">
                                                {photoUrl && (
                                                    <img
                                                        src={photoUrl}
                                                        alt={`Photo article ${index + 1}`}
                                                        className="rounded-lg w-full h-48 object-cover"
                                                        onError={(e) => {
                                                            console.error('Erreur chargement image:', photoUrl);
                                                            e.currentTarget.src = '/placeholder-image.jpg';
                                                        }}
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
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500">Aucune photo d'article disponible</p>
                            )}
                            <div className="flex justify-center mt-4">
                                <button
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg"
                                    onClick={() => addArticlePhoto()}
                                >
                                    Ajouter photo
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'photos-commentaires' && (
                        <div className="space-y-4">
                            {(commande.livraison?.photosEnlevement && Array.isArray(commande.livraison?.photosEnlevement) && commande.livraison?.photosEnlevement.length > 0)
                                || (commande.livraison?.photosLivraison && Array.isArray(commande.livraison?.photosLivraison) && commande.livraison?.photosLivraison.length > 0) ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {commande.livraison?.photosEnlevement && commande.livraison.photosEnlevement.map((photo: string | { url: string }, index) => {
                                        // Vérifier si l'URL de la photo est un URL valide
                                        const photoUrl = typeof photo === 'string' ? photo : photo?.url;
                                        return (
                                            <div key={`enlèvement-${index}`}>
                                                <p className="text-sm font-medium text-gray-700">Photo(s) à l'enlèvement :</p>
                                                <div className="relative group">

                                                    {photoUrl && (
                                                        <img
                                                            src={photoUrl}
                                                            alt={`Photo commentaire ${index + 1}`}
                                                            className="rounded-lg w-full h-48 object-cover"
                                                            onError={(e) => {
                                                                console.error('Erreur chargement image:', photoUrl);
                                                                e.currentTarget.src = '/placeholder-image.jpg';
                                                            }}
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
                                                        <img
                                                            src={photoUrl}
                                                            alt={`Photo commentaire ${index + 1}`}
                                                            className="rounded-lg w-full h-48 object-cover"
                                                            onError={(e) => {
                                                                console.error('Erreur chargement image:', photoUrl);
                                                                e.currentTarget.src = '/placeholder-image.jpg';
                                                            }}
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
                            <div className="flex justify-center mt-4">
                                <button className="bg-red-600 text-white px-4 py-2 rounded-lg">
                                    Ajouter photo
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div className="max-w-3xl mx-auto">
                            <div className="flow-root">
                                <ul className="-mb-8">
                                    {timelineEvents.map((event, index) => (
                                        <li key={index}>
                                            <div className="relative pb-8">
                                                {index !== timelineEvents.length - 1 && (
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
                    )}

                    {activeTab === 'historique' && (
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
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-4">
                            {(commande.articles?.photos?.length ?? 0) > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {commande.articles.photos?.map((photo, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={photo.url}
                                                alt={`Document ${index + 1}`}
                                                className="rounded-lg w-full h-48 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                <button className="text-white bg-red-600 px-4 py-2 rounded-lg">
                                                    Voir
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500">Aucun document disponible</p>
                            )}
                            {/* Ajouter factures et devis */}
                            {<div className="flex justify-center">
                                <button className="text-white bg-red-600 px-4 py-2 rounded-lg">
                                    Ajouter document
                                </button>
                            </div>}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default CommandeDetails;