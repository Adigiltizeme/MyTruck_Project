import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationService } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api.service';
import { useOffline } from '../../contexts/OfflineContext';
import { normalizeMagasin, normalizeChauffeur } from '../../utils/data-normalization';

const Profile = () => {
  const { user, logout, updateUserInfo, changePassword } = useAuth();
  const { dataService } = useOffline();
  const [loginHistory, setLoginHistory] = useState<{ date: Date, device: string }[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actualUserData, setActualUserData] = useState<any>(null);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  const navigate = useNavigate();

  // 🔄 Fonction pour charger les données utilisateur depuis le backend
  const loadUserData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let actualData = null;

      if (user.role === 'magasin' && user.storeId) {
        // Récupérer les données du magasin depuis l'API
        const magasins = await dataService.getMagasins();
        const magasin = magasins.find(m => m.id === user.storeId);
        
        if (magasin) {
          const normalized = normalizeMagasin(magasin);
          actualData = {
            name: normalized.name,
            email: normalized.email || user.email,
            phone: normalized.phone,
            address: normalized.address,
            manager: normalized.manager,
            status: normalized.status
          };
        }
      } else if (user.role === 'chauffeur' && user.driverId) {
        // Récupérer les données du chauffeur depuis l'API
        const personnel = await dataService.getPersonnel();
        const chauffeur = personnel.find(p => p.id === user.driverId);
        
        if (chauffeur) {
          const normalized = normalizeChauffeur(chauffeur);
          actualData = {
            name: normalized.fullName,
            email: normalized.email || user.email,
            phone: normalized.telephone,
            status: normalized.status,
            role: normalized.role
          };
        }
      } else {
        // Utilisateur admin - données d'origine
        actualData = {
          name: user.name || '',
          email: user.email || '',
          phone: user.storePhone || ''
        };
      }

      if (actualData) {
        setActualUserData(actualData);
        setUserData({
          name: actualData.name,
          email: actualData.email,
          phone: actualData.phone
        });
      }
    } catch (error) {
      console.error('Erreur chargement données profil:', error);
      // Fallback vers les données de base
      setUserData({
        name: user.name || '',
        email: user.email || '',
        phone: user.storePhone || ''
      });
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    loadUserData();
  }, [user?.role, user?.storeId, user?.driverId, dataService]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateInfo = async () => {
    try {
      let endpoint;
      let updateData;

      // ✅ APPROCHE UNIFIÉE : Utiliser /me/profile pour tous les utilisateurs
      console.log('👤 Mise à jour du profil avec endpoint unifié /me/profile...');
      
      try {
        // Endpoint unique pour tous les types d'utilisateurs
        const profileData = {
          name: userData.name,
          email: userData.email,
          phone: userData.phone
        };
        
        await apiService.patch('/me/profile', profileData);
        console.log('✅ Mise à jour du profil réussie !');
        
        // Mettre à jour le contexte utilisateur
        await updateUserInfo(profileData);
        
      } catch (error: any) {
        console.log('❌ Endpoint /me/profile non disponible, tentative avec /auth/me/profile...');
        
        // Fallback : essayer avec préfixe auth
        try {
          const profileData = {
            name: userData.name,
            email: userData.email,
            phone: userData.phone
          };
          
          await apiService.patch('/auth/me/profile', profileData);
          console.log('✅ Mise à jour du profil réussie avec fallback !');
          
          // Mettre à jour le contexte utilisateur
          await updateUserInfo(profileData);
          
        } catch (fallbackError: any) {
          console.error('❌ Tous les endpoints /me/profile ont échoué:', fallbackError.message);
          
          // Message informatif pour le développeur
          const message = `Endpoint requis non implémenté dans le backend.

📋 Endpoints à créer :
• PATCH /api/v1/me/profile  
• OU PATCH /api/v1/auth/me/profile

📝 Format attendu :
{
  "name": "Nom Complet",
  "email": "email@exemple.com", 
  "phone": "0123456789"
}

🔄 Le backend doit :
1. Identifier le type d'utilisateur depuis le token
2. Adapter les champs selon le type :
   - Chauffeur: name → prenom + nom, phone → telephone
   - Magasin: name → nom, phone → telephone  
   - Admin: données directes`;
          
          throw new Error(message);
        }
      }

      // 🔄 Recharger les données actualisées depuis le backend
      await loadUserData();
      
      setIsEditing(false);
      NotificationService.success('Informations mises à jour avec succès');
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      NotificationService.error('Erreur lors de la mise à jour');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');

    // Validation basique
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      // Vérifier si l'utilisateur est toujours authentifié
      if (!user || !user.token) {
        setPasswordError('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      // ✅ APPROCHE UNIFIÉE : Utiliser /me/password pour tous les utilisateurs
      console.log('🔐 Changement de mot de passe avec endpoint unifié /me/password...');
      
      try {
        // Endpoint unique et sécurisé pour tous les utilisateurs
        await apiService.patch('/me/password', {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        });
        
        console.log('✅ Changement de mot de passe réussi !');
        
      } catch (error: any) {
        console.log('❌ Endpoint /me/password non disponible, tentative avec /auth/me/password...');
        
        // Fallback : essayer avec préfixe auth
        try {
          await apiService.patch('/auth/me/password', {
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
          });
          
          console.log('✅ Changement de mot de passe réussi avec fallback !');
          
        } catch (fallbackError: any) {
          console.error('❌ Tous les endpoints /me/* ont échoué:', fallbackError.message);
          
          // Message informatif pour le développeur
          const message = `Endpoint requis non implémenté dans le backend.

📋 Endpoints à créer :
• PATCH /api/v1/me/password
• OU PATCH /api/v1/auth/me/password

📝 Format attendu :
{
  "currentPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe"
}

🔐 Le backend doit :
1. Vérifier l'ancien mot de passe
2. Hasher le nouveau mot de passe  
3. Mettre à jour selon le type d'utilisateur (chauffeur/magasin/admin)`;
          
          throw new Error(message);
        }
      }

      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      NotificationService.success('Mot de passe mis à jour avec succès');
    } catch (error: any) {
      console.error('Erreur changement mot de passe:', error);
      
      if (error.message?.includes('Token invalide') || error.message?.includes('expiré')) {
        setPasswordError('Session expirée. Veuillez vous reconnecter.');
        // Optionnel : rediriger vers la page de connexion
        // window.location.href = '/login';
      } else {
        setPasswordError(error.response?.data?.message || error.message || 'Erreur lors du changement de mot de passe');
      }
    }
  };

  // Fonction pour afficher les changements en attente (pour les développeurs/admins)
  const checkPendingChanges = () => {
    const pendingProfile = localStorage.getItem('pendingProfileUpdate');
    const pendingPassword = localStorage.getItem('pendingPasswordChange');
    
    console.log('📋 Vérification des changements en attente...');
    
    if (pendingProfile) {
      const profileData = JSON.parse(pendingProfile);
      console.log('👤 Profil en attente:', profileData);
    }
    
    if (pendingPassword) {
      const passwordData = JSON.parse(pendingPassword);
      console.log('🔐 Mot de passe en attente:', passwordData);
    }
    
    if (!pendingProfile && !pendingPassword) {
      console.log('✅ Aucun changement en attente');
    }
  };

  // Exposer la fonction de vérification pour le débogage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).checkPendingChanges = checkPendingChanges;
      console.log('🔧 Debug disponible: window.checkPendingChanges()');
    }
  }, []);

  const generateRandomPassword = async () => {
    try {
      const response = await apiService.post('/auth/generate-password', { length: 12 });
      // If your API returns { password: string } in response.data
      const password = (response as { password?: string })?.password ?? (response as any)?.data?.password;
      if (password) {
        setPasswordData(prev => ({
          ...prev,
          newPassword: password,
          confirmPassword: password
        }));
        NotificationService.info('Mot de passe généré automatiquement');
      } else {
        NotificationService.error('Erreur lors de la génération du mot de passe');
      }
    } catch (error) {
      console.error('Erreur génération mot de passe:', error);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Profil {user?.role !== 'admin' ? '' : '(Mode test)'}
      </h1>

      {/* Notification d'état des fonctionnalités */}
      {user?.role === 'chauffeur' && (
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Mode développement :</strong> La modification du profil utilise des endpoints fallback. 
                Vos modifications seront sauvegardées localement en attendant l'implémentation finale.
              </p>
              <button 
                onClick={checkPendingChanges}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Vérifier les modifications en attente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informations de profil */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">Informations personnelles</h2>
        <div className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Nom</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={userData.name}
                  onChange={handleInputChange}
                  className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={userData.email}
                  onChange={handleInputChange}
                  className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">Téléphone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={userData.phone}
                  onChange={handleInputChange}
                  className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={handleUpdateInfo}
                  className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
                >
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Nom</label>
                <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                  {actualUserData?.name || userData.name || 'Non défini'}
                </p>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                  {actualUserData?.email || userData.email || 'Non défini'}
                </p>
              </div>
              {(actualUserData?.phone || userData.phone) && (
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Téléphone</label>
                  <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                    {actualUserData?.phone || userData.phone}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Rôle</label>
                <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                  {user?.role === 'admin' ? 'Administrateur' :
                    user?.role === 'magasin' ? `Magasin` :
                      user?.role === 'chauffeur' ? 'Chauffeur' : 'Non défini'}
                  {user?.role === 'admin' && ' (Mode test)'}
                </p>
              </div>
              {user?.role === 'magasin' && (
                <>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Magasin</label>
                    <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                      {actualUserData?.name || user.storeName || 'Non défini'}
                    </p>
                  </div>
                  {actualUserData?.address && (
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Adresse</label>
                      <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                        {actualUserData.address}
                      </p>
                    </div>
                  )}
                  {actualUserData?.manager && (
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Responsable</label>
                      <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                        {actualUserData.manager}
                      </p>
                    </div>
                  )}
                  {actualUserData?.status && (
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Statut</label>
                      <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                        {actualUserData.status === 'actif' ? '🟢 Actif' :
                         actualUserData.status === 'inactif' ? '🔴 Inactif' : 
                         actualUserData.status === 'maintenance' ? '🟡 Maintenance' : 
                         actualUserData.status}
                      </p>
                    </div>
                  )}
                </>
              )}
              {user?.role === 'chauffeur' && (
                <>
                  {actualUserData?.status && (
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Statut</label>
                      <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                        {actualUserData.status === 'Actif' ? '🟢 Actif' :
                         actualUserData.status === 'Inactif' ? '🔴 Inactif' : 
                         actualUserData.status}
                      </p>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Modifier mes informations
              </button>
            </>
          )}
        </div>
      </div>
      {/* Section de sécurité */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">Sécurité</h2>
        {isChangingPassword ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-gray-700 text-sm font-bold mb-2">
                Mot de passe actuel
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">
                Nouveau mot de passe
              </label>
              <div className="flex space-x-2">
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="flex-1 py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  title="Générer un mot de passe"
                >
                  🎲
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            {passwordError && (
              <div className="text-red-600 text-sm">{passwordError}</div>
            )}

            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleUpdatePassword}
                className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Sauvegarder
              </button>
              <button
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                  setPasswordError('');
                }}
                className="py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Mot de passe</label>
              <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">********</p>
            </div>
            <button
              onClick={() => setIsChangingPassword(true)}
              className="mt-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Modifier le mot de passe
            </button>
          </div>
        )}
      </div>

      {/* Session actives */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 dark:bg-gray-800">
        <h2 className="text-lg font-medium mb-4">Sessions récentes</h2>
        {loginHistory.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {loginHistory.map((session, index) => (
              <li key={index} className="py-3 flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.device}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(session.date).toLocaleString()}
                  </p>
                </div>
                {index === 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Actif
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Aucune session récente</p>
        )}

        <div className="mt-4">
          <button
            onClick={handleLogout}
            className="py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;