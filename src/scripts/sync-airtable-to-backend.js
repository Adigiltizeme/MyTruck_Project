import axios from 'axios';
import 'dotenv/config';

class AirtableToBackendSync {
  constructor() {
    this.airtableToken = process.env.VITE_AIRTABLE_TOKEN;
    this.airtableBaseId = process.env.VITE_AIRTABLE_BASE_ID;
    this.backendUrl = 'http://localhost:3000/api/v1';
    this.backendToken = '';
    this.magasinIdMap = new Map(); // Cache pour les magasins

    console.log('🔄 Initialisation synchronisation Airtable → Backend');
  }

  async loginToBackend() {
    try {
      console.log('🔐 Tentative de connexion au Backend...');
      const response = await axios.post(`${this.backendUrl}/auth/login`, {
        email: 'admin@test.com',
        password: 'admin123'
      });

      this.backendToken = response.data.access_token;
      console.log('✅ Connecté au Backend API');
      return true;
    } catch (error) {
      console.error('❌ Erreur connexion Backend:', error.response?.data || error.message);
      return false;
    }
  }

  // 🆕 MAPPER LES CATÉGORIES DE VÉHICULES EXACTES
  mapCategorieVehicule(airtableValue) {
    if (!airtableValue) return null;

    // Mapping exact selon les valeurs acceptées par le Backend
    const vehiculeMap = {
      '3M3': '3M3 (Utilitaire 150kg, 180x125x180cm)',
      '6M3': '6M3 (Camionnette 300kg, 240x169x138cm)',
      '10M3': '10M3 (Camionnette 1000kg, 308x207x176cm)',
      '20M3': '20M3 (Avec hayon 1000kg, 420, 207, 230cm)',

      // Variations possibles d'Airtable
      '1M3': '3M3 (Utilitaire 150kg, 180x125x180cm)', // Fallback vers 3M3
      'UTILITAIRE': '3M3 (Utilitaire 150kg, 180x125x180cm)',
      'CAMIONNETTE': '6M3 (Camionnette 300kg, 240x169x138cm)',
      'AVEC HAYON': '20M3 (Avec hayon 1000kg, 420, 207, 230cm)'
    };

    // Recherche exacte
    if (vehiculeMap[airtableValue]) {
      return vehiculeMap[airtableValue];
    }

    // Recherche partielle (si la valeur contient...)
    const normalizedValue = airtableValue.toUpperCase();
    if (normalizedValue.includes('3M3')) return vehiculeMap['3M3'];
    if (normalizedValue.includes('6M3')) return vehiculeMap['6M3'];
    if (normalizedValue.includes('10M3')) return vehiculeMap['10M3'];
    if (normalizedValue.includes('20M3')) return vehiculeMap['20M3'];
    if (normalizedValue.includes('1M3')) return vehiculeMap['3M3']; // Fallback

    console.warn(`Catégorie véhicule non reconnue: "${airtableValue}", utilisation 3M3 par défaut`);
    return vehiculeMap['3M3']; // Valeur par défaut
  }
  async getOrCreateMagasin(magasinNom) {
    if (!magasinNom || magasinNom === '') {
      // Créer un magasin par défaut
      magasinNom = 'Magasin par défaut';
    }

    // Vérifier le cache
    if (this.magasinIdMap.has(magasinNom)) {
      return this.magasinIdMap.get(magasinNom);
    }

    try {
      // Chercher le magasin existant
      const response = await axios.get(`${this.backendUrl}/magasins`, {
        headers: { 'Authorization': `Bearer ${this.backendToken}` }
      });

      const existingMagasin = response.data.find(m =>
        m.nom.toLowerCase() === magasinNom.toLowerCase()
      );

      if (existingMagasin) {
        this.magasinIdMap.set(magasinNom, existingMagasin.id);
        return existingMagasin.id;
      }

      // Créer un nouveau magasin
      const createResponse = await axios.post(`${this.backendUrl}/magasins`, {
        nom: magasinNom,
        adresse: 'Adresse non spécifiée',
        telephone: '0000000000',
        email: `${magasinNom.toLowerCase().replace(/\s+/g, '')}@example.com`
      }, {
        headers: { 'Authorization': `Bearer ${this.backendToken}` }
      });

      const magasinId = createResponse.data.id;
      this.magasinIdMap.set(magasinNom, magasinId);
      console.log(`✅ Magasin créé: ${magasinNom} (ID: ${magasinId})`);

      return magasinId;
    } catch (error) {
      console.error(`❌ Erreur gestion magasin ${magasinNom}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getAirtableCommandes() {
    try {
      console.log('📦 Récupération des commandes depuis Airtable...');
      const allRecords = [];
      let offset;

      do {
        const url = `https://api.airtable.com/v0/${this.airtableBaseId}/Commandes`;
        const params = { pageSize: 100 };
        if (offset) params.offset = offset;

        const response = await axios.get(url, {
          headers: { 'Authorization': `Bearer ${this.airtableToken}` },
          params
        });

        allRecords.push(...response.data.records);
        offset = response.data.offset;

        console.log(`📦 Récupéré ${response.data.records.length} enregistrements (Total: ${allRecords.length})`);
      } while (offset);

      console.log(`✅ Total commandes Airtable: ${allRecords.length}`);
      return allRecords;
    } catch (error) {
      console.error('❌ Erreur récupération Airtable:', error.response?.data || error.message);
      throw error;
    }
  }

