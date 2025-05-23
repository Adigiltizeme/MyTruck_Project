import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    timestamp: Date;
    link?: string;
    linkText?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MAX_NOTIFICATIONS = 50; // Limite pour éviter une liste trop longue

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const saved = localStorage.getItem('notifications');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? parsed.map(n => ({
                    ...n,
                    timestamp: new Date(n.timestamp)
                })) : [];
            } catch (e) {
                console.error('Erreur lors du chargement des notifications:', e);
                return [];
            }
        }
        return [];
    });

    // Calculer le nombre de notifications non lues
    const unreadCount = notifications.filter(n => !n.read).length;

    // Sauvegarder les notifications dans localStorage à chaque changement
    useEffect(() => {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }, [notifications]);

    // Ajouter une nouvelle notification
    const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: uuidv4(),
            timestamp: new Date(),
            read: false
        };

        setNotifications(prev => {
            // Limiter le nombre de notifications
            const updatedNotifications = [newNotification, ...prev];
            if (updatedNotifications.length > MAX_NOTIFICATIONS) {
                return updatedNotifications.slice(0, MAX_NOTIFICATIONS);
            }
            return updatedNotifications;
        });
    };

    // Marquer une notification comme lue
    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === id ? { ...notification, read: true } : notification
            )
        );
    };

    // Marquer toutes les notifications comme lues
    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(notification => ({ ...notification, read: true }))
        );
    };

    // Supprimer toutes les notifications
    const clearNotifications = () => {
        setNotifications([]);
    };

    // Supprimer une notification spécifique
    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearNotifications,
            removeNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};