import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001, // Pour éviter les conflits avec le backend sur 3000
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // eslint-disable-next-line no-console
            console.log('Erreur de proxy:', err);
          });
          proxy.on('proxyReq', (_, req) => {
            // eslint-disable-next-line no-console
            console.log('Requête envoyée:', req.method, req.url);
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});