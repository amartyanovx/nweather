'use client';

import LoadingSkeleton from '@/components/LoadingSkeleton';
import WeatherWeek from '@/components/WeatherWeek';
import { useCityForecast } from '@/hooks/useCityForecast';
import { formatCoordinates } from '@/lib/forecastFormat';
import styles from '@/styles/page.module.css';

interface Props {
  slug: string;
}

export default function CityView({ slug }: Props) {
  const { data: forecast, error, isLoading, mutate } = useCityForecast(slug);

  const days = forecast?.days ?? [];
  const city = forecast?.city;

  if (isLoading) return <LoadingSkeleton variant="weather" />;

  if (error) {
    return (
      <p className={styles.retryBlock}>
        Не удалось загрузить погоду.{' '}
        <button type="button" className={styles.retryBtn} onClick={() => void mutate()}>
          Повторить
        </button>
      </p>
    );
  }

  if (!city || days.length === 0) return null;

  return (
    <>
      <section className={styles.cityInfo} aria-label="Информация о городе">
        <h1 className={styles.cityName}>{city.name}</h1>
        <dl className={styles.cityDetails}>
          <dt>Страна</dt>
          <dd>{city.country}</dd>
          <dt>Английское название</dt>
          <dd>{city.nameEn}</dd>
          <dt>Координаты</dt>
          <dd>{formatCoordinates(city.lat, city.lon)}</dd>
          <dt>Часовой пояс</dt>
          <dd>{city.timezone}</dd>
        </dl>
      </section>
      <WeatherWeek days={days} />
    </>
  );
}
