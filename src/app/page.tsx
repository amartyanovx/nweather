'use client';

import { useState } from 'react';
import CitySearch from '@/components/CitySearch';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import WeatherCard from '@/components/WeatherCard';
import WeatherTabs from '@/components/WeatherTabs';
import { useCities } from '@/hooks/useCities';
import { useCityForecast } from '@/hooks/useCityForecast';
import styles from '@/styles/page.module.css';
import type { CityDTO } from '@/types/weather';

export default function Home() {
  const { data: citiesData, error: citiesError, isLoading: citiesLoading } = useCities();
  const [selectedCity, setSelectedCity] = useState<CityDTO | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const {
    data: forecast,
    error: forecastError,
    isLoading: forecastLoading,
    mutate,
  } = useCityForecast(selectedCity?.slug ?? null);

  const cities = citiesData?.cities ?? [];
  const days = forecast?.days ?? [];
  // День берётся из ответа сервера: ревалидация SWR не сбрасывает выбор пользователя.
  const activeDay =
    days.find((day) => day.date === selectedDate) ?? days.find((day) => day.isToday) ?? days[0];
  const activeIndex = activeDay ? days.indexOf(activeDay) : -1;

  const handleSelect = (city: CityDTO) => {
    setSelectedCity(city);
    setSelectedDate(null);
  };

  const handleClear = () => {
    setSelectedCity(null);
    setSelectedDate(null);
  };

  const handleSelectDay = (index: number) => {
    const day = days[index];
    if (day) setSelectedDate(day.date);
  };

  return (
    <>
      {citiesError && <p>Не удалось загрузить города.</p>}
      {citiesLoading && <LoadingSkeleton variant="cities" />}
      {!citiesLoading && cities.length > 0 && (
        <CitySearch
          cities={cities}
          selected={selectedCity}
          onSelect={handleSelect}
          onClear={handleClear}
        />
      )}
      {forecastLoading && selectedCity !== null && <LoadingSkeleton variant="weather" />}
      {forecastError && (
        <p className={styles.retryBlock}>
          Не удалось загрузить погоду.{' '}
          <button type="button" className={styles.retryBtn} onClick={() => void mutate()}>
            Повторить
          </button>
        </p>
      )}
      {selectedCity && activeDay && (
        <>
          <WeatherTabs days={days} selectedIndex={activeIndex} onSelect={handleSelectDay} />
          <WeatherCard cityName={selectedCity.name} day={activeDay} />
        </>
      )}
    </>
  );
}
