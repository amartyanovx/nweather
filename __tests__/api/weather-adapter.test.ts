/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
jest.mock('@/lib/db', () => ({ db: { select: jest.fn() } }));

import { GET } from '@/app/api/weather/route';
import { DAYS_OF_WEEK } from '@/lib/constants';
import { db } from '@/lib/db';
import { resetWeatherCache } from '@/lib/weather/cache';

const mockSelect = db.select as unknown as jest.Mock;

const MOSCOW = { slug: 'moscow', name: 'Москва', timezone: 'Europe/Moscow' };
/** 11 марта 2026 — среда, полдень по Москве. */
const WEDNESDAY_NOON_UTC = '2026-03-11T09:00:00.000Z';

const request = (params = '') => new Request(`http://localhost/api/weather${params}`);

const selectChain = (rows: Array<Record<string, unknown>>) => {
  const chain = {
    where: () => chain,
    limit: () => Promise.resolve(rows),
    orderBy: () => Promise.resolve(rows),
  };
  return { from: () => chain };
};

describe('GET /api/weather (deprecated-адаптер)', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSelect.mockReset();
    resetWeatherCache();
    jest.useFakeTimers().setSystemTime(new Date(WEDNESDAY_NOON_UTC));
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    consoleErrorSpy.mockRestore();
  });

  test('без city отдаёт русские названия городов', async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ name: 'Москва' }, { name: 'Казань' }]) as never);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cities: ['Москва', 'Казань'] });
  });

  test('на пустой базе отдаёт пустой список городов', async () => {
    mockSelect.mockReturnValueOnce(selectChain([]) as never);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cities: [] });
  });

  test('с city отдаёт семь дней Пн→Вс в форме WeatherDay', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    mockSelect.mockReturnValueOnce(selectChain([MOSCOW]) as never);

    const response = await GET(request(`?city=${encodeURIComponent('Москва')}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe('Москва');
    expect(body.daily).toHaveLength(7);
    expect(body.daily.map((day: { day: string }) => day.day)).toEqual([...DAYS_OF_WEEK]);
    expect(body.daily[0]).toEqual({
      day: 'Понедельник',
      maxTempC: -10,
      minTempC: -12.5,
      precipitationMm: 0,
      pressureHpa: 990,
    });
    expect(Object.keys(body.daily[0]).sort()).toEqual([
      'day',
      'maxTempC',
      'minTempC',
      'precipitationMm',
      'pressureHpa',
    ]);
  });

  test('на неизвестный город отвечает 404 текстом', async () => {
    mockSelect.mockReturnValueOnce(selectChain([]) as never);

    const response = await GET(request(`?city=${encodeURIComponent('Атлантида')}`));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('City not found');
  });

  test('ошибку БД отдаёт как 500 текстом с логом', async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error('Unable to open database');
    });

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch weather data from DB',
      expect.any(Error),
    );
  });
});
