import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/dashboard.types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    requiresAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles = [],
    requiresAuth = true // Par défaut*
}) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Chargement...</div>;
    }

    if (!requiresAuth) {
        return <>{children}</>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Si des rôles sont spécifiés et que l'utilisateur n'a pas le bon rôle
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;