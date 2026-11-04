import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cities, dailyWeather } from '@/lib/schema';
import { DAYS_OF_WEEK } from '@/lib/constants';
import type { WeatherDay } from '@/types/weather';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cityName = url.searchParams.get('city');

    if (cityName) {
      const cityRow = await db.select().from(cities).where(eq(cities.name, cityName)).limit(1);

      if (!cityRow.length) {
        return new NextResponse('City not found', { status: 404 });
      }

      const weekData = await db
        .select()
        .from(dailyWeather)
        .where(eq(dailyWeather.cityId, cityRow[0].id))
        .orderBy(dailyWeather.dayOfWeek);

      const daily: WeatherDay[] = DAYS_OF_WEEK.map((day, idx) => {
        const dayData = weekData.find((d) => d.dayOfWeek === idx);
        return {
          day,
          maxTempC: dayData?.maxTempC ?? undefined,
          minTempC: dayData?.minTempC ?? undefined,
          precipitationMm: dayData?.precipitationMm ?? undefined,
          pressureHpa: dayData?.pressureHpa ?? undefined,
        };
      });

      return NextResponse.json({ name: cityRow[0].name, daily });
    }

    const rows = await db.select().from(cities);
    const cityNames = rows.map((r) => r.name);
    return NextResponse.json({ cities: cityNames });
  } catch (err) {
    console.error('Failed to fetch weather data from DB', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