  // 🆕 TRANSFORMATION SELON LE SCHÉMA BACKEND EXACT
  async transformAirtableToBackend(record) {
    const fields = record.fields;

    // 1. Récupérer ou créer le magasin
    const magasinNom = Array.isArray(fields['NOM DU MAGASIN'])
      ? fields['NOM DU MAGASIN'][0]
      : fields['NOM DU MAGASIN'] || 'Magasin par défaut';

    const magasinId = await this.getOrCreateMagasin(magasinNom);

    // 2. Préparer la date de livraison
    let dateLivraison = null;
    if (fields['DATE DE LIVRAISON']) {
      try {
        dateLivraison = new Date(fields['DATE DE LIVRAISON']).toISOString();
      } catch (error) {
        console.warn(`Date de livraison invalide pour ${fields['NUMERO DE COMMANDE']}: ${fields['DATE DE LIVRAISON']}`);
        dateLivraison = new Date().toISOString(); // Date par défaut
      }
    } else {
      dateLivraison = new Date().toISOString(); // Date par défaut
    }

    // 3. Normaliser le type d'adresse
    let typeAdresse = fields['TYPE D\'ADRESSE'];
    if (typeAdresse && !['Domicile', 'Professionnelle'].includes(typeAdresse)) {
      typeAdresse = 'Domicile'; // Valeur par défaut
    }

    // 4. Structure selon le DTO Backend exact
    return {
      // ✅ Champs requis selon CreateCommandeDto
      magasinId: magasinId,
      dateLivraison: dateLivraison,

      // ✅ Champs optionnels
      creneauLivraison: fields['CRENEAU DE LIVRAISON'] || null,
      categorieVehicule: this.mapCategorieVehicule(fields['CATEGORIE DE VEHICULE']),
      optionEquipier: parseInt(fields['OPTION EQUIPIER DE MANUTENTION'] || '0'),
      tarifHT: parseFloat(fields['TARIF HT'] || '0'),
      reserveTransport: fields['RESERVE TRANSPORT'] === 'OUI',
      prenomVendeur: fields['PRENOM DU VENDEUR/INTERLOCUTEUR'] || null,
      // ❌ SUPPRIMER remarques - non supporté par le DTO
      // remarques: fields['AUTRES REMARQUES'] || null,

      // ✅ Client (structure nested selon le DTO)
      client: {
        nom: fields['NOM DU CLIENT'] || '',
        prenom: fields['PRENOM DU CLIENT'] || '',
        telephone: fields['TELEPHONE DU CLIENT'] || '',
        telephoneSecondaire: fields['TELEPHONE DU CLIENT 2'] || null,
        adresseLigne1: fields['ADRESSE DE LIVRAISON'] || '',
        typeAdresse: typeAdresse || 'Domicile',
        batiment: fields['BÂTIMENT'] || null,
        etage: fields['ETAGE'] || null,
        interphone: fields['INTERPHONE/CODE'] || null,
        ascenseur: fields['ASCENSEUR'] === 'Oui'
      },

      // ✅ Articles (structure nested selon le DTO)
      articles: {
        nombre: Math.max(1, parseInt(fields['NOMBRE TOTAL D\'ARTICLES'] || '1')), // Minimum 1
        details: fields['DETAILS SUR LES ARTICLES'] || '',
        categories: [] // Tableau vide par défaut
      }

      // ✅ PAS de chauffeurIds pour l'instant (optionnel)
      // chauffeurIds: []
    };
  }

