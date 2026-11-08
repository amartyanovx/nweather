import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cities } from '@/lib/schema';
import { getCachedDay, setCachedDay } from '@/lib/weather/cache';
import { isoDateInZone, weekDates, weekStartFor } from '@/lib/weather/dates';
import { WeatherError } from '@/lib/weather/errors';
import { generateDay } from '@/lib/weather/generator';
import type { CityDTO, ForecastDay, ForecastResponse } from '@/types/weather';

/** Минимум полей города, нужный для прогноза и расчёта «сегодня». */
export interface CityRecord {
  slug: string;
  name: string;
  timezone: string;
}

const cityDtoColumns = {
  slug: cities.slug,
  name: cities.name,
  nameEn: cities.nameEn,
  country: cities.country,
  lat: cities.lat,
  lon: cities.lon,
};

const cityRecordColumns = {
  slug: cities.slug,
  name: cities.name,
  timezone: cities.timezone,
};

export const listCities = async (): Promise<CityDTO[]> =>
  db.select(cityDtoColumns).from(cities).orderBy(asc(cities.name));

export const findCityBySlug = async (slug: string): Promise<CityRecord | undefined> => {
  const rows = await db
    .select(cityRecordColumns)
    .from(cities)
    .where(eq(cities.slug, slug))
    .limit(1);
  return rows.at(0);
};

/** Кэш → генерация → кэш: повторный запрос того же дня генератор не вызывает. */
const resolveDay = (city: CityRecord, date: string, today: string): ForecastDay => {
  const cached = getCachedDay(city.slug, date);
  if (cached) return { ...cached, isToday: date === today };

  const day = generateDay({ slug: city.slug, date });
  setCachedDay(city.slug, date, day);
  return { ...day, isToday: date === today };
};

/** Неделя (или один день) в таймзоне города; «сегодня» всегда определяет сервер. */
export const buildForecast = (city: CityRecord, date?: string): ForecastResponse => {
  const today = isoDateInZone(city.timezone);
  const weekStart = weekStartFor(date ?? today);
  const dates = date ? [date] : weekDates(weekStart);

  return {
    city: { slug: city.slug, name: city.name, timezone: city.timezone },
    weekStart,
    days: dates.map((dayDate) => resolveDay(city, dayDate, today)),
  };
};

export const getForecast = async (slug: string, date?: string): Promise<ForecastResponse> => {
  const city = await findCityBySlug(slug);
  if (!city) throw new WeatherError('CITY_NOT_FOUND', 'Город не найден');

  return buildForecast(city, date);
};
