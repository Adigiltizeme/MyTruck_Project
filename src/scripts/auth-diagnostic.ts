const API_URL = 'http://localhost:3000/api/v1';

class AuthDiagnostic {
  constructor() {
    this.results = {
      backend: {
        api_accessible: false,
        health_status: 'unknown',
        auth_endpoints: {
          login: false,
          profile: false,
          users: false
        }
      },
      frontend: {
        localstorage_state: {
          has_token: false,
          token_valid: false,
          has_user_data: false,
          user_data_valid: false
        }
      },
      test_accounts: {
        admin_login: false,
        migrated_user_login: false
      }
    };
  }

  async runCompleteDiagnostic() {
    console.log('🔍 Démarrage diagnostic authentification...\n');

    try {
      // Test backend
      await this.testBackend();

      // Test frontend (localStorage)
      this.testFrontendState();

      // Test comptes
      await this.testAccounts();

      // Afficher rapport
      this.displayReport();

    } catch (error) {
      console.error('❌ Erreur diagnostic:', error);
    }
  }

  async testBackend() {
    console.log('🔧 Test Backend API...');

    try {
      // Test de santé
      const healthResponse = await fetch(`${API_URL}/health`);
      if (healthResponse.ok) {
        this.results.backend.api_accessible = true;
        this.results.backend.health_status = 'OK';
        console.log('✅ API accessible');
      }
    } catch (error) {
      console.error('❌ API inaccessible:', error.message);
      return;
    }

    // Test endpoint login
    try {
      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test', password: 'test' })
      });

