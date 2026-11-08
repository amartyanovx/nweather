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
const TAB_LABELS = [
  'Пн 09.11',
  'Вт 10.11',
  'Ср 11.11',
  'Чт 12.11',
  'Пт 13.11',
  'Сб 14.11',
  'Вс 15.11',
];

const FORECAST: ForecastResponse = {
  city: { slug: 'moscow', name: 'Москва', timezone: 'Europe/Moscow' },
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
const tab = (label: string) => screen.getByRole('tab', { name: label });

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
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
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

  test('после выбора города показывает семь табов и карточку', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    render(<Home />);
    selectCity('Мос', /Москва/);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(7);
    expect(tabs.map((item) => item.textContent)).toEqual(TAB_LABELS);
    expect(cardTitle()).toHaveTextContent('Среда, 11.11.2026');
    expect(screen.getByText('Город: Москва')).toBeInTheDocument();
  });

  test('активным по умолчанию становится день с isToday из ответа сервера', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    render(<Home />);
    selectCity('Мос', /Москва/);

    expect(tab('Ср 11.11')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Пн 09.11')).toHaveAttribute('aria-selected', 'false');
    expect(cardTitle()).toHaveTextContent('Среда, 11.11.2026');
  });

  test('переключает день по клику на таб', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    render(<Home />);
    selectCity('Мос', /Москва/);
    fireEvent.click(tab('Пт 13.11'));

    expect(cardTitle()).toHaveTextContent('Пятница, 13.11.2026');
    expect(tab('Пт 13.11')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Ср 11.11')).toHaveAttribute('aria-selected', 'false');
  });

  test('сбрасывает выбранный день при смене города', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    render(<Home />);
    selectCity('Мос', /Москва/);
    fireEvent.click(tab('Пт 13.11'));
    selectCity('Мон', /Монреаль/);

    expect(cardTitle()).toHaveTextContent('Среда, 11.11.2026');
  });

  test('показывает заглушку прогноза только после выбора города', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ isLoading: true }));

    render(<Home />);
    expect(screen.queryByRole('status', { name: 'Загрузка прогноза' })).toBeNull();

    selectCity('Мос', /Москва/);

    const skeleton = screen.getByRole('status', { name: 'Загрузка прогноза' });
    expect(skeleton.querySelectorAll('.skeletonTab')).toHaveLength(7);
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

  test('очистка поля скрывает прогноз и сбрасывает город', () => {
    mockUseCityForecast.mockReturnValue(forecastResponse({ data: FORECAST }));

    render(<Home />);
    selectCity('Мос', /Москва/);
    fireEvent.click(screen.getByRole('button', { name: 'Очистить город' }));

    expect(mockUseCityForecast).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });
});
