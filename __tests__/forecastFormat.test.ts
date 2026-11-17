/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { WEATHER_CONDITIONS } from '@/lib/constants';
import {
  CONDITION_LABELS,
  SHORT_CONDITION_LABELS,
  SHORT_DAYS_OF_WEEK,
  formatCoordinates,
  formatFullDate,
  formatMetric,
  formatTabLabel,
  weekdayIndexFromIso,
} from '@/lib/forecastFormat';

describe('weekdayIndexFromIso', () => {
  test('считает понедельник первым днём недели', () => {
    expect(weekdayIndexFromIso('2026-11-09')).toBe(0);
    expect(weekdayIndexFromIso('2026-11-10')).toBe(1);
    expect(weekdayIndexFromIso('2026-11-15')).toBe(6);
  });

  test('не зависит от таймзоны процесса', () => {
    // Полночь UTC — момент, где локальная дата в западных зонах ещё предыдущая.
    expect(weekdayIndexFromIso('2026-01-01')).toBe(3);
  });
});

describe('метки дат', () => {
  test('метка плашки — короткий день недели и дата', () => {
    expect(formatTabLabel('2026-11-10')).toBe('Вт 10.11');
    expect(formatTabLabel('2026-11-15')).toBe('Вс 15.11');
  });

  test('полная дата в формате ДД.ММ.ГГГГ', () => {
    expect(formatFullDate('2026-11-10')).toBe('10.11.2026');
    expect(formatFullDate('2027-01-01')).toBe('01.01.2027');
  });

  test('короткие метки идут в порядке Пн→Вс', () => {
    expect(SHORT_DAYS_OF_WEEK).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
  });
});

describe('CONDITION_LABELS', () => {
  test('содержит русское название для каждого условия', () => {
    expect(Object.keys(CONDITION_LABELS).sort()).toEqual([...WEATHER_CONDITIONS].sort());
    WEATHER_CONDITIONS.forEach((condition) => {
      expect(CONDITION_LABELS[condition].length).toBeGreaterThan(0);
    });
  });
});

describe('SHORT_CONDITION_LABELS', () => {
  test('содержит короткое название для каждого условия', () => {
    expect(Object.keys(SHORT_CONDITION_LABELS).sort()).toEqual([...WEATHER_CONDITIONS].sort());
    WEATHER_CONDITIONS.forEach((condition) => {
      expect(SHORT_CONDITION_LABELS[condition].length).toBeGreaterThan(0);
    });
  });
});

describe('formatCoordinates', () => {
  test('выводит широту и долготу с четырьмя знаками через запятую', () => {
    expect(formatCoordinates(55.7558, 37.6173)).toBe('55.7558, 37.6173');
    expect(formatCoordinates(1.5, 2)).toBe('1.5000, 2.0000');
  });

  test('сохраняет знак отрицательных координат', () => {
    expect(formatCoordinates(-33.8688, 151.2093)).toBe('-33.8688, 151.2093');
  });
});

describe('formatMetric', () => {
  test('добавляет единицу измерения к числу', () => {
    expect(formatMetric(24, '°C')).toBe('24°C');
    expect(formatMetric(0.4, ' мм')).toBe('0.4 мм');
  });

  test('сохраняет ноль, а не считает его отсутствующим значением', () => {
    expect(formatMetric(0, ' мм')).toBe('0 мм');
  });

  test('выводит прочерк без единицы для null и undefined', () => {
    expect(formatMetric(null, '°C')).toBe('—');
    expect(formatMetric(undefined, ' гПа')).toBe('—');
  });
});
