import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  TruckIcon,
  DocumentIcon,
  UsersIcon,
  UserCircleIcon,
  ChartBarIcon,
  CogIcon,
  ShoppingBagIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { LogOutIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

const Sidebar = ({ onCloseMobile, isMobile }: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const baseNavItems = [
    {
      name: 'Accueil',
      icon: HomeIcon,
      href: '/home',
      roles: ['admin', 'magasin', 'chauffeur'],
    },
    {
      name: 'Tableau de bord',
      icon: ChartBarIcon,
      href: '/dashboard',
      roles: ['admin', 'magasin', 'chauffeur'],
    },
    {
      name: 'Livraisons',
      icon: TruckIcon,
      href: '/deliveries',
      roles: ['admin', 'magasin', 'chauffeur'],
    },
    {
      name: 'Cessions',
      icon: ArrowsRightLeftIcon,
      href: '/cessions',
      roles: ['magasin', 'admin'],
    },
    {
      name: 'Chauffeurs',
      icon: UsersIcon,
      href: '/drivers',
      roles: ['admin'],
    },
    {
      name: 'Profil',
      icon: UserCircleIcon,
      href: '/profile',
      roles: ['admin', 'magasin', 'chauffeur']
    }
  ];

  if (user?.role === 'magasin') {
    baseNavItems.push({
      name: 'Commandes',
      icon: ShoppingBagIcon,
      href: '/orders',
      roles: ['magasin'],
    });
  }

  if (user?.role === 'admin') {
    baseNavItems.push({
      name: 'Paramètres',
      icon: CogIcon,
      href: '/settings',
      roles: ['admin'],
    });
  }

  if (user?.role === 'admin') {
    baseNavItems.push({
      name: 'Documents',
      icon: DocumentIcon,
      href: '/documents',
      roles: ['admin'],
    });
  }

  // Filtrer les éléments de navigation selon le rôle de l'utilisateur
  const navItems = baseNavItems.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  // // Ajouter toujours l'élément de profil à la fin
  // const profileItem = {
  //   name: 'Profil',
  //   icon: UserCircleIcon,
  //   href: '/profile',
  //   roles: ['admin', 'magasin', 'chauffeur']
  // };

  const visibleNavItems = [...navItems]; //, profileItem];

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
      navigate('/login');
    }
  };

  const renderNavLink = (item: any) => {
    return (
      <NavLink
        key={item.name}
        to={item.href}
        className={({ isActive }) =>
          `flex items-center px-4 py-3 text-[15px] font-medium rounded-lg transition-colors my-1 ${isActive
            ? 'bg-primary text-white'
            : 'text-gray-700 hover:bg-gray-50'
          }`
        }
        onClick={isMobile ? onCloseMobile : undefined}
      >
        <item.icon className={`h-5 w-5 mr-3 flex-shrink-0`} />
        <span>{item.name}</span>
      </NavLink>
    );
  };

  return (
    <div className="flex h-full flex-col bg-white shadow-lg">
      {/* Logo header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
        <div className="w-28 py-2">
          <img
            src="/my-truck-logo.jpg"
            alt="My Truck"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'Utilisateur'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role === 'admin' ? 'Administrateur' :
                user?.role === 'magasin' ? `${user.storeName || 'Magasin'}` :
                  'Chauffeur'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {visibleNavItems.map(renderNavLink)}
        </div>
      </nav>

      {/* Déconnexion */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-3 text-[15px] font-medium rounded-lg transition-colors my-1 w-full text-gray-700 hover:bg-gray-50"
        >
          <LogOutIcon className="h-5 w-5 mr-3 text-gray-500" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;