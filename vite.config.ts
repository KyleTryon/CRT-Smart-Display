import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/adsb': {
        target: 'https://opendata.adsb.fi/api/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/adsb/, ''),
        secure: true,
        headers: {
          'User-Agent': 'CRT-Smart-Display/1.0',
        },
      },
    },
  },
})
