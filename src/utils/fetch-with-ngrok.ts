// Utilitaire pour wraper fetch avec les en-têtes ngrok
export const fetchWithNgrok = (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...options.headers
  };

  return fetch(url, {
    ...options,
    headers
  });
};

// Alias pour garder la compatibilité
export { fetchWithNgrok as ngrokFetch };