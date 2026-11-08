import { connection, NextResponse } from 'next/server';
import { z } from 'zod';
import { isIsoDate } from '@/lib/weather/dates';
import { errorResponse, WeatherError } from '@/lib/weather/errors';
import { getForecast } from '@/lib/weather/service';

const citySchema = z.string().trim().min(1, 'Параметр city обязателен');
const dateSchema = z
  .string()
  .refine(isIsoDate, 'Параметр date должен быть датой в формате YYYY-MM-DD');

const parseCity = (value: string | null): string => {
  const parsed = citySchema.safeParse(value ?? '');
  if (!parsed.success) throw new WeatherError('INVALID_QUERY', parsed.error.issues[0].message);

  return parsed.data;
};

const parseDate = (value: string | null): string | undefined => {
  if (value === null) return undefined;

  const parsed = dateSchema.safeParse(value);
  if (!parsed.success) throw new WeatherError('INVALID_QUERY', parsed.error.issues[0].message);

  return parsed.data;
};

export async function GET(request: Request) {
  // Вне `try`: прерывание пререндера — сигнал Next.js, а не ошибка API.
  await connection();

  try {
    const url = new URL(request.url);
    const city = parseCity(url.searchParams.get('city'));
    const date = parseDate(url.searchParams.get('date'));

    return NextResponse.json(await getForecast(city, date));
  } catch (error) {
    return errorResponse(error);
  }
}