      // Endpoint accessible si on obtient une réponse (même erreur)
      this.results.backend.auth_endpoints.login = true;
      console.log('✅ Endpoint /auth/login accessible');

    } catch (error) {
      console.warn('⚠️ Endpoint /auth/login non accessible');
    }

    // Test endpoint profile
    try {
      const profileResponse = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      // Si on obtient 401, l'endpoint existe
      this.results.backend.auth_endpoints.profile = profileResponse.status === 401;
      console.log('✅ Endpoint /auth/profile accessible');

    } catch (error) {
      console.warn('⚠️ Endpoint /auth/profile non accessible');
    }

    // Test endpoint users
    try {
      const usersResponse = await fetch(`${API_URL}/users`);
      this.results.backend.auth_endpoints.users =
        usersResponse.status === 401 || usersResponse.status === 200;
      console.log('✅ Endpoint /users accessible');

    } catch (error) {
      console.warn('⚠️ Endpoint /users non accessible');
    }

    console.log();
  }

  testFrontendState() {
    console.log('🎨 Test État Frontend...');

    // Simuler localStorage dans Node.js si nécessaire
    if (typeof localStorage === 'undefined') {
      console.log('⚠️ localStorage non disponible (environnement Node.js)');
      console.log('✅ Test frontend nécessite un navigateur');
      console.log();
      return;
    }

    // Test localStorage
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');

    this.results.frontend.localstorage_state.has_token = !!token;
    this.results.frontend.localstorage_state.has_user_data = !!userData;

    if (token) {
      this.results.frontend.localstorage_state.token_valid = this.isValidJWT(token);
      console.log(`✅ Token présent: ${token.substring(0, 20)}...`);
    } else {
      console.log('❌ Aucun token en localStorage');
    }

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        this.results.frontend.localstorage_state.user_data_valid =
          !!(parsed.id && parsed.email && parsed.role);
        console.log(`✅ User data présent: ${parsed.email}`);
      } catch {
        console.log('❌ User data invalide en localStorage');
      }
    } else {
      console.log('❌ Aucune user data en localStorage');
    }

    console.log();
  }

  async testAccounts() {
    console.log('👤 Test Comptes Utilisateur...');

    if (!this.results.backend.api_accessible) {
      console.log('⚠️ Backend inaccessible, impossible de tester les comptes');
      return;
    }

    // Test compte admin
    try {
      const adminResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mytruck.com',
          password: 'MyTruck2024!'
        })
      });

      if (adminResponse.ok) {
        const data = await adminResponse.json();
        this.results.test_accounts.admin_login = !!(data.access_token && data.user);
        console.log('✅ Compte admin fonctionnel');
      } else {
        const error = await adminResponse.json().catch(() => ({}));
        console.log(`❌ Échec connexion admin: ${error.message || adminResponse.status}`);
      }

    } catch (error) {
      console.error('❌ Erreur test admin:', error.message);
    }

    // Test compte migré (récupérer avec token admin)
    if (this.results.test_accounts.admin_login) {
      try {
        // Récupérer token admin
        const adminLoginResponse = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@mytruck.com',
            password: 'MyTruck2024!'
          })
        });

        const adminData = await adminLoginResponse.json();
        const adminToken = adminData.access_token;

        // Récupérer liste utilisateurs
        const usersResponse = await fetch(`${API_URL}/users`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (usersResponse.ok) {
          const users = await usersResponse.json();
          const migratedUser = users.find(u =>
            u.airtable_id && u.email !== 'admin@mytruck.com'
          );

          if (migratedUser) {
            // Tester connexion utilisateur migré
            const migratedResponse = await fetch(`${API_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: migratedUser.email,
                password: 'MyTruck2024!'
              })
            });

            if (migratedResponse.ok) {
              this.results.test_accounts.migrated_user_login = true;
              console.log(`✅ Compte migré fonctionnel (${migratedUser.email})`);
            } else {
              console.log(`❌ Échec connexion compte migré (${migratedUser.email})`);
            }
          } else {
            console.log('⚠️ Aucun compte migré trouvé');
          }
        }

      } catch (error) {
        console.error('❌ Erreur test compte migré:', error.message);
      }
    }

    console.log();
  }

  isValidJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Décoder le payload
      const payload = JSON.parse(atob(parts[1]));

      // Vérifier les champs obligatoires
      if (!payload.sub || !payload.exp || !payload.iat) return false;

      // Vérifier expiration
      const now = Date.now() / 1000;
      if (payload.exp < now) return false;

      return true;

    } catch {
      return false;
    }
  }

  displayReport() {
    console.log('\n🔍 ========== RAPPORT DIAGNOSTIC AUTH ==========\n');

    // État Backend
    console.log('🔧 BACKEND:');
    console.log(`   API accessible: ${this.results.backend.api_accessible ? '✅' : '❌'}`);
    console.log(`   Santé: ${this.results.backend.health_status}`);

    const endpointsOK = Object.values(this.results.backend.auth_endpoints).filter(Boolean).length;
    console.log(`   Endpoints auth: ${endpointsOK}/3 OK`);

    // État Frontend
    console.log('\n🎨 FRONTEND:');
    console.log(`   Token présent: ${this.results.frontend.localstorage_state.has_token ? '✅' : '❌'}`);
    console.log(`   Token valide: ${this.results.frontend.localstorage_state.token_valid ? '✅' : '❌'}`);
    console.log(`   User data présent: ${this.results.frontend.localstorage_state.has_user_data ? '✅' : '❌'}`);
    console.log(`   User data valide: ${this.results.frontend.localstorage_state.user_data_valid ? '✅' : '❌'}`);

    // Comptes test
    console.log('\n👤 COMPTES TEST:');
    console.log(`   Admin login: ${this.results.test_accounts.admin_login ? '✅' : '❌'}`);
    console.log(`   User migré login: ${this.results.test_accounts.migrated_user_login ? '✅' : '❌'}`);

    // Diagnostic global
    const issues = this.identifyIssues();
    if (issues.length === 0) {
      console.log('\n🎉 AUTHENTIFICATION FONCTIONNELLE !');
    } else {
      console.log('\n⚠️ PROBLÈMES IDENTIFIÉS:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    // Solutions
    console.log('\n💡 ACTIONS RECOMMANDÉES:');
    const fixes = this.suggestFixes();
    fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });

    console.log('\n============================================\n');
  }

  identifyIssues() {
    const issues = [];

    if (!this.results.backend.api_accessible) {
      issues.push('Backend API inaccessible');
    }

    if (!this.results.backend.auth_endpoints.login) {
      issues.push('Endpoint /auth/login non fonctionnel');
    }

    if (!this.results.test_accounts.admin_login) {
      issues.push('Connexion compte admin échoue');
    }

    if (this.results.frontend.localstorage_state.has_token &&
      !this.results.frontend.localstorage_state.token_valid) {
      issues.push('Token localStorage invalide ou expiré');
    }

    return issues;
  }

  suggestFixes() {
    const fixes = [];

    if (!this.results.backend.api_accessible) {
      fixes.push('Démarrer le backend: cd my-truck-api && npm run start:dev');
    }

    if (!this.results.test_accounts.admin_login) {
      fixes.push('Vérifier/recréer le compte admin en base');
      fixes.push('Vérifier le hachage des mots de passe');
    }

    if (this.results.frontend.localstorage_state.has_token &&
      !this.results.frontend.localstorage_state.token_valid) {
      fixes.push('Nettoyer localStorage dans le navigateur');
      fixes.push('Forcer une nouvelle connexion');
    }

    if (this.results.backend.api_accessible && this.results.test_accounts.admin_login) {
      fixes.push('Problème probablement côté frontend - mettre à jour AuthContext');
    }

    return fixes;
  }
}

// Exécution
async function main() {
  const diagnostic = new AuthDiagnostic();
  await diagnostic.runCompleteDiagnostic();
}

main().catch(console.error);