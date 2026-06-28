import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tptptp/',
  build: { outDir: 'docs' },
  server: {
    fs: {
      allow: [
        '.',
        '/Users/macbook/Documents/apps_tesis/tesis_preparation/data_preparation/data',
      ],
    },
  },
})
