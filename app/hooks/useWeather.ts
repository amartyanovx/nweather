import useSWR from 'swr';
import { jsonFetcher } from '../../lib/fetcher';

export const useCities = () => {
  return useSWR<{ cities: string[] }>('/api/weather', jsonFetcher);
};

export const useCityWeather = (city: string | null) => {
  return useSWR<{
    name: string;
    maxTempC?: number;
    minTempC?: number;
    precipitationMm?: number;
    pressureHpa?: number;
  }>(city ? `/api/weather?city=${encodeURIComponent(city)}` : null, jsonFetcher);
};
