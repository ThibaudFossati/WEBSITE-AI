import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { translateApiPlugin } from './vite.translate-api'

export default defineConfig({
  plugins: [react(), translateApiPlugin()],
})
