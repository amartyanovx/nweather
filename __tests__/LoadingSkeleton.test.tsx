import { render, screen } from '@testing-library/react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  test('renders a select-shaped placeholder for the loading city list', () => {
    const { container } = render(<LoadingSkeleton variant="cities" />);

    const placeholder = screen.getByRole('status', { name: 'Загрузка списка городов' });

    expect(placeholder).toHaveClass('skeletonSelect');
    // У заглушки списка нет содержимого — только место под `<select>`.
    expect(placeholder.childElementCount).toBe(0);
    expect(container.querySelector('.skeletonWeather')).toBeNull();
  });

  test('renders tab and card placeholders for the loading forecast', () => {
    const { container } = render(<LoadingSkeleton variant="weather" />);

    const placeholder = screen.getByRole('status', { name: 'Загрузка прогноза' });

    expect(placeholder).toHaveClass('skeletonWeather');
    expect(container.querySelector('.skeletonTabs')).not.toBeNull();
    expect(container.querySelector('.skeletonCard')).not.toBeNull();
    expect(container.querySelectorAll('.skeletonTab')).toHaveLength(7);
    expect(container.querySelectorAll('.skeletonLine')).toHaveLength(5);
    expect(container.querySelector('.skeletonSelect')).toBeNull();
  });

  test('renders no loading text, only visual placeholders', () => {
    render(<LoadingSkeleton variant="weather" />);

    // Текст не выводится: состояние доступно только через имя роли.
    expect(screen.queryByText(/Загрузка/)).toBeNull();
    expect(screen.getByRole('status', { name: 'Загрузка прогноза' }).textContent).toBe('');
  });
});
