import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // Только для `drizzle-kit migrate`: приложение подключается к dev.db через src/lib/db.ts.
  dbCredentials: { url: './dev.db' },
});
