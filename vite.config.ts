import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa'

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff,woff2}'],
      },
      manifest: {
        name: 'TheraWay',
        short_name: 'TheraWay',
        description: 'A comprehensive mental health web application connecting clients with therapists and helping therapists find clinic spaces.',
        theme_color: '#15686e',
        background_color: '#FDFBF8',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { "src": "/icons/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
          { "src": "/icons/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
          { "src": "/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
          { "src": "/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
          { "src": "/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
          { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
          { "src": "/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
          { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
        ]
      }
    })
  ],

  // Base path (adjust if deploying to a subdirectory)
  base: '/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Points to the src directory
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps for production
  },

  publicDir: 'public', // Static assets directory
})