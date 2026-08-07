import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [],
    },
  },
  server: {
    open: true,   // Auto-opens browser on start
    host: true,   // Exposes Network URL too
    port: 5173,
  },
})