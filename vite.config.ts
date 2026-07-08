/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { THEME_COLORS } from './src/constants/theme'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_NAME = 'AlexCart'

export default defineConfig({
  base: `/${REPO_NAME}/`,
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'dev.html'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
          { src: `/${REPO_NAME}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // Take control of open tabs immediately on update instead of waiting for a
        // second reload - during active development a stale SW can otherwise keep
        // serving an old, broken bundle indefinitely on an installed PWA.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
