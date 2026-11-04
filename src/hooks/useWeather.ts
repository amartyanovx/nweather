import useSWR from 'swr';
import { jsonFetcher } from '@/lib/fetcher';

export const useCities = () => {
  return useSWR<{ cities: string[] }>('/api/weather', jsonFetcher);
};
