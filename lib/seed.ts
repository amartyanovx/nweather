import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from './db';
import { cities } from './schema';

interface WeatherCity {
  name: string;
  maxTempC?: number;
  minTempC?: number;
  precipitationMm?: number;
  pressureHpa?: number;
}

export async function seed() {
  const mockPath = path.join(process.cwd(), 'mocks', 'weatherMock.json');
  const content = await fs.readFile(mockPath, { encoding: 'utf-8' });
  const data = JSON.parse(content) as { cities: WeatherCity[] };

  for (const city of data.cities) {
    await db.insert(cities).values({
      name: city.name,
      maxTempC: city.maxTempC ?? null,
      minTempC: city.minTempC ?? null,
      precipitationMm: city.precipitationMm ?? null,
      pressureHpa: city.pressureHpa ?? null,
    });
  }

  console.log(`Seeded ${data.cities.length} cities`);
}

seed();
