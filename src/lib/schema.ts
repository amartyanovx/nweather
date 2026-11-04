import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const cities = sqliteTable('cities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 255 }).notNull().unique(),
});

export const dailyWeather = sqliteTable('daily_weather', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cityId: integer('city_id').references(() => cities.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Понедельник, ..., 6=Воскресенье
  maxTempC: real('max_temp_c'),
  minTempC: real('min_temp_c'),
  precipitationMm: real('precipitation_mm'),
  pressureHpa: real('pressure_hpa'),
});
