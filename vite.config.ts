import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
    host: true, // 外部からのアクセスを許可
    open: true  // ブラウザを自動で開く
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite']
  },
  worker: {
    format: 'es'
  }
})