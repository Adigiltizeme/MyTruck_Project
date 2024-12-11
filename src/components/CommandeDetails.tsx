import { CommandeMetier } from '../types/business.types';
import { useState } from 'react';

interface CommandeDetailsProps {
    commande: CommandeMetier;
}

const CommandeDetails: React.FC<CommandeDetailsProps> = ({ commande }) => {
    const [activeTab, setActiveTab] = useState('infos');

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(price);
    };

    return (
        <div className="p-4">
            {/* Tabs Navigation */}
            <div className="border-b mb-4">
                <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('infos')}
                        className={`py-2 px-4 ${activeTab === 'infos' ? 'border-b-2 border-red-600' : ''}`}
                    >
                        Informations Générales
                    </button>
                    <button
                        onClick={() => setActiveTab('articles')}
                        className={`py-2 px-4 ${activeTab === 'articles' ? 'border-b-2 border-red-600' : ''}`}
                    >
                        Articles & Photos
                    </button>
                    <button
                        onClick={() => setActiveTab('livraison')}
                        className={`py-2 px-4 ${activeTab === 'livraison' ? 'border-b-2 border-red-600' : ''}`}
                    >
                        Détails Livraison
                    </button>
                    <button
                        onClick={() => setActiveTab('historique')}
                        className={`py-2 px-4 ${activeTab === 'historique' ? 'border-b-2 border-red-600' : ''}`}
                    >
                        Historique & Commentaires
                    </button>
                </nav>
            </div>

            {/* Content Sections */}
            <div className="space-y-4">
                {activeTab === 'infos' && (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Section Client */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-medium text-lg mb-3">Informations Client</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Nom complet:</span> {commande.client.nomComplet}</p>
                                <p><span className="font-medium">Téléphone:</span> {commande.client.telephone.principal}</p>
                                {commande.client.telephone.secondaire && (
                                    <p><span className="font-medium">Téléphone 2:</span> {commande.client.telephone.secondaire}</p>
                                )}
                                <p><span className="font-medium">Adresse:</span> {commande.client.adresse.ligne1}</p>
                                <p><span className="font-medium">Type:</span> {commande.client.adresse.type}</p>
                            </div>
                        </div>

                        {/* Section Financier */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-medium text-lg mb-3">Informations Financières</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Tarif HT:</span> {formatPrice(commande.financier.tarifHT)}</p>
                                <p><span className="font-medium">Réserve transport:</span> {commande.livraison.reserve ? 'Oui' : 'Non'}</p>
                                <p><span className="font-medium">Commercial:</span> {commande.commercial.prenom}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'articles' && (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Section Articles */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-medium text-lg mb-3">Détails des Articles</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Nombre total:</span> {commande.articles.nombre}</p>
                                <p><span className="font-medium">Catégories:</span> {commande.articles.categories.join(', ')}</p>
                                <div className="mt-4">
                                    <p className="font-medium mb-2">Détails:</p>
                                    <p className="whitespace-pre-wrap">{commande.articles.details}</p>
                                </div>
                            </div>
                        </div>

                        {/* Section Photos */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-medium text-lg mb-3">Photos</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {commande.articles.photos.map((photo, index) => (
                                    <div
                                        key={index}
                                        className="aspect-square bg-gray-100 rounded-lg"
                                    >
                                        {photo && (
                                            <img
                                                src={photo}
                                                alt={`Photo article ${index + 1}`}
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'livraison' && (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Détails de livraison */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-medium text-lg mb-3">Informations de Livraison</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Créneau:</span> {commande.livraison.creneau}</p>
                                <p><span className="font-medium">Véhicule:</span> {commande.livraison.vehicule}</p>
                                <p><span className="font-medium">Équipiers:</span> {commande.livraison.equipiers}</p>
                                <p><span className="font-medium">Réserve:</span> {commande.livraison.reserve ? 'Oui' : 'Non'}</p>
                            </div>
                        </div>

                        {/* Adresse de livraison */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-medium text-lg mb-3">Adresse de Livraison</h3>
                            <div className="space-y-2">
                                <p>{commande.client.adresse.ligne1}</p>
                                {commande.client.adresse.batiment && (
                                    <p><span className="font-medium">Bâtiment:</span> {commande.client.adresse.batiment}</p>
                                )}
                                {commande.client.adresse.etage && (
                                    <p><span className="font-medium">Étage:</span> {commande.client.adresse.etage}</p>
                                )}
                                <p><span className="font-medium">Ascenseur:</span> {commande.client.adresse.ascenseur ? 'Oui' : 'Non'}</p>
                                {commande.client.adresse.interphone && (
                                    <p><span className="font-medium">Interphone:</span> {commande.client.adresse.interphone}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'historique' && (
                    <div className="space-y-6">
                        {/* Commentaires */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-medium text-lg mb-3">Commentaires</h3>
                            {commande.livraison.commentaireEnlevement && (
                                <div className="mb-4">
                                    <p className="font-medium">À l'enlèvement:</p>
                                    <p className="mt-1 text-gray-700">{commande.livraison.commentaireEnlevement}</p>
                                </div>
                            )}
                            {commande.livraison.commentaireLivraison && (
                                <div>
                                    <p className="font-medium">À la livraison:</p>
                                    <p className="mt-1 text-gray-700">{commande.livraison.commentaireLivraison}</p>
                                </div>
                            )}
                        </div>

                        {/* Historique des statuts */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-medium text-lg mb-3">Historique des statuts</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Commande: {commande.statuts.commande}</span>
                                    <span className="text-sm text-gray-500">
                                        {commande.dates.commande.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Livraison: {commande.statuts.livraison}</span>
                                    <span className="text-sm text-gray-500">
                                        {commande.dates.misAJour.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommandeDetails;