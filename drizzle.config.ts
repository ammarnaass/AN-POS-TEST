import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './electron/drizzle/schema.ts',
  out: './electron/drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './electron/main/data/an-pos.db',
  },
});
