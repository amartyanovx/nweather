import type { WeatherCondition } from '@/lib/constants';

export type { WeatherCondition };

/** Один день прогноза; `isToday` считает сервер в таймзоне города. */
export interface ForecastDay {
  date: string;
  maxTempC: number;
  minTempC: number;
  precipitationMm: number;
  pressureHpa: number;
  humidityPct: number;
  windSpeedMs: number;
  condition: WeatherCondition;
  isDay: boolean;
  isToday: boolean;
}

/** Город в ответе `GET /api/cities`. */
export interface CityDTO {
  slug: string;
  name: string;
  nameEn: string;
  country: string;
  lat: number;
  lon: number;
}

/** Город в ответе `GET /api/forecast` — только то, что нужно клиенту прогноза. */
export interface ForecastCity {
  slug: string;
  name: string;
  timezone: string;
}

export interface ForecastResponse {
  city: ForecastCity;
  weekStart: string;
  days: ForecastDay[];
}
