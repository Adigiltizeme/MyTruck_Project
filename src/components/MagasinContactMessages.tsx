import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { ContactService, Contact } from '../services/contact.service';
import { Modal } from './Modal';

interface ContactMessageRowProps {
  contact: Contact;
}

const ContactMessageRow: React.FC<ContactMessageRowProps> = ({ contact }) => {
  const getStatusBadge = (status: string) => {
    const statusStyles = {
      NOUVEAU: 'bg-red-100 text-red-800 border-red-200',
      LU: 'bg-blue-100 text-blue-800 border-blue-200',
      EN_COURS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      TRAITE: 'bg-green-100 text-green-800 border-green-200',
      ARCHIVE: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const statusLabels = {
      NOUVEAU: 'Nouveau',
      LU: 'Lu',
      EN_COURS: 'En cours',
      TRAITE: 'Traité',
      ARCHIVE: 'Archivé'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status as keyof typeof statusStyles] || statusStyles.NOUVEAU}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  const getRaisonBadge = (raison: string) => {
    const raisonColors = {
      RENSEIGNEMENTS: 'bg-blue-500',
      DEVIS: 'bg-green-500',
      LITIGE: 'bg-red-500',
      RECLAMATION: 'bg-orange-500'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${raisonColors[raison as keyof typeof raisonColors] || 'bg-gray-500'}`}>
        {raison}
      </span>
    );
  };

  return (
    <div className="border rounded-lg p-4 mb-3 bg-white hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            {getStatusBadge(contact.statut)}
            {getRaisonBadge(contact.raison)}
          </div>
          <h3 className="font-semibold text-gray-900">{contact.nomMagasin}</h3>
          <p className="text-sm text-gray-600">{contact.email} • {contact.telephone}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {format(new Date(contact.createdAt), 'dd MMMM yyyy à HH:mm')}
          </p>
          {contact.treatedAt && (
            <p className="text-xs text-green-600">
              Traité le {format(new Date(contact.treatedAt), 'dd/MM/yyyy')}
            </p>
          )}
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
          {contact.message}
        </p>
      </div>

      {contact.response && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">Votre réponse:</p>
          <p className="text-sm text-gray-700 bg-green-50 p-2 rounded border-l-4 border-green-400">
            {contact.response}
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <div className={`px-4 py-2 rounded-md text-sm font-medium text-center ${
          contact.statut === 'TRAITE'
            ? 'bg-green-100 text-green-800'
            : contact.statut === 'EN_COURS'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {contact.statut === 'TRAITE'
            ? '✓ Traité par My Truck'
            : contact.statut === 'EN_COURS'
            ? '⏳ En cours de traitement'
            : '📧 Demande envoyée'}
        </div>
      </div>
    </div>
  );
};


const MagasinContactMessages: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [raisonFilter, setRaisonFilter] = useState<string>('all');

  const contactService = new ContactService();

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [contacts, statusFilter, raisonFilter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Utiliser la route spécifique aux magasins
      const response = await contactService.getMyContacts();

      if (response.success) {
        setContacts(response.data);
      } else {
        throw new Error('Impossible de charger les messages');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des contacts:', err);
      setError('Impossible de charger les messages de contact');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contacts];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.statut === statusFilter);
    }

    if (raisonFilter !== 'all') {
      filtered = filtered.filter(contact => contact.raison === raisonFilter);
    }

    // Trier par date (plus récents en premier)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredContacts(filtered);
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadContacts}
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contact My Truck</h1>
            <p className="text-gray-600 mt-1">
              {filteredContacts.length} message{filteredContacts.length > 1 ? 's' : ''} reçu{filteredContacts.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={loadContacts}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
          >
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="flex space-x-4 mb-6">
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Statut:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="NOUVEAU">Nouveau</option>
              <option value="LU">Lu</option>
              <option value="EN_COURS">En cours</option>
              <option value="TRAITE">Traité</option>
            </select>
          </div>

          <div>
            <label htmlFor="raisonFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Raison:
            </label>
            <select
              id="raisonFilter"
              value={raisonFilter}
              onChange={(e) => setRaisonFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toutes les raisons</option>
              <option value="RENSEIGNEMENTS">Renseignements</option>
              <option value="DEVIS">Devis</option>
              <option value="LITIGE">Litige</option>
              <option value="RECLAMATION">Réclamation</option>
            </select>
          </div>
        </div>

        {/* Liste des messages */}
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.456L3 21l2.456-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun message</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter !== 'all' || raisonFilter !== 'all'
                ? 'Aucun message ne correspond aux filtres sélectionnés.'
                : 'Vous n\'avez reçu aucun message de contact pour le moment.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContacts.map((contact) => (
              <ContactMessageRow
                key={contact.id}
                contact={contact}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default MagasinContactMessages;