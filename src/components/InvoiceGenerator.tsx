import React, { useState, useEffect } from 'react';
import { CommandeMetier } from '../types/business.types';
import { useOffline } from '../contexts/OfflineContext';
import { formatPrice } from '../utils/formatters';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CloudinaryService } from '../services/cloudinary.service';
import { Modal } from './Modal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';

interface InvoiceGeneratorProps {
    commande: CommandeMetier;
    isOpen: boolean;
    onClose: () => void;
    onInvoiceGenerated: (factureInfo: any) => void;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
    commande,
    isOpen,
    onClose,
    onInvoiceGenerated
}) => {
    const { dataService } = useOffline();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateFacture, setDateFacture] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [dateEcheance, setDateEcheance] = useState<string>(
        format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    );
    const [montantHT, setMontantHT] = useState<number>(commande.financier?.tarifHT || 0);
    const [additionalItems, setAdditionalItems] = useState<{ description: string; price: number; quantity: number }[]>([]);
    const [notes, setNotes] = useState<string>('');

    // Vérifier si l'utilisateur a les droits d'admin
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (isOpen) {
            // Initialiser le montant HT avec la valeur de la commande
            setMontantHT(commande.financier?.tarifHT || 0);
        }
    }, [isOpen, commande.financier?.tarifHT]);

    // Vérification des autorisations pour générer des factures
    useEffect(() => {
        if (!isAdmin) {
            setError("Vous n'avez pas l'autorisation de générer des factures.");
        }
    }, [isAdmin]);

    const addItem = () => {
        setAdditionalItems([...additionalItems, { description: '', price: 0, quantity: 1 }]);
    };

    const updateItem = (index: number, field: 'description' | 'price' | 'quantity', value: string | number) => {
        const updatedItems = [...additionalItems];
        updatedItems[index][field] = value as never;
        setAdditionalItems(updatedItems);
    };

    const removeItem = (index: number) => {
        setAdditionalItems(additionalItems.filter((_, i) => i !== index));
    };

    const getTotalHT = () => {
        const baseAmount = montantHT || 0;
        const additionalAmount = additionalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return baseAmount + additionalAmount;
    };

    const getTVA = () => {
        return getTotalHT() * 0.2; // TVA 20%
    };

    const getTotalTTC = () => {
        return getTotalHT() + getTVA();
    };

    const generatePDF = (): { doc: jsPDF, factureNumber: string } => {
        const doc = new jsPDF();

        // Logo et informations de l'entreprise
        doc.setFontSize(22);
        doc.setTextColor(44, 62, 80);
        doc.text('My Truck Transport', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('5 rue des Transports, 75001 Paris', 105, 28, { align: 'center' });
        doc.text('contact@mytruck.fr | +33 1 23 45 67 89', 105, 33, { align: 'center' });
        doc.text('SIRET: 123 456 789 00012 | TVA: FR12 123 456 789', 105, 38, { align: 'center' });

        // Titre du document
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('FACTURE', 105, 50, { align: 'center' });

        // Numéro et date de la facture
        const factureNumber = `FAC-${new Date().getTime()}`;
        doc.setFontSize(10);
        doc.text(`Facture n° ${factureNumber}`, 15, 60);
        doc.text(`Date: ${format(new Date(dateFacture), 'dd/MM/yyyy')}`, 15, 65);
        doc.text(`Échéance: ${format(new Date(dateEcheance), 'dd/MM/yyyy')}`, 15, 70);
        doc.text(`Commande n° ${commande.numeroCommande}`, 15, 75);

        // Informations client
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text('Facturé à', 15, 85);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${commande.client.nom} ${commande.client.prenom}`, 15, 92);
        doc.text(`${commande.client.adresse.ligne1}`, 15, 97);
        doc.text(`Téléphone: ${commande.client.telephone.principal}`, 15, 102);

        // Informations livraison
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text('Détails de la livraison', 120, 85);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Date: ${format(new Date(commande.dates.livraison), 'dd/MM/yyyy')}`, 120, 92);
        doc.text(`Créneau: ${commande.livraison.creneau}`, 120, 97);
        doc.text(`Véhicule: ${commande.livraison.vehicule}`, 120, 102);

        // Tableau des articles
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text('Détail des prestations', 15, 115);

        const tableColumn = ["Description", "Quantité", "Prix unitaire HT (€)", "Total HT (€)"];
        let tableRows = [];

        // Prestation de base (transport)
        tableRows.push([
            `Transport (${commande.livraison.vehicule})`,
            "1",
            montantHT.toString(),
            montantHT.toString()
        ]);

        // Articles supplémentaires
        additionalItems.forEach(item => {
            const total = item.price * item.quantity;
            tableRows.push([
                item.description,
                item.quantity.toString(),
                item.price.toString(),
                total.toString()
            ]);
        });

        // @ts-ignore
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 120,
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

        // Conditions de paiement
        doc.setFontSize(10);
        doc.setTextColor(44, 62, 80);
        doc.text('Conditions de paiement', 15, finalY + 35);
        doc.setTextColor(100, 100, 100);
        doc.text('Paiement à 30 jours à compter de la date de facture', 15, finalY + 40);

        // Notes
        if (notes) {
            doc.setFontSize(10);
            doc.setTextColor(44, 62, 80);
            doc.text('Notes:', 15, finalY + 50);
            doc.setTextColor(100, 100, 100);
            doc.text(notes, 15, finalY + 55);
        }

        // Coordonnées bancaires
        doc.setFontSize(10);
        doc.setTextColor(44, 62, 80);
        doc.text('Coordonnées bancaires', 15, finalY + 70);
        doc.setTextColor(100, 100, 100);
        doc.text('IBAN: FR76 1234 5678 9101 1121 3141 5161', 15, finalY + 75);
        doc.text('BIC: ABCDEFGHIJK', 15, finalY + 80);

        // Mentions légales en bas de page
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('My Truck Transport - SAS au capital de 50 000€ - SIRET: 123 456 789 00012 - TVA: FR12 123 456 789', 105, 280, { align: 'center' });

        return {
            doc,
            factureNumber
        };
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            // Vérifier que l'utilisateur est admin
            if (!isAdmin) {
                setError("Vous n'avez pas l'autorisation de générer des factures.");
                return;
            }

            // Générer le PDF
            const { doc, factureNumber } = generatePDF();

            // Enregistrer le PDF comme blob
            const pdfBlob = doc.output('blob');

            // Upload du PDF vers Cloudinary
            const cloudinaryService = new CloudinaryService();
            const uploadResult = await cloudinaryService.uploadFile(pdfBlob, `facture_${factureNumber}.pdf`);

            // Créer l'objet facture
            const factureInfo = {
                id: factureNumber,
                numeroFacture: factureNumber,
                dateFacture: new Date(dateFacture).toISOString(),
                dateEcheance: new Date(dateEcheance).toISOString(),
                montantHT: getTotalHT(),
                statut: 'En attente',
                url: uploadResult.url,
                notes: notes,
                additionalItems: additionalItems
            };

            // Ajouter la facture à la commande via dataService
            await dataService.addFactureToCommande(commande, {
                id: factureNumber,
                numeroFacture: factureNumber,
                dateFacture: new Date(dateFacture).toISOString(),
                dateEcheance: new Date(dateEcheance).toISOString(),
                montantHT: getTotalHT(),
                statut: 'En attente'
            });

            // Télécharger le PDF
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = `facture_${factureNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            onInvoiceGenerated(factureInfo);
            onClose();
        } catch (error) {
            console.error('Erreur lors de la génération de la facture:', error);
            setError(error instanceof Error ? error.message : 'Erreur lors de la génération de la facture');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-6">Générer une facture</h2>

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
                            <h3 className="font-semibold text-lg mb-3">Informations commande</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-600">Numéro de commande:</p>
                                    <p>{commande.numeroCommande}</p>
                                </div>
                                <div>
                                    <p>{format(new Date(commande.dates.livraison), 'dd/MM/yyyy')}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Statut de livraison:</p>
                                    <p>{commande.statuts.livraison}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-semibold text-lg mb-3">Détails de la facture</h3>
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-gray-600 mb-1">Date de facture</label>
                                        <input
                                            type="date"
                                            value={dateFacture}
                                            onChange={(e) => setDateFacture(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-600 mb-1">Date d'échéance</label>
                                        <input
                                            type="date"
                                            value={dateEcheance}
                                            onChange={(e) => setDateEcheance(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            min={dateFacture}
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-gray-600">Montant HT base (€)</label>
                                        <input
                                            type="number"
                                            value={montantHT}
                                            onChange={(e) => setMontantHT(Number(e.target.value))}
                                            className="w-32 border border-gray-300 rounded-md px-3 py-2"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-medium">Lignes additionnelles</h4>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm"
                                        >
                                            Ajouter
                                        </button>
                                    </div>

                                    {additionalItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                placeholder="Description"
                                                className="flex-grow border border-gray-300 rounded-md px-3 py-2"
                                            />
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                placeholder="Qté"
                                                className="w-16 border border-gray-300 rounded-md px-3 py-2"
                                                min="1"
                                                step="1"
                                            />
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                                                placeholder="Prix"
                                                className="w-24 border border-gray-300 rounded-md px-3 py-2"
                                                min="0"
                                                step="0.01"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
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
                                disabled={loading || !isAdmin}
                            >
                                {loading ? 'Génération...' : 'Générer et envoyer'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
export default InvoiceGenerator;