import { NextResponse } from 'next/server';
import { DAYS_OF_WEEK } from '@/lib/constants';
import { buildForecast, findCityByName, listCities } from '@/lib/weather/service';
import type { WeatherDay } from '@/types/weather';

/**
 * @deprecated Адаптер под текущий UI (`src/hooks/useWeather.ts`, `src/hooks/useCityWeeklyWeather.ts`).
 * Удаляется в задаче переделки фронта вместе с переходом на `/api/cities` и `/api/forecast`.
 * Тела ошибок остаются текстовыми: их ожидают тесты фронтенда, которые в этой задаче не меняются.
 */
export async function GET(request: Request) {
  // Чтение `request.url` бросает сигнал прерывания пререндера, поэтому оно вне `try`.
  const url = new URL(request.url);

  try {
    const cityName = url.searchParams.get('city');

    if (cityName) {
      const city = await findCityByName(cityName);

      if (!city) {
        return new NextResponse('City not found', { status: 404 });
      }

      const forecast = buildForecast(city);
      const daily: WeatherDay[] = forecast.days.map((forecastDay, index) => ({
        day: DAYS_OF_WEEK[index],
        maxTempC: forecastDay.maxTempC,
        minTempC: forecastDay.minTempC,
        precipitationMm: forecastDay.precipitationMm,
        pressureHpa: forecastDay.pressureHpa,
      }));

      return NextResponse.json({ name: city.name, daily });
    }

    const cities = await listCities();
    return NextResponse.json({ cities: cities.map((city) => city.name) });
  } catch (error) {
    console.error('Failed to fetch weather data from DB', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
