import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy backend in dev so the frontend can use relative URLs
    // (same as production behind nginx).
    proxy: {
      '/ws':      { target: 'ws://localhost:8080',   ws: true },
      '/nodes':   { target: 'http://localhost:8080', changeOrigin: true },
      '/submit':  { target: 'http://localhost:8080', changeOrigin: true },
      '/config':  { target: 'http://localhost:8080', changeOrigin: true },
      '/health':  { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
