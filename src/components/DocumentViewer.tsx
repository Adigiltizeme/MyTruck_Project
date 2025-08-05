import React, { useState } from 'react';
import { CommandeMetier, FactureInfo, DevisInfo } from '../types/business.types';
import { Download, Eye, FileText, FilePlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Utility function to format dates
const formatDate = (date: string | Date): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('fr-FR', options);
};
import QuoteGenerator from './QuoteGenerator';
import InvoiceGenerator from './InvoiceGenerator';
import { DocumentService } from '../services/document.service';

interface DocumentViewerProps {
    commande: CommandeMetier;
    onUpdate: (updatedCommande: CommandeMetier) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ commande, onUpdate }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showQuoteGenerator, setShowQuoteGenerator] = useState(false);
    const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);

    const isAdmin = user?.role === 'admin';
    const isMagasin = user?.role === 'magasin';

    // Récupérer les factures et devis de la commande
    const factures = commande.financier?.factures || [];
    const devis = commande.financier?.devis || [];

    // Fonction pour télécharger un document
    const handleDownloadDocument = async (documentId: string, type: 'facture' | 'devis') => {
        try {
            setLoading(documentId);
            setError(null);

            // Utiliser le service de documents pour récupérer le document
            const documentService = new DocumentService();

            // Trouver le document dans la liste
            const document = type === 'facture'
                ? factures.find(f => f.id === documentId)
                : devis.find(d => d.id === documentId);

            if (!document) {
                throw new Error(`Document ${documentId} introuvable`);
            }

            // Récupérer le document
            const documentBlob = await documentService.getCommandeDocument(commande, type);

            if (!documentBlob) {
                throw new Error(`Impossible de récupérer le document ${documentId}`);
            }

            // Télécharger le document
            const fileName = type === 'facture'
                ? `facture_${'numeroFacture' in document ? document.numeroFacture : documentId}.pdf`
                : `devis_${'numeroDevis' in document ? document.numeroDevis : documentId}.pdf`;

            documentService.downloadDocument(documentBlob, fileName);
        } catch (error) {
            console.error(`Erreur lors du téléchargement du document ${documentId}:`, error);
            setError(error instanceof Error ? error.message : `Erreur lors du téléchargement du document ${documentId}`);
        } finally {
            setLoading(null);
        }
    };

    const handleQuoteGenerated = (devisInfo: DevisInfo) => {
        // Mettre à jour la commande avec le nouveau devis
        const updatedCommande = {
            ...commande,
            financier: {
                ...commande.financier,
                devis: [...(commande.financier?.devis || []), devisInfo]
            }
        };

        onUpdate(updatedCommande);
    };

    const handleInvoiceGenerated = (factureInfo: FactureInfo) => {
        // Mettre à jour la commande avec la nouvelle facture
        const updatedCommande = {
            ...commande,
            financier: {
                ...commande.financier,
                factures: [...(commande.financier?.factures || []), factureInfo]
            }
        };

        onUpdate(updatedCommande);
    };

    // Déterminer si la commande est éligible pour une facture (livrée)
    const canGenerateInvoice = isAdmin && commande.statuts.livraison === 'LIVREE';

    // Déterminer si on doit proposer de générer un devis
    const shouldOfferQuote = (isMagasin || isAdmin) &&
        commande.livraison?.equipiers > 2 &&
        devis.length === 0 &&
        ['EN ATTENTE', 'CONFIRMEE'].includes(commande.statuts.livraison);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Documents</h3>
                <div className="space-x-2">
                    {shouldOfferQuote && (
                        <button
                            onClick={() => setShowQuoteGenerator(true)}
                            className="px-3 py-1 bg-yellow-600 text-white rounded-lg flex items-center text-sm"
                        >
                            <FilePlus className="w-4 h-4 mr-1" />
                            Générer un devis
                        </button>
                    )}

                    {canGenerateInvoice && (
                        <button
                            onClick={() => setShowInvoiceGenerator(true)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg flex items-center text-sm"
                        >
                            <FilePlus className="w-4 h-4 mr-1" />
                            Générer une facture
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Devis */}
            {devis.length > 0 && (
                <div>
                    <h4 className="font-medium text-gray-700 mb-2">Devis</h4>
                    <div className="space-y-2">
                        {devis.map((devisItem) => (
                            <div key={devisItem.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50 flex justify-between items-center">
                                <div>
                                    <div className="font-medium">{devisItem.numeroDevis || `Devis ${devisItem.id}`}</div>
                                    <div className="text-sm text-gray-500">
                                        <span>Date: {formatDate(devisItem.dateDevis)}</span>
                                        <span className="mx-2">•</span>
                                        <span>Montant: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devisItem.montantHT)}</span>
                                        <span className="mx-2">•</span>
                                        <span>Statut: {devisItem.statut}</span>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleDownloadDocument(devisItem.id, 'devis')}
                                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        disabled={loading === devisItem.id}
                                    >
                                        {loading === devisItem.id ? (
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin"></div>
                                        ) : (
                                            <Download className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Factures */}
            {factures.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Factures</h4>
                    <div className="space-y-2">
                        {factures.map((factureItem) => (
                            <div key={factureItem.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50 flex justify-between items-center">
                                <div>
                                    <div className="font-medium">{factureItem.numeroFacture || `Facture ${factureItem.id}`}</div>
                                    <div className="text-sm text-gray-500">
                                        <span>Date: {formatDate(factureItem.dateFacture)}</span>
                                        <span className="mx-2">•</span>
                                        <span>Montant: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(factureItem.montantHT)}</span>
                                        <span className="mx-2">•</span>
                                        <span>Statut: {factureItem.statut}</span>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleDownloadDocument(factureItem.id, 'facture')}
                                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        disabled={loading === factureItem.id}
                                    >
                                        {loading === factureItem.id ? (
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin"></div>
                                        ) : (
                                            <Download className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {devis.length === 0 && factures.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>Aucun document disponible pour cette commande</p>
                </div>
            )}

            {/* Générateurs de documents */}
            <QuoteGenerator
                commande={commande}
                isOpen={showQuoteGenerator}
                onClose={() => setShowQuoteGenerator(false)}
                onQuoteGenerated={handleQuoteGenerated}
            />

            <InvoiceGenerator
                commande={commande}
                isOpen={showInvoiceGenerator}
                onClose={() => setShowInvoiceGenerator(false)}
                onInvoiceGenerated={handleInvoiceGenerated}
            />
        </div>
    );
};

export default DocumentViewer;