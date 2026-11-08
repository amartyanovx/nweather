import type { WeatherCondition } from '@/lib/constants';

export const SHORT_DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export const CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: 'Ясно',
  'partly-cloudy': 'Переменная облачность',
  cloudy: 'Облачно',
  rain: 'Дождь',
  snow: 'Снег',
  thunderstorm: 'Гроза',
  fog: 'Туман',
};

/**
 * Индекс дня недели (0 — понедельник). Дата разбирается как UTC-полночь, как `toTimestamp` в
 * `src/lib/weather/dates.ts`, поэтому метка не зависит от таймзоны браузера.
 */
export const weekdayIndexFromIso = (isoDate: string): number => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
};

export const formatTabLabel = (isoDate: string): string => {
  const [, month, day] = isoDate.split('-');
  return `${SHORT_DAYS_OF_WEEK[weekdayIndexFromIso(isoDate)]} ${day}.${month}`;
};

export const formatFullDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
};

export const formatMetric = (value: number | null | undefined, unit: string): string =>
  value === null || value === undefined ? '—' : `${value}${unit}`;
