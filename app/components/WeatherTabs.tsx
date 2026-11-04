'use client';

import React from 'react';
import styles from '../styles.module.css';

interface Props {
  days: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function WeatherTabs({ days, selectedIndex, onSelect }: Props) {
  return (
    <div className={styles.tabs}>
      {days.map((day, idx) => (
        <button
          key={day}
          className={`${styles.tab} ${idx === selectedIndex ? styles.active : ''}`}
          onClick={() => onSelect(idx)}
        >
          {day}
        </button>
      ))}
    </div>
  );
}
