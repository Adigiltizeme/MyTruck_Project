import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
// import { OfflineProvider } from './contexts/OfflineContext'
import App from './App'
import './styles/Home.css';
import './index.css'
import './styles/themes.css';
import './utils/api-interceptor';

declare global {
  interface Window {
    __WS_TOKEN__?: string;
  }
}
import { ThemeProvider } from './contexts/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { DatabaseManager } from './services/database-manager.service'

if (typeof window.__WS_TOKEN__ === 'undefined') {
  // @ts-ignore
  window.__WS_TOKEN__ = 'dummy_token';
}

DatabaseManager.initialize()
  .then(success => {
    if (success) {
      console.log('Système de base de données initialisé avec succès');
    } else {
      console.warn('Initialisation du système de base de données avec des avertissements');
    }

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            {/* <OfflineProvider> */}
              <ThemeProvider>
                <NotificationProvider>
                  <App />
                </NotificationProvider>
              </ThemeProvider>
            {/* </OfflineProvider> */}
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    );
  })
  .catch(error => {
    console.error('Erreur critique lors de l\'initialisation du système de base de données:', error);

    // Afficher une page d'erreur plutôt que de planter l'application
    document.getElementById('root')!.innerHTML = `
    <div style="padding: 20px; font-family: system-ui, sans-serif;">
      <h1 style="color: #e11d48; margin-bottom: 20px;">Erreur de démarrage</h1>
      <p>Une erreur critique est survenue lors de l'initialisation de l'application.</p>
      <p style="margin-top: 10px; color: #666;">Détails techniques: ${error instanceof Error ? error.message : String(error)}</p>
      <button 
        style="margin-top: 20px; padding: 10px 16px; background-color: #e11d48; color: white; border: none; border-radius: 4px; cursor: pointer;"
        onclick="window.location.reload()"
      >
        Réessayer
      </button>
    </div>
  `;
  });