import React, { useState } from 'react';
import MetricsSection from './components/MetricsSection';
import Filters from './components/Filters';
import { useMetricsData } from '../../hooks/useMetricsData';
import { FilterOptions } from '../../types/metrics';
import { UserRole } from '../../types/dashboard.types';
import Loading from '../../components/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { RoleSelector } from '../../components/RoleSelector';
import DashboardController from '../../components/dashboard/DashboardController';

interface DashboardProps {
    userRole?: UserRole;
    storeId?: string;
}

const Dashboard: React.FC<DashboardProps> = () => {
    const { user } = useAuth();
    
    if (!user) {
        return <div>Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Sélecteur de rôle en mode dev seulement */}
            {import.meta.env.DEV && (
                <div className="mb-6">
                    <RoleSelector />
                </div>
            )}
            
            {/* Dashboard spécifique au rôle */}
            <DashboardController 
                role={user.role as UserRole}
                storeId={user.storeId}
            />
        </div>
    );
};

export default Dashboard;