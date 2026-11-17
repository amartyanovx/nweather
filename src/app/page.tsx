'use client';

import Link from 'next/link';
import { useState } from 'react';
import CitySearch from '@/components/CitySearch';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import WeatherCard from '@/components/WeatherCard';
import { useCities } from '@/hooks/useCities';
import { useCityForecast } from '@/hooks/useCityForecast';
import styles from '@/styles/page.module.css';
import type { CityDTO } from '@/types/weather';

export default function Home() {
  const { data: citiesData, error: citiesError, isLoading: citiesLoading } = useCities();
  const [selectedCity, setSelectedCity] = useState<CityDTO | null>(null);

  const {
    data: forecast,
    error: forecastError,
    isLoading: forecastLoading,
    mutate,
  } = useCityForecast(selectedCity?.slug ?? null);

  const cities = citiesData?.cities ?? [];
  const days = forecast?.days ?? [];
  const today = days.find((day) => day.isToday) ?? days[0];

  // Заголовок живёт по выбору пользователя, а не по ответу прогноза: он виден и во время загрузки,
  // и при ошибке, чтобы переход на страницу города не зависел от состояния запроса.
  const handleSelect = (city: CityDTO) => setSelectedCity(city);
  const handleClear = () => setSelectedCity(null);

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
      {selectedCity && (
        <h2 className={styles.title}>
          <Link className={styles.cityLink} href={`/city/${selectedCity.slug}`}>
            {selectedCity.name}
          </Link>
        </h2>
      )}
      {selectedCity && forecastLoading && <LoadingSkeleton variant="today" />}
      {forecastError && (
        <p className={styles.retryBlock}>
          Не удалось загрузить погоду.{' '}
          <button type="button" className={styles.retryBtn} onClick={() => void mutate()}>
            Повторить
          </button>
        </p>
      )}
      {selectedCity && today && <WeatherCard day={today} />}
    </>
  );
}
