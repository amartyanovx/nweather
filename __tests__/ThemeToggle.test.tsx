import { fireEvent, render, screen } from '@testing-library/react';
import ThemeToggle from '@/components/ThemeToggle';

const toggle = () => screen.getByRole('switch', { name: 'Тёмная тема' });
const htmlTheme = () => document.documentElement.getAttribute('data-theme');

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  test('по умолчанию выключен и оставляет светлую тему', () => {
    render(<ThemeToggle />);

    expect(toggle()).not.toBeChecked();
    expect(htmlTheme()).toBeNull();
  });

  test('включает тёмную тему и запоминает выбор', () => {
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(toggle()).toBeChecked();
    expect(htmlTheme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  test('возвращает светлую тему и перезаписывает выбор', () => {
    render(<ThemeToggle />);

    fireEvent.click(toggle());
    fireEvent.click(toggle());

    expect(toggle()).not.toBeChecked();
    expect(htmlTheme()).toBeNull();
    expect(localStorage.getItem('theme')).toBe('light');
  });

  test('стартует включённым, если тема уже применена инлайн-скриптом', () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    render(<ThemeToggle />);

    expect(toggle()).toBeChecked();
  });
});
