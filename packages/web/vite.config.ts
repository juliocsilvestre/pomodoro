import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/timer': 'http://localhost:3333',
      '/tasks': 'http://localhost:3333',
      '/sessions': 'http://localhost:3333',
      '/settings': 'http://localhost:3333',
      '/ws': { target: 'ws://localhost:3333', ws: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
