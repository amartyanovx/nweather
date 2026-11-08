import { render, screen } from '@testing-library/react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  test('рисует заглушку поля ввода на всю ширину для списка городов', () => {
    const { container } = render(<LoadingSkeleton variant="cities" />);

    const placeholder = screen.getByRole('status', { name: 'Загрузка списка городов' });

    // У заглушки поля нет содержимого — только место под поле города.
    expect(placeholder.childElementCount).toBe(0);
    expect(container.querySelector('.skeletonTabs')).toBeNull();
    expect(container.querySelector('.skeletonCard')).toBeNull();
  });

  test('рисует заглушки табов и карточки для прогноза', () => {
    const { container } = render(<LoadingSkeleton variant="weather" />);

    const placeholder = screen.getByRole('status', { name: 'Загрузка прогноза' });

    expect(placeholder).toHaveClass('skeletonWeather');
    expect(container.querySelector('.skeletonTabs')).not.toBeNull();
    expect(container.querySelector('.skeletonCard')).not.toBeNull();
    expect(container.querySelectorAll('.skeletonTab')).toHaveLength(7);
    expect(container.querySelectorAll('.skeletonLine')).toHaveLength(5);
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
