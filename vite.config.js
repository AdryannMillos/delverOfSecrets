import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        renderer: resolve(__dirname, 'src/renderer/index.html'),
        overlay: resolve(__dirname, 'src/overlay/index.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
