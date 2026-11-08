import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Справочник городов — единственная таблица БД. Прогноз в базе не хранится:
 * он генерируется по запросу и живёт в кэше процесса (`src/lib/weather/cache.ts`).
 */
export const cities = sqliteTable('cities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  nameEn: text('name_en').notNull(),
  country: text('country').notNull(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  timezone: text('timezone').notNull(),
});
