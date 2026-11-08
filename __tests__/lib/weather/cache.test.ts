/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { getCachedDay, resetWeatherCache, setCachedDay } from '@/lib/weather/cache';
import type { ForecastDay } from '@/types/weather';

const makeDay = (date: string): ForecastDay => ({
  date,
  maxTempC: 10,
  minTempC: 1,
  precipitationMm: 0,
  pressureHpa: 1010,
  humidityPct: 60,
  windSpeedMs: 3,
  condition: 'clear',
  isDay: true,
  isToday: false,
});

describe('weather cache', () => {
  beforeEach(() => {
    resetWeatherCache();
  });

  test('хранит и отдаёт день по паре slug/date', () => {
    const day = makeDay('2026-03-10');
    setCachedDay('moscow', '2026-03-10', day);

    expect(getCachedDay('moscow', '2026-03-10')).toEqual(day);
    expect(getCachedDay('moscow', '2026-03-11')).toBeUndefined();
    expect(getCachedDay('kazan', '2026-03-10')).toBeUndefined();
  });

  test('склеивает ключ из slug и date без потери границы', () => {
    setCachedDay('a#b', 'c', makeDay('первый'));
    setCachedDay('a', 'b#c', makeDay('второй'));

    // Обе пары дают один ключ, поэтому актуальным остаётся последнее значение.
    expect(getCachedDay('a#b', 'c')).toEqual(makeDay('второй'));
    expect(getCachedDay('a', 'b#c')).toEqual(makeDay('второй'));
  });

  test('сбрасывает все записи', () => {
    setCachedDay('moscow', '2026-03-10', makeDay('2026-03-10'));

    resetWeatherCache();

    expect(getCachedDay('moscow', '2026-03-10')).toBeUndefined();
  });

  test('вытесняет самый старый день при переполнении', () => {
    for (let index = 0; index <= 5000; index += 1) {
      setCachedDay('moscow', `day-${index}`, makeDay(`day-${index}`));
    }

    expect(getCachedDay('moscow', 'day-0')).toBeUndefined();
    expect(getCachedDay('moscow', 'day-5000')).toEqual(makeDay('day-5000'));
  });
});
