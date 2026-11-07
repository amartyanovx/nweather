import { render, screen, fireEvent } from '@testing-library/react';
import { mutate } from 'swr';
import Home from '@/app/page';
import { useCities } from '@/hooks/useWeather';
import { useCityWeeklyWeather } from '@/hooks/useCityWeeklyWeather';
import type { WeatherDay } from '@/types/weather';

jest.mock('swr', () => ({ mutate: jest.fn() }));
jest.mock('@/hooks/useWeather');
jest.mock('@/hooks/useCityWeeklyWeather');

const mockUseCities = jest.mocked(useCities);
const mockUseCityWeeklyWeather = jest.mocked(useCityWeeklyWeather);
const mockMutate = jest.mocked(mutate);

const CITIES = ['Москва', 'Лунный Берег'];

/** 4 ноября 2026 — среда: `getDay()` === 3, поэтому индекс дня по умолчанию (3 + 6) % 7 = 2. */
const TODAY = new Date(2026, 10, 4, 12, 0, 0);
const TODAY_INDEX = 2;

const WEEK: WeatherDay[] = [
  { day: 'Понедельник', maxTempC: null, minTempC: null, precipitationMm: null, pressureHpa: null },
  { day: 'Вторник', maxTempC: 26, minTempC: 19, precipitationMm: 1.5, pressureHpa: 1010 },
  { day: 'Среда', maxTempC: 24, minTempC: 15, precipitationMm: 0.4, pressureHpa: 1008 },
  { day: 'Четверг', maxTempC: 20, minTempC: 12, precipitationMm: 0, pressureHpa: 1005 },
  { day: 'Пятница', maxTempC: 21 },
  { day: 'Суббота', maxTempC: 22 },
  { day: 'Воскресенье', maxTempC: 23 },
];

interface CitiesState {
  data?: { cities: string[] };
  error?: Error;
  isLoading?: boolean;
}

interface WeeklyState {
  data?: WeatherDay[];
  error?: Error;
  isLoading?: boolean;
}

/** Полный `SWRResponse`, чтобы мок `useCities` соответствовал типу возврата хука. */
const citiesResponse = ({ data, error, isLoading = false }: CitiesState = {}): ReturnType<
  typeof useCities
> => ({
  data,
  error,
  isLoading,
  isValidating: false,
  mutate: jest.fn(),
});

const weeklyResponse = ({ data, error, isLoading = false }: WeeklyState = {}): ReturnType<
  typeof useCityWeeklyWeather
> => ({
  data,
  error,
  isLoading,
});

const dropdown = () => screen.getByRole('combobox');
const tab = (day: string) => screen.getByRole('button', { name: day });
const retryButton = () => screen.getByRole('button', { name: 'Повторить' });

const renderPage = () => render(<Home />);

