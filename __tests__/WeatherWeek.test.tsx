import { render, screen, within } from '@testing-library/react';
import WeatherWeek from '@/components/WeatherWeek';
import type { ForecastDay } from '@/types/weather';

const day = (date: string, isToday = false, overrides: Partial<ForecastDay> = {}): ForecastDay => ({
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
  ...overrides,
});

/** Неделя 9–15 ноября 2026: Пн→Вс, «сегодня» — среда. */
const DAYS = [
  '2026-11-09',
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
  '2026-11-15',
].map((date, index) => day(date, index === 2));

const plates = () => screen.getAllByRole('listitem');

describe('WeatherWeek', () => {
  test('рисует семь плашек недели Пн→Вс', () => {
    render(<WeatherWeek days={DAYS} />);

    expect(screen.getByRole('list', { name: 'Прогноз на неделю' })).toBeInTheDocument();
    expect(plates()).toHaveLength(7);
    expect(plates()[0]).toHaveTextContent('Пн 09.11');
    expect(plates()[6]).toHaveTextContent('Вс 15.11');
  });

  test('выводит условие, температуры и метрики дня', () => {
    render(<WeatherWeek days={DAYS} />);

    const first = within(plates()[0]);
    expect(first.getByText('Ясно')).toBeInTheDocument();
    expect(first.getByText('20° / 10°')).toBeInTheDocument();
    expect(first.getByText('Осадки: 0 мм')).toBeInTheDocument();
    expect(first.getByText('Давление: 1010 гПа')).toBeInTheDocument();
    expect(first.getByText('Влажность: 50 %')).toBeInTheDocument();
    expect(first.getByText('Ветер: 2 м/с')).toBeInTheDocument();
    expect(first.getByText('Время суток: День')).toBeInTheDocument();
  });

  test('помечает сегодняшнюю плашку', () => {
    render(<WeatherWeek days={DAYS} />);

    expect(within(plates()[2]).getByText('Сегодня')).toBeInTheDocument();
    expect(plates()[2]).toHaveAttribute('data-today', 'true');
    expect(plates()[0]).not.toHaveAttribute('data-today');
    expect(screen.getAllByText('Сегодня')).toHaveLength(1);
  });

  test('выводит короткие подписи условий, чтобы они помещались в плашку', () => {
    render(
      <WeatherWeek
        days={[
          day('2026-11-09', false, { condition: 'partly-cloudy' }),
          day('2026-11-10', false, { condition: 'thunderstorm' }),
        ]}
      />,
    );

    expect(screen.getByText('Перем. облачность')).toBeInTheDocument();
    expect(screen.getByText('Гроза')).toBeInTheDocument();
  });

  test('показывает ночь для дня без светлого времени', () => {
    render(<WeatherWeek days={[day('2026-11-09', false, { isDay: false })]} />);

    expect(screen.getByText('Время суток: Ночь')).toBeInTheDocument();
  });

  test('выводит прочерк вместо отсутствующей метрики', () => {
    render(
      <WeatherWeek
        days={[
          day('2026-11-09', false, {
            maxTempC: null as unknown as number,
            precipitationMm: null as unknown as number,
          }),
        ]}
      />,
    );

    expect(screen.getByText('— / 10°')).toBeInTheDocument();
    expect(screen.getByText('Осадки: —')).toBeInTheDocument();
  });
});
