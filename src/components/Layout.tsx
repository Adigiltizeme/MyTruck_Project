import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
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
          >
            <XMarkIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </button>
        )}
        
        <Sidebar onCloseMobile={closeSidebar} isMobile={!sidebarOpen} />
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header mobile */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-white px-4 py-2 border-b">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
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

        {/* Header desktop */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Contenu */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[90%] mx-auto"> {/* Largeur max du contenu, avant : "max-w-7xl mx-auto" et possible également : "w-full px-6" */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;