/**
 * Composant lien adresse avec menu contextuel
 * Propose plusieurs options : Google Maps, Waze, Apple Maps, Copier
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatAddressForNavigation } from '../utils/contact-links';

interface AddressLinkProps {
    address: string;
    city?: string;
    postalCode?: string;
    className?: string;
    showIcon?: boolean;
}

export default function AddressLink({
    address,
    city,
    postalCode,
    className = '',
    showIcon = true
}: AddressLinkProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const formattedAddress = formatAddressForNavigation(address, city, postalCode);

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

    const handleGoogleMaps = () => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${formattedAddress}`, '_blank');
        setShowMenu(false);
    };

    const handleWaze = () => {
        window.open(`https://waze.com/ul?q=${formattedAddress}&navigate=yes`, '_blank');
        setShowMenu(false);
    };

    const handleAppleMaps = () => {
        // iOS détecte automatiquement et ouvre Apple Maps
        window.open(`http://maps.apple.com/?q=${formattedAddress}`, '_blank');
        setShowMenu(false);
    };

    const handleShare = async () => {
        const fullAddress = [address, postalCode, city].filter(Boolean).join(', ');
        // Utiliser le Share API natif pour accéder à TOUTES les apps installées
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Adresse de navigation',
                    text: fullAddress,
                    url: `https://www.google.com/maps/search/?api=1&query=${formattedAddress}`
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
        const fullAddress = [address, postalCode, city].filter(Boolean).join(', ');
        try {
            await navigator.clipboard.writeText(fullAddress);
            alert('📋 Adresse copiée !');
        } catch (err) {
            // Fallback si clipboard API non disponible
            const textArea = document.createElement('textarea');
            textArea.value = fullAddress;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('📋 Adresse copiée !');
        }
        setShowMenu(false);
    };

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    // Vérifier si Share API est disponible
    const isShareAvailable = typeof navigator !== 'undefined' && navigator.share;

    // Menu contextuel avec options pour tous les appareils (mobile ET desktop)
    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setShowMenu(!showMenu)}
                className={`text-green-600 hover:text-green-800 hover:underline font-medium ${className}`}
                title="Options de navigation"
            >
                {showIcon && '📍 '}{address}
            </button>

            {showMenu && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-50 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                    style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                >
                    <button
                        onClick={handleGoogleMaps}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center"
                    >
                        <span className="mr-2">🗺️</span> Google Maps
                    </button>
                    <button
                        onClick={handleWaze}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center"
                    >
                        <span className="mr-2">🚗</span> Waze
                    </button>
                    {isIOS && (
                        <button
                            onClick={handleAppleMaps}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center"
                        >
                            <span className="mr-2">🍎</span> Apple Maps
                        </button>
                    )}

                    {/* Bouton "Autres options" avec Share API */}
                    {isShareAvailable && (
                        <>
                            <hr className="my-1 border-gray-200" />
                            <button
                                onClick={handleShare}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 flex items-center"
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
                        <span className="mr-2">📋</span> Copier l'adresse
                    </button>
                </div>,
                document.body
            )}
        </>
    );
}
