import useSWR from 'swr';
import { jsonFetcher } from '@/lib/fetcher';
import type { CityDTO } from '@/types/weather';

export const useCities = () => useSWR<{ cities: CityDTO[] }>('/api/cities', jsonFetcher);
