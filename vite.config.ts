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
        theme_color: '#171717',
        background_color: '#f4f1ea',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
