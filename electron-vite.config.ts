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
      target: 'node20',
      lib: {
        entry: path.resolve(__dirname_n, 'electron/main/index.ts'),
        formats: ['cjs'],
        fileName: () => '[name].cjs',
      },
      rollupOptions: {
        input: path.resolve(__dirname_n, 'electron/main/index.ts'),
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
        external: ['better-sqlite3'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      target: 'node20',
      lib: {
        entry: path.resolve(__dirname_n, 'electron/preload/index.ts'),
        formats: ['cjs'],
        fileName: () => '[name].cjs',
      },
      rollupOptions: {
        input: path.resolve(__dirname_n, 'electron/preload/index.ts'),
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
        external: ['better-sqlite3'],
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname_n, 'src'),
      },
    },
    build: {
      rollupOptions: {
        input: { index: path.resolve(__dirname_n, 'index.html') },
      },
    },
  },
});
