import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        filename: 'fresh-ops-sw.js',
        manifestFilename: 'fresh-ops.webmanifest',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'fresh-ops-apple-180.png',
          'fresh-ops-192.png',
          'fresh-ops-512.png',
          'fresh-ops-maskable-512.png',
        ],
        manifest: {
          id: './?app=fresh-electric-ops',
          name: 'إدارة العمليات — مصنع المبرد الصحراوي والميكروويف | فريش إليكتريك',
          short_name: 'Fresh Ops',
          description: 'المنصة الموحدة لإدارة العمليات والتصنيع الرشيق بمصنع المبرد الصحراوي والميكروويف — شركة فريش إليكتريك للأجهزة المنزلية.',
          theme_color: '#B91C1C',
          background_color: '#FAFAF9',
          display: 'standalone',
          orientation: 'any',
          start_url: './?app=fresh-electric-ops',
          scope: './',
          dir: 'rtl',
          lang: 'ar',
          icons: [
            {
              src: 'fresh-ops-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'fresh-ops-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'fresh-ops-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cacheId: 'fresh-electric-ops-hub',
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fresh-ops-google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fresh-ops-gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
