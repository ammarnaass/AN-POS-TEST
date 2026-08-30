import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname_n = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname_n, 'electron/main/index.ts'),
        external: ['better-sqlite3'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname_n, 'electron/preload/index.ts'),
        external: ['better-sqlite3'],
      },
    },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname_n, 'src/renderer/index.html'),
      },
      rolldownOptions: {
        input: path.resolve(__dirname_n, 'src/renderer/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname_n, 'src'),
      },
    },
  },
});
