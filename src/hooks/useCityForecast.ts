import useSWR from 'swr';
import { jsonFetcher } from '@/lib/fetcher';
import type { ForecastResponse } from '@/types/weather';

/** `mutate` наружу, чтобы «Повторить» не знала про формат ключа SWR. */
export const useCityForecast = (slug: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<ForecastResponse>(
    slug ? `/api/forecast?city=${encodeURIComponent(slug)}` : null,
    jsonFetcher,
  );

  return { data, error, isLoading, mutate };
};
