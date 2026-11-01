"use client";
import styles from "./styles.module.css";
// Import React to make JSX work in a module context.
import React, { useState } from "react";
import { useCities, useCityWeather } from "./hooks/useWeather";
// The shape of the weather data is inferred directly from the API response.

export default function Home() {
  const { data: citiesData, error: cityError } = useCities();
  // Safely extract array of city names; default to empty array if not loaded yet.
  const cityNames = citiesData?.cities ?? [];
  // Local state for the selected city
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const {
    data: weather,
    error: weatherErr,
    isLoading: weatherLoading,
  } = useCityWeather(selectedCity);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value || null);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Погода</h1>
      {cityError && <p>Не удалось загрузить города.</p>}
      {Array.isArray(cityNames) && cityNames.length > 0 && (
        <select
          className={styles.select}
          value={selectedCity ?? ""}
          onChange={handleChange}
        >
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
      {weather && (
        <div className={styles.weatherInfo}>
          <p>Город: {weather.name}</p>
          <p>Максимальная температура: {weather.maxTempC ?? "—"}°C</p>
          <p>Минимальная температура: {weather.minTempC ?? "—"}°C</p>
          <p>Осадки: {weather.precipitationMm ?? "—"} мм</p>
          <p>Давление: {weather.pressureHpa ?? "—"} гПа</p>
        </div>
      )}
    </div>
  );
}
