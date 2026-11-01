import useSWR from "swr";
import { jsonFetcher } from "../../lib/fetcher";

export const useCities = () => {
  /* The API returns an object { cities: string[] } */
  return useSWR<{ cities: string[] }>(
    "/api/weather",
    jsonFetcher
  );
};

  /* Fetch weather data for a selected city; returns undefined if no city */
export const useCityWeather = (city: string | null) => {
  return useSWR<{
    name: string;
    maxTempC?: number;
    minTempC?: number;
    precipitationMm?: number;
    pressureHpa?: number;
  }>(
    city ? `/api/weather?city=${encodeURIComponent(city)}` : null,
    jsonFetcher
  );
};
