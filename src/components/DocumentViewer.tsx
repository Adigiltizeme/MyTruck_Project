import React, { useEffect, useState } from 'react';
import { CommandeMetier, FactureInfo, DevisInfo } from '../types/business.types';
import { Download, Eye, FileText, FilePlus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import QuoteGenerator from './QuoteGenerator';
import InvoiceGenerator from './InvoiceGenerator';
import { DocumentService } from '../services/document.service';
import { useOffline } from '../contexts/OfflineContext';
import { formatDate } from '../utils/formatters';
import { PDFViewer } from './PDFViewer';
import { toast } from 'react-toastify';

interface DocumentViewerProps {
    commande: CommandeMetier;
    onUpdate: (updatedCommande: CommandeMetier) => void;
    onRefresh?: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ commande, onUpdate, onRefresh }) => {
    const { user } = useAuth();
    const { dataService } = useOffline();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showPDFPreview, setShowPDFPreview] = useState<{
        tempUrl?: string;
        originalUrl: string;
        title: string;
        loading: boolean;
    } | null>(null);

    useEffect(() => {
        console.log('📄 ===== DEBUG DOCUMENTVIEWER PROPS =====');
        console.log('📄 onRefresh reçu:', typeof onRefresh);
        console.log('📄 onRefresh function:', onRefresh);
        console.log('📄 onUpdate reçu:', typeof onUpdate);
        console.log('📄 Commande ID:', commande.id);
    }, [onRefresh, onUpdate, commande.id]);

    const existingDocuments = commande.documents || [];
    const hasBonCommande = existingDocuments.some((doc: any) => doc.type === 'BON_COMMANDE');
    const hasFacture = existingDocuments.some((doc: any) => doc.type === 'FACTURE');
    const hasDevis = existingDocuments.some((doc: any) => doc.type === 'DEVIS');

    const handleDeleteDocument = async (documentId: string, documentType: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ce ${documentType.toLowerCase()} ?`)) {
            return;
        }

        try {
            setLoading(`delete-${documentId}`);
            setError(null);

            await dataService.deleteDocument(documentId);

            console.log('✅ Document supprimé, refresh...');
            await handleRefreshWithIndicator();

        } catch (error) {
            console.error('❌ Erreur suppression document:', error);
            setError('Impossible de supprimer le document. Veuillez réessayer.');
        } finally {
            setLoading(null);
        }
    };

    const handlePreviewDocument = async (document: any) => {
        try {
            console.log('📄 Aperçu document:', {
                id: document.id,
                type: document.type,
                cloudinaryId: document.cloudinaryId?.substring(0, 30) + '...',
                isCloudinary: document.cloudinaryId && !document.cloudinaryId.includes('uploads')
            });

            setShowPDFPreview({
                originalUrl: document.url,
                title: `${document.type} ${document.numeroDocument}`,
                loading: true
            });

            // ✅ VÉRIFIER SI DOCUMENT CLOUDINARY OU LOCAL
            const isCloudinaryDoc = document.cloudinaryId &&
                !document.cloudinaryId.includes('uploads') &&
                !document.cloudinaryId.includes('\\');

            if (isCloudinaryDoc) {
                console.log('☁️ Document Cloudinary détecté, génération URL signée...');
                console.log('🔍 VITE_API_URL =', import.meta.env.VITE_API_URL);
                console.log('🔍 URL complète =', `${import.meta.env.VITE_API_URL}/documents/${document.id}/view-url`);

                const response = await fetch(`${import.meta.env.VITE_API_URL}/documents/${document.id}/view-url`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Erreur ${response.status}`);
                }

                const data = await response.json();
                console.log('✅ URL Cloudinary reçue:', data.viewUrl?.substring(0, 50) + '...');

                setShowPDFPreview(prev => prev ? {
                    ...prev,
                    tempUrl: data.viewUrl,
                    loading: false
                } : null);

            } else {
                console.log('📁 Document local détecté, utilisation URL directe...');

                // ✅ POUR ANCIENS DOCUMENTS, UTILISER URL DIRECTE
                setShowPDFPreview(prev => prev ? {
                    ...prev,
                    tempUrl: document.url, // URL locale directe
                    loading: false
                } : null);
            }

        } catch (error) {
            console.error('❌ Erreur aperçu document:', error);
            const errorMessage = (error instanceof Error && error.message) ? error.message : String(error);
            setError(`Impossible de générer l'aperçu: ${errorMessage}`);
            setShowPDFPreview(prev => prev ? { ...prev, loading: false } : null);
        }
    };

    const handleDownloadDocument = async (documentId: string) => {
        try {
            console.log('📥 Téléchargement via Cloudinary...');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}/download-url`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}`);
            }

            const data = await response.json();

            // ✅ OUVRIR URL CLOUDINARY DIRECTEMENT
            window.open(data.downloadUrl, '_blank');

            console.log('✅ Téléchargement initié');

        } catch (error) {
            console.error('❌ Erreur téléchargement:', error);
            setError('Impossible de télécharger le document.');
        }
    };

    // ✅ WRAPPER refresh avec indicateur visuel
    const handleRefreshWithIndicator = async () => {
        setRefreshing(true);
        try {
            // ✅ MÊME PATTERN QUE CHAUFFEURS - Refresh avec contexte
            if (onRefresh && typeof onRefresh === 'function') {
                console.log('🔄 Déclenchement onRefresh contexte...');
                onRefresh();
                console.log('✅ onRefresh contexte terminé');
            } else {
                console.log('⚠️ onRefresh non disponible, fallback getCommande');
                const freshCommande = await dataService.getCommande(commande.id);
                if (freshCommande) {
                    console.log('🔄 Mise à jour via onUpdate');
                    onUpdate(freshCommande);
                }
            }
        } finally {
            setRefreshing(false);
        }
    };

    // ✅ NOUVELLES MÉTHODES - Utiliser les endpoints dédiés
    const handleGenerateBonCommande = async () => {
        if (hasBonCommande) {
            setError('Un bon de commande existe déjà. Supprimez-le d\'abord si nécessaire.');
            return;
        }

        try {
            setLoading('bon-commande');
            setError(null);

            await dataService.generateBonCommande(commande.id);

            console.log('✅ Document généré avec succès !');

            await handleRefreshWithIndicator();

            // ✅ NOTIFICATION SUCCÈS
            setError(null);
            
            toast.success('Bon de commande généré avec succès !');

        } catch (error) {
            console.error('❌ Erreur génération bon commande:', error);
            setError('Impossible de générer le bon de commande. Veuillez réessayer.');
        } finally {
            setLoading(null);
        }
    };

    // const handleGenerateBonCommande = async () => {
    //     try {
    //         setLoading('bon-commande');
    //         setError(null);

    //         // ✅ UTILISER LA MÉTHODE AVEC REFRESH INTÉGRÉ
    //         const updatedCommande = await dataService.generateBonCommandeWithRefresh(commande.id);

    //         console.log('✅ Document généré et commande rafraîchie');

    //         // ✅ METTRE À JOUR DIRECT (pattern chauffeurs)
    //         onUpdate(updatedCommande);

    //     } catch (error) {
    //         console.error('❌ Erreur génération bon commande:', error);
    //         setError('Impossible de générer le bon de commande. Veuillez réessayer.');
    //     } finally {
    //         setLoading(null);
    //     }
    // };

    const handleGenerateDevis = async () => {
        try {
            setLoading('devis');
            setError(null);

            // Préparer données devis
            const devisData = {
                montantHT: parseFloat(commande.financier?.tarifHT?.toString() || '0'),
                montantTTC: parseFloat(commande.financier?.tarifHT?.toString() || '0') * 1.2,
                client: {
                    nom: commande.client?.nom,
                    prenom: commande.client?.prenom,
                    telephone: commande.client?.telephone?.principal,
                    adresse: commande.client?.adresse?.ligne1
                },
                vehicule: commande.livraison?.vehicule,
                equipiers: commande.livraison?.equipiers || 0,
                dateDevis: new Date().toISOString(),
                dateEcheance: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
            };

            console.log('📄 Génération devis via nouveau service');
            await dataService.generateDevis(commande.id, devisData);

            if (onRefresh && typeof onRefresh === 'function') {
                await onRefresh();
            }

        } catch (error) {
            console.error('❌ Erreur génération devis:', error);
            setError('Impossible de générer le devis. Veuillez réessayer.');
        } finally {
            setLoading(null);
        }
    };

    const handleGenerateFacture = async () => {
        if (hasFacture) {
            setError('Une facture existe déjà. Supprimez-la d\'abord si nécessaire.');
            return;
        }

        try {
            setLoading('facture');
            setError(null);

            const factureData = {
                montantHT: parseFloat(commande.financier?.tarifHT?.toString() || '0'),
                montantTTC: parseFloat(commande.financier?.tarifHT?.toString() || '0') * 1.2,
                client: {
                    nom: commande.client?.nom,
                    prenom: commande.client?.prenom,
                    telephone: commande.client?.telephone?.principal,
                    adresse: commande.client?.adresse?.ligne1
                },
                dateFacture: new Date().toISOString(),
                dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };

            console.log('📄 Génération facture via nouveau service');
            await dataService.generateFacture(commande.id, factureData);

            await handleRefreshWithIndicator();

        } catch (error) {
            console.error('❌ Erreur génération facture:', error);
            setError('Impossible de générer la facture. Veuillez réessayer.');
        } finally {
            setLoading(null);
        }
    };

    // ✅ DÉTERMINER QUELS DOCUMENTS PEUVENT ÊTRE GÉNÉRÉS
    const canGenerateBonCommande = (user?.role === 'magasin' || user?.role === 'admin');

    const canGenerateDevis = user?.role === 'admin' && (
        (commande.livraison?.equipiers && commande.livraison.equipiers > 2) ||
        commande.financier?.devisObligatoire
    );

    const canGenerateFacture = user?.role === 'admin' &&
        commande.statuts?.livraison === 'LIVREE';

    return (
        <div className="space-y-4">
            {refreshing && (
                <div className="flex items-center justify-center py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-blue-700 text-sm">Actualisation en cours...</span>
                </div>
            )}
            {/* En-tête avec boutons de génération */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">📄 Documents</h3>
                <div className="flex space-x-2">
                    {canGenerateBonCommande && !hasBonCommande && (
                        <button
                            onClick={handleGenerateBonCommande}
                            disabled={loading === 'bon-commande'}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {loading === 'bon-commande' ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    Génération...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-1" />
                                    Bon de commande
                                </>
                            )}
                        </button>
                    )}

                    {hasBonCommande && (
                        <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            Bon déjà généré
                        </div>
                    )}

                    {canGenerateDevis && !hasDevis && (
                        <button
                            onClick={handleGenerateDevis}
                            disabled={loading === 'devis'}
                            className="px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-50 flex items-center"
                        >
                            {loading === 'devis' ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    Génération...
                                </>
                            ) : (
                                <>
                                    <FilePlus className="w-4 h-4 mr-1" />
                                    Devis
                                </>
                            )}
                        </button>
                    )}

                    {canGenerateFacture && !hasFacture && (
                        <button
                            onClick={handleGenerateFacture}
                            disabled={loading === 'facture'}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center"
                        >
                            {loading === 'facture' ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    Génération...
                                </>
                            ) : (
                                <>
                                    <FilePlus className="w-4 h-4 mr-1" />
                                    Facture
                                </>
                            )}
                        </button>
                    )}

                    {hasFacture && (
                        <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            Facture déjà générée
                        </div>
                    )}
                </div>
            </div>

            {/* Messages d'erreur */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Affichage des documents existants */}
            <div className="space-y-4">
                {/* Documents de la nouvelle API */}
                {existingDocuments.length > 0 && (
                    <div>
                        <h4 className="font-medium text-gray-700 mb-3">Documents générés</h4>
                        <div className="space-y-2">
                            {existingDocuments.map((document: any) => (
                                <div key={document.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <div className="font-medium flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                            {document.numeroDocument}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            <span>Type: {document.type.replace('_', ' ')}</span>
                                            <span className="mx-2">•</span>
                                            <span>Date: {new Date(document.dateDocument).toLocaleDateString('fr-FR')}</span>
                                            {document.montantHT && (
                                                <>
                                                    <span className="mx-2">•</span>
                                                    <span>Montant: {document.montantHT}€ HT</span>
                                                </>
                                            )}
                                            <span className="mx-2">•</span>
                                            <span className={`px-2 py-1 rounded text-xs ${document.statut === 'VALIDE' ? 'bg-green-100 text-green-800' :
                                                document.statut === 'EN_ATTENTE' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {document.statut.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handlePreviewDocument(document)}
                                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                            title="Aperçu"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleDownloadDocument(document.id)}
                                            className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                            title="Télécharger"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleDeleteDocument(document.id, document.type)}
                                            disabled={loading === `delete-${document.id}`}
                                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                            title="Supprimer"
                                        >
                                            {loading === `delete-${document.id}` ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {showPDFPreview && (
                    <PDFViewer
                        documentUrl={showPDFPreview.tempUrl || showPDFPreview.originalUrl}
                        title={showPDFPreview.title}
                        loading={showPDFPreview.loading}
                        onClose={() => setShowPDFPreview(null)}
                    />
                )}

                {/* Anciens documents (transition) */}
                {((Array.isArray(commande.financier?.devis) && commande.financier.devis.length > 0) ||
                    (Array.isArray(commande.financier?.factures) && commande.financier.factures.length > 0)) && (
                        <div>
                            <h4 className="font-medium text-gray-700 mb-3">Anciens documents</h4>
                            {/* ... logique existante pour anciens documents ... */}
                            <div className="space-y-2">
                                {commande.financier?.devis?.map((document: any) => (
                                    <div key={document.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50 flex justify-between items-center">
                                        <div>
                                            <h5 className="font-medium text-gray-800">{document.titre}</h5>
                                            <p className="text-sm text-gray-500">{formatDate(document.date)}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleDownloadDocument(document.id)}
                                                className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                                title="Télécharger"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                {/* Pas de documents */}
                {existingDocuments.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>Aucun document disponible pour cette commande</p>
                        {canGenerateBonCommande && canGenerateFacture && (
                            <p className="text-sm mt-2">Cliquez sur "Bon de commande" ou "Facture" pour commencer</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentViewer;