import { db } from './offline-db.service';
import demoCommandesData from '../data/demo-commandes.json';
import demoPersonnelData from '../data/demo-personnel.json';
import demoMagasinsData from '../data/demo-magasins.json';
import { CommandeMetier, PersonnelInfo, MagasinInfo } from '../types/business.types';

// Conversion avec typage explicite
const demoCommandes = demoCommandesData as unknown as CommandeMetier[];
const demoPersonnel = demoPersonnelData as unknown as PersonnelInfo[];
const demoMagasins = demoMagasinsData as unknown as MagasinInfo[];

export async function initDevData() {
    // Vérifier si on a déjà des données
    const commandesCount = await db.commandes.count();
    const personnelCount = await db.personnel.count();
    const magasinsCount = await db.magasins.count();

    // Uniquement initialiser si les tables sont vides
    if (commandesCount === 0) {
        console.log('Initialisation des commandes de démo...');
        await db.commandes.bulkAdd(demoCommandes);
    }

    if (personnelCount === 0) {
        console.log('Initialisation du personnel de démo...');
        await db.personnel.bulkAdd(demoPersonnel);
    }

    if (magasinsCount === 0) {
        console.log('Initialisation des magasins de démo...');
        await db.magasins.bulkAdd(demoMagasins);
    }

    console.log('Base de données dev initialisée avec succès!');
}