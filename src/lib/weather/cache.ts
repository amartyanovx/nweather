import { LRUCache } from 'lru-cache';
import type { ForecastDay } from '@/types/weather';

const MAX_CACHED_DAYS = 5000;

const cacheKey = (slug: string, date: string): string => `${slug}#${date}`;

const createCache = (): LRUCache<string, ForecastDay> =>
  new LRUCache<string, ForecastDay>({ max: MAX_CACHED_DAYS });

/** Синглтон на процесс: `next dev` с HMR может его обнулять — это ожидаемо, не дефект. */
let daysCache = createCache();

export const getCachedDay = (slug: string, date: string): ForecastDay | undefined =>
  daysCache.get(cacheKey(slug, date));

export const setCachedDay = (slug: string, date: string, day: ForecastDay): void => {
  daysCache.set(cacheKey(slug, date), day);
};

/** Для тестов и будущей ручной инвалидации; TTL у кэша нет — прогноз на дату не устаревает. */
export const resetWeatherCache = (): void => {
  daysCache = createCache();
};
