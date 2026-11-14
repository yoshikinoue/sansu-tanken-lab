/**
 * vite.config.js - Vite Configuration for 算数探検ラボ
 *
 * Configures:
 * - Development server on port 3000 matching PackageConfigReference & server.js
 * - Host access for tablet / local network testing
 * - API reverse proxy to backend Node server
 * - ESM output bundling to dist/
 */

/** @type {import('vite').UserConfig} */
export default {
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: true
  }
};
