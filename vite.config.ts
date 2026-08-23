import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { RELEASES } from './src/release/releases.ts'
import { runtimeCaching } from './src/pwa/cache-routes.ts'

const packageMetadata = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }
const buildSha = process.env.GITHUB_SHA?.trim().slice(0, 12) || 'local'
const buildEnvironment = process.env.GITHUB_ACTIONS === 'true'
  ? 'GitHub Pages'
  : 'local'

function versionProbePlugin(): Plugin {
  return {
    name: 'red-repeat-version-probe',
    apply: 'build',
    generateBundle() {
      const release = RELEASES.find((candidate) => candidate.version === packageMetadata.version)
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({
          version: packageMetadata.version,
          commit: buildSha,
          ...(release ? { release } : {}),
        })}\n`,
      })
    },
  }
}

export default defineConfig({
  define: {
    __RED_REPEAT_VERSION__: JSON.stringify(packageMetadata.version),
    __RED_REPEAT_BUILD_SHA__: JSON.stringify(buildSha),
    __RED_REPEAT_BUILD_ENVIRONMENT__: JSON.stringify(buildEnvironment),
  },
  plugins: [
    react(),
    versionProbePlugin(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
      workbox: {
        clientsClaim: true,
        globIgnores: ['library-runtime/**', 'version.json'],
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
