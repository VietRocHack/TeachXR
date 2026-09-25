import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Local dev only. Production reaches the backend via Firebase Hosting's
    // /api/** rewrite (HTTP) and straight to Cloud Run (WebSocket); see
    // src/lib/api.js and docs/runbook.md.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
