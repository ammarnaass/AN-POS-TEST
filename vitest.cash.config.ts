import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';
import path from 'path';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const buildDate = new Date().toISOString().split('T')[0];
const buildNumber = `${buildDate.replace(/-/g, '')}.1`;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_DATE__: JSON.stringify(buildDate),
    __APP_BUILD_NUMBER__: JSON.stringify(buildNumber),
  },
  test: {
    environment: 'node',
  },
});
