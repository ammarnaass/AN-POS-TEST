import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname_n = path.dirname(fileURLToPath(import.meta.url));

// قراءة رقم الإصدار من package.json — المصدر الوحيد للحقيقة (Single Source of Truth)
const pkg = JSON.parse(readFileSync(path.resolve(__dirname_n, 'package.json'), 'utf-8'));
const buildDate = new Date().toISOString().split('T')[0];
const buildNumber = `${buildDate.replace(/-/g, '')}.1`;

const sharedDefines = {
  __APP_VERSION__: JSON.stringify(pkg.version),
  __APP_BUILD_DATE__: JSON.stringify(buildDate),
  __APP_BUILD_NUMBER__: JSON.stringify(buildNumber),
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: sharedDefines,
    build: {
      rollupOptions: {
        input: path.resolve(__dirname_n, 'electron/main/index.ts'),
        external: ['better-sqlite3'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: sharedDefines,
    build: {
      rollupOptions: {
        input: path.resolve(__dirname_n, 'electron/preload/index.ts'),
        external: ['better-sqlite3'],
      },
    },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    define: sharedDefines,
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
        '@shared': path.resolve(__dirname_n, 'shared'),
      },
    },
  },
});
