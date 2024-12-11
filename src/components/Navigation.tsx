import { NavLink } from 'react-router-dom';
import { HomeIcon, DeliveryIcon, DriverIcon, ProfileIcon } from './icons/NavIcons';

const Navigation = () => {
  const navItems = [
    { icon: HomeIcon, text: 'Dashboard', path: '/' },
    { icon: DeliveryIcon, text: 'Livraisons', path: '/deliveries' },
    { icon: DriverIcon, text: 'Chauffeurs', path: '/drivers' },
    { icon: ProfileIcon, text: 'Profil', path: '/profile' }
  ];

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