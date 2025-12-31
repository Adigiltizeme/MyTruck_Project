import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Contact, ContactService } from '../services/contact.service';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, CheckCircle, XCircle, Clock, AlertCircle, Eye, PlusCircle, Trash2 } from 'lucide-react';
import { dateFormatter } from '../utils/formatters';
import { isAdminRole, isMagasinRole } from '../utils/role-helpers';
import { PDFViewer } from './PDFViewer';
import { useNavigate } from 'react-router-dom';
import { parseContactMessage } from '../utils/contact-parser';

interface DevisFromContactsProps {
  searchTerm?: string;
}

const DevisFromContacts: React.FC<DevisFromContactsProps> = ({ searchTerm = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationNote, setValidationNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [actionType, setActionType] = useState<'validate' | 'reject'>('validate');
  const [showPDFPreview, setShowPDFPreview] = useState<{
    tempUrl?: string;
    originalUrl: string;
    title: string;
    loading: boolean;
  } | null>(null);

  // ✅ ÉTATS pour suppression multiple (réutilisant logique Deliveries.tsx)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const contactService = new ContactService();

  useEffect(() => {
    loadDevisContacts();
  }, []);

  const loadDevisContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      let contactsData: Contact[] = [];

      try {
        if (isAdminRole(user?.role)) {
          // Admin : Récupérer tous les contacts avec devis
          const response = await contactService.getAllContacts({ raison: 'DEVIS' });
          contactsData = response.data || [];
        } else if (isMagasinRole(user?.role)) {
          // Magasin : Récupérer ses propres contacts
          const response = await contactService.getMyContacts();
          contactsData = (response.data || []).filter(c => c.raison === 'DEVIS');
        } else {
          // Rôle non supporté (chauffeur, etc.)
          console.log('ℹ️ Rôle non supporté pour les devis:', user?.role);
          setContacts([]);
          setLoading(false);
          return;
        }
      } catch (apiErr: any) {
        console.warn('⚠️ Erreur API chargement contacts, retour gracieux:', apiErr);
        // En cas d'erreur API, on retourne une liste vide plutôt que de planter
        setContacts([]);
        setLoading(false);
        return;
      }

      // Filtrer seulement ceux qui ont un devis généré
      const devisContacts = contactsData.filter(
        c => c.devisDocumentId && ['DEVIS_GENERE', 'DEVIS_VALIDE', 'DEVIS_REFUSE'].includes(c.statut)
      );

      setContacts(devisContacts);
    } catch (err: any) {
      console.error('❌ Erreur chargement devis contacts:', err);
      setError(err.message || 'Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  };

  // ✅ MÉTHODES RÉUTILISÉES DEPUIS DocumentViewer.tsx
  const handlePreviewDevis = async (contact: Contact) => {
    try {
      console.log('📄 Aperçu devis contact:', contact.id);

      const response = await contactService.getContactDevis(contact.id);

      if (!response.data) {
        setError('Aucun document de devis disponible');
        return;
      }

      const document = response.data;

      setShowPDFPreview({
        originalUrl: document.downloadUrl || document.url,
        title: `Devis - ${contact.nomMagasin}`,
        loading: true
      });

      // ✅ VÉRIFIER SI DOCUMENT CLOUDINARY OU LOCAL
      const isCloudinaryDoc = document.cloudinaryId &&
        !document.cloudinaryId.includes('uploads') &&
        !document.cloudinaryId.includes('\\');

      if (isCloudinaryDoc) {
        console.log('☁️ Document Cloudinary détecté, génération URL signée...');

        const viewResponse = await fetch(`${import.meta.env.VITE_API_URL}/documents/${document.id}/view-url`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (!viewResponse.ok) {
          throw new Error(`Erreur ${viewResponse.status}`);
        }

        const data = await viewResponse.json();
        console.log('✅ URL Cloudinary reçue');

        setShowPDFPreview(prev => prev ? {
          ...prev,
          tempUrl: data.viewUrl,
          loading: false
        } : null);

      } else {
        console.log('📁 Document local détecté, utilisation URL directe...');

        setShowPDFPreview(prev => prev ? {
          ...prev,
          tempUrl: document.downloadUrl || document.url,
          loading: false
        } : null);
      }

    } catch (err: any) {
      console.error('❌ Erreur aperçu devis:', err);
      setError(`Impossible de générer l'aperçu: ${err.message || 'Erreur inconnue'}`);
      setShowPDFPreview(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const handleDownloadDevis = async (contact: Contact) => {
    try {
      console.log('📥 Téléchargement devis contact:', contact.id);

      const response = await contactService.getContactDevis(contact.id);

      if (!response.data) {
        setError('Aucun document de devis disponible');
        return;
      }

      const document = response.data;

      // ✅ VÉRIFIER SI DOCUMENT CLOUDINARY
      const isCloudinaryDoc = document.cloudinaryId &&
        !document.cloudinaryId.includes('uploads') &&
        !document.cloudinaryId.includes('\\');

      if (isCloudinaryDoc) {
        // Générer URL signée pour téléchargement
        const downloadResponse = await fetch(`${import.meta.env.VITE_API_URL}/documents/${document.id}/download-url`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (!downloadResponse.ok) {
          throw new Error(`Erreur ${downloadResponse.status}`);
        }

        const data = await downloadResponse.json();
        window.open(data.downloadUrl, '_blank');
      } else {
        // URL directe pour documents locaux
        window.open(document.downloadUrl || document.url, '_blank');
      }

      console.log('✅ Téléchargement initié');

    } catch (err: any) {
      console.error('❌ Erreur téléchargement devis:', err);
      setError('Impossible de télécharger le document.');
    }
  };

  const handleValidateClick = (contact: Contact) => {
    setSelectedContact(contact);
    setActionType('validate');
    setValidationNote('');
    setShowNoteModal(true);
  };

  const handleRejectClick = (contact: Contact) => {
    setSelectedContact(contact);
    setActionType('reject');
    setValidationNote('');
    setShowNoteModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedContact) return;

    try {
      if (actionType === 'validate') {
        await contactService.validateDevis(selectedContact.id, validationNote || undefined);
        alert('✅ Devis validé avec succès');
      } else {
        await contactService.rejectDevis(selectedContact.id, validationNote || undefined);
        alert('❌ Devis refusé');
      }

      setShowNoteModal(false);
      setSelectedContact(null);
      setValidationNote('');
      await loadDevisContacts();
    } catch (err: any) {
      console.error(`❌ Erreur ${actionType === 'validate' ? 'validation' : 'rejet'} devis:`, err);
      alert(`Erreur lors de ${actionType === 'validate' ? 'la validation' : 'du rejet'} du devis`);
    }
  };

  // ✅ CRÉER COMMANDE DEPUIS DEVIS - Approche événement custom (comme "Demandez votre devis ici")
  const handleCreateCommande = (contact: Contact) => {
    try {
      // Parser le message du contact pour extraire les données
      const contactData = parseContactMessage(contact.message);

      const prefilledFormData = {
        contactId: contact.id,
        magasin: {
          nom: contact.nomMagasin,
          adresse: contact.adresse,
          telephone: contact.telephone,
        },
        ...contactData
      };

      console.log('✅ DevisFromContacts - Ouverture formulaire avec données:', prefilledFormData);

      // ✅ Stocker dans localStorage pour la navigation (approche ContactsManagement.tsx)
      localStorage.setItem('commandeFromContact', JSON.stringify(prefilledFormData));

      // ✅ CORRECTION : Naviguer avec ?openForm=true comme ContactsManagement.tsx
      navigate('/deliveries?openForm=true');

    } catch (error) {
      console.error('❌ Erreur lors de la création de commande:', error);
      setError('Impossible de créer la commande à partir de ce contact');
    }
  };

  // ✅ SUPPRESSION UNIQUE (réutilisant logique Deliveries.tsx)
  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce devis et son contact associé ?')) {
      try {
        await contactService.deleteContact(id);
        setContacts(prevContacts => prevContacts.filter(contact => contact.id !== id));
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression');
      }
    }
  };

  // ✅ SÉLECTION MULTIPLE (réutilisant logique Deliveries.tsx)
  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisibleIds = new Set(filteredContacts.map(contact => contact.id));
      setSelectedRows(allVisibleIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  // ✅ SUPPRESSION MULTIPLE (réutilisant logique Deliveries.tsx)
  const handleMultipleDelete = async () => {
    if (selectedRows.size === 0) return;

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedRows.size} devis sélectionné(s) ? Cette action est irréversible.`;

    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedRows);
      console.log('🗑️ Début suppression multiple devis contacts:', idsToDelete);

      const results = { success: [] as string[], errors: [] as { id: string; error: string }[] };

      for (const id of idsToDelete) {
        try {
          await contactService.deleteContact(id);
          results.success.push(id);
        } catch (err) {
          results.errors.push({
            id,
            error: err instanceof Error ? err.message : 'Erreur inconnue'
          });
        }
      }

      // Mettre à jour la liste avec seulement les suppressions réussies
      setContacts(prevContacts =>
        prevContacts.filter(contact => !results.success.includes(contact.id))
      );

      // Réinitialiser la sélection
      setSelectedRows(new Set());

      // Afficher les résultats
      if (results.success.length > 0) {
        console.log(`✅ ${results.success.length} devis supprimé(s) avec succès`);
      }
      if (results.errors.length > 0) {
        console.error(`❌ ${results.errors.length} erreur(s):`, results.errors);
        setError(`${results.errors.length} devis n'ont pas pu être supprimés`);
      }

    } catch (error) {
      console.error('❌ Erreur suppression multiple:', error);
      setError('Erreur lors de la suppression multiple');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'DEVIS_GENERE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </span>
        );
      case 'DEVIS_VALIDE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Validé
          </span>
        );
      case 'DEVIS_REFUSE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Refusé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {statut}
          </span>
        );
    }
  };

  // Filtrer par searchTerm
  const filteredContacts = contacts.filter(contact =>
    contact.nomMagasin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        {error}
      </div>
    );
  }

  if (filteredContacts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Aucun devis disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête section avec actions de suppression multiple */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium">📄 Devis issus des demandes de contact</h3>
          {selectedRows.size > 0 && (
            <span className="text-sm text-gray-500">
              ({selectedRows.size} sélectionné{selectedRows.size > 1 ? 's' : ''})
            </span>
          )}
        </div>

        {/* ✅ Boutons d'action (seulement pour admin) */}
        {isAdminRole(user?.role) && selectedRows.size > 0 && (
          <button
            onClick={handleMultipleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Suppression...' : `Supprimer (${selectedRows.size})`}</span>
          </button>
        )}
      </div>

      {/* Affichage des devis - Pattern DocumentViewer.tsx */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Devis générés</h4>
            {/* ✅ Checkbox "Tout sélectionner" (seulement pour admin) */}
            {isAdminRole(user?.role) && filteredContacts.length > 0 && (
              <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredContacts.length && filteredContacts.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span>Tout sélectionner</span>
              </label>
            )}
          </div>
          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`border rounded-lg p-3 bg-white hover:bg-gray-50 flex justify-between items-center ${
                  selectedRows.has(contact.id) ? 'ring-2 ring-red-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  {/* ✅ Checkbox de sélection (seulement pour admin) */}
                  {isAdminRole(user?.role) && (
                    <input
                      type="checkbox"
                      checked={selectedRows.has(contact.id)}
                      onChange={(e) => handleSelectRow(contact.id, e.target.checked)}
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-blue-600" />
                      {contact.nomMagasin}
                    </div>
                    <div className="text-sm text-gray-500">
                    <span>Créé le: {dateFormatter.forDisplay(contact.createdAt)}</span>
                    {contact.validatedAt && (
                      <>
                        <span className="mx-2">•</span>
                        <span>
                          {contact.statut === 'DEVIS_VALIDE' ? 'Validé' : 'Refusé'} le: {dateFormatter.forDisplay(contact.validatedAt)}
                        </span>
                      </>
                    )}
                    <span className="mx-2">•</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      contact.statut === 'DEVIS_VALIDE' ? 'bg-green-100 text-green-800' :
                      contact.statut === 'DEVIS_REFUSE' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {contact.statut === 'DEVIS_GENERE' ? 'EN ATTENTE' :
                       contact.statut === 'DEVIS_VALIDE' ? 'VALIDÉ' : 'REFUSÉ'}
                    </span>
                  </div>
                    {contact.validationNote && (
                      <div className="text-xs text-gray-500 mt-1 italic">
                        Note: {contact.validationNote}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {/* Bouton Aperçu */}
                  <button
                    onClick={() => handlePreviewDevis(contact)}
                    className="p-2 text-blue-700 rounded-lg hover:bg-blue-200"
                    title="Aperçu"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Bouton Télécharger */}
                  <button
                    onClick={() => handleDownloadDevis(contact)}
                    className="p-2 text-gray-700 rounded-lg hover:bg-gray-300"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Boutons Validation/Rejet (seulement pour magasins avec statut DEVIS_GENERE) */}
                  {contact.statut === 'DEVIS_GENERE' && isMagasinRole(user?.role) && (
                    <>
                      <button
                        onClick={() => handleValidateClick(contact)}
                        className="p-2 text-green-700 rounded-lg hover:bg-green-200"
                        title="Valider"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRejectClick(contact)}
                        className="p-2 text-red-700 rounded-lg hover:bg-red-200"
                        title="Refuser"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Bouton Créer Commande (seulement pour admin avec devis validé) */}
                  {isAdminRole(user?.role) && contact.statut === 'DEVIS_VALIDE' && (
                    <button
                      onClick={() => handleCreateCommande(contact)}
                      className="p-2 text-purple-700 rounded-lg hover:bg-purple-200"
                      title="Créer une commande avec les données de ce devis"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  )}

                  {/* ✅ Bouton Supprimer (seulement pour admin) */}
                  {isAdminRole(user?.role) && (
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 text-red-700 rounded-lg hover:bg-red-200"
                      title="Supprimer ce devis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ MODAL PDF PREVIEW - Composant réutilisé de DocumentViewer.tsx */}
      {showPDFPreview && (
        <PDFViewer
          documentUrl={showPDFPreview.tempUrl || showPDFPreview.originalUrl}
          title={showPDFPreview.title}
          loading={showPDFPreview.loading}
          onClose={() => setShowPDFPreview(null)}
        />
      )}

      {/* Modal Note de validation/rejet */}
      <AnimatePresence>
        {showNoteModal && selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold mb-4">
                {actionType === 'validate' ? '✅ Valider le devis' : '❌ Refuser le devis'}
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                Magasin: <span className="font-medium">{selectedContact.nomMagasin}</span>
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (optionnelle)
              </label>
              <textarea
                value={validationNote}
                onChange={(e) => setValidationNote(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                rows={3}
                placeholder={
                  actionType === 'validate'
                    ? 'Ajoutez une note de validation...'
                    : 'Précisez la raison du refus...'
                }
              />

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setSelectedContact(null);
                    setValidationNote('');
                  }}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 text-sm text-white rounded transition-colors ${
                    actionType === 'validate'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DevisFromContacts;