describe('Home page', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
    mockUseCities.mockReturnValue(citiesResponse({ data: { cities: CITIES } }));
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders the city dropdown with a placeholder and all cities', () => {
    renderPage();

    expect(dropdown()).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Выберите город' })).toHaveAttribute('value', '');
    CITIES.forEach((city) => {
      expect(screen.getByRole('option', { name: city })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('option')).toHaveLength(CITIES.length + 1);
  });

  test('does not render the dropdown when the city list is empty', () => {
    mockUseCities.mockReturnValue(citiesResponse({ data: { cities: [] } }));

    renderPage();

    expect(screen.queryByRole('combobox')).toBeNull();
  });

  test('does not render the dropdown while cities are still loading', () => {
    mockUseCities.mockReturnValue(citiesResponse({ isLoading: true }));

    renderPage();

    expect(screen.queryByRole('combobox')).toBeNull();
  });

  test('shows the cities error message and hides the weather error', () => {
    mockUseCities.mockReturnValue(citiesResponse({ error: new Error('DB is down') }));

    renderPage();

    expect(screen.getByText('Не удалось загрузить города.')).toBeInTheDocument();
    expect(screen.queryByText(/Не удалось загрузить погоду\./)).toBeNull();
  });

  test('does not show the cities error message when cities load fine', () => {
    renderPage();

    expect(screen.queryByText('Не удалось загрузить города.')).toBeNull();
  });

  test('selects the day of the week matching today before any interaction', () => {
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse({ data: WEEK }));

    renderPage();

    expect(screen.getByRole('heading')).toHaveTextContent(WEEK[TODAY_INDEX].day);
    expect(tab(WEEK[TODAY_INDEX].day)).toHaveClass('active');
    expect(tab(WEEK[0].day)).not.toHaveClass('active');
  });

  test('switches the displayed day when another tab is clicked', () => {
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse({ data: WEEK }));

    renderPage();
    fireEvent.click(tab(WEEK[0].day));

    expect(screen.getByRole('heading')).toHaveTextContent(WEEK[0].day);
    expect(tab(WEEK[0].day)).toHaveClass('active');
    expect(tab(WEEK[TODAY_INDEX].day)).not.toHaveClass('active');
  });

  test('passes the chosen city to the weekly weather hook and resets it to null', () => {
    renderPage();

    fireEvent.change(dropdown(), { target: { value: CITIES[0] } });

    expect(mockUseCityWeeklyWeather).toHaveBeenLastCalledWith(CITIES[0]);
    expect(dropdown()).toHaveValue(CITIES[0]);

    fireEvent.change(dropdown(), { target: { value: '' } });

    expect(mockUseCityWeeklyWeather).toHaveBeenLastCalledWith(null);
    expect(dropdown()).toHaveValue('');
  });

  test('shows the loading indicator only when a city is selected', () => {
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse({ isLoading: true }));

    renderPage();
    expect(screen.queryByText('Загрузка...')).toBeNull();

    fireEvent.change(dropdown(), { target: { value: CITIES[1] } });

    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  test('renders weather details of the selected day', () => {
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse({ data: WEEK }));

    renderPage();
    fireEvent.change(dropdown(), { target: { value: CITIES[0] } });

    expect(screen.getByText(`Город: ${CITIES[0]}`)).toBeInTheDocument();
    expect(screen.getByText('Максимальная температура: 24°C')).toBeInTheDocument();
    expect(screen.getByText('Минимальная температура: 15°C')).toBeInTheDocument();
    expect(screen.getByText('Осадки: 0.4 мм')).toBeInTheDocument();
    expect(screen.getByText('Давление: 1008 гПа')).toBeInTheDocument();
  });

  test('renders dashes when the day has no measurements', () => {
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse({ data: WEEK }));

    renderPage();
    fireEvent.click(tab(WEEK[0].day));

    expect(screen.getByText('Максимальная температура: —°C')).toBeInTheDocument();
    expect(screen.getByText('Минимальная температура: —°C')).toBeInTheDocument();
    expect(screen.getByText('Осадки: — мм')).toBeInTheDocument();
    expect(screen.getByText('Давление: — гПа')).toBeInTheDocument();
  });

  test('shows the weather error and revalidates the current city on retry', () => {
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse({ error: new Error('Not found') }));

    renderPage();
    fireEvent.change(dropdown(), { target: { value: CITIES[0] } });

    expect(screen.getByText(/Не удалось загрузить погоду\./)).toBeInTheDocument();
    // Пробел между текстом ошибки и кнопкой часть разметки — проверяем его наличие.
    expect(screen.getByText(/Не удалось загрузить погоду\./)).toHaveTextContent(
      'Не удалось загрузить погоду. Повторить',
    );

    fireEvent.click(retryButton());

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(`/api/weather?city=${encodeURIComponent(CITIES[0])}`);
  });

  test('does not revalidate anything on retry when no city is selected', () => {
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse({ error: new Error('Not found') }));

    renderPage();
    fireEvent.click(retryButton());

    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('does not render tabs and weather info without weekly data', () => {
    renderPage();

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button', { name: WEEK[0].day })).toBeNull();
  });

  test('does not show the weather error when the weekly request succeeds', () => {
    mockUseCityWeeklyWeather.mockReturnValue(weeklyResponse({ data: WEEK }));

    renderPage();

    expect(screen.queryByText(/Не удалось загрузить погоду\./)).toBeNull();
  });
});
