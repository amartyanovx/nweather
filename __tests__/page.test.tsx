import { act, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { useCities } from '@/hooks/useCities';
import { useCityForecast } from '@/hooks/useCityForecast';
import { DEBOUNCE_MS } from '@/lib/cityQuery';
import type { CityDTO, ForecastDay, ForecastResponse } from '@/types/weather';

jest.mock('@/hooks/useCities');
jest.mock('@/hooks/useCityForecast');

const mockUseCities = jest.mocked(useCities);
const mockUseCityForecast = jest.mocked(useCityForecast);

const city = (slug: string, name: string, nameEn: string): CityDTO => ({
  slug,
  name,
  nameEn,
  country: 'Россия',
  lat: 0,
  lon: 0,
});

const MOSCOW = city('moscow', 'Москва', 'Moscow');
const MONTREAL = city('montreal', 'Монреаль', 'Montreal');

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

interface CitiesState {
  data?: { cities: CityDTO[] };
  error?: Error;
  isLoading?: boolean;
}

interface ForecastState {
  data?: ForecastResponse;
  error?: Error;
  isLoading?: boolean;
  mutate?: jest.Mock;
}

/** Полный `SWRResponse`, чтобы мок `useCities` соответствовал типу возврата хука. */
const citiesResponse = ({ data, error, isLoading = false }: CitiesState = {}): ReturnType<
  typeof useCities
> => ({ data, error, isLoading, isValidating: false, mutate: jest.fn() });

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

const combobox = () => screen.getByRole('combobox', { name: 'Город' });
const cardTitle = () => screen.getByRole('heading', { level: 3 });
const cityLink = () => screen.getByRole('link', { name: 'Москва' });

/** Выбор города как в браузере: ввод → дебаунс → клик по подсказке. */
const selectCity = (query: string, optionName: RegExp) => {
  fireEvent.change(combobox(), { target: { value: query } });
  act(() => {
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });
  fireEvent.click(screen.getByRole('option', { name: optionName }));
};

describe('Home page', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseCities.mockReturnValue(citiesResponse({ data: { cities: [MOSCOW, MONTREAL] } }));
    mockUseCityForecast.mockReturnValue(forecastResponse());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('без выбора города показывает только поле поиска', () => {
    render(<Home />);

    expect(combobox()).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(mockUseCityForecast).toHaveBeenLastCalledWith(null);
  });

  test('показывает заглушку поля, пока города загружаются', () => {
    mockUseCities.mockReturnValue(citiesResponse({ isLoading: true }));

    render(<Home />);

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('status', { name: 'Загрузка списка городов' })).toBeInTheDocument();
  });

  test('скрывает поле, если список городов пуст', () => {
    mockUseCities.mockReturnValue(citiesResponse({ data: { cities: [] } }));

    render(<Home />);

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('status', { name: 'Загрузка списка городов' })).toBeNull();
  });

  test('показывает ошибку загрузки городов', () => {
    mockUseCities.mockReturnValue(citiesResponse({ error: new Error('DB is down') }));

    render(<Home />);

    expect(screen.getByText('Не удалось загрузить города.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  test('после выбора города запрашивает прогноз по slug', () => {
    render(<Home />);

    selectCity('Мос', /Москва/);

    expect(mockUseCityForecast).toHaveBeenLastCalledWith('moscow');
  });

  test('после выбора города показывает ссылку на город и карточку на сегодня', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    render(<Home />);
    selectCity('Мос', /Москва/);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Москва');
    expect(cityLink()).toHaveAttribute('href', '/city/moscow');
    expect(cardTitle()).toHaveTextContent('Среда, 11.11.2026');
    expect(screen.getByText('Сегодня')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('без isToday показывает первый день недели', () => {
    mockUseCityForecast.mockReturnValue(
      forecastResponse({
        data: { ...FORECAST, days: DAYS.map((item) => ({ ...item, isToday: false })) },
      }),
    );

    render(<Home />);
    selectCity('Мос', /Москва/);

    expect(cardTitle()).toHaveTextContent('Понедельник, 09.11.2026');
  });

  test('заголовок города остаётся при ошибке прогноза', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ error: new Error('Ошибка 500') }));

    render(<Home />);
    selectCity('Мос', /Москва/);

    expect(cityLink()).toHaveAttribute('href', '/city/moscow');
    expect(screen.getByText(/Не удалось загрузить погоду\./)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });

  test('показывает заглушку сегодняшней карточки только после выбора города', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ isLoading: true }));

    render(<Home />);
    expect(screen.queryByRole('status', { name: 'Загрузка прогноза' })).toBeNull();

    selectCity('Мос', /Москва/);

    const skeleton = screen.getByRole('status', { name: 'Загрузка прогноза' });
    // На главной показывается только карточка: семь заглушек плашек недели не рендерятся.
    expect(skeleton.querySelectorAll('span')).toHaveLength(5);
  });

  test('показывает ошибку прогноза и повторяет запрос через mutate', () => {
    const mutate = jest.fn();
    mockUseCityForecast.mockReturnValue(
      forecastResponse({ error: new Error('Ошибка 500'), mutate }),
    );

    render(<Home />);
    selectCity('Мос', /Москва/);

    expect(screen.getByText(/Не удалось загрузить погоду\./)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  test('не показывает ошибку прогноза при успешном ответе', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    render(<Home />);
    selectCity('Мос', /Москва/);

    expect(screen.queryByText(/Не удалось загрузить погоду\./)).toBeNull();
  });

  test('очистка поля скрывает заголовок города и прогноз', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    render(<Home />);
    selectCity('Мос', /Москва/);
    fireEvent.click(screen.getByRole('button', { name: 'Очистить город' }));

    expect(mockUseCityForecast).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
