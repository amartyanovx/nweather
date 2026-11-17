import { fireEvent, render, screen, within } from '@testing-library/react';
import CityView from '@/components/CityView';
import { useCityForecast } from '@/hooks/useCityForecast';
import type { ForecastDay, ForecastResponse } from '@/types/weather';

jest.mock('@/hooks/useCityForecast');

const mockUseCityForecast = jest.mocked(useCityForecast);

const day = (date: string, isToday: boolean): ForecastDay => ({
  date,
  maxTempC: 24,
  minTempC: 15,
  precipitationMm: 0.4,
  pressureHpa: 1008,
  humidityPct: 65,
  windSpeedMs: 3.5,
  condition: 'rain',
  isDay: true,
  isToday,
});

/** Неделя 9–15 ноября 2026, «сегодня» — среда 11 ноября (по ответу сервера). */
const TODAY_INDEX = 2;
const DATES = [
  '2026-11-09',
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
  '2026-11-15',
];
const DAYS = DATES.map((date, index) => day(date, index === TODAY_INDEX));

const FORECAST: ForecastResponse = {
  city: {
    slug: 'moscow',
    name: 'Москва',
    nameEn: 'Moscow',
    country: 'Россия',
    lat: 55.7558,
    lon: 37.6173,
    timezone: 'Europe/Moscow',
  },
  weekStart: '2026-11-09',
  days: DAYS,
};

interface ForecastState {
  data?: ForecastResponse;
  error?: Error;
  isLoading?: boolean;
  mutate?: jest.Mock;
}

const forecastResponse = ({
  data,
  error,
  isLoading = false,
  mutate = jest.fn(),
}: ForecastState = {}): ReturnType<typeof useCityForecast> => ({
  data,
  error,
  isLoading,
  mutate,
});

const renderView = (slug = 'moscow') => render(<CityView slug={slug} />);

describe('CityView', () => {
  beforeEach(() => {
    mockUseCityForecast.mockReturnValue(forecastResponse());
  });

  test('запрашивает прогноз по переданному slug', () => {
    renderView('kazan');

    expect(mockUseCityForecast).toHaveBeenLastCalledWith('kazan');
  });

  test('показывает данные города из справочника', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    renderView();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Москва');
    expect(screen.getByText('Страна')).toBeInTheDocument();
    expect(screen.getByText('Россия')).toBeInTheDocument();
    expect(screen.getByText('Английское название')).toBeInTheDocument();
    expect(screen.getByText('Moscow')).toBeInTheDocument();
    expect(screen.getByText('Координаты')).toBeInTheDocument();
    expect(screen.getByText('55.7558, 37.6173')).toBeInTheDocument();
    expect(screen.getByText('Часовой пояс')).toBeInTheDocument();
    expect(screen.getByText('Europe/Moscow')).toBeInTheDocument();
  });

  test('показывает семь плашек недели сразу', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    renderView();

    const plates = screen.getAllByRole('listitem');
    expect(plates).toHaveLength(7);
    expect(plates[0]).toHaveTextContent('Пн 09.11');
    expect(plates[2]).toHaveTextContent('Ср 11.11');
    expect(screen.getByRole('list', { name: 'Прогноз на неделю' })).toBeInTheDocument();
  });

  test('помечает сегодняшнюю плашку', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    renderView();

    const plates = screen.getAllByRole('listitem');
    expect(within(plates[2]).getByText('Сегодня')).toBeInTheDocument();
    expect(plates[2]).toHaveAttribute('data-today', 'true');
    expect(plates[0]).not.toHaveAttribute('data-today');
    expect(screen.getAllByText('Сегодня')).toHaveLength(1);
  });

  test('не помечает плашку, если сервер не отметил сегодняшний день', () => {
    mockUseCityForecast.mockReturnValue(
      forecastResponse({
        data: { ...FORECAST, days: DAYS.map((item) => ({ ...item, isToday: false })) },
      }),
    );

    renderView();

    expect(screen.queryByText('Сегодня')).toBeNull();
  });

  test('показывает заглушку недели при загрузке', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ isLoading: true }));

    renderView();

    const skeleton = screen.getByRole('status', { name: 'Загрузка прогноза' });
    expect(skeleton.querySelectorAll('span')).toHaveLength(7);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  test('показывает ошибку прогноза и повторяет запрос через mutate', () => {
    const mutate = jest.fn();
    mockUseCityForecast.mockReturnValue(
      forecastResponse({ error: new Error('Ошибка 500'), mutate }),
    );

    renderView();

    expect(screen.getByText(/Не удалось загрузить погоду\./)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  test('пустая неделя не ломает экран города', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: { ...FORECAST, days: [] } }));

    renderView();

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Прогноз на неделю' })).toBeNull();
  });

  test('ничего не рендерит без данных и без ошибки', () => {
    renderView();

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Прогноз на неделю' })).toBeNull();
  });
});
