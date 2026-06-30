import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  optimizeDeps: {
    include: ['@aztec/bb.js'],
  },
  worker: {
    format: 'es',
  },
  server: {
    https: true,
    host: true,
    port: 5173,
  },
});
