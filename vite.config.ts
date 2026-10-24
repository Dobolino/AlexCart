/// <reference types="vitest/config" />
import path from 'node:path'
import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { THEME_COLORS } from './src/constants/theme.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_NAME = 'AlexCart'

export default defineConfig({
  base: `/${REPO_NAME}/`,
  server: { proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } } },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'dev.html'),
    },
  },
  plugins: [
    {
      name: 'alexcart-entry',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (['/', '/AlexCart/', '/AlexCart'].includes(request.url?.split('?')[0] ?? ''))
            request.url = '/AlexCart/dev.html'
          next()
        })
      },
      writeBundle(output) {
        const directory = output.dir ?? path.resolve(__dirname, 'dist')
        copyFileSync(path.join(directory, 'dev.html'), path.join(directory, 'index.html'))
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'AlexShop',
        short_name: 'AlexShop',
        description: 'Einkaufslisten-App mit Wochenplan-Import und Vorrats-Verwaltung',
        lang: 'de',
        theme_color: THEME_COLORS.dark.themeColor,
        background_color: THEME_COLORS.dark.bg,
        display: 'standalone',
        orientation: 'portrait',
        scope: `/${REPO_NAME}/`,
        start_url: `/${REPO_NAME}/`,
        icons: [
          { src: `/${REPO_NAME}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `/${REPO_NAME}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          {
            src: `/${REPO_NAME}/icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,wasm,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'dev.html',
        cleanupOutdatedCaches: true,
        // Keep the active version during a shopping session; update after confirmation.
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/cdn\.jsdelivr\.net\/npm\/(?:tesseract\.js(?:-core)?(?:@[^/]+)?|@tesseract\.js-data)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'alexcart-ocr',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 86400 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
