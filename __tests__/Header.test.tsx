import { render, screen } from '@testing-library/react';
import Header from '@/components/Header';

describe('Header', () => {
  test('renders logo image and title text', () => {
    const { container } = render(<Header />);
    const img = container.querySelector('img');

    expect(img).toHaveAttribute('alt', 'Nweather logo');
    expect(img).toHaveAttribute('width', '105');
    expect(screen.getByText('Nweather')).toBeInTheDocument();
  });
});
