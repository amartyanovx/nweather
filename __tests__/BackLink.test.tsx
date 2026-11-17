import { render, screen } from '@testing-library/react';
import BackLink from '@/components/BackLink';

describe('BackLink', () => {
  test('ведёт на экран поиска с названием, понятным без контекста', () => {
    render(<BackLink />);

    const link = screen.getByRole('link', { name: 'Назад' });
    expect(link).toHaveAttribute('href', '/');
  });

  test('прячет стрелку от скринридеров: направление передаёт текст ссылки', () => {
    render(<BackLink />);

    expect(screen.getByText('←')).toHaveAttribute('aria-hidden', 'true');
  });
});
