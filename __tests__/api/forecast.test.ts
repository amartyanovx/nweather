/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
jest.mock('@/lib/db', () => ({ db: { select: jest.fn() } }));
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return { ...actual, connection: jest.fn().mockResolvedValue(undefined) };
});

import { GET } from '@/app/api/forecast/route';
import { db } from '@/lib/db';
import { resetWeatherCache } from '@/lib/weather/cache';

const mockSelect = db.select as unknown as jest.Mock;

const MOSCOW = { slug: 'moscow', name: 'Москва', timezone: 'Europe/Moscow' };
/** 11 марта 2026 — среда, полдень по Москве. */
const WEDNESDAY_NOON_UTC = '2026-03-11T09:00:00.000Z';

const request = (params: string) => new Request(`http://localhost/api/forecast${params}`);

const selectChain = (rows: Array<Record<string, unknown>>) => {
  const chain = {
    where: () => chain,
    limit: () => Promise.resolve(rows),
    orderBy: () => Promise.resolve(rows),
  };
  return { from: () => chain };
};

const weekDates = [
  '2026-03-09',
  '2026-03-10',
  '2026-03-11',
  '2026-03-12',
  '2026-03-13',
  '2026-03-14',
  '2026-03-15',
];

describe('GET /api/forecast', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSelect.mockReset();
    resetWeatherCache();
    jest.useFakeTimers().setSystemTime(new Date(WEDNESDAY_NOON_UTC));
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  test('без date отдаёт неделю Пн→Вс в форме контракта', async () => {
    mockSelect.mockReturnValueOnce(selectChain([MOSCOW]) as never);

    const response = await GET(request('?city=moscow'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.city).toEqual(MOSCOW);
    expect(body.weekStart).toBe('2026-03-09');
    expect(body.days.map((day: { date: string }) => day.date)).toEqual(weekDates);
    expect(body.days[2].isToday).toBe(true);
    expect(body.days.filter((day: { isToday: boolean }) => day.isToday)).toHaveLength(1);
    expect(Object.keys(body.days[0]).sort()).toEqual(
      [
        'condition',
        'date',
        'humidityPct',
        'isDay',
        'isToday',
        'maxTempC',
        'minTempC',
        'precipitationMm',
        'pressureHpa',
        'windSpeedMs',
      ].sort(),
    );
  });

  test('с date отдаёт один день недели этой даты', async () => {
    mockSelect.mockReturnValueOnce(selectChain([MOSCOW]) as never);

    const response = await GET(request('?city=moscow&date=2026-04-01'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.weekStart).toBe('2026-03-30');
    expect(body.days).toHaveLength(1);
    expect(body.days[0].date).toBe('2026-04-01');
    expect(body.days[0].isToday).toBe(false);
  });

  test('повторный запрос отдаёт тот же прогноз (кэш в памяти)', async () => {
    mockSelect.mockReturnValue(selectChain([MOSCOW]) as never);

    const first = await (await GET(request('?city=moscow'))).json();
    const second = await (await GET(request('?city=moscow'))).json();

    expect(second).toEqual(first);
  });

  test.each([
    ['?city=', 'Параметр city обязателен'],
    ['?city=%20%20', 'Параметр city обязателен'],
    ['', 'Параметр city обязателен'],
    ['?city=moscow&date=2026-02-30', 'Параметр date должен быть датой в формате YYYY-MM-DD'],
    ['?city=moscow&date=10.03.2026', 'Параметр date должен быть датой в формате YYYY-MM-DD'],
    ['?city=moscow&date=', 'Параметр date должен быть датой в формате YYYY-MM-DD'],
  ])('на некорректный запрос %s отвечает 400 INVALID_QUERY', async (params, message) => {
    const response = await GET(request(params));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY', message } });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test('на неизвестный город отвечает 404 CITY_NOT_FOUND', async () => {
    mockSelect.mockReturnValueOnce(selectChain([]) as never);

    const response = await GET(request('?city=atlantis'));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'CITY_NOT_FOUND', message: 'Город не найден' },
    });
  });

  test('ошибку БД отдаёт как 500 INTERNAL с логом', async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error('no such table: cities');
    });

    const response = await GET(request('?city=moscow'));

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
