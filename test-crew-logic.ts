/**
 * Test de la nouvelle logique hiérarchique d'équipiers
 */
import { VehicleValidationService } from './src/services/vehicle-validation.service';

interface TestCase {
    name: string;
    articles: { poids?: number; quantite?: number; categories?: string[] }[];
    conditions: any;
    expectedCrew: number;
    expectedLevel: string;
}

const testCases: TestCase[] = [
    // 🔵 NIVEAU 0: Chauffeur seul
    {
        name: "Livraison simple - chauffeur seul",
        articles: [{ poids: 10, quantite: 1 }],
        conditions: { hasElevator: true, floor: 1 },
        expectedCrew: 0,
        expectedLevel: "Chauffeur seul"
    },

    // 🟢 NIVEAU 1: +1 équipier
    {
        name: "Article 30kg-60kg (priorité sur charge totale)",
        articles: [{ poids: 45, quantite: 1 }],
        conditions: { hasElevator: true, floor: 1 },
        expectedCrew: 1,
        expectedLevel: "+1 équipier"
    },
    {
        name: "Charge lourde SANS article ≥30kg",
        articles: [{ poids: 25, quantite: 15 }], // 375kg total, aucun article ≥30kg
        conditions: { hasElevator: true, floor: 1 },
        expectedCrew: 1,
        expectedLevel: "+1 équipier"
    },
    {
        name: "Étage ≥2 + nombreux articles (≥20)",
        articles: [{ poids: 5, quantite: 25 }],
        conditions: { hasElevator: false, floor: 2 },
        expectedCrew: 1,
        expectedLevel: "+1 équipier"
    },
    {
        name: "Nombreux articles AVEC ascenseur",
        articles: [{ poids: 5, quantite: 25 }],
        conditions: { hasElevator: true, floor: 1 },
        expectedCrew: 1,
        expectedLevel: "+1 équipier"
    },
    {
        name: "Rue inaccessible",
        articles: [{ poids: 20, quantite: 2 }],
        conditions: { rueInaccessible: true },
        expectedCrew: 1,
        expectedLevel: "+1 équipier"
    },
    {
        name: "Palette simple (rez-de-chaussée)",
        articles: [{ poids: 20, quantite: 5 }],
        conditions: { paletteComplete: true, floor: 0 },
        expectedCrew: 1,
        expectedLevel: "+1 équipier"
    },
    {
        name: "Distance portage ≥50m",
        articles: [{ poids: 15, quantite: 3 }],
        conditions: { parkingDistance: 60 },
        expectedCrew: 1,
        expectedLevel: "+1 équipier"
    },
    {
        name: "Duplex avec livraison étage",
        articles: [{ poids: 10, quantite: 25 }],
        conditions: { hasElevator: false, floor: 1, isDuplex: true, deliveryToUpperFloor: true }, // floor effectif = 2
        expectedCrew: 1,
        expectedLevel: "+1 équipier"
    },

    // 🟡 NIVEAU 2: +2 équipiers
    {
        name: "Article 60kg-90kg",
        articles: [{ poids: 75, quantite: 1 }],
        conditions: { hasElevator: true, floor: 1 },
        expectedCrew: 2,
        expectedLevel: "+2 équipiers"
    },
    {
        name: "3 étages + 30 plantes sans ascenseur",
        articles: [
            { poids: 5, quantite: 15, categories: ['plante'] },
            { poids: 3, quantite: 20, categories: ['pot', 'terreau'] }
        ],
        conditions: { hasElevator: false, floor: 3 },
        expectedCrew: 2,
        expectedLevel: "+2 équipiers"
    },
    {
        name: "Palette + étage",
        articles: [{ poids: 20, quantite: 5 }],
        conditions: { paletteComplete: true, floor: 2 },
        expectedCrew: 2,
        expectedLevel: "+2 équipiers"
    },
    {
        name: "Gros sujet volumineux",
        articles: [{ poids: 40, quantite: 1 }],
        conditions: { hasLargeVoluminousItems: true },
        expectedCrew: 2,
        expectedLevel: "+2 équipiers"
    },
    {
        name: "Manutention 30-45min",
        articles: [{ poids: 15, quantite: 3 }],
        conditions: { estimatedHandlingTime: 35 },
        expectedCrew: 2,
        expectedLevel: "+2 équipiers"
    },

    // 🔥 NIVEAU 3: Devis obligatoire
    {
        name: "Article ≥90kg",
        articles: [{ poids: 95, quantite: 1 }],
        conditions: { hasElevator: true, floor: 1 },
        expectedCrew: 3,
        expectedLevel: "Devis obligatoire"
    },
    {
        name: "3 étages + 40 plantes sans ascenseur",
        articles: [
            { poids: 5, quantite: 25, categories: ['plante'] },
            { poids: 3, quantite: 20, categories: ['terreau'] }
        ],
        conditions: { hasElevator: false, floor: 3 },
        expectedCrew: 3,
        expectedLevel: "Devis obligatoire"
    },
    {
        name: "Palette + accès compliqué",
        articles: [{ poids: 20, quantite: 5 }],
        conditions: { paletteComplete: true, complexAccess: true },
        expectedCrew: 3,
        expectedLevel: "Devis obligatoire"
    },
    {
        name: "Plusieurs gros sujets volumineux",
        articles: [{ poids: 30, quantite: 2 }],
        conditions: { multipleLargeVoluminousItems: true },
        expectedCrew: 3,
        expectedLevel: "Devis obligatoire"
    },
    {
        name: "Manutention >45min",
        articles: [{ poids: 15, quantite: 10 }],
        conditions: { estimatedHandlingTime: 50 },
        expectedCrew: 3,
        expectedLevel: "Devis obligatoire"
    },

    // 🧪 TESTS SPÉCIAUX - CONDITIONS D'ANNULATION
    {
        name: "CONFLIT: Article 40kg mais charge totale >300kg avec ascenseur",
        articles: [{ poids: 40, quantite: 1 }, { poids: 30, quantite: 10 }], // Article 40kg prend priorité
        conditions: { hasElevator: true, floor: 1 },
        expectedCrew: 1, // Article 30-60kg prioritaire
        expectedLevel: "+1 équipier (priorité article)"
    },
    {
        name: "CONFLIT: Nombreux articles mais étage sans ascenseur",
        articles: [{ poids: 5, quantite: 25 }],
        conditions: { hasElevator: false, floor: 3 }, // Étage + articles combinés
        expectedCrew: 1, // Combinaison étage + articles
        expectedLevel: "+1 équipier (combinaison)"
    },
    {
        name: "CONFLIT: Palette en étage vs simple",
        articles: [{ poids: 20, quantite: 5 }],
        conditions: { paletteComplete: true, floor: 1 }, // Étage > 0
        expectedCrew: 2, // Palette + étage = niveau 2
        expectedLevel: "+2 équipiers (palette + étage)"
    }
];

