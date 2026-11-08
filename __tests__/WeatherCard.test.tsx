import { render, screen } from '@testing-library/react';
import WeatherCard from '@/components/WeatherCard';
import type { ForecastDay } from '@/types/weather';

const DAY: ForecastDay = {
  date: '2026-11-11',
  maxTempC: 24,
  minTempC: 15,
  precipitationMm: 0.4,
  pressureHpa: 1008,
  humidityPct: 65,
  windSpeedMs: 3.5,
  condition: 'rain',
  isDay: true,
  isToday: false,
};

describe('WeatherCard', () => {
  test('показывает полное название дня и дату в заголовке', () => {
    render(<WeatherCard cityName="Москва" day={DAY} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Среда, 11.11.2026');
  });

  test('помечает сегодняшний день бейджем', () => {
    render(<WeatherCard cityName="Москва" day={{ ...DAY, isToday: true }} />);

    expect(screen.getByText('Сегодня')).toBeInTheDocument();
  });

  test('не показывает бейдж для другого дня', () => {
    render(<WeatherCard cityName="Москва" day={DAY} />);

    expect(screen.queryByText('Сегодня')).toBeNull();
  });

  test('выводит метрики в едином формате', () => {
    render(<WeatherCard cityName="Москва" day={DAY} />);

    expect(screen.getByText('Город: Москва')).toBeInTheDocument();
    expect(screen.getByText('Условие: Дождь')).toBeInTheDocument();
    expect(screen.getByText('Максимальная температура: 24°C')).toBeInTheDocument();
    expect(screen.getByText('Минимальная температура: 15°C')).toBeInTheDocument();
    expect(screen.getByText('Осадки: 0.4 мм')).toBeInTheDocument();
    expect(screen.getByText('Давление: 1008 гПа')).toBeInTheDocument();
    expect(screen.getByText('Влажность: 65 %')).toBeInTheDocument();
    expect(screen.getByText('Ветер: 3.5 м/с')).toBeInTheDocument();
  });

  test('показывает время суток', () => {
    const { rerender } = render(<WeatherCard cityName="Москва" day={DAY} />);
    expect(screen.getByText('Время суток: День')).toBeInTheDocument();

    rerender(<WeatherCard cityName="Москва" day={{ ...DAY, isDay: false }} />);
    expect(screen.getByText('Время суток: Ночь')).toBeInTheDocument();
  });

  test('выводит прочерк вместо отсутствующей метрики', () => {
    // Контракт API гарантирует числа, но расчёт риска остаётся: null не должен стать нулём.
    const dayWithoutMetrics = {
      ...DAY,
      maxTempC: null,
      minTempC: null,
      precipitationMm: null,
    } as unknown as ForecastDay;

    render(<WeatherCard cityName="Москва" day={dayWithoutMetrics} />);

    expect(screen.getByText('Максимальная температура: —')).toBeInTheDocument();
    expect(screen.getByText('Минимальная температура: —')).toBeInTheDocument();
    expect(screen.getByText('Осадки: —')).toBeInTheDocument();
  });
});
