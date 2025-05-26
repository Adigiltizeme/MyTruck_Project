import React, { useState } from 'react';
import VehicleSelector from './VehicleSelector';
import { VehicleType } from '../services/vehicle-validation.service';

const VehicleTestComponent: React.FC = () => {
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | ''>('');
    const [selectedCrew, setSelectedCrew] = useState<number>(0);
    const [testData, setTestData] = useState<any>({});

    // Articles de test
    const testArticles = [
        {
            longueur: 150,
            largeur: 80,
            hauteur: 120,
            poids: 25
        },
        {
            longueur: 200,
            largeur: 60,
            hauteur: 180,
            poids: 35
        }
    ];

    const handleVehicleSelect = (vehicleType: VehicleType | '') => {
        console.log("🧪 [TEST] Véhicule sélectionné:", vehicleType);
        setSelectedVehicle(vehicleType);
    };

    const handleCrewSelect = (crewSize: number) => {
        console.log("🧪 [TEST] Équipiers sélectionnés:", crewSize);
        setSelectedCrew(crewSize);
    };

    const handleDeliveryDetailsChange = (details: any) => {
        console.log("🧪 [TEST] Détails de livraison changés:", details);
        setTestData(details);
    };

    // Simuler la sauvegarde
    const handleSave = () => {
        const dataToSave = {
            livraison: {
                vehicule: selectedVehicle,
                equipiers: selectedCrew,
                details: JSON.stringify(testData)
            }
        };

        console.log("🧪 [TEST] Données à sauvegarder:", dataToSave);
        localStorage.setItem('vehicleTest', JSON.stringify(dataToSave));
        alert('Données sauvegardées dans localStorage!');
    };

    // Simuler la restauration
    const handleRestore = () => {
        const saved = localStorage.getItem('vehicleTest');
        if (saved) {
            const data = JSON.parse(saved);
            console.log("🧪 [TEST] Données restaurées:", data);

            setSelectedVehicle(data.livraison?.vehicule || '');
            setSelectedCrew(data.livraison?.equipiers || 0);

            try {
                const details = JSON.parse(data.livraison?.details || '{}');
                setTestData(details);
            } catch (e) {
                console.error("Erreur parsing details:", e);
            }

            alert('Données restaurées!');
        } else {
            alert('Aucune donnée sauvegardée trouvée');
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">🧪 Test VehicleSelector</h1>

            {/* Contrôles de test */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Contrôles de test</h2>
                <div className="space-x-4">
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        💾 Sauvegarder
                    </button>
                    <button
                        onClick={handleRestore}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        🔄 Restaurer
                    </button>
                </div>
            </div>

            {/* État actuel */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">État actuel</h2>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <strong>Véhicule:</strong> <code>{selectedVehicle || 'aucun'}</code>
                    </div>
                    <div>
                        <strong>Équipiers:</strong> <code>{selectedCrew}</code>
                    </div>
                    <div>
                        <strong>Détails:</strong> <code>{JSON.stringify(testData)}</code>
                    </div>
                </div>
            </div>

            {/* VehicleSelector */}
            <div className="border border-gray-200 rounded-lg p-4">
                <VehicleSelector
                    articles={testArticles}
                    onVehicleSelect={handleVehicleSelect}
                    onCrewSelect={handleCrewSelect}
                    onDeliveryDetailsChange={handleDeliveryDetailsChange}
                    initialVehicle={selectedVehicle as VehicleType}
                    initialCrew={selectedCrew}
                    deliveryInfo={testData}
                />
            </div>

            {/* Logs de debug */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">📋 Instructions de test</h2>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Ouvrir la console du navigateur</li>
                    <li>Sélectionner un véhicule dans le composant ci-dessus</li>
                    <li>Vérifier les logs 🧪 [TEST] dans la console</li>
                    <li>Cliquer sur "Sauvegarder"</li>
                    <li>Changer la sélection</li>
                    <li>Cliquer sur "Restaurer"</li>
                    <li>Vérifier que la sélection est restaurée</li>
                </ol>
            </div>
        </div>
    );
};

export default VehicleTestComponent;
