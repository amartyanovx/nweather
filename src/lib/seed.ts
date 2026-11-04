import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { cities, dailyWeather } from './schema';

interface WeatherCity {
  name: string;
  maxTempC: number;
  minTempC: number;
  precipitationMm: number;
  pressureHpa: number;
}

export async function seed() {
  const dbPath = path.join(process.cwd(), 'dev.db');
  const sqlite = new Database(dbPath);

  // Create tables if not exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS daily_weather (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id INTEGER REFERENCES cities(id),
      day_of_week INTEGER NOT NULL,
      max_temp_c REAL,
      min_temp_c REAL,
      precipitation_mm REAL,
      pressure_hpa REAL
    )
  `);

  const db = drizzle(sqlite);

  // Read mock data
  const mockPath = path.join(process.cwd(), 'mocks', 'weatherMock.json');
  const content = await fs.readFile(mockPath, { encoding: 'utf-8' });
  const data = JSON.parse(content) as { cities: WeatherCity[] };

  // Clear existing data (daily_weather first due to FK)
  sqlite.exec('DELETE FROM daily_weather');
  sqlite.exec('DELETE FROM cities');

  // Insert cities
  for (const city of data.cities) {
    await db.insert(cities).values({ name: city.name });
  }

  // Get city IDs and generate weekly weather
  const insertedCities = await db.select().from(cities);
  const cityMap = new Map(insertedCities.map((c) => [c.name, c.id!]));

  for (const city of data.cities) {
    const cityId = cityMap.get(city.name);
    if (!cityId) continue;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const tempVariation = Math.round(Math.sin(dayIdx * 0.8) * 2 + (dayIdx > 3 ? -1 : 0));
      const maxTemp = city.maxTempC + tempVariation;
      const minTemp = city.minTempC + Math.round(tempVariation * 0.7);

      let precipMM: number;
      if (city.precipitationMm > 5) {
        precipMM =
          dayIdx % 3 === 0
            ? Math.round(city.precipitationMm * (0.6 + Math.random() * 0.8))
            : Math.round(Math.random() * 3);
      } else {
        precipMM = Math.random() < 0.2 ? Math.round(2 + Math.random() * 5) : 0;
      }

      const pressure = city.pressureHpa + Math.round(Math.sin(dayIdx * 1.2) * 8);

      await db.insert(dailyWeather).values({
        cityId,
        dayOfWeek: dayIdx,
        maxTempC: maxTemp,
        minTempC: minTemp,
        precipitationMm: precipMM,
        pressureHpa: pressure,
      });
    }
  }

  sqlite.close();
  console.log(`Seeded ${data.cities.length} cities with ${data.cities.length * 7} daily records`);
}

seed();