// Exécuter les tests
console.log('🧪 TESTS DE LA NOUVELLE LOGIQUE HIÉRARCHIQUE D\'ÉQUIPIERS\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
    console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
    
    const result = VehicleValidationService.getRequiredCrewSize(
        testCase.articles, 
        testCase.conditions
    );
    
    const passed = result === testCase.expectedCrew;
    passedTests += passed ? 1 : 0;
    
    console.log(`   Articles: ${JSON.stringify(testCase.articles)}`);
    console.log(`   Conditions: ${JSON.stringify(testCase.conditions)}`);
    console.log(`   Attendu: ${testCase.expectedCrew} équipiers (${testCase.expectedLevel})`);
    console.log(`   Résultat: ${result} équipiers`);
    console.log(`   ${passed ? '✅ RÉUSSI' : '❌ ÉCHEC'}`);
});

console.log(`\n📊 RÉSUMÉ: ${passedTests}/${totalTests} tests réussis`);
console.log(`📈 Taux de réussite: ${Math.round((passedTests/totalTests) * 100)}%`);

if (passedTests === totalTests) {
    console.log('\n🎉 TOUS LES TESTS SONT RÉUSSIS! La nouvelle logique fonctionne correctement.');
} else {
    console.log('\n⚠️ Certains tests ont échoué. Vérification nécessaire.');
}