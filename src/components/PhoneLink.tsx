/**
 * Composant lien téléphone avec menu contextuel
 * Propose plusieurs options : Appel, WhatsApp, SMS, Copier
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createPhoneLink, formatPhoneForLink } from '../utils/contact-links';

interface PhoneLinkProps {
    phone: string;
    className?: string;
    showIcon?: boolean;
}

export default function PhoneLink({ phone, className = '', showIcon = true }: PhoneLinkProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const cleanedPhone = formatPhoneForLink(phone);

    // Calculer position du menu et fermer si clic à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu && buttonRef.current) {
            // Calculer position du bouton
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX
            });
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleCall = () => {
        window.location.href = `tel:${cleanedPhone}`;
        setShowMenu(false);
    };

    const handleWhatsApp = () => {
        // Format international sans le + pour WhatsApp
        const waPhone = cleanedPhone.replace(/\+/g, '');
        window.open(`https://wa.me/${waPhone}`, '_blank');
        setShowMenu(false);
    };

    const handleSMS = () => {
        window.location.href = `sms:${cleanedPhone}`;
        setShowMenu(false);
    };

    const handleShare = async () => {
        // Utiliser le Share API natif pour accéder à TOUTES les apps installées
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Contact',
                    text: `Téléphone : ${phone}`
                    // Pas d'URL car tel: n'est pas supporté par Share API
                });
                setShowMenu(false);
            } catch (err) {
                // L'utilisateur a annulé le partage, ne rien faire
                if ((err as Error).name !== 'AbortError') {
                    console.error('Erreur partage:', err);
                }
            }
        } else {
            alert('⚠️ Le partage n\'est pas disponible sur cet appareil');
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(phone);
            alert('📋 Numéro copié !');
        } catch (err) {
            // Fallback si clipboard API non disponible
            const textArea = document.createElement('textarea');
            textArea.value = phone;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('📋 Numéro copié !');
        }
        setShowMenu(false);
    };

    // Vérifier si Share API est disponible
    const isShareAvailable = typeof navigator !== 'undefined' && navigator.share;

    // Menu contextuel avec options pour tous les appareils (mobile ET desktop)
    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setShowMenu(!showMenu)}
                className={`text-blue-600 hover:text-blue-800 hover:underline font-medium ${className}`}
                title="Options d'appel"
            >
                {showIcon && '📞 '}{phone}
            </button>

            {showMenu && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-50 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                    style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                >
                    <button
                        onClick={handleCall}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center"
                    >
                        <span className="mr-2">📞</span> Appeler
                    </button>
                    <button
                        onClick={handleWhatsApp}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 flex items-center"
                    >
                        <span className="mr-2">💬</span> WhatsApp
                    </button>
                    <button
                        onClick={handleSMS}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center"
                    >
                        <span className="mr-2">✉️</span> SMS
                    </button>

                    {/* Bouton "Autres options" avec Share API */}
                    {isShareAvailable && (
                        <>
                            <hr className="my-1 border-gray-200" />
                            <button
                                onClick={handleShare}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center"
                            >
                                <span className="mr-2">🔗</span> Autres options
                            </button>
                        </>
                    )}

                    <hr className="my-1 border-gray-200" />
                    <button
                        onClick={handleCopy}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                        <span className="mr-2">📋</span> Copier le numéro
                    </button>
                </div>,
                document.body
            )}
        </>
    );
}
