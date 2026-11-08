import { readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { z } from 'zod';

/**
 * Идемпотентный сид справочника городов: `npm run db:seed` (Node запускает `.ts` без сборки).
 * Схема создаётся миграциями, поэтому сид требует уже применённых `npm run db:migrate`.
 * Имена колонок повторяют `src/lib/schema.ts` — прямой импорт схемы из `scripts/` запрещён
 * правилами tsconfig (`allowImportingTsExtensions`), а Node без расширения `.ts` не разрешит путь.
 */

const DB_PATH = path.join(process.cwd(), 'dev.db');
const CITIES_FIXTURE_PATH = path.join(process.cwd(), 'src', 'data', 'cities.json');

const citySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().min(1),
  country: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  timezone: z.string().min(1),
});

const citiesSchema = z.array(citySchema).min(1);

type CityFixture = z.infer<typeof citySchema>;

const UPSERT_CITY_SQL = `
  INSERT INTO cities (slug, name, name_en, country, lat, lon, timezone)
  VALUES (@slug, @name, @nameEn, @country, @lat, @lon, @timezone)
  ON CONFLICT(slug) DO UPDATE SET
    name = excluded.name,
    name_en = excluded.name_en,
    country = excluded.country,
    lat = excluded.lat,
    lon = excluded.lon,
    timezone = excluded.timezone
`;

const loadCities = (): CityFixture[] =>
  citiesSchema.parse(JSON.parse(readFileSync(CITIES_FIXTURE_PATH, 'utf-8')));

const seed = (): void => {
  const cities = loadCities();
  const sqlite = new Database(DB_PATH);

  try {
    const upsert = sqlite.prepare(UPSERT_CITY_SQL);
    sqlite.transaction((rows: CityFixture[]) => {
      for (const row of rows) upsert.run(row);
    })(cities);
  } finally {
    sqlite.close();
  }

  console.log(`Seeded ${cities.length} cities`);
};

seed();
