import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  appType: 'spa',
  server: {
    // Bind IPv4 so Chrome on Windows (localhost → 127.0.0.1) can connect
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    port: 4173,
  },
})
