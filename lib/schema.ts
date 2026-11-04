import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const cities = sqliteTable('cities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 255 }).notNull(),
  maxTempC: integer('max_temp_c'),
  minTempC: integer('min_temp_c'),
  precipitationMm: integer('precipitation_mm'),
  pressureHpa: integer('pressure_hpa'),
});
