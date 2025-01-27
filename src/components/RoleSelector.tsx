import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/roles';

export const RoleSelector = () => {
    const { user, setRole } = useAuth();

    return (
        <div className="mb-4 flex items-center gap-4">
            <label className="text-sm font-medium">Rôle test :</label>
            <select
                value={user?.role || 'admin'}
                onChange={(e) => {
                    const role = e.target.value as UserRole;
                    switch (role) {
                        case 'magasin':
                            setRole(role, { storeId: 'recc1nE9KB0WVIuF2' }); // ID de Truffaut Bry
                            break;
                        case 'chauffeur':
                            setRole(role, { driverId: 'recOJXIE0zjz0nqP9' }); // ID d'un chauffeur
                            break;
                        default:
                            setRole('admin');
                    }
                }}
                className="border rounded px-3 py-1"
            >
                <option value="admin">Admin</option>
                <option value="magasin">Magasin</option>
                <option value="chauffeur">Chauffeur</option>
            </select>
            <span className="text-sm text-gray-500">
                {user?.role === 'magasin' && `(Store ID: ${user.storeId})`}
                {user?.role === 'chauffeur' && `(Driver ID: ${user.driverId})`}
            </span>
        </div>
    );
};