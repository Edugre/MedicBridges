import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/review-ui/',
  server: {
    port: 5173,
    proxy: {
      '/review': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
  },
})
