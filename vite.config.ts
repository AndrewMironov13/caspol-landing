import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // сайт живёт в подпапке репозитория на GitHub Pages
  base: process.env.GH_PAGES ? '/caspol-landing/' : '/',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client'] },
  server: { port: 5185, host: true },
  preview: { port: 5185, host: true },
})
