import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['axetask.png'],
        manifest: {
          name: 'AxeTask Enterprise',
          short_name: 'AxeTask',
          description: 'Gestion de tâches et productivité multi-ventures',
          theme_color: '#090D16',
          background_color: '#090D16',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/axetask.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/axetask.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Allow external tunnels (ngrok, etc.)
      allowedHosts: [
        '127.0.0.1:3000',
        'localhost:3000',
        'unanimatedly-canorous-arya.ngrok-free.dev',
      ],
    },
  };
});
