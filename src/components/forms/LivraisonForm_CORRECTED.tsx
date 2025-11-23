// VOICI LA SECTION CORRIGÉE (lignes 877-899)
// Copiez et collez cette section dans LivraisonForm.tsx aux lignes 877-899

            // Utiliser l'adresse stockée localement OU récupérer la plus récente
            const addressToUse = storeAddress || await getLatestStoreAddress();

            // ✅ Pour une cession, utiliser l'adresse du magasin de destination
            const adresseLivraison = isCession
                ? (data.magasinDestination?.address || data.livraison?.adresse || '')
                : data.client.adresse.ligne1;

            // Log de vérification
            console.log('Calcul du tarif avec les paramètres:', {
                mode: isCession ? '🔄 CESSION' : '📦 COMMANDE',
                vehicule: data.livraison.vehicule,
                adresseMagasin: addressToUse,
                adresseLivraison: adresseLivraison,
                equipiers: data.livraison.equipiers || 0
            });

            const tarif = await tarificationService.calculerTarif({
                vehicule: data.livraison.vehicule as TypeVehicule,
                adresseMagasin: addressToUse,
                adresseLivraison: adresseLivraison,
                equipiers: data.livraison.equipiers || 0
            });
