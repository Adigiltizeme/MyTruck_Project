import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationService } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, logout, updateUserInfo, changePassword } = useAuth();
  const [loginHistory, setLoginHistory] = useState<{ date: Date, device: string }[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.storePhone || ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    // Simuler un historique de connexion
    if (user) {
      setLoginHistory([
        {
          date: user.lastLogin || new Date(),
          device: 'Navigateur Web (Cet appareil)'
        }
      ]);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateInfo = async () => {
    try {
      // Appel à la fonction updateUserInfo du context d'authentification
      // (à implémenter dans AuthContext.tsx)
      await updateUserInfo(userData);
      setIsEditing(false);
      NotificationService.success('Informations mises à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des informations:', error);
      NotificationService.error('Erreur lors de la mise à jour des informations');
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

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      // Appel à la fonction changePassword du context d'authentification
      // (à implémenter dans AuthContext.tsx)
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      NotificationService.success('Mot de passe mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error);
      setPasswordError('Mot de passe actuel incorrect ou erreur serveur');
    }
  };


  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profil</h1>

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
                <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">{user?.name}</p>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">{user?.email}</p>
              </div>
              {user?.storePhone && (
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Téléphone</label>
                  <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">{user?.storePhone}</p>
                </div>
              )}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Rôle</label>
                <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">
                  {user?.role === 'admin' ? 'Administrateur' :
                    user?.role === 'magasin' ? `Magasin (${user.storeName})` :
                      'Chauffeur'}
                </p>
              </div>
              {user?.storeName && (
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Magasin</label>
                  <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">{user.storeName}</p>
                </div>
              )}
              {user?.storeAddress && (
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Adresse</label>
                  <p className="py-2 px-3 border border-gray-300 rounded bg-gray-50">{user.storeAddress}</p>
                </div>
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
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
              />
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