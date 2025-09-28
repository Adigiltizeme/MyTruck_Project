import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Header from './Header';
import Sidebar from './Sidebar';
import { AuthStatus } from './AuthStatus';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumbs from './Breadcrumbs';
import DatabaseErrorMonitor from './DatabaseErrorMonitor';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Vérifier si l'utilisateur est connecté
  const isAuthenticated = !!user;

  const isPublicRoute = ['/login', '/signup', '/home'].includes(location.pathname) && !isAuthenticated;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Afficher la sidebar uniquement si l'utilisateur est connecté */}
      {isAuthenticated && (
        <>
          {/* Overlay mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity z-20 lg:hidden"
              onClick={closeSidebar}
            />
          )}

          {/* Sidebar mobile */}
          <div
            className={`
              fixed inset-y-0 left-0 flex flex-col w-64 lg:w-64 transform transition-transform duration-300 ease-in-out z-30
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0
            `}
          >
            {/* Bouton fermer pour mobile */}
            {sidebarOpen && (
              <button
                className="absolute top-4 right-4 lg:hidden"
                onClick={closeSidebar}
                aria-label="Fermer le menu"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </button>
            )}

            <Sidebar
              onCloseMobile={closeSidebar}
              isMobile={!sidebarOpen}
            />
          </div>
        </>
      )}

      {/* Contenu principal */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isAuthenticated ? '' : 'w-full'}`}>
        {isAuthenticated ? (
          <>
            {/* Header mobile pour utilisateurs connectés */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between bg-surface border-b border-theme px-4 py-2">
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Ouvrir le menu"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <div className="w-24"> {/* Logo plus petit pour mobile */}
                  <img
                    src="/my-truck-logo.jpg"
                    alt="My Truck"
                    className="h-auto w-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Header desktop pour utilisateurs connectés */}
            <div className="hidden lg:block">
              <Header />
            </div>
          </>
        ) : (
          /* Header simplifié pour les pages publiques */
          <div className="bg-surface border-b border-theme">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <img
                      src="/my-truck-logo.jpg"
                      alt="My Truck"
                      className="h-10 w-auto"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {location.pathname !== '/login' && (
                    <a
                      href="/login"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                    >
                      Connexion
                    </a>
                  )}
                  {/* {location.pathname !== '/signup' && (
                    <a
                      href="/signup"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Inscription
                    </a>
                  )} */}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenu */}
        <main className="flex-1 overflow-auto bg-theme">
          <div className={`${isPublicRoute ? 'max-w-7xl' : 'max-w-[100%]'} mx-auto py-6 px-4 sm:px-6 lg:px-8`}>
            {isAuthenticated && !isPublicRoute && <Breadcrumbs />}
            <Outlet />
          </div>
        </main>
      </div>
      {user?.role === 'admin' && <DatabaseErrorMonitor />}
    </div>
  );
};

export default Layout;