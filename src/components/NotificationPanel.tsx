import React, { Fragment } from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';
import { BellIcon, CheckIcon, XMarkIcon, ChatBubbleLeftRightIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { useUnreadCounts } from '../hooks/useUnreadCounts';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';

export const NotificationPanel: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        removeNotification,
        addNotification
    } = useNotifications();
    const { messages: unreadMessages, contacts: unreadContacts, refreshCounts } = useUnreadCounts();

    // Calculer le nombre total de notifications (app + messages + contacts)
    const totalUnreadCount = unreadCount + unreadMessages + unreadContacts;

    // Fonction pour marquer tous les contacts nouveaux comme lus
    const markAllContactsAsRead = async () => {
        if (!user || (user.role !== 'admin' && user.role !== 'magasin')) return;

        try {
            // Récupérer tous les contacts NOUVEAU
            const contactsResponse = await apiService.get('/contacts');
            const contacts = (contactsResponse as { data?: any[] })?.data || [];

            // Filtrer selon le rôle
            const newContacts = contacts.filter(contact => {
                if (contact.statut !== 'NOUVEAU') return false;

                if (user.role === 'admin') {
                    return true; // Les admins voient tous les contacts
                } else if (user.role === 'magasin') {
                    // Les magasins voient seulement leurs propres contacts
                    return contact.magasinId === user.storeId || contact.nomMagasin === user.storeName;
                }
                return false;
            });

            // Marquer chacun comme LU
            for (const contact of newContacts) {
                await apiService.patch(`/contacts/${contact.id}`, { statut: 'LU' });
            }

            // Actualiser les compteurs
            refreshCounts();

            // Ajouter une notification de succès
            addNotification({
                message: `${newContacts.length} contact(s) marqué(s) comme lu(s)`,
                type: 'success'
            });
        } catch (error) {
            console.error('Erreur lors du marquage des contacts:', error);
            addNotification({
                message: 'Erreur lors du marquage des contacts',
                type: 'error'
            });
        }
    };

    // Fonction pour naviguer vers les messages
    const handleMessagesClick = () => {
        navigate('/messagerie');
        addNotification({
            message: 'Redirection vers la messagerie',
            type: 'info'
        });
    };

    // Fonction pour naviguer vers les contacts et marquer comme lus
    const handleContactsClick = async () => {
        if (unreadContacts > 0) {
            await markAllContactsAsRead();
        }

        // Redirection selon le rôle
        if (user?.role === 'admin') {
            navigate('/contacts');
        } else if (user?.role === 'magasin') {
            navigate('/contact-mytruck');
        }

        addNotification({
            message: 'Redirection vers les contacts',
            type: 'info'
        });
    };

    const formatTimestamp = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffDay > 0) {
            return `il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
        }
        if (diffHour > 0) {
            return `il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
        }
        if (diffMin > 0) {
            return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
        }
        return 'à l\'instant';
    };

    const getNotificationIcon = (type: Notification['type']) => {
        const baseClasses = "w-5 h-5";

        switch (type) {
            case 'success':
                return <CheckIcon className={`${baseClasses} text-green-500`} />;
            case 'error':
                return <XMarkIcon className={`${baseClasses} text-red-500`} />;
            case 'warning':
                return (
                    <svg className={`${baseClasses} text-yellow-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'info':
            default:
                return (
                    <svg className={`${baseClasses} text-blue-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    return (
        <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="relative p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                <span className="sr-only">Notifications</span>
                <BellIcon className="h-6 w-6" />
                {totalUnreadCount > 0 && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                )}
            </MenuButton>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <MenuItems className="absolute right-0 mt-2 w-80 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:divide-gray-700">
                    <div className="px-4 py-3 flex justify-between items-center">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Notifications</h3>
                        <div className="flex space-x-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Tout marquer comme lu
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearNotifications}
                                    className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    Effacer tout
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {/* Section messages et contacts non lus */}
                        {(unreadMessages > 0 || unreadContacts > 0) && (
                            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700">
                                <div className="space-y-2">
                                    {unreadMessages > 0 && (
                                        <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 cursor-pointer transition-colors"
                                             onClick={handleMessagesClick}>
                                            <div className="flex items-center space-x-2">
                                                <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-600" />
                                                <span className="text-gray-700 dark:text-gray-300">Messages non lus</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                                                    {unreadMessages}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {unreadContacts > 0 && (user?.role === 'admin' || user?.role === 'magasin') && (
                                        <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-800/30 cursor-pointer transition-colors"
                                             onClick={handleContactsClick}>
                                            <div className="flex items-center space-x-2">
                                                <UsersIcon className="h-4 w-4 text-green-600" />
                                                <span className="text-gray-700 dark:text-gray-300">Nouveaux contacts</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                                                    {unreadContacts}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {notifications.length === 0 && unreadMessages === 0 && unreadContacts === 0 ? (
                            <div className="py-6 px-4 text-center text-gray-500 dark:text-gray-400">
                                <p>Pas de notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`px-4 py-3 flex items-start gap-3 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                            } hover:bg-gray-50 dark:hover:bg-gray-700`}
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {notification.message}
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {formatTimestamp(notification.timestamp)}
                                            </p>
                                            {notification.link && (
                                                <a
                                                    href={notification.link}
                                                    className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                                                >
                                                    {notification.linkText || 'En savoir plus'}
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0 flex flex-col gap-1">
                                            {!notification.read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title="Marquer comme lu"
                                                >
                                                    <CheckIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => removeNotification(notification.id)}
                                                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                                                title="Supprimer"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </MenuItems>
            </Transition>
        </Menu >
    );
};