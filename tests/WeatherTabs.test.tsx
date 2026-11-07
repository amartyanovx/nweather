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
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(days.length);
    expect(buttons[0]).toHaveAttribute('class', 'tab active');

    // Click the second tab
    fireEvent.click(screen.getByText(days[1]));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  test('marks exactly one tab as active', () => {
    render(<WeatherTabs days={days} selectedIndex={1} onSelect={jest.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.filter((button) => button.classList.contains('active'))).toHaveLength(1);
    expect(buttons[1]).toHaveClass('active');
    expect(buttons[0]).not.toHaveClass('active');
    expect(buttons[2]).not.toHaveClass('active');
  });

  test('gives inactive tabs the base class only', () => {
    render(<WeatherTabs days={days} selectedIndex={0} onSelect={jest.fn()} />);

    const buttons = screen.getAllByRole('button');
    // CSS-модуль замокан в jest.setup.ts, поэтому класс неактивного таба — ровно `tab`.
    expect(buttons[1].getAttribute('class')?.trim()).toBe('tab');
    expect(buttons[2].getAttribute('class')?.trim()).toBe('tab');
  });

  test('renders no active tab when selectedIndex is out of range', () => {
    render(<WeatherTabs days={days} selectedIndex={5} onSelect={jest.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).not.toHaveClass('active');
      expect(button.getAttribute('class')?.trim()).toBe('tab');
    });
  });
});
