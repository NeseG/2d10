import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Depuis Docker : API_PROXY_TARGET=http://back:3000 ; en local : défaut 127.0.0.1:3000
const proxyTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
})
