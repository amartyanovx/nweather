/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
jest.mock('@/lib/db', () => ({ db: { select: jest.fn() } }));

import { db } from '@/lib/db';
import { resetWeatherCache } from '@/lib/weather/cache';
import * as generator from '@/lib/weather/generator';
import { WeatherError } from '@/lib/weather/errors';
import { buildForecast, findCityBySlug, getForecast, listCities } from '@/lib/weather/service';

const mockSelect = db.select as unknown as jest.Mock;

/** Цепочка запроса: `.orderBy()` для списка, `.where().limit()` для поиска города. */
const selectChain = (rows: Array<Record<string, unknown>>) => {
  const chain = {
    where: () => chain,
    limit: () => Promise.resolve(rows),
    orderBy: () => Promise.resolve(rows),
  };
  return { from: () => chain };
};

const MOSCOW = { slug: 'moscow', name: 'Москва', timezone: 'Europe/Moscow' };
/** 11 марта 2026 — среда, полдень по Москве. */
const WEDNESDAY_NOON_UTC = '2026-03-11T09:00:00.000Z';

const forecastDates = (days: ReadonlyArray<{ date: string; isToday: boolean }>) =>
  days.map(({ date, isToday }) => ({ date, isToday }));

describe('weather service', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    resetWeatherCache();
    jest.useFakeTimers().setSystemTime(new Date(WEDNESDAY_NOON_UTC));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('listCities отдаёт только поля контракта', async () => {
    const row = {
      slug: 'moscow',
      name: 'Москва',
      nameEn: 'Moscow',
      country: 'Россия',
      lat: 55.75,
      lon: 37.62,
    };
    mockSelect.mockReturnValueOnce(selectChain([row]) as never);

    await expect(listCities()).resolves.toEqual([row]);
  });

  test('findCityBySlug возвращает запись или undefined', async () => {
    mockSelect.mockReturnValueOnce(selectChain([MOSCOW]) as never);
    await expect(findCityBySlug('moscow')).resolves.toEqual(MOSCOW);

    mockSelect.mockReturnValueOnce(selectChain([]) as never);
    await expect(findCityBySlug('atlantis')).resolves.toBeUndefined();
  });

  test('на неизвестный slug отвечает ошибкой CITY_NOT_FOUND', async () => {
    mockSelect.mockReturnValue(selectChain([]) as never);

    await expect(getForecast('atlantis')).rejects.toBeInstanceOf(WeatherError);
    await expect(getForecast('atlantis')).rejects.toMatchObject({
      name: 'WeatherError',
      code: 'CITY_NOT_FOUND',
    });
  });

  test('неделя — семь дат Пн→Вс в таймзоне города', async () => {
    mockSelect.mockReturnValueOnce(selectChain([MOSCOW]) as never);

    const forecast = await getForecast('moscow');

    expect(forecast.city).toEqual(MOSCOW);
    expect(forecast.weekStart).toBe('2026-03-09');
    expect(forecastDates(forecast.days)).toEqual([
      { date: '2026-03-09', isToday: false },
      { date: '2026-03-10', isToday: false },
      { date: '2026-03-11', isToday: true },
      { date: '2026-03-12', isToday: false },
      { date: '2026-03-13', isToday: false },
      { date: '2026-03-14', isToday: false },
      { date: '2026-03-15', isToday: false },
    ]);
  });

  test('с датой отдаёт один день и начало его недели', async () => {
    mockSelect.mockReturnValueOnce(selectChain([MOSCOW]) as never);

    const forecast = await getForecast('moscow', '2026-04-01');

    expect(forecast.weekStart).toBe('2026-03-30');
    expect(forecast.days).toHaveLength(1);
    expect(forecast.days[0].date).toBe('2026-04-01');
  });

  test('повторный запрос недели не вызывает генератор', async () => {
    const generateSpy = jest.spyOn(generator, 'generateDay');
    mockSelect.mockReturnValue(selectChain([MOSCOW]) as never);

    await getForecast('moscow');
    expect(generateSpy).toHaveBeenCalledTimes(7);

    await getForecast('moscow');
    expect(generateSpy).toHaveBeenCalledTimes(7);
  });

  test('пересчитывает «сегодня» по текущему времени, а не по кэшу', async () => {
    const generateSpy = jest.spyOn(generator, 'generateDay');
    mockSelect.mockReturnValue(selectChain([MOSCOW]) as never);

    const wednesday = await getForecast('moscow');
    expect(wednesday.days.filter((day) => day.isToday).map((day) => day.date)).toEqual([
      '2026-03-11',
    ]);

    jest.setSystemTime(new Date('2026-03-12T09:00:00.000Z'));
    const thursday = await getForecast('moscow');

    expect(thursday.days.filter((day) => day.isToday).map((day) => day.date)).toEqual([
      '2026-03-12',
    ]);
    expect(generateSpy).toHaveBeenCalledTimes(7);
  });

  test('buildForecast работает по записи города, без обращения к БД', async () => {
    const forecast = buildForecast(MOSCOW, '2026-03-11');

    expect(mockSelect).not.toHaveBeenCalled();
    expect(forecast.days).toHaveLength(1);
  });

  test('прокидывает ошибку БД наружу', async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    await expect(getForecast('moscow')).rejects.toThrow('Database connection failed');
  });
});
