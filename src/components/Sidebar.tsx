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
  ArrowsRightLeftIcon,
  ClockIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  MapIcon
} from '@heroicons/react/24/outline';
import { Clock, LogOutIcon, MessageCircleIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SlotsManagement } from './admin/SlotsManagement';
import { useOffline } from '../contexts/OfflineContext';
import { isAdminRole } from '../utils/role-helpers';
import { useState, useEffect } from 'react';
import { normalizeMagasin, normalizeChauffeur } from '../utils/data-normalization';
import { useUnreadCounts } from '../hooks/useUnreadCounts';
import { UnreadBadge } from './UnreadBadge';

interface SidebarProps {
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

const Sidebar = ({ onCloseMobile, isMobile }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { dataService } = useOffline();
  const navigate = useNavigate();
  const [displayUserData, setDisplayUserData] = useState<any>(null);
  const { messages: unreadMessages, contacts: unreadContacts } = useUnreadCounts();

  // Charger les données réelles selon le rôle sélectionné
  useEffect(() => {
    const loadDisplayUserData = async () => {
      if (!user) return;

      try {
        if (user.role === 'magasin' && user.storeId) {
          const magasins = await dataService.getMagasins();
          const magasin = magasins.find(m => m.id === user.storeId);
          if (magasin) {
            const normalized = normalizeMagasin(magasin);
            setDisplayUserData({
              name: normalized.name,
              storeName: normalized.name,
              email: normalized.email,
              phone: normalized.phone
            });
          }
        } else if (user.role === 'chauffeur' && user.driverId) {
          const personnel = await dataService.getPersonnel();
          const chauffeur = personnel.find(p => p.id === user.driverId);
          if (chauffeur) {
            const normalized = normalizeChauffeur(chauffeur);
            setDisplayUserData({
              name: normalized.fullName,
              email: normalized.email,
              phone: normalized.telephone
            });
          }
        } else {
          setDisplayUserData(null); // Mode admin normal
        }
      } catch (error) {
        console.error('Erreur chargement données sidebar:', error);
        setDisplayUserData(null);
      }
    };

    loadDisplayUserData();
  }, [user?.role, user?.storeId, user?.driverId, dataService]);

  const baseNavItems = [
    {
      name: 'Accueil',
      icon: HomeIcon,
      href: '/home',
      roles: ['admin', 'magasin', 'chauffeur', 'direction'],
    },
    {
      name: 'Tableau de bord',
      icon: ChartBarIcon,
      href: '/dashboard',
      roles: ['admin', 'magasin', 'chauffeur', 'direction'],
    },
    {
      name: 'Livraisons',
      icon: TruckIcon,
      href: '/deliveries',
      roles: ['admin', 'magasin', 'chauffeur', 'direction'],
    },
    {
      name: 'Cessions Inter-magasins',
      icon: ArrowsRightLeftIcon,
      href: '/cessions',
      roles: ['magasin', 'admin'],
    },
    {
      name: 'Gestion Créneaux',
      icon: ClockIcon,
      href: '/slots',
      roles: ['admin', 'direction']
    },
    {
      name: 'Gestion Chauffeurs',
      icon: UsersIcon,
      href: '/chauffeurs',
      roles: ['admin', 'direction'],
    },
    {
      name: 'Gestion Magasins',
      icon: BuildingStorefrontIcon,
      href: '/magasins',
      roles: ['admin', 'direction'],
    },
    {
      name: 'Gestion Admins',
      icon: UserCircleIcon,
      href: '/admins',
      roles: ['admin', 'direction'],
    },
    {
      name: 'Gestion Clients',
      icon: UsersIcon,
      href: '/clients',
      roles: ['admin', 'magasin', 'direction'],
    },
    {
      name: 'Gestion Contacts',
      icon: ChatBubbleLeftRightIcon,
      href: '/contacts',
      roles: ['admin', 'direction'],
    },
    {
      name: 'Documents',
      icon: DocumentIcon,
      href: '/documents',
      roles: ['admin', 'magasin', 'direction'],
    },
    {
      name: 'Contact My Truck',
      icon: MessageCircleIcon,
      href: '/contact-mytruck',
      roles: ['magasin']
    },
    ...(import.meta.env.DEV ? [{
      name: 'Messagerie Realtime',
      icon: ChatBubbleLeftRightIcon,
      href: '/messagerie',
      roles: ['magasin', 'admin', 'chauffeur', 'direction']
    }] : []),
    {
      name: 'Profil',
      icon: UserCircleIcon,
      href: '/profile',
      roles: ['admin', 'magasin', 'chauffeur', 'direction']
    }
  ];

  if (isAdminRole(user?.role)) {
    baseNavItems.push({
      name: 'Paramètres',
      icon: CogIcon,
      href: '/settings',
      roles: ['admin', 'direction'],
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
    // Déterminer le nombre de notifications pour ce lien
    const getUnreadCount = () => {
      switch (item.href) {
        case '/contacts':
          return unreadContacts;
        case '/contact-mytruck':
          return unreadContacts; // ✅ Contact My Truck utilise compteur contacts
        case '/messagerie':
          return unreadMessages; // ✅ Messagerie Realtime utilise compteur messages
        default:
          return 0;
      }
    };

    const unreadCount = getUnreadCount();

    return (
      <NavLink
        key={item.name}
        to={item.href}
        className={({ isActive }) =>
          `flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-[15px] font-medium rounded-lg transition-colors my-1 relative ${isActive
            ? 'bg-primary text-white'
            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
          }`
        }
        onClick={isMobile ? onCloseMobile : undefined}
      >
        <div className="flex items-center">
          <item.icon className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3`} />
          <span className="truncate">{item.name}</span>
        </div>
        <div className="relative flex-shrink-0 mb-3">
          <UnreadBadge count={unreadCount} />
        </div>
      </NavLink>
    );
  };

  return (
    <div className="flex h-full flex-col bg-white shadow-lg dark:bg-gray-800">
      {/* Logo header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
        <div className="w-28 py-2">
          <button
            onClick={() => { navigate('/home') }}
          >
            <img
              src="/my-truck-logo.jpg"
              alt="My Truck"
              className="h-auto w-full object-contain"
            />
          </button>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {displayUserData?.name ? displayUserData.name.charAt(0).toUpperCase() :
                user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-300">
              {displayUserData?.name || user?.name || 'Utilisateur'}
              {isAdminRole(user?.role) && displayUserData ? ' (test)' : ''}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {isAdminRole(user?.role) && !displayUserData ? 'Administrateur' :
                user?.role === 'magasin' ? `${displayUserData?.storeName || displayUserData?.name || user.storeName || 'Magasin'}` :
                  user?.role === 'chauffeur' ? `Chauffeur` :
                    'Administrateur'
              }
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
          className="flex items-center px-4 py-3 text-[15px] font-medium rounded-lg transition-colors my-1 w-full text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <LogOutIcon className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-300" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;