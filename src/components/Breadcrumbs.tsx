import { useLocation, Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';

const Breadcrumbs = () => {
    const location = useLocation();

    // Mapper les chemins aux noms lisibles
    const pathMap: Record<string, string> = {
        '': 'Accueil',
        'home': 'Accueil',
        'deliveries': 'Livraisons',
        'commande': 'Détail Commande',
        'dashboard': 'Tableau de bord',
        'drivers': 'Chauffeurs',
        'profile': 'Profil',
        'settings': 'Paramètres'
    };

    const paths = location.pathname.split('/').filter(Boolean);

    if (paths.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center space-x-1 text-sm text-gray-500">
                <li>
                    <Link to="/home" className="flex items-center hover:text-gray-700">
                        <HomeIcon className="h-4 w-4 mr-1" />
                        Accueil
                    </Link>
                </li>

                {paths.map((path, index) => {
                    // Ignorer 'home' s'il est le premier élément
                    if (index === 0 && path === 'home') return null;

                    const isLast = index === paths.length - 1;
                    const to = `/${paths.slice(0, index + 1).join('/')}`;
                    const displayName = pathMap[path] || path;

                    return (
                        <li key={path} className="flex items-center">
                            <ChevronRightIcon className="h-4 w-4 mx-1" />
                            {isLast ? (
                                <span aria-current="page" className="font-medium text-gray-900">
                                    {displayName}
                                </span>
                            ) : (
                                <Link to={to} className="hover:text-gray-700">
                                    {displayName}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;