import useSWR from 'swr';
import { jsonFetcher } from '@/lib/fetcher';
import type { WeatherDay } from '@/types/weather';

interface CityWeatherResponse {
  name: string;
  daily: WeatherDay[];
}

export const useCityWeeklyWeather = (city: string | null) => {
  const { data, error, isLoading } = useSWR<CityWeatherResponse>(
    city ? `/api/weather?city=${encodeURIComponent(city)}` : null,
    jsonFetcher,
  );

  return { data: data?.daily ?? undefined, error, isLoading };
};
