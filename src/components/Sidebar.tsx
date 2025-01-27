import { NavLink } from 'react-router-dom';
import { HomeIcon, TruckIcon, UsersIcon, UserCircleIcon, BeakerIcon, ChartBarIcon, UserIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

const Sidebar = ({ onCloseMobile, isMobile }: SidebarProps) => {
  const navItems = [
    {
      name: 'Home',
      icon: HomeIcon,
      href: '/home',
    },
    {
      name: 'Dashboard',
      icon: ChartBarIcon,
      href: '/dashboard',
    },
    {
      name: 'Livraisons',
      icon: TruckIcon,
      href: '/deliveries',
    },
    {
      name: 'Chauffeurs',
      icon: UsersIcon,
      href: '/drivers',
    },
    {
      name: 'Profil',
      icon: UserCircleIcon,
      href: '/profile',
    },
    {
      name: 'Test Airtable',
      icon: BeakerIcon,
      href: '/test-airtable',
    },
    {
      name: 'Login',
      icon: UserIcon,
      href: '/login',
    }
  ];

  const renderNavLink = (item: typeof navItems[0]) => {
    return (
      <NavLink
        key={item.href}
        to={item.href}
        onClick={() => isMobile && onCloseMobile?.()}
        className={({ isActive }) => 
          `flex items-center px-4 py-3 text-[15px] font-medium rounded-lg transition-colors my-1
          ${isActive ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`
        }
      >
        {({ isActive }) => (
          <>
            <item.icon 
              className={`h-5 w-5 mr-3 ${
                isActive ? 'text-white' : 'text-gray-500'
              }`} 
            />
            <span>{item.name}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
        <div className="w-28 py-2"> {/* Ajout du padding vertical et réduction de la largeur */}
          <img 
            src="/my-truck-logo.jpg" 
            alt="My Truck" 
            className="h-auto w-full object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navItems.map(renderNavLink)}
      </nav>
    </div>
  );
};

export default Sidebar;