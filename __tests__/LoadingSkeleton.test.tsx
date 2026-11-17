import { render, screen } from '@testing-library/react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  test('рисует заглушку поля ввода на всю ширину для списка городов', () => {
    const { container } = render(<LoadingSkeleton variant="cities" />);

    const placeholder = screen.getByRole('status', { name: 'Загрузка списка городов' });

    // У заглушки поля нет содержимого — только место под поле города.
    expect(placeholder.childElementCount).toBe(0);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  test('рисует заглушки плашек недели для страницы города', () => {
    const { container } = render(<LoadingSkeleton variant="weather" />);

    const placeholder = screen.getByRole('status', { name: 'Загрузка прогноза' });

    expect(placeholder).toHaveClass('skeletonWeather');
    // CSS-модуль в тестах не содержит новых классов, поэтому считаем дочерние заглушки по тегам.
    expect(container.querySelectorAll('span')).toHaveLength(7);
    expect(container.querySelector('.skeletonCard')).toBeNull();
  });

  test('рисует только карточку для сегодняшнего прогноза', () => {
    const { container } = render(<LoadingSkeleton variant="today" />);

    const placeholder = screen.getByRole('status', { name: 'Загрузка прогноза' });

    expect(placeholder).toHaveClass('skeletonWeather');
    expect(container.querySelectorAll('span')).toHaveLength(5);
    expect(container.querySelector('.skeletonWeek')).toBeNull();
  });

  test('не выводит текст загрузки — только визуальные заглушки', () => {
    render(<LoadingSkeleton variant="weather" />);

    expect(screen.queryByText(/Загрузка/)).toBeNull();
    expect(screen.getByRole('status', { name: 'Загрузка прогноза' }).textContent).toBe('');
  });

  test('объявляет загрузку поля через роль status без текста', () => {
    render(<LoadingSkeleton variant="cities" />);

    expect(screen.getByRole('status', { name: 'Загрузка списка городов' }).textContent).toBe('');
    expect(screen.queryByText(/Загрузка/)).toBeNull();
  });
});
