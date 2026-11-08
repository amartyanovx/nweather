/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { WEATHER_CONDITIONS } from '@/lib/constants';
import { generateDay } from '@/lib/weather/generator';
import type { ForecastDay, WeatherCondition } from '@/types/weather';

const DATE = '2026-03-10';
const SLUG = 'moscow';

/** `Math.random` подменяется детерминированно: генератор не должен зависеть от реального ГСЧ. */
const mockRandom = (values: number[]): void => {
  let index = 0;
  jest.spyOn(Math, 'random').mockImplementation(() => values[index++ % values.length]);
};

const day = (overrides: Partial<ForecastDay>): ForecastDay => ({
  date: DATE,
  maxTempC: 0,
  minTempC: 0,
  precipitationMm: 0,
  pressureHpa: 1000,
  humidityPct: 50,
  windSpeedMs: 0,
  condition: 'clear',
  isDay: false,
  isToday: false,
  ...overrides,
});

/** Эталонные значения при постоянном `Math.random`: фиксируют веса условий и границы шкал. */
const EXPECTED: Array<[number, ForecastDay]> = [
  [0, day({ maxTempC: -10, minTempC: -12.5, pressureHpa: 990, humidityPct: 30, isDay: true })],
  [
    0.2,
    day({
      maxTempC: -1.4,
      minTempC: -5.8,
      pressureHpa: 998,
      humidityPct: 43,
      windSpeedMs: 3.6,
      isDay: true,
    }),
  ],
  [
    0.35,
    day({
      maxTempC: 5,
      minTempC: -0.8,
      pressureHpa: 1004,
      humidityPct: 53,
      windSpeedMs: 6.3,
      condition: 'partly-cloudy',
      isDay: true,
    }),
  ],
  [
    0.5,
    day({
      maxTempC: 11.5,
      minTempC: 4.3,
      pressureHpa: 1010,
      humidityPct: 63,
      windSpeedMs: 9,
      condition: 'partly-cloudy',
    }),
  ],
  [
    0.65,
    day({
      maxTempC: 18,
      minTempC: 9.3,
      pressureHpa: 1016,
      humidityPct: 72,
      windSpeedMs: 11.7,
      condition: 'cloudy',
    }),
  ],
  [
    0.75,
    day({
      maxTempC: 22.3,
      minTempC: 12.7,
      precipitationMm: 6.1,
      pressureHpa: 1020,
      humidityPct: 79,
      windSpeedMs: 13.5,
      condition: 'rain',
    }),
  ],
  [
    0.85,
    day({
      maxTempC: 26.6,
      minTempC: 16,
      precipitationMm: 17.3,
      pressureHpa: 1024,
      humidityPct: 85,
      windSpeedMs: 15.3,
      condition: 'thunderstorm',
    }),
  ],
  [
    0.95,
    day({
      maxTempC: 30.8,
      minTempC: 19.3,
      pressureHpa: 1028,
      humidityPct: 92,
      windSpeedMs: 17.1,
      condition: 'fog',
    }),
  ],
  [
    1,
    day({
      maxTempC: 33,
      minTempC: 21,
      pressureHpa: 1030,
      humidityPct: 95,
      windSpeedMs: 18,
      condition: 'cloudy',
    }),
  ],
];

describe('generateDay', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each(EXPECTED)('при Math.random = %s отдаёт эталонный день', (value, expected) => {
    mockRandom([value]);

    expect(generateDay({ slug: SLUG, date: DATE })).toEqual(expected);
  });

  test('при отрицательном минимуме заменяет rain на snow', () => {
    // Три значения уходят на maxTempC, три на minTempC, седьмое — на выбор условия.
    mockRandom([0, 0, 0, 1, 0, 0, 1, 0, 0.5, 0.5, 0.5, 0.5]);

    expect(generateDay({ slug: SLUG, date: DATE })).toEqual(
      day({
        maxTempC: -10,
        minTempC: -15.7,
        precipitationMm: 1.9,
        pressureHpa: 1003,
        humidityPct: 52,
        windSpeedMs: 6,
        condition: 'snow',
        isDay: true,
      }),
    );
  });

  test('усредняет три случайных значения для каждого показателя', () => {
    mockRandom([0.9, 0.1, 0.5, 0.2, 0.8, 0.4, 0.55, 0.3, 0.7, 0.6, 0.45, 0.35]);

    expect(generateDay({ slug: SLUG, date: DATE })).toEqual(
      day({
        maxTempC: 11.5,
        minTempC: 4.6,
        pressureHpa: 1011,
        humidityPct: 67,
        windSpeedMs: 4.8,
        condition: 'cloudy',
      }),
    );
  });

  test('на границе весов выбирает следующее условие', () => {
    mockRandom([0.3]);

    expect(generateDay({ slug: SLUG, date: DATE }).condition).toBe('partly-cloudy');
  });

  test('страхует выбор условия при сумме весов вне диапазона', () => {
    mockRandom([1]);

    expect(generateDay({ slug: SLUG, date: DATE }).condition).toBe('cloudy');
  });

  test('держит инварианты полей на двухстах датах', () => {
    const precipitationConditions = new Set<WeatherCondition>(['rain', 'snow', 'thunderstorm']);

    for (let index = 0; index < 200; index += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
      const forecast = generateDay({ slug: SLUG, date });

      expect(forecast.date).toBe(date);
      expect(forecast.isToday).toBe(false);
      expect(forecast.minTempC).toBeLessThan(forecast.maxTempC);
      expect(forecast.maxTempC).toBeGreaterThanOrEqual(-10);
      expect(forecast.maxTempC).toBeLessThanOrEqual(33);
      expect(forecast.precipitationMm).toBeGreaterThanOrEqual(0);
      expect(forecast.precipitationMm).toBeLessThanOrEqual(20);
      expect(Number.isInteger(forecast.pressureHpa)).toBe(true);
      expect(forecast.pressureHpa).toBeGreaterThanOrEqual(950);
      expect(forecast.pressureHpa).toBeLessThanOrEqual(1050);
      expect(Number.isInteger(forecast.humidityPct)).toBe(true);
      expect(forecast.humidityPct).toBeGreaterThanOrEqual(0);
      expect(forecast.humidityPct).toBeLessThanOrEqual(100);
      expect(forecast.windSpeedMs).toBeGreaterThanOrEqual(0);
      expect(forecast.windSpeedMs).toBeLessThanOrEqual(18);
      expect(WEATHER_CONDITIONS).toContain(forecast.condition);
      expect(typeof forecast.isDay).toBe('boolean');
      expect(Number.isInteger(forecast.maxTempC * 10)).toBe(true);
      expect(Number.isInteger(forecast.minTempC * 10)).toBe(true);
      expect(Number.isInteger(forecast.precipitationMm * 10)).toBe(true);
      expect(Number.isInteger(forecast.windSpeedMs * 10)).toBe(true);

      if (precipitationConditions.has(forecast.condition)) {
        expect(forecast.precipitationMm).toBeGreaterThan(0);
      } else {
        expect(forecast.precipitationMm).toBe(0);
      }

      if (forecast.minTempC < 0) expect(forecast.condition).not.toBe('rain');
    }
  });
});
