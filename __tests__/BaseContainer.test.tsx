import { render, screen } from '@testing-library/react';
import BaseContainer from '@/components/BaseContainer';

describe('BaseContainer', () => {
  test('renders children elements inside the container wrapper', () => {
    const { container } = render(
      <BaseContainer>
        <span data-testid="child">Test Child</span>
      </BaseContainer>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    const div = container.querySelector('div');
    expect(div).toHaveAttribute('class', 'container');
  });

  test('renders Header including logo and title', () => {
    render(
      <BaseContainer>
        <span>test</span>
      </BaseContainer>,
    );
    expect(screen.getByText('Nweather')).toBeInTheDocument();
  });
});
