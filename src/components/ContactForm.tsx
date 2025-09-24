import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { ContactService } from '../services/contact.service';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'DEVIS' | 'LITIGE' | 'RECLAMATION' | 'RENSEIGNEMENTS';
  prefilledData?: {
    client?: {
      nom?: string;
      prenom?: string;
      telephone?: { principal?: string; secondaire?: string } | string;
      adresse?: {
        ligne1?: string;
        batiment?: string;
        etage?: string;
        interphone?: string;
        ascenseur?: boolean;
        type?: string;
      };
    };
    articles?: {
      nombre?: number;
      details?: string;
      dimensions?: any[];
      categories?: string[];
      photos?: any[];
    };
    livraison?: {
      creneau?: string;
      vehicule?: string;
      equipiers?: number;
      remarques?: string;
      details?: any;
    };
    dates?: {
      livraison?: string;
    };
    magasin?: {
      id?: string;
      nom?: string;
      manager?: string;
    };
  };
}

interface ContactFormData {
  nomMagasin: string;
  adresse: string;
  telephone: string;
  email: string;
  raison: 'DEVIS' | 'LITIGE' | 'RECLAMATION' | 'RENSEIGNEMENTS';
  message: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ isOpen, onClose, reason = 'RENSEIGNEMENTS', prefilledData }) => {
  const { user } = useAuth();
  const contactService = new ContactService();

  // Fonction pour générer le message pré-rempli selon la raison
  const generatePrefilledMessage = (): string => {
    if (!prefilledData || reason !== 'DEVIS') {
      return '';
    }

    const { client, articles, livraison, dates, magasin } = prefilledData;
    let message = 'Demande de devis pour livraison :\n\n';

    // Informations client
    if (client) {
      message += '=== CLIENT ===\n';
      if (client.nom || client.prenom) {
        message += `Nom : ${client.nom || ''} ${client.prenom || ''}\n`;
      }

      const telephone = typeof client.telephone === 'string'
        ? client.telephone
        : client.telephone?.principal;
      if (telephone) {
        message += `Téléphone : ${telephone}\n`;
      }

      if (typeof client.telephone === 'object' && client.telephone?.secondaire) {
        message += `Téléphone 2 : ${client.telephone.secondaire}\n`;
      }

      if (client.adresse) {
        message += `Adresse : ${client.adresse.ligne1 || ''}\n`;
        if (client.adresse.batiment) {
          message += `Bâtiment : ${client.adresse.batiment}\n`;
        }
        if (client.adresse.etage) {
          message += `Étage : ${client.adresse.etage}\n`;
        }
        if (client.adresse.interphone) {
          message += `Interphone : ${client.adresse.interphone}\n`;
        }
        message += `Ascenseur : ${client.adresse.ascenseur ? 'Oui' : 'Non'}\n`;
        message += `Type d'adresse : ${client.adresse.type || 'Domicile'}\n`;
      }
      message += '\n';
    }

    // Informations articles
    if (articles) {
      message += '=== ARTICLES ===\n';
      message += `Nombre d'articles : ${articles.nombre || 1}\n`;
      if (articles.details) {
        message += `Détails : ${articles.details}\n`;
      }
      if (articles.categories && articles.categories.length > 0) {
        message += `Catégories : ${articles.categories.join(', ')}\n`;
      }
      if (articles.dimensions && articles.dimensions.length > 0) {
        message += 'Dimensions :\n';
        articles.dimensions.forEach((dim: any, index: number) => {
          message += `  ${index + 1}. ${dim.nom || 'Article'} (x${dim.quantite || 1})`;
          if (dim.longueur || dim.largeur || dim.hauteur) {
            message += ` - `;
            if (dim.longueur) message += `L:${dim.longueur}cm `;
            if (dim.largeur) message += `l:${dim.largeur}cm `;
            if (dim.hauteur) message += `H:${dim.hauteur}cm `;
          }
          if (dim.poids) {
            message += `- Poids: ${dim.poids}kg`;
          }
          message += '\n';
        });
      }
      message += '\n';
    }

    // Informations livraison
    if (livraison || dates) {
      message += '=== LIVRAISON ===\n';
      if (dates?.livraison) {
        message += `Date souhaitée : ${new Date(dates.livraison).toLocaleDateString()}\n`;
      }
      if (livraison?.creneau) {
        message += `Créneau souhaité : ${livraison.creneau}\n`;
      }
      if (livraison?.vehicule) {
        message += `Type de véhicule : ${livraison.vehicule}\n`;
      }
      if (livraison?.equipiers) {
        message += `Nombre d'équipiers : ${livraison.equipiers}\n`;
      }

      // Conditions spéciales de livraison
      if (livraison?.details) {
        let conditions;
        try {
          conditions = typeof livraison.details === 'string'
            ? JSON.parse(livraison.details)
            : livraison.details;
        } catch (e) {
          conditions = livraison.details;
        }

        if (conditions && typeof conditions === 'object') {
          const specialConditions = [];
          if (conditions.rueInaccessible) specialConditions.push('Rue inaccessible');
          if (conditions.paletteComplete) specialConditions.push('Palette complète');
          if (conditions.parkingDistance > 50) specialConditions.push(`Portage: ${conditions.parkingDistance}m`);
          if (conditions.hasStairs) specialConditions.push(`Escaliers: ${conditions.stairCount || '?'} marches`);
          if (conditions.needsAssembly) specialConditions.push('Montage requis');
          if (conditions.isDuplex && conditions.deliveryToUpperFloor) specialConditions.push('Livraison étage supérieur (duplex)');

          if (specialConditions.length > 0) {
            message += `Conditions spéciales : ${specialConditions.join(', ')}\n`;
          }
        }
      }

      if (livraison?.remarques) {
        message += `Autres remarques : ${livraison.remarques}\n`;
      }
      message += '\n';
    }

    // Informations magasin
    if (magasin) {
      message += '=== MAGASIN ===\n';
      if (magasin.nom) {
        message += `Magasin : ${magasin.nom}\n`;
      }
      if (magasin.manager) {
        message += `Vendeur : ${magasin.manager}\n`;
      }
      message += '\n';
    }

    message += 'Merci de me faire parvenir un devis pour cette livraison.\n';
    message += 'Cordialement.';

    return message;
  };
  const [formData, setFormData] = useState<ContactFormData>({
    nomMagasin: user?.storeName || '',
    adresse: user?.storeAddress || '',
    telephone: '',
    email: user?.email || '',
    raison: reason,
    message: generatePrefilledMessage()
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Effet pour mettre à jour le message quand le formulaire s'ouvre ou les données changent
  useEffect(() => {
    if (isOpen && prefilledData && reason === 'DEVIS') {
      const prefilledMessage = generatePrefilledMessage();
      setFormData(prev => ({
        ...prev,
        message: prefilledMessage,
        raison: reason
      }));
    }
  }, [isOpen, prefilledData, reason]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.nomMagasin.trim()) {
      setErrorMessage('Le nom du magasin est requis');
      return false;
    }
    if (!formData.adresse.trim()) {
      setErrorMessage('L\'adresse est requise');
      return false;
    }
    if (!formData.telephone.trim()) {
      setErrorMessage('Le téléphone est requis');
      return false;
    }
    if (!formData.email.trim()) {
      setErrorMessage('L\'email est requis');
      return false;
    }
    if (!formData.message.trim()) {
      setErrorMessage('Le message est requis');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!validateForm()) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Préparer les données pour l'API
      const contactData = {
        ...formData,
        magasinId: user?.storeId || undefined,
        userId: user?.id || undefined,
      };

      console.log('Envoi du formulaire de contact:', contactData);

      // Appel à l'API réelle
      const response = await contactService.submitContact(contactData);

      console.log('📥 Réponse du service:', response);

      if (response.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          setSubmitStatus('idle');
          setErrorMessage('');
          // Réinitialiser le formulaire
          setFormData({
            nomMagasin: user?.storeName || '',
            adresse: user?.storeAddress || '',
            telephone: '',
            email: user?.email || '',
            raison: reason,
            message: ''
          });
        }, 2000);
      } else {
        setErrorMessage(response.message || 'Une erreur s\'est produite lors de l\'envoi.');
        setSubmitStatus('error');
      }

    } catch (error) {
      console.error('Erreur lors de l\'envoi du formulaire:', error);
      setErrorMessage('Une erreur de connexion s\'est produite. Veuillez réessayer.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRaisonLabel = (raison: string) => {
    switch (raison) {
      case 'DEVIS': return 'Demande de devis';
      case 'LITIGE': return 'Déclaration de litige';
      case 'RECLAMATION': return 'Réclamation';
      case 'RENSEIGNEMENTS': return 'Demande de renseignements';
      default: return raison;
    }
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Envoi en cours...';
    if (submitStatus === 'success') return 'Message envoyé !';
    return 'Envoyer le message';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Send className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Contact My Truck</h2>
              <p className="text-sm text-gray-600">
                {getRaisonLabel(formData.raison)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Contenu du formulaire */}
        <div className="p-6 space-y-6">
          {/* Messages de statut */}
          {submitStatus === 'success' && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Votre message a été envoyé avec succès ! Nous vous recontacterons bientôt.
            </div>
          )}

          {submitStatus === 'error' && errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {errorMessage}
            </div>
          )}

          {/* Informations du magasin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nomMagasin" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du magasin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nomMagasin"
                name="nomMagasin"
                value={formData.nomMagasin}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Nom de votre magasin"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Votre numéro de téléphone"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="adresse" className="block text-sm font-medium text-gray-700 mb-1">
              Adresse <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="adresse"
              name="adresse"
              value={formData.adresse}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Adresse complète du magasin"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="votre@email.com"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Raison du contact */}
          <div>
            <label htmlFor="raison" className="block text-sm font-medium text-gray-700 mb-1">
              Raison du contact <span className="text-red-500">*</span>
            </label>
            <select
              id="raison"
              name="raison"
              value={formData.raison}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
              disabled={isSubmitting}
            >
              <option value="RENSEIGNEMENTS">Demande de renseignements</option>
              <option value="DEVIS">Demande de devis</option>
              <option value="LITIGE">Déclaration de litige</option>
              <option value="RECLAMATION">Réclamation</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder={`Décrivez votre ${
                formData.raison === 'RENSEIGNEMENTS' ? 'demande de renseignements' :
                formData.raison === 'DEVIS' ? 'demande de devis' :
                formData.raison === 'LITIGE' ? 'litige' : 'réclamation'
              } en détail...`}
              required
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.raison === 'RENSEIGNEMENTS' &&
                "Décrivez vos besoins en livraison, votre secteur d'activité, et les services qui vous intéressent."
              }
              {formData.raison === 'DEVIS' &&
                "Précisez les détails de votre demande : type de livraison, dimensions, contraintes particulières, etc."
              }
              {formData.raison === 'LITIGE' &&
                "Décrivez les faits, la date, et les éléments concernés par le litige."
              }
              {formData.raison === 'RECLAMATION' &&
                "Expliquez votre réclamation en détail avec les éléments de contexte."
              }
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={`flex-1 px-4 py-2 rounded-md transition-colors flex items-center justify-center space-x-2 ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : submitStatus === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {submitStatus === 'success' && <CheckCircle className="w-4 h-4" />}
              {submitStatus !== 'success' && !isSubmitting && <Send className="w-4 h-4" />}
              <span>{getSubmitButtonText()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;