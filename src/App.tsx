import { Routes, Route, Navigate } from 'react-router-dom';
import { OfflineProvider, useOffline } from './contexts/OfflineContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries/Deliveries';
import Drivers from './pages/Drivers';
import Profile from './pages/Profile/Profile';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/Home';
import CommandeDetailPage from './pages/Deliveries/CommandeDetailPage';
import DevModeToggle from './components/DevModeToggle';
import { useEffect } from 'react';
import { OptimizedImageCache } from './services/optimized-image-cache.service';
import Dexie from 'dexie';
import { ToastContainer } from 'react-toastify';
import Signup from './pages/Signup';
import SignupSuccess from './pages/SignupSuccess';
import { AuthService } from './services/authService';
import { handleStorageError } from './utils/error-handler';
import { useNotifications } from './contexts/NotificationContext';
import { setNotificationContext } from './services/notificationService';
import 'react-toastify/dist/ReactToastify.css';
import Settings from './pages/settings/settings';
import Cessions from './pages/Deliveries/Cessions';
import DocumentsPage from './pages/documents/documents';
import { DbRepair } from './utils/db-repair';
import { useAuth } from './contexts/AuthContext';
import { MigrationControl } from './components/MigrationControl';
import TestAuth from './components/TestAuth';

const App = () => {

  const { dataService, isOnline } = useOffline();

  const notificationContext = useNotifications();

  const { refreshUserContext } = useAuth();

  // Initialiser le service de notification
  useEffect(() => {
    setNotificationContext(notificationContext);
  }, [notificationContext]);

  // Initialise le service d'authentification
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Charger les utilisateurs depuis la BD locale
        await AuthService.loadUsersFromDB();

        // Si en ligne, synchroniser avec Airtable
        if (isOnline) {
          await AuthService.syncUsers().catch(err => {
            console.warn('Erreur lors de la synchronisation des utilisateurs:', err);
          });
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
      }
    };

    initAuth();
  }, [isOnline]);

  useEffect(() => {
    // Au démarrage de l'application, réparer les relations utilisateur-magasin
    // si nécessaire
    const repairIfNeeded = async () => {
      try {
        // Vérifier s'il y a eu des problèmes récents
        const lastRepair = localStorage.getItem('lastUserStoreRepair');
        const now = Date.now();

        // Ne réparer qu'une fois par jour maximum
        if (!lastRepair || (now - parseInt(lastRepair)) > 24 * 60 * 60 * 1000) {
          const result = await DbRepair.repairUserStoreRelations();
          if (result.fixed > 0) {
            console.log(`Relations utilisateur-magasin réparées: ${result.fixed} corrections`);

            // Rafraîchir le contexte utilisateur si l'utilisateur actuel est affecté
            refreshUserContext();
          }

          // Enregistrer la date de la dernière réparation
          localStorage.setItem('lastUserStoreRepair', now.toString());
        }
      } catch (error) {
        console.error('Erreur lors de la tentative de réparation:', error);
      }
    };

    repairIfNeeded();
  }, []);

  // Fonction de nettoyage des brouillons
  const cleanupBrouillons = async () => {
    try {
      const db = new Dexie('MyTruckDrafts');
      db.version(1).stores({
        drafts: '++id,timestamp,status,storeId'
      });

      // Récupérer tous les brouillons
      const allDrafts = await db.table('drafts').toArray();

      // Pour chaque brouillon, s'assurer que storeId et magasin.id concordent
      for (const draft of allDrafts) {
        let shouldUpdate = false;

        // Si le brouillon n'a pas de storeId mais a un magasin.id interne
        if (!draft.storeId && draft.data?.magasin?.id) {
          draft.storeId = draft.data.magasin.id;
          shouldUpdate = true;
        }

        // Si le brouillon a un storeId mais pas de magasin.id interne cohérent
        if (draft.storeId &&
          (!draft.data?.magasin?.id || draft.data.magasin.id !== draft.storeId)) {

          if (!draft.data) draft.data = {};
          if (!draft.data.magasin) draft.data.magasin = {};

          draft.data.magasin.id = draft.storeId;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await db.table('drafts').update(draft.id, draft);
          console.log(`Brouillon corrigé - ID: ${draft.id}, storeId: ${draft.storeId}`);
        }
      }

      console.log('Nettoyage des brouillons terminé');
    } catch (error) {
      if (!handleStorageError(error)) {
        console.error('Erreur lors du nettoyage des brouillons:', error);
      }
    }
  };

  // Exécuter au démarrage
  cleanupBrouillons();

  // Effet pour nettoyer le cache d'images et lancer la migration automatique
  useEffect(() => {
    const initImageSystem = async () => {
      try {
        // Nettoyer le cache d'images périodiquement
        await OptimizedImageCache.cleanupCache();

        // Lancer la migration automatique des images si en ligne
        if (isOnline) {
          // Exécuter en différé pour ne pas ralentir le chargement initial
          setTimeout(() => {
            if (typeof dataService.migrateAllCommandeImages === 'function') {
              dataService.migrateAllCommandeImages()
                .catch(err => {
                  if (!handleStorageError(err)) {
                    console.error('Erreur lors de la migration des images:', err);
                  }
                });
            } else {
              console.warn('La méthode migrateAllCommandeImages est absente du dataService.');
            }
          }, 5000);
        }
      } catch (error) {
        if (!handleStorageError(error)) {
          console.error('Erreur lors de l\'initialisation du système d\'images:', error);
        }
      }
    };

    initImageSystem();

    // Définir un nettoyage périodique (une fois par jour)
    const cleanupInterval = setInterval(() => {
      OptimizedImageCache.cleanupCache()
        .catch(err => console.error('Erreur lors du nettoyage du cache:', err));
    }, 24 * 60 * 60 * 1000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [isOnline, dataService]);

  return (
    <OfflineProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="/login" element={<Login />} />
            {/* <Route path="/login" element={<TestAuth />} /> */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup-success" element={<SignupSuccess />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute requiresAuth={false}>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliveries"
              element={
                <ProtectedRoute>
                  <Deliveries />
                  <MigrationControl />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commande/:id"
              element={
                <ProtectedRoute>
                  <CommandeDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cessions"
              element={
                <ProtectedRoute allowedRoles={['admin', 'magasin']}>
                  <Cessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drivers"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Drivers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/unauthorized"
              element={
                <div className="flex items-center justify-center h-screen">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-600 mb-4">Accès non autorisé</h1>
                    <p className="mb-4">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
                    <button
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Retour
                    </button>
                  </div>
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
        <OfflineIndicator />
        {import.meta.env.DEV && <DevModeToggle />}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </OfflineProvider>
  );
};

export default App;