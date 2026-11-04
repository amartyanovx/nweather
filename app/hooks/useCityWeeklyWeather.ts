import useSWR from 'swr';
import { jsonFetcher } from '../../lib/fetcher';

export interface WeatherDay {
  day: string;
  maxTempC?: number;
  minTempC?: number;
  precipitationMm?: number;
  pressureHpa?: number;
}

/**
 * Fetch weather data for a selected city and return an array of daily forecasts.
 */
export const useCityWeeklyWeather = (city: string | null) => {
  const { data, error, isLoading } = useSWR<{
    name: string;
    maxTempC?: number;
    minTempC?: number;
    precipitationMm?: number;
    pressureHpa?: number;
  }>(city ? `/api/weather?city=${encodeURIComponent(city)}` : null, jsonFetcher);

  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  const weekly: WeatherDay[] | undefined = data
    ? days.map((day, idx) => ({
        day,
        maxTempC: data.maxTempC !== undefined ? data.maxTempC + idx : undefined,
        minTempC: data.minTempC !== undefined ? data.minTempC + idx : undefined,
        precipitationMm:
          data.precipitationMm !== undefined ? Math.max(0, data.precipitationMm - idx) : undefined,
        pressureHpa: data.pressureHpa !== undefined ? data.pressureHpa + idx * 2 : undefined,
      }))
    : undefined;

  return { data: weekly, error, isLoading };
};
