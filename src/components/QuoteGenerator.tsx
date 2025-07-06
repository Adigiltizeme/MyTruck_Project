import React, { useState, useEffect } from 'react';
import { CommandeMetier } from '../types/business.types';
// import { useOffline } from '../contexts/OfflineContext';
import { validateCommande } from '../utils/validation.utils';
import { formatPrice } from '../utils/formatters';
import { format as formatDate } from 'date-fns';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CloudinaryService } from '../services/cloudinary.service';
import { TarificationService, TarifResponse } from '../services/tarification.service';
import { Modal } from './Modal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface QuoteGeneratorProps {
    commande: CommandeMetier;
    isOpen: boolean;
    onClose: () => void;
    onQuoteGenerated: (devisInfo: any) => void;
}

const QuoteGenerator: React.FC<QuoteGeneratorProps> = ({
    commande,
    isOpen,
    onClose,
    onQuoteGenerated
}) => {
    // const { dataService } = useOffline();
    const [loading, setLoading] = useState(false);
    const [tarifDetails, setTarifDetails] = useState<TarifResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dateEcheance, setDateEcheance] = useState<string>(
        format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    );
    const [montantHT, setMontantHT] = useState<number>(0);
    const [additionalServices, setAdditionalServices] = useState<Array<{ name: string, price: number }>>([]);
    const [notes, setNotes] = useState<string>('');

    // Vérifier si un devis est nécessaire
    const needsQuote = validateCommande.needsDevis(commande);

    // Calculer le tarif lors du chargement du composant
    useEffect(() => {
        if (isOpen) {
            calculateQuote();
        }
    }, [isOpen]);

    const calculateQuote = async () => {
        try {
            setLoading(true);
            setError(null);

            // Obtenir l'adresse du magasin
            const storeAddress = commande.magasin?.address || '';
            const deliveryAddress = commande.client?.adresse?.ligne1 || '';

            if (!storeAddress || !deliveryAddress) {
                throw new Error('Adresses incomplètes pour le calcul du devis');
            }

            const tarificationService = new TarificationService();
            const tarifResponse = await tarificationService.calculerTarif({
                vehicule: commande.livraison.vehicule,
                adresseMagasin: storeAddress,
                adresseLivraison: deliveryAddress,
                equipiers: commande.livraison.equipiers
            });

            setTarifDetails(tarifResponse);

            // Calculer le montant HT de base
            let basePrice = 0;
            if (typeof tarifResponse.montantHT === 'number') {
                basePrice = tarifResponse.montantHT;
            } else {
                // Si c'est un devis, utiliser une formule spéciale pour le montant
                const vehiclePrice = tarifResponse.detail.vehicule || 0;
                const distancePrice = typeof tarifResponse.detail.distance === 'number' ? tarifResponse.detail.distance : 0;
                const equipePrice = typeof tarifResponse.detail.equipiers === 'number'
                    ? tarifResponse.detail.equipiers
                    : commande.livraison.equipiers * 50; // Prix par défaut par équipier supplémentaire

                basePrice = vehiclePrice + distancePrice + equipePrice;

                // Ajouter un supplément pour les devis spéciaux
                if (commande.livraison.equipiers > 2) {
                    basePrice += (commande.livraison.equipiers - 2) * 75; // 75€ par équipier supplémentaire au-delà de 2
                }
            }

            setMontantHT(basePrice);
        } catch (error) {
            console.error('Erreur lors du calcul du devis:', error);
            setError(error instanceof Error ? error.message : 'Erreur lors du calcul du devis');
        } finally {
            setLoading(false);
        }
    };

    const addService = () => {
        setAdditionalServices([...additionalServices, { name: '', price: 0 }]);
    };

    const updateService = (index: number, field: keyof typeof additionalServices[number], value: string | number) => {
        const updatedServices = [...additionalServices];
        updatedServices[index][field] = value as never;
        setAdditionalServices(updatedServices);
    };

    const removeService = (index: number) => {
        setAdditionalServices(additionalServices.filter((_, i) => i !== index));
    };

    const getTotalHT = () => {
        const servicesTotal = additionalServices.reduce((sum, service) => sum + service.price, 0);
        return montantHT + servicesTotal;
    };

    const getTVA = () => {
        return getTotalHT() * 0.2; // TVA 20%
    };

    const getTotalTTC = () => {
        return getTotalHT() + getTVA();
    };

    const generatePDF = () => {
        const doc = new jsPDF();

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
        const devisNumber = `DEV-${new Date().getTime()}`;
        doc.setFontSize(10);
        doc.text(`Devis n° ${devisNumber}`, 15, 55);
        doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 15, 60);
        doc.text(`Validité: ${format(new Date(dateEcheance), 'dd/MM/yyyy')}`, 15, 65);

        // Informations client
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text('Informations client', 15, 75);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Nom: ${commande.client.nom} ${commande.client.prenom}`, 15, 82);
        doc.text(`Adresse: ${commande.client.adresse.ligne1}`, 15, 87);
        doc.text(`Téléphone: ${commande.client.telephone.principal}`, 15, 92);

        // Informations livraison
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text('Informations livraison', 15, 102);

        doc.setFontSize(10);
        doc.text(`Date: ${formatDate(new Date(commande.dates.livraison), 'dd/MM/yyyy')}`, 15, 109);
        doc.text(`Date: ${formatDate(commande.dates.livraison)}`, 15, 109);
        doc.text(`Créneau: ${commande.livraison.creneau}`, 15, 114);
        doc.text(`Véhicule: ${commande.livraison.vehicule}`, 15, 119);
        doc.text(`Équipiers: ${commande.livraison.equipiers}`, 15, 124);

        // Tableau de prestations
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text('Détail des prestations', 15, 134);

        const tableColumn = ["Désignation", "Prix HT (€)"];
        let tableRows = [];

        // Prestations de base
        tableRows.push(["Transport", tarifDetails?.detail.vehicule || 0]);

        if (typeof tarifDetails?.detail.distance === 'number') {
            tableRows.push(["Frais kilométriques", tarifDetails.detail.distance]);
        } else {
            tableRows.push(["Frais kilométriques", "Sur devis"]);
        }

        if (typeof tarifDetails?.detail.equipiers === 'number') {
            tableRows.push(["Équipiers", tarifDetails.detail.equipiers]);
        } else {
            tableRows.push(["Équipiers supplémentaires", commande.livraison.equipiers * 50]);
        }

        // Services additionnels
        additionalServices.forEach(service => {
            tableRows.push([service.name, service.price]);
        });

        // @ts-ignore
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 140,
            theme: 'striped',
            headStyles: { fillColor: [44, 62, 80] },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        // Récupérer la position Y finale du tableau
        // @ts-ignore
        const finalY = (doc as any).lastAutoTable.finalY || 200;

        // Total
        doc.setFontSize(10);
        doc.setTextColor(44, 62, 80);
        doc.text(`Total HT: ${formatPrice(getTotalHT())}`, 150, finalY + 10, { align: 'right' });
        doc.text(`TVA (20%): ${formatPrice(getTVA())}`, 150, finalY + 15, { align: 'right' });
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text(`Total TTC: ${formatPrice(getTotalTTC())}`, 150, finalY + 22, { align: 'right' });

        // Notes
        if (notes) {
            doc.setFontSize(10);
            doc.setTextColor(44, 62, 80);
            doc.text('Notes:', 15, finalY + 35);
            doc.setTextColor(100, 100, 100);
            doc.text(notes, 15, finalY + 40);
        }

        // Conditions
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Conditions générales: Ce devis est valable 15 jours à compter de sa date d\'émission. Paiement à 30 jours après livraison.', 15, 270);

        return {
            doc,
            devisNumber
        };
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            // Générer le PDF
            const { doc, devisNumber } = generatePDF();

            // Enregistrer le PDF comme blob
            const pdfBlob = doc.output('blob');

            // Upload du PDF vers Cloudinary
            const cloudinaryService = new CloudinaryService();
            const uploadResult = await cloudinaryService.uploadFile(pdfBlob, `devis_${devisNumber}.pdf`);

            // Créer l'objet devis
            const devisInfo = {
                numeroDevis: devisNumber,
                dateDevis: new Date().toISOString(),
                dateEcheance: new Date(dateEcheance).toISOString(),
                montantHT: getTotalHT(),
                montantTTC: getTotalTTC(),
                statut: 'En attente',
                url: uploadResult.url,
                notes: notes,
                additionalServices: additionalServices
            };

            // Ajouter le devis à la commande
            // await dataService.addDevisToCommande(commande, {
            //     id: devisInfo.numeroDevis,
            //     numeroDevis: devisNumber,
            //     dateDevis: new Date().toISOString(),
            //     dateEcheance: new Date(dateEcheance).toISOString(),
            //     montantHT: getTotalHT(),
            //     statut: 'En attente'
            // });

            // Télécharger le PDF
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = `devis_${devisNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            onQuoteGenerated(devisInfo);
            onClose();
        } catch (error) {
            console.error('Erreur lors de la génération du devis:', error);
            setError(error instanceof Error ? error.message : 'Erreur lors de la génération du devis');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-6">Générer un devis</h2>

                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="font-semibold text-lg mb-3">Informations client</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-600">Nom:</p>
                                    <p>{commande.client.nom} {commande.client.prenom}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Téléphone:</p>
                                    <p>{commande.client.telephone.principal}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-600">Adresse:</p>
                                    <p>{commande.client.adresse.ligne1}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-semibold text-lg mb-3">Informations livraison</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-600">Date:</p>
                                    <p>{formatDate(commande.dates.livraison)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Créneau:</p>
                                    <p>{commande.livraison.creneau}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Véhicule:</p>
                                    <p>{commande.livraison.vehicule}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Équipiers:</p>
                                    <p>{commande.livraison.equipiers}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-semibold text-lg mb-3">Détails du devis</h3>
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-gray-600 mb-1">Validité du devis</label>
                                        <input
                                            type="date"
                                            value={dateEcheance}
                                            onChange={(e) => setDateEcheance(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-600 mb-1">Montant HT (€)</label>
                                        <input
                                            type="number"
                                            value={montantHT}
                                            onChange={(e) => setMontantHT(Number(e.target.value))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-medium">Services additionnels</h4>
                                        <button
                                            type="button"
                                            onClick={addService}
                                            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm"
                                        >
                                            Ajouter
                                        </button>
                                    </div>

                                    {additionalServices.map((service, index) => (
                                        <div key={index} className="flex items-center gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={service.name}
                                                onChange={(e) => updateService(index, 'name', e.target.value)}
                                                placeholder="Nom du service"
                                                className="flex-grow border border-gray-300 rounded-md px-3 py-2"
                                            />
                                            <input
                                                type="number"
                                                value={service.price}
                                                onChange={(e) => updateService(index, 'price', Number(e.target.value))}
                                                placeholder="Prix"
                                                className="w-24 border border-gray-300 rounded-md px-3 py-2"
                                                min="0"
                                                step="0.01"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeService(index)}
                                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-600 mb-1">Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        rows={3}
                                        placeholder="Conditions particulières, précisions, etc."
                                    />
                                </div>

                                <div className="border-t pt-4 mt-4">
                                    <div className="flex justify-between mb-1">
                                        <span>Total HT:</span>
                                        <span>{formatPrice(getTotalHT())}</span>
                                    </div>
                                    <div className="flex justify-between mb-1">
                                        <span>TVA (20%):</span>
                                        <span>{formatPrice(getTVA())}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                        <span>Total TTC:</span>
                                        <span>{formatPrice(getTotalTTC())}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="px-4 py-2 bg-red-600 text-white rounded-md"
                                disabled={loading}
                            >
                                {loading ? 'Génération...' : 'Générer et envoyer'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default QuoteGenerator;