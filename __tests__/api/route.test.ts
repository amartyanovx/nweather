/**
 * @jest-environment node
 */
jest.mock('@/lib/db', () => ({ db: { select: jest.fn() } }));

import { GET } from '@/app/api/weather/route';
import { db } from '@/lib/db';

const mockSelect = db.select as unknown as jest.Mock;

const request = (params = '') => new Request(`http://localhost/api/weather${params}`);

/** Цепочка для `db.select().from(cities)` — результат ожидается напрямую. */
const makeListChain = (rows: Array<Record<string, unknown>>) => ({
  from: () => Promise.resolve(rows),
});

/** Цепочка для `db.select().from(table).where(...).limit(1)` и `.orderBy(...)`. */
const makeWhereChain = (rows: Array<Record<string, unknown>>) => {
  const chain = {
    where: () => chain,
    limit: () => Promise.resolve(rows),
    orderBy: () => Promise.resolve(rows),
  };
  return { from: () => chain };
};

const MOSCOW = { id: 1, name: 'Москва' };

const cityWeatherRequest = (city = 'Москва') => request(`?city=${encodeURIComponent(city)}`);

describe('GET /api/weather', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSelect.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('returns city list when no city query param is provided', async () => {
    mockSelect.mockReturnValueOnce(
      makeListChain([MOSCOW, { id: 2, name: 'Лунный Берег' }]) as never,
    );

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cities: ['Москва', 'Лунный Берег'] });
  });

  test('returns city list when city query param is empty', async () => {
    mockSelect.mockReturnValueOnce(makeListChain([MOSCOW]) as never);

    const response = await GET(request('?city='));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cities: ['Москва'] });
  });

  test('returns empty city list when database has no cities', async () => {
    mockSelect.mockReturnValueOnce(makeListChain([]) as never);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cities: [] });
  });

  test('returns 404 when city is not found in database', async () => {
    mockSelect.mockReturnValueOnce(makeWhereChain([]) as never);

    const response = await GET(cityWeatherRequest('Несуществующий город'));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('City not found');
  });

  test('returns weekly weather mapped to all 7 days when city exists', async () => {
    mockSelect.mockReturnValueOnce(makeWhereChain([MOSCOW]) as never).mockReturnValueOnce(
      makeWhereChain([
        {
          id: 1,
          cityId: 1,
          dayOfWeek: 0,
          maxTempC: 25,
          minTempC: 18,
          precipitationMm: 0.5,
          pressureHpa: 1013,
        },
        { id: 2, cityId: 1, dayOfWeek: 1, maxTempC: 26, minTempC: 19 },
      ]) as never,
    );

    const response = await GET(cityWeatherRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Москва');
    expect(body.daily).toHaveLength(7);
    expect(body.daily[0]).toEqual({
      day: 'Понедельник',
      maxTempC: 25,
      minTempC: 18,
      precipitationMm: 0.5,
      pressureHpa: 1013,
    });
    expect(body.daily[1].maxTempC).toBe(26);
    expect(body.daily[1].precipitationMm).toBeUndefined();
  });

  test('returns all 7 days with undefined values when DB has no weather rows', async () => {
    mockSelect
      .mockReturnValueOnce(makeWhereChain([MOSCOW]) as never)
      .mockReturnValueOnce(makeWhereChain([]) as never);

    const response = await GET(cityWeatherRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.daily).toHaveLength(7);
    expect(body.daily.every((day: { maxTempC?: number }) => day.maxTempC === undefined)).toBe(true);
  });

  test('returns 500 when city list query fails', async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('returns 500 when city weather query fails', async () => {
    mockSelect.mockReturnValueOnce(makeWhereChain([MOSCOW]) as never).mockImplementationOnce(() => {
      throw new Error('SQL syntax error');
    });

    const response = await GET(cityWeatherRequest());

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
