import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { runtimeCaching } from './src/pwa/cache-routes.ts'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
      workbox: {
        globIgnores: ['library-runtime/**'],
        cleanupOutdatedCaches: true,
        runtimeCaching,
      },
      manifest: {
        name: 'RED:REPEAT',
        short_name: 'RED:REPEAT',
        description: 'A focused archive for returning to songs.',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#f4f1ea',
        background_color: '#f4f1ea',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
