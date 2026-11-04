import { render, screen, fireEvent } from '@testing-library/react';
import WeatherTabs from '../src/components/WeatherTabs';

describe('WeatherTabs component', () => {
  const days = ['Понедельник', 'Вторник', 'Среда'];

  test('renders all tabs and handles click events', () => {
    const onSelect = jest.fn();
    render(<WeatherTabs days={days} selectedIndex={0} onSelect={onSelect} />);

    // All buttons should be in the document
    days.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });

    // The first button should have active class
    const firstButton = screen.getAllByRole('button')[0];
    expect(firstButton).toHaveAttribute('class', 'tab active');

    // Click the second tab
    fireEvent.click(screen.getByText(days[1]));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
