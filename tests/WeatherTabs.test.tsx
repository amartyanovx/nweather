import { render, screen, fireEvent } from "@testing-library/react";
import WeatherTabs from "../app/components/WeatherTabs";

  jest.mock('../../app/styles.module.css', () => ({}));

describe("WeatherTabs component", () => {
  const days = ["Понедельник", "Вторник", "Среда"];
  test("renders all tabs and handles click events", () => {
    const onSelect = jest.fn();
    render(
      <WeatherTabs days={days} selectedIndex={0} onSelect={onSelect} />
    );

    // All buttons should be in the document
    days.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });

    // The first button should have active class (assumed to contain 'active')
    const firstButton = screen.getAllByRole("button")[0];
    expect(firstButton).toHaveClass(/active/);

    // Click the second tab
    fireEvent.click(screen.getByText(days[1]));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
