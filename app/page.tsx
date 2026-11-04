'use client';
import styles from './styles.module.css';
import React, { useState, useEffect } from 'react';
import { useCities } from './hooks/useWeather';
import { useCityWeeklyWeather } from './hooks/useCityWeeklyWeather';
import WeatherTabs from './components/WeatherTabs';

export default function Home() {
  const { data: citiesData, error: cityError } = useCities();
  const cityNames = citiesData?.cities ?? [];
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    const d = new Date();
    setSelectedDayIndex((d.getDay() + 6) % 7);
  }, []);

  const {
    data: weekly,
    error: weatherErr,
    isLoading: weatherLoading,
  } = useCityWeeklyWeather(selectedCity);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value || null);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Погода</h1>
      {cityError && <p>Не удалось загрузить города.</p>}
      {Array.isArray(cityNames) && cityNames.length > 0 && (
        <select className={styles.select} value={selectedCity ?? ''} onChange={handleChange}>
          <option value="">Выберите город</option>
          {cityNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
      {weatherLoading && selectedCity !== null && <p>Загрузка...</p>}
      {weatherErr && <p>Не удалось загрузить погоду.</p>}
      {weekly && (
        <>
          <WeatherTabs
            days={weekly.map((d) => d.day)}
            selectedIndex={selectedDayIndex}
            onSelect={setSelectedDayIndex}
          />
          <div className={styles.weatherInfo}>
            <h3>{weekly[selectedDayIndex].day}</h3>
            <p>Город: {selectedCity}</p>
            <p>Максимальная температура: {weekly[selectedDayIndex].maxTempC ?? '—'}°C</p>
            <p>Минимальная температура: {weekly[selectedDayIndex].minTempC ?? '—'}°C</p>
            <p>Осадки: {weekly[selectedDayIndex].precipitationMm ?? '—'} мм</p>
            <p>Давление: {weekly[selectedDayIndex].pressureHpa ?? '—'} гПа</p>
          </div>
        </>
      )}
    </div>
  );
}
