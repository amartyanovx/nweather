import { test, expect } from '@playwright/test';

const MOSCOW_SLUG = 'moscow';
const CONDITIONS = ['clear', 'partly-cloudy', 'cloudy', 'rain', 'snow', 'thunderstorm', 'fog'];

interface ForecastDayBody {
  date: string;
  maxTempC: number;
  minTempC: number;
  precipitationMm: number;
  pressureHpa: number;
  humidityPct: number;
  windSpeedMs: number;
  condition: string;
  isDay: boolean;
  isToday: boolean;
}

interface ForecastBody {
  city: { slug: string; name: string; timezone: string };
  weekStart: string;
  days: ForecastDayBody[];
}

interface ErrorBody {
  error: { code: string; message: string };
}

const nextIsoDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
};

test.describe('API прогноза', () => {
  test('GET /api/cities отдаёт города в форме контракта', async ({ request }) => {
    const response = await request.get('/api/cities');

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { cities: Array<Record<string, unknown>> };

    expect(body.cities).toHaveLength(100);
    expect(Object.keys(body.cities[0]).sort()).toEqual([
      'country',
      'lat',
      'lon',
      'name',
      'nameEn',
      'slug',
    ]);
    expect(body.cities.some((city) => city.slug === MOSCOW_SLUG)).toBe(true);
  });

  test('GET /api/forecast без date отдаёт неделю Пн→Вс в таймзоне города', async ({ request }) => {
    const response = await request.get(`/api/forecast?city=${MOSCOW_SLUG}`);

    expect(response.status()).toBe(200);
    const body = (await response.json()) as ForecastBody;

    expect(body.city).toEqual({ slug: 'moscow', name: 'Москва', timezone: 'Europe/Moscow' });
    expect(body.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.days).toHaveLength(7);
    expect(body.days[0].date).toBe(body.weekStart);

    for (let index = 1; index < body.days.length; index += 1) {
      expect(body.days[index].date).toBe(nextIsoDate(body.days[index - 1].date));
    }

    expect(body.days.filter((day) => day.isToday)).toHaveLength(1);

    for (const day of body.days) {
      expect(typeof day.maxTempC).toBe('number');
      expect(typeof day.minTempC).toBe('number');
      expect(day.minTempC).toBeLessThan(day.maxTempC);
      expect(day.precipitationMm).toBeGreaterThanOrEqual(0);
      expect(day.humidityPct).toBeGreaterThanOrEqual(0);
      expect(day.humidityPct).toBeLessThanOrEqual(100);
      expect(day.pressureHpa).toBeGreaterThanOrEqual(950);
      expect(day.pressureHpa).toBeLessThanOrEqual(1050);
      expect(day.windSpeedMs).toBeGreaterThanOrEqual(0);
      expect(day.windSpeedMs).toBeLessThanOrEqual(25);
      expect(CONDITIONS).toContain(day.condition);
      expect(typeof day.isDay).toBe('boolean');
    }
  });

  test('GET /api/forecast с date отдаёт один день и начало его недели', async ({ request }) => {
    const response = await request.get(`/api/forecast?city=${MOSCOW_SLUG}&date=2026-01-15`);

    expect(response.status()).toBe(200);
    const body = (await response.json()) as ForecastBody;

    expect(body.weekStart).toBe('2026-01-12');
    expect(body.days).toHaveLength(1);
    expect(body.days[0].date).toBe('2026-01-15');
    expect(typeof body.days[0].isToday).toBe('boolean');
  });

  test('повторный запрос того же дня отдаёт идентичный payload', async ({ request }) => {
    const url = `/api/forecast?city=${MOSCOW_SLUG}&date=2026-01-15`;

    const first = await (await request.get(url)).json();
    const second = await (await request.get(url)).json();

    expect(second).toEqual(first);
  });

  test('некорректные параметры дают 400 INVALID_QUERY', async ({ request }) => {
    const urls = [
      '/api/forecast',
      '/api/forecast?city=',
      '/api/forecast?city=moscow&date=2026-02-30',
      '/api/forecast?city=moscow&date=yesterday',
      '/api/forecast?city=moscow&date=',
    ];

    for (const url of urls) {
      const response = await request.get(url);
      const body = (await response.json()) as ErrorBody;

      expect(response.status(), url).toBe(400);
      expect(body.error.code).toBe('INVALID_QUERY');
      expect(body.error.message.length).toBeGreaterThan(0);
    }
  });

  test('неизвестный город даёт 404 CITY_NOT_FOUND', async ({ request }) => {
    const response = await request.get('/api/forecast?city=atlantis');

    expect(response.status()).toBe(404);
    expect(((await response.json()) as ErrorBody).error).toEqual({
      code: 'CITY_NOT_FOUND',
      message: 'Город не найден',
    });
  });
});
