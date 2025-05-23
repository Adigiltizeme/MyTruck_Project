import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            aria-label={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
            className={`
        relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
        ${isDark ? 'bg-blue-600' : 'bg-gray-200'}
      `}
            onClick={toggleTheme}
        >
            <span className="sr-only">
                {isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
            </span>
            <span
                className={`
          ${isDark ? 'translate-x-6' : 'translate-x-1'}
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
        `}
            >
                {isDark ? (
                    <MoonIcon className="h-4 w-4 text-blue-600" />
                ) : (
                    <SunIcon className="h-4 w-4 text-yellow-500" />
                )}
            </span>
        </button>
    );
};