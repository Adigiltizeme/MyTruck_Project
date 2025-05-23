import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Charger le thème depuis localStorage ou utiliser 'light' par défaut
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme');
        return (savedTheme === 'dark' ? 'dark' : 'light') as Theme;
    });

    // Appliquer le thème au document au chargement et à chaque changement
    useEffect(() => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.classList.add('bg-gray-900', 'text-white');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('bg-gray-900', 'text-white');
        }
        localStorage.setItem('theme', theme);
      }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};