#!/usr/bin/env node

/**
 * 🎨 GÉNÉRATEUR D'ICÔNES PWA - MY TRUCK
 *
 * Génère les icônes PWA (192x192 et 512x512) à partir du logo officiel My Truck
 * Utilise my-truck-logo.jpg comme source
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcon(size) {
    const logoPath = path.join(__dirname, 'public', 'my-truck-logo.jpg');
    const outputPath = path.join(__dirname, 'public', `icon-${size}x${size}.png`);

    // Vérifier que le logo existe
    if (!fs.existsSync(logoPath)) {
        throw new Error('Logo My Truck introuvable : public/my-truck-logo.jpg');
    }

    // Redimensionner le logo et le convertir en PNG
    await sharp(logoPath)
        .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 } // Fond blanc si nécessaire
        })
        .png()
        .toFile(outputPath);

    console.log(`✅ Icône générée : icon-${size}x${size}.png`);
}

async function main() {
    console.log('🎨 Génération des icônes PWA My Truck...\n');

    // Vérifier que le dossier public existe
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log('📁 Dossier public/ créé\n');
    }

    try {
        // Générer les deux tailles requises
        await generateIcon(192);
        await generateIcon(512);

        console.log('\n🎉 Toutes les icônes ont été générées avec succès !');
        console.log('📍 Emplacement : frontend/public/');
        console.log('\n🔄 Redémarrez le serveur de développement pour appliquer les changements.');
    } catch (error) {
        console.error('❌ Erreur lors de la génération des icônes :', error.message);
        process.exit(1);
    }
}

main();
