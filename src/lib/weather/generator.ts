import type { ForecastDay, WeatherCondition } from '@/types/weather';

export interface GenerateDayInput {
  slug: string;
  date: string;
}

/**
 * Генерация правдоподобного дня без климатической модели и детерминизма: значения не зависят
 * ни от города, ни от сезона, поэтому `slug` входит только в контракт, но не в расчёт.
 * Среднее нескольких равномерных значений даёт колоколообразное распределение — крайности редки.
 */
const bell = (min: number, max: number, samples = 3): number => {
  let sum = 0;
  for (let index = 0; index < samples; index += 1) sum += Math.random();
  return min + (sum / samples) * (max - min);
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

const COLD_TEMP_C = 0;

/** Порядок важен: сумма весов должна покрывать [0, 1). */
const CONDITION_WEIGHTS: ReadonlyArray<readonly [WeatherCondition, number]> = [
  ['clear', 0.3],
  ['partly-cloudy', 0.22],
  ['cloudy', 0.18],
  ['rain', 0.14],
  ['thunderstorm', 0.06],
  ['fog', 0.1],
];

const PRECIPITATION_MM_RANGES: ReadonlyArray<readonly [WeatherCondition, number, number]> = [
  ['rain', 0.3, 8],
  ['snow', 0.3, 5],
  ['thunderstorm', 2, 20],
];

const pickCondition = (minTempC: number): WeatherCondition => {
  const roll = Math.random();
  let cumulative = 0;

  for (const [condition, weight] of CONDITION_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) {
      return condition === 'rain' && minTempC < COLD_TEMP_C ? 'snow' : condition;
    }
  }

  return minTempC < COLD_TEMP_C ? 'snow' : 'cloudy';
};

const precipitationFor = (condition: WeatherCondition): number => {
  const range = PRECIPITATION_MM_RANGES.find(([name]) => name === condition);
  return range ? round1(bell(range[1], range[2])) : 0;
};

export const generateDay = ({ date }: GenerateDayInput): ForecastDay => {
  const maxTempC = round1(bell(-10, 33));
  const minTempC = round1(maxTempC - bell(2.5, 12));
  const condition = pickCondition(minTempC);

  return {
    date,
    maxTempC,
    minTempC,
    precipitationMm: precipitationFor(condition),
    pressureHpa: Math.round(bell(990, 1030)),
    humidityPct: Math.round(bell(30, 95)),
    windSpeedMs: round1(bell(0, 18)),
    condition,
    isDay: Math.random() < 0.5,
    // «Сегодня» зависит от таймзоны города, поэтому проставляет сервис.
    isToday: false,
  };
};
