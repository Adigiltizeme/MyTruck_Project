import { NavLink } from 'react-router-dom';
import { HomeIcon, DeliveryIcon, DriverIcon, ProfileIcon } from './icons/NavIcons';
import { useAuth } from '../contexts/AuthContext';

const MessageIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
  </svg>
);

const Navigation = () => {
  const { user } = useAuth();

  const navItems = [
    { icon: HomeIcon, text: 'Dashboard', path: '/', roles: ['admin', 'magasin', 'chauffeur'] },
    { icon: DeliveryIcon, text: 'Livraisons', path: '/deliveries', roles: ['admin', 'magasin', 'chauffeur'] },
    { icon: DriverIcon, text: 'Chauffeurs', path: '/drivers', roles: ['admin'] },
    { icon: MessageIcon, text: 'Mes Messages', path: '/mes-messages', roles: ['magasin'] },
    { icon: ProfileIcon, text: 'Profil', path: '/profile', roles: ['admin', 'magasin', 'chauffeur'] }
  ].filter(item => item.roles.includes(user?.role || ''));

  return (
    <nav className="flex flex-col bg-white w-64 h-screen shadow-lg">
      <div className="p-4">
        <img
          src="/myTruckLogo.jpg"
          alt="My Truck"
          className="h-12 w-auto"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 space-y-1">
          {navItems.map(({ icon: Icon, text, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                ${isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                }`
              }
            >
              <Icon />
              <span className="ml-3">{text}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;