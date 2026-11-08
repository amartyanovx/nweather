import { render, screen, fireEvent } from '@testing-library/react';
import WeatherTabs from '@/components/WeatherTabs';
import type { ForecastDay } from '@/types/weather';

const day = (date: string, isToday = false): ForecastDay => ({
  date,
  maxTempC: 20,
  minTempC: 10,
  precipitationMm: 0,
  pressureHpa: 1010,
  humidityPct: 50,
  windSpeedMs: 2,
  condition: 'clear',
  isDay: true,
  isToday,
});

/** Неделя 9–15 ноября 2026: Пн→Вс. */
const DAYS = [
  '2026-11-09',
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
  '2026-11-15',
].map((date, index) => day(date, index === 2));

const LABELS = ['Пн 09.11', 'Вт 10.11', 'Ср 11.11', 'Чт 12.11', 'Пт 13.11', 'Сб 14.11', 'Вс 15.11'];

describe('WeatherTabs component', () => {
  test('рисует семь табов с метками из дат', () => {
    render(<WeatherTabs days={DAYS} selectedIndex={0} onSelect={jest.fn()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(7);
    expect(tabs.map((tab) => tab.textContent)).toEqual(LABELS);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  test('отдаёт индекс выбранного дня по клику', () => {
    const onSelect = jest.fn();
    render(<WeatherTabs days={DAYS} selectedIndex={0} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Пт 13.11' }));

    expect(onSelect).toHaveBeenCalledWith(4);
  });

  test('помечает активным ровно один таб', () => {
    render(<WeatherTabs days={DAYS} selectedIndex={2} onSelect={jest.fn()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveClass('active');
    expect(tabs[0]).not.toHaveClass('active');
  });

  test('у неактивных табов только базовый класс', () => {
    render(<WeatherTabs days={DAYS} selectedIndex={0} onSelect={jest.fn()} />);

    const tabs = screen.getAllByRole('tab');
    // CSS-модуль замокан в jest.setup.ts, поэтому класс неактивного таба — ровно `tab`.
    expect(tabs[1].getAttribute('class')?.trim()).toBe('tab');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  test('подсказывает полное название дня в title', () => {
    render(<WeatherTabs days={DAYS} selectedIndex={0} onSelect={jest.fn()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('title', 'Понедельник');
    expect(tabs[6]).toHaveAttribute('title', 'Воскресенье');
  });

  test('не выделяет ни один таб, если индекс вне диапазона', () => {
    render(<WeatherTabs days={DAYS} selectedIndex={9} onSelect={jest.fn()} />);

    screen.getAllByRole('tab').forEach((tab) => {
      expect(tab).toHaveAttribute('aria-selected', 'false');
      expect(tab.getAttribute('class')?.trim()).toBe('tab');
    });
  });
});
