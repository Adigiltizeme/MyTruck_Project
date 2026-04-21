/**
 * Parser le message structuré d'un contact de type DEVIS
 * Extrait les données client, articles, livraison et dates
 * ✅ Supporte aussi les CESSIONS INTER-MAGASINS
 */
export const parseContactMessage = (message: string) => {
  const data: any = {
    articles: { dimensions: [] },
    livraison: { conditionsSpeciales: {} },
    dates: {},
    magasin: {}
  };

  // ✅ Parser MAGASIN DESTINATAIRE (pour cessions)
  const magasinDestinataireMatch = message.match(/=== MAGASIN DESTINATAIRE \(DEMANDEUR\) ===\n([\s\S]*?)(?:\n===|$)/);
  if (magasinDestinataireMatch) {
    const magasinSection = magasinDestinataireMatch[1];

    const nomMatch = magasinSection.match(/Nom\s*:\s*(.+)/);
    const enseigneMatch = magasinSection.match(/Enseigne\s*:\s*(.+)/);
    const adresseMatch = magasinSection.match(/Adresse\s*:\s*(.+)/);
    const telMatch = magasinSection.match(/Téléphone\s*:\s*(.+)/);
    const managerMatch = magasinSection.match(/Responsable\s*:\s*(.+)/);

    data.magasinDestinataire = {
      nom: nomMatch?.[1]?.trim(),
      enseigne: enseigneMatch?.[1]?.trim(),
      adresse: adresseMatch?.[1]?.trim(),
      telephone: telMatch?.[1]?.trim(),
      manager: managerMatch?.[1]?.trim()
    };
  }

  // ✅ Parser MAGASIN D'ORIGINE (pour cessions)
  const magasinOrigineMatch = message.match(/=== MAGASIN CÉDANT ===\n([\s\S]*?)(?:\n===|$)/);
  if (magasinOrigineMatch) {
    const magasinSection = magasinOrigineMatch[1];
    const nomMatch = magasinSection.match(/Nom\s*:\s*(.+)/);
    const enseigneMatch = magasinSection.match(/Enseigne\s*:\s*(.+)/);
    const adresseMatch = magasinSection.match(/Adresse\s*:\s*(.+)/);
    const telMatch = magasinSection.match(/Téléphone\s*:\s*(.+)/);
    const managerMatch = magasinSection.match(/Responsable\s*:\s*(.+)/);

    data.magasinOrigine = {
      nom: nomMatch?.[1].trim(),
      enseigne: enseigneMatch?.[1].trim(),
      adresse: adresseMatch?.[1].trim(),
      telephone: telMatch?.[1].trim(),
      manager: managerMatch?.[1].trim()
    };
  }

  // Parser CLIENT (pour commandes classiques)
  const clientMatch = message.match(/=== CLIENT ===\n([\s\S]*?)(?:\n===|$)/);
  if (clientMatch) {
    const clientSection = clientMatch[1];
    const nomMatch = clientSection.match(/Nom\s*:\s*(.+)/);
    const telMatch = clientSection.match(/Téléphone\s*:\s*(.+)/);
    const adresseMatch = clientSection.match(/Adresse\s*:\s*(.+)/);
    const etageMatch = clientSection.match(/Étage\s*:\s*(.+)/);
    const interphoneMatch = clientSection.match(/Interphone\s*:\s*(.+)/);
    const ascenseurMatch = clientSection.match(/Ascenseur\s*:\s*(.+)/);

    // ✅ N'initialiser client QUE si section CLIENT existe
    data.client = { adresse: {}, telephone: {} };

    if (nomMatch) {
      const fullName = nomMatch[1].trim();
      const nameParts = fullName.split(' ');
      data.client.nom = nameParts[0];
      data.client.prenom = nameParts.slice(1).join(' ') || '';
    }
    if (telMatch) data.client.telephone = { principal: telMatch[1].trim() };
    if (adresseMatch) {
      data.client.adresse = { ligne1: adresseMatch[1].trim() };
      // Toujours inclure l'étage (même si 0)
      if (etageMatch) {
        const etageValue = etageMatch[1].trim();
        if (etageValue !== 'Aucun') {
          data.client.adresse.etage = etageValue === '0' ? 0 : parseInt(etageValue);
        }
      }
    }
    // Toujours inclure le code d'accès/interphone (obligatoire dans le formulaire)
    if (interphoneMatch) {
      data.client.adresse.interphone = interphoneMatch[1].trim();
    }
    if (ascenseurMatch) {
      data.client.ascenseur = ascenseurMatch[1].trim().toLowerCase() === 'oui';
    }
  }

  // Parser ARTICLES
  const articlesMatch = message.match(/=== ARTICLES ===\n([\s\S]*?)(?:\n===|$)/);
  if (articlesMatch) {
    const articlesSection = articlesMatch[1];
    const nombreMatch = articlesSection.match(/Nombre total d'articles\s*:\s*(\d+)/);
    if (nombreMatch) data.articles.nombre = parseInt(nombreMatch[1]);

    // Parser "autres articles"
    const autresArticlesMatch = articlesSection.match(/Autres articles[^:]*:\s*(\d+)/);
    if (autresArticlesMatch) {
      data.articles.autresArticles = parseInt(autresArticlesMatch[1]);
    }

    // Parser dimensions des articles avec nouveau format
    // Format: "1. 📦 [Article le plus grand] Comm (x1) - L:150cm l:150cm H:100cm - Poids: 100kg"
    const dimensionRegex = /\d+\.\s*(?:📦|⚖️)\s*\[.*?\]\s*(.+?)\s*\(x(\d+)\)\s*(?:-\s*L:(\d+)cm)?\s*(?:l:(\d+)cm)?\s*(?:H:(\d+)cm)?\s*(?:-\s*Poids:\s*(\d+(?:\.\d+)?)kg)?/g;
    let match;
    while ((match = dimensionRegex.exec(articlesSection)) !== null) {
      // ✅ CORRECTION : Si le nom est "(Non renseigné)", le transformer en chaîne vide
      const articleName = match[1].trim();
      data.articles.dimensions.push({
        nom: articleName === '(Non renseigné)' ? '' : articleName,
        quantite: parseInt(match[2]),
        longueur: match[3] ? parseInt(match[3]) : undefined,
        largeur: match[4] ? parseInt(match[4]) : undefined,
        hauteur: match[5] ? parseInt(match[5]) : undefined,
        poids: match[6] ? parseFloat(match[6]) : undefined,
      });
    }
  }

  // Parser LIVRAISON
  const livraisonMatch = message.match(/=== LIVRAISON ===\n([\s\S]*?)(?:\n===|$)/);
  if (livraisonMatch) {
    const livraisonSection = livraisonMatch[1];
    // Utiliser regex case-insensitive et flexible pour gérer accents et apostrophes
    const dateMatch = livraisonSection.match(/Date souhait.+?\s*:\s*(.+)/i);
    const creneauMatch = livraisonSection.match(/Cr.neau souhait.+?\s*:\s*(.+)/i);
    // ✅ CORRECTION : Chercher "Type de véhicule" OU "Véhicule" (comme le backend)
    const vehiculeMatch = livraisonSection.match(/(?:Type de )?[Vv].hicule\s*:\s*(.+)/i);
    const equipiersMatch = livraisonSection.match(/Nombre d.+?quipiers\s*:\s*(\d+)/i);
    const conditionsMatch = livraisonSection.match(/Conditions sp.ciales\s*:\s*(.+)/i);

    if (dateMatch) data.dates.livraison = dateMatch[1].trim();
    if (creneauMatch) data.livraison.creneau = creneauMatch[1].trim();
    if (vehiculeMatch) data.livraison.vehicule = vehiculeMatch[1].trim();
    if (equipiersMatch) data.livraison.equipiers = parseInt(equipiersMatch[1]);

    // Parser conditions spéciales (peut contenir plusieurs conditions séparées par virgule)
    if (conditionsMatch) {
      const conditions = conditionsMatch[1].trim();
      data.livraison.conditionsSpeciales = {};

      // Palette complète
      if (conditions.toLowerCase().includes('palette')) {
        data.livraison.conditionsSpeciales.paletteComplete = true;
      }
      // Montage requis
      if (conditions.toLowerCase().includes('montage')) {
        data.livraison.conditionsSpeciales.montageInstallation = true;
      }
      // Rue inaccessible
      if (conditions.toLowerCase().includes('rue inaccessible') || conditions.toLowerCase().includes('inaccessible')) {
        data.livraison.conditionsSpeciales.rueInaccessible = true;
      }
      // Appartement duplex
      if (conditions.toLowerCase().includes('duplex') || conditions.toLowerCase().includes('étages')) {
        data.livraison.conditionsSpeciales.appartementDuplex = true;
      }
    }
  }

  // Parser MAGASIN
  const magasinMatch = message.match(/=== MAGASIN ===\n([\s\S]*?)(?:\n===|$)/);
  if (magasinMatch) {
    const magasinSection = magasinMatch[1];
    const nomMatch = magasinSection.match(/Magasin\s*:\s*(.+)/);
    const adresseMatch = magasinSection.match(/Adresse\s*:\s*(.+)/);
    const telMatch = magasinSection.match(/Téléphone\s*:\s*(.+)/);

    if (nomMatch) data.magasin.nom = nomMatch[1].trim();
    if (adresseMatch) data.magasin.adresse = adresseMatch[1].trim();
    if (telMatch) data.magasin.telephone = telMatch[1].trim();
  }

  return data;
};
