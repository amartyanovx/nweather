'use client';

import { DAYS_OF_WEEK } from '@/lib/constants';
import { formatTabLabel, weekdayIndexFromIso } from '@/lib/forecastFormat';
import styles from '@/styles/page.module.css';
import type { ForecastDay } from '@/types/weather';

interface Props {
  days: ForecastDay[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function WeatherTabs({ days, selectedIndex, onSelect }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Дни недели">
      {days.map((day, index) => (
        <button
          key={day.date}
          type="button"
          role="tab"
          aria-selected={index === selectedIndex}
          title={DAYS_OF_WEEK[weekdayIndexFromIso(day.date)]}
          className={`${styles.tab} ${index === selectedIndex ? styles.active : ''}`}
          onClick={() => onSelect(index)}
        >
          {formatTabLabel(day.date)}
        </button>
      ))}
    </div>
  );
}
