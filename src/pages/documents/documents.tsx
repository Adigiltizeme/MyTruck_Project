import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { CommandeMetier, FactureInfo, DevisInfo } from '../../types/business.types';
import { dateFormatter, formatPrice } from '../../utils/formatters';
import { DocumentService } from '../../services/document.service';
import { motion } from 'framer-motion';
import { Download, FileText, FilePlus, Filter, Search, AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import DetailedQuoteForm from '../../components/DetailedQuoteForm';

/**
 * Page pour la gestion centralisée des devis et factures
 */
const DocumentsPage: React.FC = () => {
    const { user } = useAuth();
    const { dataService, isOnline } = useOffline();
    const [loading, setLoading] = useState(true);
    const [commandes, setCommandes] = useState<CommandeMetier[]>([]);
    const [devis, setDevis] = useState<DevisInfo[]>([]);
    const [factures, setFactures] = useState<FactureInfo[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'tous' | 'en_attente' | 'acceptes' | 'refuses'>('tous');
    const [typeFilter, setTypeFilter] = useState<'tous' | 'devis' | 'factures'>('tous');
    const [showNewDevisForm, setShowNewDevisForm] = useState(false);
    const [selectedCommande, setSelectedCommande] = useState<CommandeMetier | null>(null);

    // Document service
    const documentService = new DocumentService(import.meta.env.VITE_AIRTABLE_TOKEN);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Charger les commandes, cela inclut les devis et factures
            const commandesData = await dataService.getCommandes();
            setCommandes(commandesData);

            // Extraire tous les devis et factures des commandes
            const allDevis: DevisInfo[] = [];
            const allFactures: FactureInfo[] = [];

            commandesData.forEach((commande: CommandeMetier) => {
                // Ajouter les devis avec référence à la commande
                if (commande.financier?.devis && commande.financier.devis.length > 0) {
                    commande.financier.devis.forEach(devis => {
                        allDevis.push({
                            ...devis,
                            id: commande.id,
                            numeroDevis: commande.numeroCommande,
                            client: commande.client || { nom: '', id: '' },
                            magasin: commande.magasin || { id: '', name: '' }
                        });
                    });
                }

                // Ajouter les factures avec référence à la commande
                if (commande.financier?.factures && commande.financier.factures.length > 0) {
                    commande.financier.factures.forEach(facture => {
                        allFactures.push({
                            ...facture,
                            id: commande.id,
                            numeroFacture: commande.numeroCommande,
                            client: commande.client || { nom: '', id: '' },
                            magasin: commande.magasin || { id: '', name: '' }
                        });
                    });
                }
            });

            setDevis(allDevis);
            setFactures(allFactures);
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            setError('Impossible de charger les documents. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les documents selon les critères
    const getFilteredDocuments = () => {
        let documents: Array<DevisInfo | FactureInfo> = [];

        // Ajouter les documents selon le type sélectionné
        if (typeFilter === 'tous' || typeFilter === 'devis') {
            documents = [...documents, ...devis];
        }

        if (typeFilter === 'tous' || typeFilter === 'factures') {
            documents = [...documents, ...factures];
        }

        // Filtrer par statut
        if (statusFilter !== 'tous') {
            documents = documents.filter(doc => {
                if ('numeroDevis' in doc) {
                    // C'est un devis
                    return statusFilter === 'en_attente' ? doc.statut === 'En attente' :
                        statusFilter === 'acceptes' ? doc.statut === 'Accepté' :
                            statusFilter === 'refuses' ? doc.statut === 'Refusé' : true;
                } else {
                    // C'est une facture
                    return statusFilter === 'en_attente' ? doc.statut === 'En attente' :
                        statusFilter === 'acceptes' ? doc.statut === 'Payée' : false;
                }
            });
        }

        // Filtrer par terme de recherche
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            documents = documents.filter(doc => {
                const isDevis = 'numeroDevis' in doc;
                const docNum = isDevis ? doc.numeroDevis : doc.numeroFacture;

                return docNum.toLowerCase().includes(term) ||
                    doc.id?.toLowerCase().includes(term) ||
                    doc.client?.nom?.toLowerCase().includes(term) ||
                    doc.magasin?.name?.toLowerCase().includes(term);
            });
        }

        // Filtrer par magasin si l'utilisateur est un magasin
        if (user?.role === 'magasin' && user.storeId) {
            documents = documents.filter(doc => {
                // Trouver la commande associée
                const commande = commandes.find(c => c.id === doc.id);
                return commande && commande.magasin?.id === user.storeId;
            });
        }

        // Trier par date (plus récent en premier)
        return documents.sort((a, b) => {
            const dateA = 'dateDevis' in a ? new Date(a.dateDevis) : new Date(a.dateFacture);
            const dateB = 'dateDevis' in b ? new Date(b.dateDevis) : new Date(b.dateFacture);
            return dateB.getTime() - dateA.getTime();
        });
    };

    const filteredDocuments = getFilteredDocuments();

    const isDevis = (doc: DevisInfo | FactureInfo): doc is DevisInfo => {
        return 'numeroDevis' in doc;
    };

    const handleDownloadDocument = async (doc: DevisInfo | FactureInfo) => {
        try {
            setLoading(true);

            // Trouver la commande associée
            const commande = commandes.find(c => c.id === doc.id);
            if (!commande) {
                throw new Error('Commande introuvable');
            }

            // Déterminer le type de document
            const docType = isDevis(doc) ? 'devis' : 'facture';

            // Télécharger le document
            const docBlob = await documentService.getCommandeDocument(commande, docType);

            if (!docBlob) {
                throw new Error(`Document introuvable`);
            }

            // Formater le nom du fichier
            const fileName = isDevis(doc)
                ? `devis_${doc.numeroDevis}.pdf`
                : `facture_${doc.numeroFacture}.pdf`;

            // Télécharger le document
            documentService.downloadDocument(docBlob, fileName);
        } catch (error) {
            console.error('Erreur lors du téléchargement du document:', error);
            setError('Impossible de télécharger le document. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    const handleNewDevis = () => {
        // Chercher une commande avec plus de 2 équipiers ou sans devis existant
        const eligibleCommandes = commandes.filter(commande =>
            (commande.livraison?.equipiers > 2 ||
                !commande.financier?.devis ||
                commande.financier.devis.length === 0) &&
            ['EN ATTENTE', 'CONFIRMEE'].includes(commande.statuts.livraison)
        );

        if (eligibleCommandes.length > 0) {
            // Sélectionner la première commande éligible
            setSelectedCommande(eligibleCommandes[0]);
            setShowNewDevisForm(true);
        } else {
            setError('Aucune commande éligible pour un nouveau devis.');
        }
    };

    const handleDevisGenerated = (devisInfo: any) => {
        loadData(); // Recharger les données pour afficher le nouveau devis
    };

    const getDocumentStatusStyle = (doc: DevisInfo | FactureInfo) => {
        if (isDevis(doc)) {
            switch (doc.statut) {
                case 'En attente':
                    return 'bg-yellow-100 text-yellow-800';
                case 'Accepté':
                    return 'bg-green-100 text-green-800';
                case 'Refusé':
                    return 'bg-red-100 text-red-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        } else {
            switch (doc.statut) {
                case 'En attente':
                    return 'bg-yellow-100 text-yellow-800';
                case 'Payée':
                    return 'bg-green-100 text-green-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        }
    };

    const getDocumentTypeStyle = (doc: DevisInfo | FactureInfo) => {
        return isDevis(doc)
            ? 'bg-blue-100 text-blue-800'
            : 'bg-purple-100 text-purple-800';
    };

    // Vérifie si l'utilisateur a les permissions pour générer un devis
    const canGenerateDevis = () => {
        return user?.role === 'admin' || user?.role === 'magasin';
    };

    return (
        <div className="p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="container mx-auto"
            >
                {/* En-tête */}
                <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-6 h-6 text-red-600" />
                        <h1 className="text-2xl font-bold">Gestion des documents</h1>
                    </div>
                    <p className="text-gray-600">
                        Consultez et gérez tous les devis et factures générés.
                    </p>
                </div>

                {/* Message d'erreur */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {/* Avertissement hors ligne */}
                {!isOnline && (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
                        Vous êtes en mode hors ligne. Certaines fonctionnalités peuvent être limitées.
                    </div>
                )}

                {/* Filtres et recherche */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher par n° document, client, commande..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                        />
                    </div>

                    <div className="flex space-x-2">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as 'tous' | 'devis' | 'factures')}
                            className="border border-gray-300 rounded-lg p-2"
                        >
                            <option value="tous">Tous les types</option>
                            <option value="devis">Devis uniquement</option>
                            <option value="factures">Factures uniquement</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'tous' | 'en_attente' | 'acceptes' | 'refuses')}
                            className="border border-gray-300 rounded-lg p-2"
                        >
                            <option value="tous">Tous les statuts</option>
                            <option value="en_attente">En attente</option>
                            <option value="acceptes">Acceptés/Payées</option>
                            <option value="refuses">Refusés</option>
                        </select>

                        {canGenerateDevis() && (
                            <button
                                onClick={handleNewDevis}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center"
                            >
                                <FilePlus className="w-5 h-5 mr-2" />
                                Nouveau devis
                            </button>
                        )}
                    </div>
                </div>

                {/* Liste des documents */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
                    </div>
                ) : filteredDocuments.length > 0 ? (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Numéro
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Client
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Commande
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Montant HT
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Statut
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredDocuments.map((doc) => (
                                        <tr key={isDevis(doc) ? `devis-${doc.id}` : `facture-${doc.id}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDocumentTypeStyle(doc)}`}>
                                                    {isDevis(doc) ? 'Devis' : 'Facture'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {isDevis(doc) ? doc.numeroDevis : doc.numeroFacture}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {dateFormatter.forDisplay((isDevis(doc) ? doc.dateDevis : doc.dateFacture).toString())}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {doc.client?.nom}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {doc.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatPrice(doc.montantHT)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDocumentStatusStyle(doc)}`}>
                                                    {doc.statut}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => handleDownloadDocument(doc)}
                                                    className="text-blue-600 hover:text-blue-900 flex items-center"
                                                    title="Télécharger"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                        {searchTerm || typeFilter !== 'tous' || statusFilter !== 'tous' ? (
                            <>
                                <p className="text-lg font-medium">Aucun document ne correspond à vos critères</p>
                                <p className="mt-2">Essayez de modifier vos filtres</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-medium">Aucun document</p>
                                <p className="mt-2">Les devis et factures apparaîtront ici une fois créés</p>
                            </>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Modal pour le formulaire de devis détaillé */}
            {selectedCommande && (
                <Modal
                    isOpen={showNewDevisForm}
                    onClose={() => setShowNewDevisForm(false)}
                >
                    <DetailedQuoteForm
                        commande={selectedCommande}
                        isOpen={showNewDevisForm}
                        onClose={() => setShowNewDevisForm(false)}
                        onQuoteGenerated={handleDevisGenerated}
                    />
                </Modal>
            )}
        </div>
    );
};

export default DocumentsPage;