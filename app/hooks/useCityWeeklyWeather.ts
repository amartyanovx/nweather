import useSWR from 'swr';
import { jsonFetcher } from '../../lib/fetcher';

export interface WeatherDay {
  day: string;
  maxTempC?: number | null;
  minTempC?: number | null;
  precipitationMm?: number | null;
  pressureHpa?: number | null;
}

interface CityWeatherResponse {
  name: string;
  daily: WeatherDay[];
}

/**
 * Fetch weather data for a selected city and return an array of daily forecasts.
 */
export const useCityWeeklyWeather = (city: string | null) => {
  const { data, error, isLoading } = useSWR<CityWeatherResponse>(
    city ? `/api/weather?city=${encodeURIComponent(city)}` : null,
    jsonFetcher
  );

  return { data: data?.daily ?? undefined, error, isLoading };
};
