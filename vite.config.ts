import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'PRIA v10',
        short_name: 'PRIA',
        description: 'Plataforma de Planificación Educativa con IA',
        theme_color: '#3A9E5E',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.minimax/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/steadfast-alignment-production\.up\.railway\.app/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pria-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    exclude: ['@anthropic-akai/sdk'],
    include: ['buffer'],
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  define: {
    // Polyfill for browser environments — buffer package handles Buffer global
    global: 'globalThis',
    'globalThis.global': 'globalThis',
    'process.env': {},
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split pdfjs-dist into its own chunk (1.2MB worker)
          if (id.includes('pdfjs-dist')) return 'pdf-worker';
          // Split promptRunner (LLM orchestration) for better caching
          if (id.includes('promptRunner')) return 'vendor-promptrunner';
          // Vendor chunk for React ecosystem
          if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
        },
      },
    },
  },
})