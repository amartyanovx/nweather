/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
jest.mock('@/lib/db', () => ({ db: { select: jest.fn() } }));
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return { ...actual, connection: jest.fn().mockResolvedValue(undefined) };
});

import { connection } from 'next/server';
import { GET } from '@/app/api/cities/route';
import { db } from '@/lib/db';
import { resetWeatherCache } from '@/lib/weather/cache';

const mockSelect = db.select as unknown as jest.Mock;

const MOSCOW = {
  slug: 'moscow',
  name: 'Москва',
  nameEn: 'Moscow',
  country: 'Россия',
  lat: 55.75,
  lon: 37.62,
};

const selectChain = (rows: Array<Record<string, unknown>>) => {
  const chain = {
    where: () => chain,
    limit: () => Promise.resolve(rows),
    orderBy: () => Promise.resolve(rows),
  };
  return { from: () => chain };
};

describe('GET /api/cities', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSelect.mockReset();
    resetWeatherCache();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('возвращает список городов в форме контракта', async () => {
    mockSelect.mockReturnValueOnce(selectChain([MOSCOW]) as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cities: [MOSCOW] });
    expect(connection).toHaveBeenCalled();
  });

  test('на пустой базе отдаёт пустой список', async () => {
    mockSelect.mockReturnValueOnce(selectChain([]) as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cities: [] });
  });

  test('ошибку БД отдаёт как 500 INTERNAL с логом', async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error('unable to open database file');
    });

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: 'INTERNAL', message: 'Внутренняя ошибка сервера' },
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unexpected error in weather API',
      expect.any(Error),
    );
  });
});
