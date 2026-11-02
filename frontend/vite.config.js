import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/login': 'http://127.0.0.1:8000',
      '/alumnos': 'http://127.0.0.1:8000',
      '/profesores': 'http://127.0.0.1:8000',
      '/directores': 'http://127.0.0.1:8000',
      '/cursos': 'http://127.0.0.1:8000',
      '/certificados': 'http://127.0.0.1:8000',
    }
  }
})
