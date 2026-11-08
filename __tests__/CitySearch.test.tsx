import { act, fireEvent, render, screen } from '@testing-library/react';
import CitySearch from '@/components/CitySearch';
import { DEBOUNCE_MS } from '@/lib/cityQuery';
import type { CityDTO } from '@/types/weather';

const city = (slug: string, name: string, nameEn: string, country = 'Россия'): CityDTO => ({
  slug,
  name,
  nameEn,
  country,
  lat: 0,
  lon: 0,
});

const MOSCOW = city('moscow', 'Москва', 'Moscow');
// Порядок подсказок для «Мо» — по алфавиту: Монреаль, Москва.
const MONTREAL = city('montreal', 'Монреаль', 'Montreal', 'Канада');
const SPB = city('saint-petersburg', 'Санкт-Петербург', 'Saint Petersburg');
const CITIES = [MOSCOW, MONTREAL, SPB];

interface Overrides {
  cities?: CityDTO[];
  selected?: CityDTO | null;
}

const setup = ({ cities = CITIES, selected = null }: Overrides = {}) => {
  const onSelect = jest.fn();
  const onClear = jest.fn();
  render(<CitySearch cities={cities} selected={selected} onSelect={onSelect} onClear={onClear} />);

  return {
    onSelect,
    onClear,
    input: screen.getByRole('combobox', { name: 'Город' }) as HTMLInputElement,
  };
};

const type = (input: HTMLInputElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

const typeAndWait = (input: HTMLInputElement, value: string) => {
  type(input, value);
  act(() => {
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });
};

const optionIds = () => screen.getAllByRole('option').map((option) => option.id);

describe('CitySearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('не открывает список для запроса короче двух символов', () => {
    const { input } = setup();

    typeAndWait(input, 'М');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  test('показывает подсказки только после дебаунса', () => {
    const { input } = setup();

    type(input, 'Мо');
    expect(screen.queryByRole('listbox')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS - 1);
    });
    expect(screen.queryByRole('listbox')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  test('выводит название города и вторую строку с nameEn и страной', () => {
    const { input } = setup();

    typeAndWait(input, 'Мос');

    const option = screen.getByRole('option', { name: /Москва/ });
    expect(option).toHaveTextContent('Москва');
    expect(option).toHaveTextContent('Moscow · Россия');
  });

  test('выбирает город мышью и закрывает список', () => {
    const { input, onSelect } = setup();

    typeAndWait(input, 'Мос');
    fireEvent.click(screen.getByRole('option', { name: /Москва/ }));

    expect(onSelect).toHaveBeenCalledWith(MOSCOW);
    expect(input).toHaveValue('Москва');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('ходит стрелками по кольцу и выбирает активную подсказку по Enter', () => {
    const { input, onSelect } = setup();

    typeAndWait(input, 'Мо');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', optionIds()[0]);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', optionIds()[1]);

    // Вниз с последней подсказки возвращает к первой.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');

    // Вверх с первой уходит на последнюю.
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(MOSCOW);
  });

  test('Escape закрывает список, но оставляет текст', () => {
    const { input } = setup();

    typeAndWait(input, 'Мо');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveValue('Мо');
  });

  test('открывает список снова при фокусе, если запрос достаточно длинный', () => {
    const { input } = setup();

    typeAndWait(input, 'Мо');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  test('крестик очищает поле и выбор, возвращая фокус в поле', () => {
    const { input, onClear } = setup({ selected: MOSCOW });
    expect(input).toHaveValue('Москва');

    fireEvent.click(screen.getByRole('button', { name: 'Очистить город' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Очистить город' })).toBeNull();
  });

  test('не показывает крестик при пустом поле', () => {
    setup();

    expect(screen.queryByRole('button', { name: 'Очистить город' })).toBeNull();
  });

  test('сбрасывает выбранный город при вводе', () => {
    const { input, onClear } = setup({ selected: MOSCOW });

    type(input, 'Мос');

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('отбрасывает недопустимые символы при вводе', () => {
    const { input } = setup();

    type(input, 'Мос1ква!');

    expect(input).toHaveValue('Москва');
  });

  test('показывает «Ничего не найдено», когда совпадений нет', () => {
    const { input } = setup();

    typeAndWait(input, 'ццц');

    expect(screen.getByRole('status')).toHaveTextContent('Ничего не найдено');
    expect(screen.queryByRole('option')).toBeNull();
  });

  test('закрывает список по клику вне поля', () => {
    const { input } = setup();

    typeAndWait(input, 'Мо');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('не выставляет aria-activedescendant при закрытом списке', () => {
    const { input } = setup();

    expect(input).not.toHaveAttribute('aria-activedescendant');
  });
});
