import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      // Przekierowuje zapytania /socket.io na Twój lokalny backend
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true, // Obsługa WebSocketów dla Socket.io!
      }
    }
  }
})
