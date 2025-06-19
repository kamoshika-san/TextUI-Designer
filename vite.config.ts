import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  build: {
    outDir: '../../media',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html'),
      output: {
        entryFileNames: 'webview.js',
      },
    },
  },
  plugins: [react()],
  // 開発モードの設定
  server: {
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
}); 