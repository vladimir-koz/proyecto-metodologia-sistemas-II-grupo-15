import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// En desarrollo, Vite reenvía /api a la API local (opciones 1, 2 o 3 del README).
const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiUrl
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5 todavía usa @import y funciones de color viejas de Sass.
        quietDeps: true,
        silenceDeprecations: ['import']
      }
    }
  },
  test: {
    environment: 'node'
  }
});
