import React, { useState, useEffect } from 'react';
import { DevisFormData } from '../types/devis.types';
import { CommandeMetier } from '../types/business.types';
// import { useOffline } from '../contexts/OfflineContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, FileText, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { TarificationService } from '../services/tarification.service';
import { format } from 'date-fns';
import { CRENEAUX_LIVRAISON, VEHICULES } from './constants/options';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CloudinaryService } from '../services/cloudinary.service';

interface DetailedQuoteFormProps {
  commande?: CommandeMetier;
  isOpen: boolean;
  onClose: () => void;
  onQuoteGenerated: (devisInfo: any) => void;
}

const DetailedQuoteForm: React.FC<DetailedQuoteFormProps> = ({
  commande,
  isOpen,
  onClose,
  onQuoteGenerated
}) => {
  // const { dataService } = useOffline();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialiser les données du formulaire
  const [formData, setFormData] = useState<DevisFormData>({
    client: {
      nom_entreprise: commande?.client?.nom || '',
      nom_contact: commande?.client?.prenom || '',
      adresse_facturation: commande?.client?.adresse?.ligne1 || '',
      code_postal: commande?.client?.adresse?.ligne1?.match(/\d{5}/)?.toString() || '',
      ville: commande?.client?.adresse?.ligne1?.replace(/.*\d{5}\s+/, '') || '',
      telephone: commande?.client?.telephone?.principal || '',
      email: ''
    },
    livraison: {
      adresse: commande?.client?.adresse?.ligne1 || '',
      code_postal: commande?.client?.adresse?.ligne1?.match(/\d{5}/)?.toString() || '',
      ville: commande?.client?.adresse?.ligne1?.replace(/.*\d{5}\s+/, '') || '',
      date_souhaitee: commande?.dates?.livraison
        ? format(new Date(commande.dates.livraison), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      creneau_horaire: commande?.livraison?.creneau || CRENEAUX_LIVRAISON[0]
    },
    lieu_livraison: {
      etage: commande?.client?.adresse?.etage || '',
      ascenseur: commande?.client?.adresse?.ascenseur || false,
      dimensions_ascenseur: '',
      marches_avant_ascenseur: false,
      nombre_marches: 0,
      stationnement_possible: true,
      restrictions_stationnement: '',
      distance_stationnement: '',
      acces_difficile: false,
      details_acces: ''
    },
    commande: {
      type_produits: commande?.articles?.categories || ['Autre'],
      quantite: commande?.articles?.nombre || 1,
      poids_total: 0,
      dimensions: '',
      materiel_manutention: commande?.livraison?.equipiers ? commande.livraison.equipiers > 0 : false,
      conditions_particulieres: commande?.livraison?.remarques || ''
    },
    options_livraison: {
      type_livraison: 'standard',
      assurance: false,
      services_supplementaires: []
    },
    articles: [
      {
        description: `Transport - ${VEHICULES[commande?.livraison?.vehicule || '3M3']}`,
        quantite: 1,
        prix_unitaire: 0,
        montant_ht: 0
      }
    ],
    remarques: ''
  });

  // Calculer le coût initial lors du chargement
  useEffect(() => {
    if (isOpen && commande) {
      calculateInitialCosts();
    }
  }, [isOpen, commande]);

  const calculateInitialCosts = async () => {
    try {
      setLoading(true);

      if (!commande) return;

      const tarificationService = new TarificationService();

      // Calculer les coûts de transport
      const tarifResponse = await tarificationService.calculerTarif({
        vehicule: commande.livraison.vehicule,
        adresseMagasin: commande.magasin?.address || '',
        adresseLivraison: commande.client?.adresse?.ligne1 || '',
        equipiers: commande.livraison?.equipiers || 0
      });

      // Mettre à jour le prix du transport
      const updatedArticles = [...formData.articles];

      // Mettre à jour le premier article (transport)
      if (updatedArticles.length > 0) {
        updatedArticles[0] = {
          ...updatedArticles[0],
          prix_unitaire: typeof tarifResponse.montantHT === 'number' ? tarifResponse.montantHT : 0,
          montant_ht: typeof tarifResponse.montantHT === 'number' ? tarifResponse.montantHT : 0
        };
      }

      // Si on dépasse 2 équipiers, ajouter un article pour les équipiers supplémentaires
      if (commande.livraison?.equipiers && commande.livraison.equipiers > 2) {
        const equipiersSupplementaires = commande.livraison.equipiers - 2;
        const prixEquipier = 75; // 75€ par équipier supplémentaire

        updatedArticles.push({
          description: `Équipiers supplémentaires (${equipiersSupplementaires})`,
          quantite: equipiersSupplementaires,
          prix_unitaire: prixEquipier,
          montant_ht: equipiersSupplementaires * prixEquipier
        });
      }

      // Mettre à jour les articles
      setFormData(prev => ({
        ...prev,
        articles: updatedArticles
      }));

    } catch (error) {
      console.error('Erreur lors du calcul des coûts initiaux:', error);
      setError('Erreur lors du calcul des coûts. Veuillez vérifier les informations.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    section: keyof DevisFormData,
    field: string,
    value: string | boolean | number | string[]
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(typeof prev[section] === 'object' && prev[section] !== null ? prev[section] : {}),
        [field]: value
      }
    }));
  };

  const handleArticleChange = (index: number, field: string, value: string | number) => {
    const updatedArticles = [...formData.articles];

    // Mettre à jour le champ spécifié
    updatedArticles[index] = {
      ...updatedArticles[index],
      [field]: value
    };

    // Recalculer le montant HT si nécessaire
    if (field === 'prix_unitaire' || field === 'quantite') {
      updatedArticles[index].montant_ht =
        updatedArticles[index].prix_unitaire * updatedArticles[index].quantite;
    }

    setFormData(prev => ({
      ...prev,
      articles: updatedArticles
    }));
  };

  const addArticle = () => {
    setFormData(prev => ({
      ...prev,
      articles: [
        ...prev.articles,
        {
          description: '',
          quantite: 1,
          prix_unitaire: 0,
          montant_ht: 0
        }
      ]
    }));
  };

  const removeArticle = (index: number) => {
    if (index === 0) return; // Ne pas supprimer l'article de transport

    const updatedArticles = [...formData.articles];
    updatedArticles.splice(index, 1);

    setFormData(prev => ({
      ...prev,
      articles: updatedArticles
    }));
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const calculateTotals = () => {
    // Calculer le total HT
    const totalHT = formData.articles.reduce((sum, article) => sum + article.montant_ht, 0);

    // Calculer la TVA (20%)
    const tva = totalHT * 0.2;

    // Calculer le total TTC
    const totalTTC = totalHT + tva;

    return { totalHT, tva, totalTTC };
  };

  const generatePDF = (): { doc: jsPDF, fileName: string } => {
    const doc = new jsPDF();
    const devisNumber = `DEV-${Date.now()}`;
    const { totalHT, tva, totalTTC } = calculateTotals();

    // Logo et informations de l'entreprise
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text('My Truck Transport', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('5 rue des Transports, 75001 Paris', 105, 28, { align: 'center' });
    doc.text('contact@mytruck.fr | +33 1 23 45 67 89', 105, 33, { align: 'center' });

    // Titre du document
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('DEVIS', 105, 45, { align: 'center' });

    // Numéro et date du devis
    doc.setFontSize(10);
    doc.text(`Devis n° ${devisNumber}`, 15, 55);
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 15, 60);
    doc.text(`Validité: 15 jours`, 15, 65);

    // Informations client
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text('Client', 15, 75);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${formData.client.nom_entreprise}`, 15, 82);
    doc.text(`A l'attention de: ${formData.client.nom_contact}`, 15, 87);
    doc.text(`${formData.client.adresse_facturation}`, 15, 92);
    doc.text(`${formData.client.code_postal} ${formData.client.ville}`, 15, 97);
    doc.text(`Tel: ${formData.client.telephone}`, 15, 102);
    if (formData.client.email) {
      doc.text(`Email: ${formData.client.email}`, 15, 107);
    }

    // Informations livraison
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text('Livraison', 120, 75);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Adresse: ${formData.livraison.adresse}`, 120, 82);
    doc.text(`${formData.livraison.code_postal} ${formData.livraison.ville}`, 120, 87);
    doc.text(`Date: ${formData.livraison.date_souhaitee}`, 120, 92);
    doc.text(`Créneau: ${formData.livraison.creneau_horaire}`, 120, 97);
    doc.text(`Étage: ${formData.lieu_livraison.etage}`, 120, 102);
    doc.text(`Ascenseur: ${formData.lieu_livraison.ascenseur ? 'Oui' : 'Non'}`, 120, 107);

    // Détails supplémentaires
    const yStart = 117;
    let y = yStart;

    if (formData.lieu_livraison.acces_difficile) {
      doc.text(`Accès difficile: ${formData.lieu_livraison.details_acces}`, 120, y);
      y += 5;
    }

    if (!formData.lieu_livraison.stationnement_possible) {
      doc.text(`Restrictions stationnement: ${formData.lieu_livraison.restrictions_stationnement}`, 120, y);
      y += 5;
    }

    if (formData.commande.materiel_manutention) {
      doc.text(`Manutention requise`, 120, y);
      y += 5;
    }

    // Tableau des articles
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text('Détail des prestations', 15, 125);

    const tableColumn = ["Description", "Quantité", "Prix unitaire HT (€)", "Total HT (€)"];
    const tableRows = formData.articles.map(article => [
      article.description,
      article.quantite.toString(),
      article.prix_unitaire.toFixed(2),
      article.montant_ht.toFixed(2)
    ]);

    // Ajouter les services supplémentaires
    if (formData.options_livraison.services_supplementaires) {
      if (formData.options_livraison.services_supplementaires.includes('installation')) {
        tableRows.push(['Installation', '1', '30.00', '30.00']);
      }

      if (formData.options_livraison.services_supplementaires.includes('retrait_dechets')) {
        tableRows.push(['Retrait des déchets', '1', '20.00', '20.00']);
      }

      if (formData.options_livraison.services_supplementaires.includes('montage')) {
        tableRows.push(['Montage', '1', '40.00', '40.00']);
      }
    }

    // @ts-ignore
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 130,
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80] },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    });

    // Récupérer la position Y finale du tableau
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable.finalY || 200;

    // Options supplémentaires
    if (formData.options_livraison.type_livraison === 'express') {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Supplément livraison express (+25%)', 120, finalY + 10);
    }

    if (formData.options_livraison.assurance) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Assurance marchandise incluse', 120, finalY + 15);
    }

    // Total
    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);
    doc.text(`Total HT: ${totalHT.toFixed(2)} €`, 150, finalY + 20, { align: 'right' });
    doc.text(`TVA (20%): ${tva.toFixed(2)} €`, 150, finalY + 25, { align: 'right' });
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text(`Total TTC: ${totalTTC.toFixed(2)} €`, 150, finalY + 32, { align: 'right' });

    // Conditions de paiement
    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);
    doc.text('Conditions de paiement', 15, finalY + 45);
    doc.setTextColor(100, 100, 100);
    doc.text('Paiement à 30 jours à compter de la date de réception', 15, finalY + 50);

    // Notes & Remarques
    if (formData.remarques) {
      doc.setFontSize(10);
      doc.setTextColor(44, 62, 80);
      doc.text('Remarques', 15, finalY + 60);
      doc.setTextColor(100, 100, 100);

      // Découper les remarques en lignes
      const remarquesLines = doc.splitTextToSize(formData.remarques, 180);
      doc.text(remarquesLines, 15, finalY + 65);
    }

    // Conditions générales
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Le client reconnaît avoir pris connaissance des conditions générales de vente au verso et déclare les accepter sans réserve.', 15, 265);
    doc.text('My Truck Transport - SAS au capital de 50 000€ - SIRET: 123 456 789 00012 - TVA: FR12 123 456 789', 105, 275, { align: 'center' });

    return { doc, fileName: `devis_${devisNumber}.pdf` };
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Générer le PDF
      const { doc, fileName } = generatePDF();

      // Convertir le PDF en blob
      const pdfBlob = doc.output('blob');

      // Uploader le PDF sur Cloudinary
      const cloudinaryService = new CloudinaryService();
      const uploadResult = await cloudinaryService.uploadFile(pdfBlob, fileName);

      const { totalHT, totalTTC } = calculateTotals();

      // Créer l'objet devis
      const devisInfo = {
        id: `DEV-${Date.now()}`,
        numeroDevis: `DEV-${Date.now()}`,
        dateDevis: new Date().toISOString(),
        dateEcheance: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        montantHT: totalHT,
        montantTTC: totalTTC,
        statut: 'En attente',
        url: uploadResult.url,
        client: formData.client,
        livraison: formData.livraison,
        lieu_livraison: formData.lieu_livraison,
        commande: formData.commande,
        options_livraison: formData.options_livraison,
        articles: formData.articles,
        remarques: formData.remarques
      };

      // Ajouter le devis à la commande
      // if (commande) {
      //   await dataService.addDevisToCommande(commande, {
      //     id: devisInfo.id,
      //     numeroDevis: devisInfo.numeroDevis,
      //     dateDevis: devisInfo.dateDevis,
      //     dateEcheance: devisInfo.dateEcheance,
      //     montantHT: devisInfo.montantHT,
      //     statut: 'En attente'
      //   });
      // }

      // Télécharger le PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pdfUrl);

      // Notifier le parent
      onQuoteGenerated(devisInfo);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la génération du devis:', error);
      setError('Une erreur est survenue lors de la génération du devis. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Composants pour chaque étape du formulaire
  const renderClientInfo = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Informations du client</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l'entreprise / Client <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.client.nom_entreprise}
            onChange={(e) => handleInputChange('client', 'nom_entreprise', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom du contact <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.client.nom_contact}
            onChange={(e) => handleInputChange('client', 'nom_contact', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse de facturation <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.client.adresse_facturation}
            onChange={(e) => handleInputChange('client', 'adresse_facturation', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code postal <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.client.code_postal}
            onChange={(e) => handleInputChange('client', 'code_postal', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ville <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.client.ville}
            onChange={(e) => handleInputChange('client', 'ville', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.client.telephone}
            onChange={(e) => handleInputChange('client', 'telephone', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse e-mail
          </label>
          <input
            type="email"
            value={formData.client.email}
            onChange={(e) => handleInputChange('client', 'email', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>
    </div>
  );

  const renderLivraisonInfo = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Informations sur la livraison</h3>

      <div className="mb-4">
        <label className="flex items-center text-sm mb-2">
          <input
            type="checkbox"
            checked={formData.livraison.adresse === formData.client.adresse_facturation}
            onChange={(e) => {
              if (e.target.checked) {
                handleInputChange('livraison', 'adresse', formData.client.adresse_facturation);
                handleInputChange('livraison', 'code_postal', formData.client.code_postal);
                handleInputChange('livraison', 'ville', formData.client.ville);
              }
            }}
            className="mr-2"
          />
          Adresse de livraison identique à l'adresse de facturation
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse de livraison <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.livraison.adresse}
            onChange={(e) => handleInputChange('livraison', 'adresse', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code postal <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.livraison.code_postal}
            onChange={(e) => handleInputChange('livraison', 'code_postal', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ville <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.livraison.ville}
            onChange={(e) => handleInputChange('livraison', 'ville', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date souhaitée de livraison <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.livraison.date_souhaitee}
            onChange={(e) => handleInputChange('livraison', 'date_souhaitee', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Créneau horaire préféré <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.livraison.creneau_horaire}
            onChange={(e) => handleInputChange('livraison', 'creneau_horaire', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          >
            {CRENEAUX_LIVRAISON.map(creneau => (
              <option key={creneau} value={creneau}>{creneau}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderLieuLivraison = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Détails du lieu de livraison</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Étage de livraison <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.lieu_livraison.etage}
            onChange={(e) => handleInputChange('lieu_livraison', 'etage', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div className="flex items-center">
          <label className="flex items-center text-sm mb-1">
            <input
              type="checkbox"
              checked={formData.lieu_livraison.ascenseur}
              onChange={(e) => handleInputChange('lieu_livraison', 'ascenseur', e.target.checked)}
              className="mr-2"
            />
            Présence d'un ascenseur ou monte-charge ?
          </label>
        </div>

        {formData.lieu_livraison.ascenseur && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimensions de l'ascenseur/monte-charge
            </label>
            <input
              type="text"
              value={formData.lieu_livraison.dimensions_ascenseur || ''}
              onChange={(e) => handleInputChange('lieu_livraison', 'dimensions_ascenseur', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Ex: 120x80x210 cm"
            />
          </div>
        )}

        <div className="flex items-center">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={formData.lieu_livraison.marches_avant_ascenseur}
              onChange={(e) => handleInputChange('lieu_livraison', 'marches_avant_ascenseur', e.target.checked)}
              className="mr-2"
            />
            Y a-t-il des marches ou escaliers avant l'ascenseur ?
          </label>
        </div>

        {formData.lieu_livraison.marches_avant_ascenseur && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de marches ou escaliers
            </label>
            <input
              type="number"
              value={formData.lieu_livraison.nombre_marches || 0}
              onChange={(e) => handleInputChange('lieu_livraison', 'nombre_marches', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              min="0"
            />
          </div>
        )}

        <div className="flex items-center">
          <label className="flex items-center text-sm mb-1">
            <input
              type="checkbox"
              checked={formData.lieu_livraison.stationnement_possible}
              onChange={(e) => handleInputChange('lieu_livraison', 'stationnement_possible', e.target.checked)}
              className="mr-2"
            />
            Possibilité de stationner devant l'adresse de livraison ?
          </label>
        </div>

        {!formData.lieu_livraison.stationnement_possible && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restrictions de stationnement
              </label>
              <input
                type="text"
                value={formData.lieu_livraison.restrictions_stationnement || ''}
                onChange={(e) => handleInputChange('lieu_livraison', 'restrictions_stationnement', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Ex: Stationnement payant, zone piétonne..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distance de stationnement à l'entrée
              </label>
              <input
                type="text"
                value={formData.lieu_livraison.distance_stationnement || ''}
                onChange={(e) => handleInputChange('lieu_livraison', 'distance_stationnement', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Ex: 50 mètres"
              />
            </div>
          </>
        )}

        <div className="flex items-center">
          <label className="flex items-center text-sm mb-1">
            <input
              type="checkbox"
              checked={formData.lieu_livraison.acces_difficile}
              onChange={(e) => handleInputChange('lieu_livraison', 'acces_difficile', e.target.checked)}
              className="mr-2"
            />
            Accès difficile ou obstacles particuliers ?
          </label>
        </div>

        {formData.lieu_livraison.acces_difficile && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Détails de l'accès
            </label>
            <textarea
              value={formData.lieu_livraison.details_acces || ''}
              onChange={(e) => handleInputChange('lieu_livraison', 'details_acces', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              placeholder="Ex: Portail, terrain accidenté, passage étroit..."
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderCommandeDetails = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Détails de la commande</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de produits <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.commande.type_produits[0]}
            onChange={(e) => handleInputChange('commande', 'type_produits', [e.target.value])}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          >
            <option value="Plantes">Plantes</option>
            <option value="Arbres">Arbres</option>
            <option value="Meubles">Meubles</option>
            <option value="Matériaux">Matériaux</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantité <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.commande.quantite}
            onChange={(e) => handleInputChange('commande', 'quantite', parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            min="1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Poids total estimé (kg)
          </label>
          <input
            type="number"
            value={formData.commande.poids_total || ''}
            onChange={(e) => handleInputChange('commande', 'poids_total', parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dimensions estimées
          </label>
          <input
            type="text"
            value={formData.commande.dimensions || ''}
            onChange={(e) => handleInputChange('commande', 'dimensions', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Ex: 120x80x210 cm"
          />
        </div>

        <div className="flex items-center">
          <label className="flex items-center text-sm mb-1">
            <input
              type="checkbox"
              checked={formData.commande.materiel_manutention}
              onChange={(e) => handleInputChange('commande', 'materiel_manutention', e.target.checked)}
              className="mr-2"
            />
            Besoin de matériel de manutention spécifique ?
          </label>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conditions de livraison particulières
          </label>
          <textarea
            value={formData.commande.conditions_particulieres || ''}
            onChange={(e) => handleInputChange('commande', 'conditions_particulieres', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            rows={3}
            placeholder="Précisions sur la livraison, conditions spéciales..."
          />
        </div>
      </div>
    </div>
  );

  const renderOptionsLivraison = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Options de livraison</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de livraison <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center text-sm">
              <input
                type="radio"
                checked={formData.options_livraison.type_livraison === 'standard'}
                onChange={() => handleInputChange('options_livraison', 'type_livraison', 'standard')}
                className="mr-2"
              />
              Standard
            </label>
            <label className="flex items-center text-sm">
              <input
                type="radio"
                checked={formData.options_livraison.type_livraison === 'express'}
                onChange={() => handleInputChange('options_livraison', 'type_livraison', 'express')}
                className="mr-2"
              />
              Express (+25%)
            </label>
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex items-center text-sm mb-1">
            <input
              type="checkbox"
              checked={formData.options_livraison.assurance}
              onChange={(e) => handleInputChange('options_livraison', 'assurance', e.target.checked)}
              className="mr-2"
            />
            Assurance de la marchandise (+5%)
          </label>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Services supplémentaires
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.options_livraison.services_supplementaires?.includes('installation')}
                onChange={(e) => {
                  const current = formData.options_livraison.services_supplementaires || [];
                  if (e.target.checked) {
                    handleInputChange('options_livraison', 'services_supplementaires', [...current, 'installation']);
                  } else {
                    handleInputChange(
                      'options_livraison',
                      'services_supplementaires',
                      current.filter(service => service !== 'installation')
                    );
                  }
                }}
                className="mr-2"
              />
              Installation (+30€)
            </label>

            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.options_livraison.services_supplementaires?.includes('retrait_dechets')}
                onChange={(e) => {
                  const current = formData.options_livraison.services_supplementaires || [];
                  if (e.target.checked) {
                    handleInputChange('options_livraison', 'services_supplementaires', [...current, 'retrait_dechets']);
                  } else {
                    handleInputChange(
                      'options_livraison',
                      'services_supplementaires',
                      current.filter(service => service !== 'retrait_dechets')
                    );
                  }
                }}
                className="mr-2"
              />
              Retrait des déchets (+20€)
            </label>

            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.options_livraison.services_supplementaires?.includes('montage')}
                onChange={(e) => {
                  const current = formData.options_livraison.services_supplementaires || [];
                  if (e.target.checked) {
                    handleInputChange('options_livraison', 'services_supplementaires', [...current, 'montage']);
                  } else {
                    handleInputChange(
                      'options_livraison',
                      'services_supplementaires',
                      current.filter(service => service !== 'montage')
                    );
                  }
                }}
                className="mr-2"
              />
              Montage (+40€)
            </label>
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarques supplémentaires
          </label>
          <textarea
            value={formData.remarques || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, remarques: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            rows={3}
            placeholder="Autres informations ou demandes particulières..."
          />
        </div>
      </div>

      {/* Tableau des articles */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-lg">Détail des prestations</h3>
          <button
            type="button"
            onClick={addArticle}
            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unitaire (€)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total HT (€)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formData.articles.map((article, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <input
                      type="text"
                      value={article.description}
                      onChange={(e) => handleArticleChange(index, 'description', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-1"
                      disabled={index === 0} // Désactiver l'édition pour l'article de transport
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <input
                      type="number"
                      value={article.quantite}
                      onChange={(e) => handleArticleChange(index, 'quantite', parseInt(e.target.value))}
                      className="w-20 border border-gray-300 rounded-md px-3 py-1"
                      min="1"
                      disabled={index === 0} // Désactiver l'édition pour l'article de transport
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <input
                      type="number"
                      value={article.prix_unitaire}
                      onChange={(e) => handleArticleChange(index, 'prix_unitaire', parseFloat(e.target.value))}
                      className="w-24 border border-gray-300 rounded-md px-3 py-1"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {article.montant_ht.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeArticle(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right font-medium">Total HT</td>
                <td className="px-4 py-2 font-medium">{calculateTotals().totalHT.toFixed(2)} €</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right font-medium">TVA (20%)</td>
                <td className="px-4 py-2 font-medium">{calculateTotals().tva.toFixed(2)} €</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right font-medium">Total TTC</td>
                <td className="px-4 py-2 font-medium">{calculateTotals().totalTTC.toFixed(2)} €</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  // Barre de progression
  const renderProgressBar = () => {
    const steps = [
      'Client',
      'Livraison',
      'Lieu',
      'Commande',
      'Options'
    ];

    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex-1 border-t-4 ${index + 1 <= currentStep ? 'border-red-600' : 'border-gray-200'}`}
            >
              <div className="text-center mt-2 text-sm">
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg p-6 max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-6">Génération de devis détaillé</h2>

      {/* Messages d'erreur */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Barre de progression */}
      {renderProgressBar()}

      {/* Contenu du formulaire */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 1 && renderClientInfo()}
          {currentStep === 2 && renderLivraisonInfo()}
          {currentStep === 3 && renderLieuLivraison()}
          {currentStep === 4 && renderCommandeDetails()}
          {currentStep === 5 && renderOptionsLivraison()}
        </motion.div>
      </AnimatePresence>

      {/* Boutons de navigation */}
      <div className="mt-8 flex justify-between">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2 border border-gray-300 rounded-md flex items-center"
            disabled={loading}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Précédent
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md"
            disabled={loading}
          >
            Annuler
          </button>
        )}

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center"
            disabled={loading}
          >
            Suivant
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Génération...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-1" />
                Générer le devis
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default DetailedQuoteForm;