import { DAYS_OF_WEEK } from '@/lib/constants';
import {
  CONDITION_LABELS,
  formatFullDate,
  formatMetric,
  weekdayIndexFromIso,
} from '@/lib/forecastFormat';
import styles from '@/styles/page.module.css';
import type { ForecastDay } from '@/types/weather';

interface Props {
  day: ForecastDay;
}

export default function WeatherCard({ day }: Props) {
  const title = `${DAYS_OF_WEEK[weekdayIndexFromIso(day.date)]}, ${formatFullDate(day.date)}`;

  return (
    <section className={styles.weatherInfo} aria-label="Погода на день">
      <h3>
        {title}
        {day.isToday && <span className={styles.todayBadge}>Сегодня</span>}
      </h3>
      <p>Условие: {CONDITION_LABELS[day.condition]}</p>
      <p>Максимальная температура: {formatMetric(day.maxTempC, '°C')}</p>
      <p>Минимальная температура: {formatMetric(day.minTempC, '°C')}</p>
      <p>Осадки: {formatMetric(day.precipitationMm, ' мм')}</p>
      <p>Давление: {formatMetric(day.pressureHpa, ' гПа')}</p>
      <p>Влажность: {formatMetric(day.humidityPct, ' %')}</p>
      <p>Ветер: {formatMetric(day.windSpeedMs, ' м/с')}</p>
      <p>Время суток: {day.isDay ? 'День' : 'Ночь'}</p>
    </section>
  );
}