  async sendCommandeToBackend(commande) {
    try {
      console.log(`📤 Envoi commande pour ${commande.client.nom} ${commande.client.prenom}`);

      const response = await axios.post(`${this.backendUrl}/commandes`, commande, {
        headers: {
          'Authorization': `Bearer ${this.backendToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Commande créée avec ID: ${response.data.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi commande:`, error.response?.data || error.message);

      // Afficher les détails de la commande qui a échoué pour debug
      if (error.response?.status === 400) {
        console.log('📋 Données envoyées:', JSON.stringify(commande, null, 2));
      }

      return false;
    }
  }

  async testConnections() {
    console.log('🧪 Test des connexions...');

    // Test Backend
    try {
      const healthResponse = await axios.get(`${this.backendUrl}/health`);
      console.log('✅ Backend accessible:', healthResponse.data);
    } catch (error) {
      console.error('❌ Backend inaccessible:', error.message);
      return false;
    }

    // Test Airtable
    try {
      const testResponse = await axios.get(
        `https://api.airtable.com/v0/${this.airtableBaseId}/Commandes?maxRecords=1`,
        {
          headers: { 'Authorization': `Bearer ${this.airtableToken}` }
        }
      );
      console.log('✅ Airtable accessible, commandes trouvées:', testResponse.data.records.length);
    } catch (error) {
      console.error('❌ Airtable inaccessible:', error.response?.data || error.message);
      return false;
    }

    return true;
  }

  async syncAll() {
    try {
      console.log('🚀 Début synchronisation Airtable → Backend');

      // 0. Test des connexions
      const connectionsOk = await this.testConnections();
      if (!connectionsOk) {
        throw new Error('Problèmes de connexion détectés');
      }

      // 1. Connexion Backend
      const loginSuccess = await this.loginToBackend();
      if (!loginSuccess) {
        throw new Error('Impossible de se connecter au Backend');
      }

      // 2. Récupération données Airtable
      const airtableRecords = await this.getAirtableCommandes();

      if (airtableRecords.length === 0) {
        console.log('⚠️ Aucune commande trouvée dans Airtable');
        return;
      }

      // 3. Transformation et envoi
      let success = 0;
      let errors = 0;

      console.log(`🔄 Début de l'envoi de ${airtableRecords.length} commandes...`);

      for (let i = 0; i < airtableRecords.length; i++) {
        const record = airtableRecords[i];
        try {
          const transformedCommande = await this.transformAirtableToBackend(record);

          const sendSuccess = await this.sendCommandeToBackend(transformedCommande);
          if (sendSuccess) {
            success++;
          } else {
            errors++;
          }

          // Pause pour éviter de surcharger l'API
          if (i % 3 === 0 && i > 0) {
            console.log(`⏸️ Pause de 2 secondes... (${i + 1}/${airtableRecords.length})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          errors++;
          console.error(`❌ Erreur commande ${record.id}:`, error.message);
        }
      }

      console.log(`🎉 Synchronisation terminée:`);
      console.log(`  ✅ ${success} commandes synchronisées avec succès`);
      console.log(`  ❌ ${errors} erreurs`);
      console.log(`  📊 Taux de réussite: ${Math.round((success / airtableRecords.length) * 100)}%`);

      if (success > 0) {
        console.log(`🔗 Vérifiez les commandes sur: http://localhost:3001/deliveries`);
      }

    } catch (error) {
      console.error('❌ Erreur synchronisation:', error.message);
      throw error;
    }
  }
}

// Fonction principale
async function main() {
  try {
    console.log('🎯 === SYNCHRONISATION AIRTABLE → BACKEND (VERSION CORRIGÉE) ===');
    const sync = new AirtableToBackendSync();
    await sync.syncAll();
    console.log('✅ Script terminé avec succès');
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécution
main();