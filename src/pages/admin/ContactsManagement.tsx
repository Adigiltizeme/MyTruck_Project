import React, { useState, useEffect } from 'react';
import {
  EnvelopeIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { ContactService, Contact, ContactFilters, ContactStats } from '../../services/contact.service';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../contexts/NotificationContext';

interface ContactDetailModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updateData: any) => void;
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (contact) {
      setResponse(contact.response || '');
    }
  }, [contact]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOUVEAU': return 'bg-yellow-100 text-yellow-800';
      case 'LU': return 'bg-blue-100 text-blue-800';
      case 'EN_COURS': return 'bg-orange-100 text-orange-800';
      case 'TRAITE': return 'bg-green-100 text-green-800';
      case 'ARCHIVE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRaisonLabel = (raison: string) => {
    switch (raison) {
      case 'RENSEIGNEMENTS': return 'Demande de renseignements';
      case 'DEVIS': return 'Demande de devis';
      case 'LITIGE': return 'Déclaration de litige';
      case 'RECLAMATION': return 'Réclamation';
      default: return raison;
    }
  };

  const handleMarkAsTreated = async () => {
    if (!contact || !response.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdate(contact.id, { statut: 'TRAITE', response: response.trim() });
      onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!contact) return;

    setIsSubmitting(true);
    try {
      await onUpdate(contact.id, { statut: newStatus });
      if (newStatus !== 'TRAITE') {
        onClose();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-red-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Contact de {contact.nomMagasin}
                </h2>
                <p className="text-sm text-gray-600">
                  {getRaisonLabel(contact.raison)} • {new Date(contact.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contact.statut)}`}>
                {contact.statut}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Informations du contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Informations du magasin</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <BuildingStorefrontIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{contact.nomMagasin}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{contact.telephone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{contact.email}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {contact.adresse}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Détails du contact</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Raison :</span>
                  <span className="ml-2 text-sm">{getRaisonLabel(contact.raison)}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Date :</span>
                  <span className="ml-2 text-sm">
                    {new Date(contact.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                {contact.treatedAt && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Traité le :</span>
                    <span className="ml-2 text-sm">
                      {new Date(contact.treatedAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Message</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.message}</p>
            </div>
          </div>

          {/* Actions de statut */}
          {contact.statut !== 'TRAITE' && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Actions</h3>
              <div className="flex space-x-2">
                {contact.statut === 'NOUVEAU' && (
                  <button
                    onClick={() => handleStatusChange('LU')}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Marquer comme lu
                  </button>
                )}
                {(contact.statut === 'NOUVEAU' || contact.statut === 'LU') && (
                  <button
                    onClick={() => handleStatusChange('EN_COURS')}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    Prendre en charge
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Réponse */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Réponse</h3>
            {contact.statut === 'TRAITE' && contact.response ? (
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.response}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Rédigez votre réponse..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <button
                  onClick={handleMarkAsTreated}
                  disabled={isSubmitting || !response.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Envoi...' : 'Marquer comme traité'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ContactsManagement() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ContactFilters>({});
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const contactService = new ContactService();
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadContacts();
    loadStats();
  }, [filters]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await contactService.getAllContacts(filters);
      if (response.success) {
        setContacts(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await contactService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  const handleContactUpdate = async (id: string, updateData: any) => {
    try {
      const response = await contactService.updateContact(id, updateData);
      if (response.success) {
        await loadContacts();
        await loadStats();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const handleDeleteContact = async (id: string) => {
    const contactToDelete = contacts.find(c => c.id === id);
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

    try {
      const response = await contactService.deleteContact(id);
      if (response.success) {
        await loadContacts();
        await loadStats();
        addNotification({
          message: `Contact "${contactToDelete?.nomMagasin || 'supprimé'}" supprimé avec succès`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      addNotification({
        message: 'Erreur lors de la suppression du contact',
        type: 'error'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOUVEAU': return 'bg-yellow-100 text-yellow-800';
      case 'LU': return 'bg-blue-100 text-blue-800';
      case 'EN_COURS': return 'bg-orange-100 text-orange-800';
      case 'TRAITE': return 'bg-green-100 text-green-800';
      case 'ARCHIVE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRaisonColor = (raison: string) => {
    switch (raison) {
      case 'RENSEIGNEMENTS': return 'bg-blue-100 text-blue-800';
      case 'DEVIS': return 'bg-purple-100 text-purple-800';
      case 'LITIGE': return 'bg-red-100 text-red-800';
      case 'RECLAMATION': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRaisonLabel = (raison: string) => {
    switch (raison) {
      case 'RENSEIGNEMENTS': return 'Renseignements';
      case 'DEVIS': return 'Devis';
      case 'LITIGE': return 'Litige';
      case 'RECLAMATION': return 'Réclamation';
      default: return raison;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Contacts</h1>
          <p className="text-gray-600">Consultez et gérez les messages de contact reçus</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <ChartBarIcon className="w-5 h-5" />
            <span>Statistiques</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <FunnelIcon className="w-5 h-5" />
            <span>Filtres</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <AnimatePresence>
        {showStats && stats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg border p-6"
          >
            <h3 className="font-medium text-gray-900 mb-4">Statistiques</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.parStatut.nouveau}</div>
                <div className="text-sm text-gray-600">Nouveaux</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.parStatut.enCours}</div>
                <div className="text-sm text-gray-600">En cours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.parStatut.traite}</div>
                <div className="text-sm text-gray-600">Traités</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg border p-6"
          >
            <h3 className="font-medium text-gray-900 mb-4">Filtres</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison</label>
                <select
                  value={filters.raison || ''}
                  onChange={(e) => setFilters({ ...filters, raison: e.target.value as any || undefined })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Toutes</option>
                  <option value="RENSEIGNEMENTS">Renseignements</option>
                  <option value="DEVIS">Devis</option>
                  <option value="LITIGE">Litige</option>
                  <option value="RECLAMATION">Réclamation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={filters.statut || ''}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value as any || undefined })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Tous</option>
                  <option value="NOUVEAU">Nouveau</option>
                  <option value="LU">Lu</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="TRAITE">Traité</option>
                  <option value="ARCHIVE">Archivé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={filters.dateDebut || ''}
                  onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={filters.dateFin || ''}
                  onChange={(e) => setFilters({ ...filters, dateFin: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, message..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des contacts */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucun contact trouvé</p>
            <p className="mt-1">Les messages de contact apparaîtront ici</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Magasin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raison
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingStorefrontIcon className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contact.nomMagasin}
                          </div>
                          <div className="text-sm text-gray-500">
                            {contact.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRaisonColor(contact.raison)}`}>
                        {getRaisonLabel(contact.raison)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {contact.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contact.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contact.statut)}`}>
                        {contact.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={async () => {
                          setSelectedContact(contact);
                          setShowDetailModal(true);
                          // Marquer automatiquement comme LU si c'est NOUVEAU
                          if (contact.statut === 'NOUVEAU') {
                            await handleContactUpdate(contact.id, { statut: 'LU' });
                            addNotification({
                              message: `Contact "${contact.nomMagasin}" marqué comme lu`,
                              type: 'success'
                            });
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de détail */}
      <ContactDetailModal
        contact={selectedContact}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedContact(null);
        }}
        onUpdate={handleContactUpdate}
      />
    </div>
  );
}