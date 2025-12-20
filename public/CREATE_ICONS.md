# Création des Icônes PWA pour My Truck

## Icônes Requises

Vous devez créer 2 icônes PNG avec les dimensions suivantes :

1. **icon-192x192.png** : 192x192 pixels
2. **icon-512x512.png** : 512x512 pixels

## Option 1 : Outils en Ligne (Recommandé)

### Utiliser PWA Asset Generator

Visitez : <https://www.pwabuilder.com/imageGenerator>

1. Uploader votre logo My Truck (format carré recommandé)
2. Le site génère automatiquement toutes les tailles nécessaires
3. Télécharger et placer les fichiers dans `frontend/public/`

### Utiliser RealFaviconGenerator

Visitez : <https://realfavicongenerator.net/>

1. Uploader votre logo
2. Configurer pour PWA
3. Télécharger le package
4. Extraire les fichiers vers `frontend/public/`

## Option 2 : Créer Manuellement (Photoshop/Figma)

### Design Recommandé

**Couleur de fond** : #0066CC (bleu My Truck)
**Logo** : Camion simplifié blanc + texte "MT"
**Padding** : 20% autour du logo

### Étapes Figma

1. Créer un frame 512x512px
2. Fond bleu #0066CC
3. Ajouter icône de camion (ou texte "MT") en blanc
4. Exporter en PNG 512x512
5. Redimensionner à 192x192 pour la petite icône

### Étapes Photoshop

1. Nouveau document 512x512px, 72 DPI
2. Fond uni #0066CC
3. Ajouter votre logo centré
4. Sauvegarder en PNG
5. Image > Taille de l'image > 192x192 pour la petite version

## Option 3 : Temporaire (SVG to PNG)

En attendant les vraies icônes, vous pouvez utiliser favicon.io :
<https://favicon.io/favicon-generator/>

1. Texte : "MT"
2. Background : #0066CC
3. Font : Arial Bold
4. Télécharger
5. Renommer android-chrome-192x192.png → icon-192x192.png
6. Renommer android-chrome-512x512.png → icon-512x512.png

## Vérification

Après création, les fichiers doivent être placés dans :

- `frontend/public/icon-192x192.png`
- `frontend/public/icon-512x512.png`

Puis rebuild l'application : `npm run build`

## Checklist Qualité

- [ ] Format PNG avec transparence (ou fond uni)
- [ ] Dimensions exactes 192x192 et 512x512
- [ ] Taille fichier < 50KB chacun
- [ ] Logo centré avec padding
- [ ] Contraste suffisant (logo visible sur tous fonds)
- [ ] Test sur mobile : icône claire à taille réduite
