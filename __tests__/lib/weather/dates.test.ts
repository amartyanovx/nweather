/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { isIsoDate, isoDateInZone, weekDates, weekStartFor } from '@/lib/weather/dates';

describe('isoDateInZone', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('переводит момент времени в календарную дату таймзоны города', () => {
    const at = new Date('2026-03-10T23:30:00.000Z');

    expect(isoDateInZone('Europe/Moscow', at)).toBe('2026-03-11');
    expect(isoDateInZone('America/New_York', at)).toBe('2026-03-10');
    expect(isoDateInZone('UTC', at)).toBe('2026-03-10');
  });

  test('по умолчанию берёт текущий момент сервера', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-01T21:30:00.000Z'));

    expect(isoDateInZone('UTC')).toBe('2026-07-01');
    expect(isoDateInZone('Asia/Tokyo')).toBe('2026-07-02');
  });
});

describe('weekStartFor', () => {
  test('для понедельника возвращает ту же дату', () => {
    expect(weekStartFor('2026-03-09')).toBe('2026-03-09');
  });

  test('для воскресенья возвращает понедельник той же недели', () => {
    expect(weekStartFor('2026-03-15')).toBe('2026-03-09');
  });

  test('для середины недели возвращает понедельник', () => {
    expect(weekStartFor('2026-03-11')).toBe('2026-03-09');
  });

  test('переходит через границу года и месяца', () => {
    expect(weekStartFor('2026-01-01')).toBe('2025-12-29');
    expect(weekStartFor('2026-03-01')).toBe('2026-02-23');
  });
});

describe('weekDates', () => {
  test('отдаёт семь дат Пн→Вс без пропусков', () => {
    expect(weekDates('2026-03-11')).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
    ]);
  });

  test('корректно проходит через конец месяца', () => {
    expect(weekDates('2026-03-31')).toEqual([
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
      '2026-04-04',
      '2026-04-05',
    ]);
  });
});

describe('isIsoDate', () => {
  test('принимает существующие даты', () => {
    expect(isIsoDate('2026-03-10')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  test('отклоняет неверный формат', () => {
    expect(isIsoDate('2026-3-10')).toBe(false);
    expect(isIsoDate('10.03.2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate('2026-03-10T00:00:00Z')).toBe(false);
    expect(isIsoDate('x2026-03-10')).toBe(false);
  });

  test('отклоняет несуществующие даты', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2025-02-29')).toBe(false);
  });
});
