import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

interface WeatherCity {
  name: string;
  maxTempC?: number;
  minTempC?: number;
  precipitationMm?: number;
  pressureHpa?: number;
}

export async function GET(request: Request) {
  const mockPath = path.join(process.cwd(), 'mocks', 'weatherMock.json');
  try {
    const content = await fs.readFile(mockPath, { encoding: 'utf-8' });
    const data = JSON.parse(content) as { cities: WeatherCity[] };

    const url = new URL(request.url);
    const cityName = url.searchParams.get('city');
    if (cityName) {
      const cityData = data.cities.find((c) => c.name === cityName);
      if (!cityData) {
        return new NextResponse('City not found', { status: 404 });
      }
      const days = [
        'Понедельник',
        'Вторник',
        'Среда',
        'Четверг',
        'Пятница',
        'Суббота',
        'Воскресенье',
      ];
      const daily = days.map((day, idx) => ({
        day,
        maxTempC: cityData.maxTempC !== undefined ? cityData.maxTempC + idx : undefined,
        minTempC: cityData.minTempC !== undefined ? cityData.minTempC + idx : undefined,
        precipitationMm:
          cityData.precipitationMm !== undefined
            ? Math.max(0, cityData.precipitationMm - idx)
            : undefined,
        pressureHpa:
          cityData.pressureHpa !== undefined ? cityData.pressureHpa + idx * 2 : undefined,
      }));
      return NextResponse.json({ name: cityData.name, daily });
    }

    const cityNames = data.cities.map((c) => c.name);
    return NextResponse.json({ cities: cityNames });
  } catch (err) {
    console.error('Failed to load weather mock', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
