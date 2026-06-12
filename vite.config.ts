import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** 固定开发端口，与 server/src/config.ts、.env.example 保持一致 */
const WEB_PORT = 5173
const API_PORT = 8787

export default defineConfig({
  plugins: [react()],
  server: {
    port: WEB_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
