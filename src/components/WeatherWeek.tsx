import { SHORT_CONDITION_LABELS, formatMetric, formatTabLabel } from '@/lib/forecastFormat';
import styles from '@/styles/page.module.css';
import type { ForecastDay } from '@/types/weather';

interface Props {
  days: ForecastDay[];
}

/** Все семь дней сразу: выбор дня не нужен, поэтому состояние компоненту не требуется. */
export default function WeatherWeek({ days }: Props) {
  return (
    <ol className={styles.week} aria-label="Прогноз на неделю">
      {days.map((day) => (
        <li key={day.date} className={styles.weekDay} data-today={day.isToday ? 'true' : undefined}>
          <span className={styles.weekDate}>{formatTabLabel(day.date)}</span>
          {day.isToday && <span className={styles.weekTodayBadge}>Сегодня</span>}
          <span className={styles.weekCondition}>{SHORT_CONDITION_LABELS[day.condition]}</span>
          <span className={styles.weekTemp}>
            {formatMetric(day.maxTempC, '°')} / {formatMetric(day.minTempC, '°')}
          </span>
          <span className={styles.weekMetric}>
            Осадки: {formatMetric(day.precipitationMm, ' мм')}
          </span>
          <span className={styles.weekMetric}>
            Давление: {formatMetric(day.pressureHpa, ' гПа')}
          </span>
          <span className={styles.weekMetric}>
            Влажность: {formatMetric(day.humidityPct, ' %')}
          </span>
          <span className={styles.weekMetric}>Ветер: {formatMetric(day.windSpeedMs, ' м/с')}</span>
          <span className={styles.weekMetric}>Время суток: {day.isDay ? 'День' : 'Ночь'}</span>
        </li>
      ))}
    </ol>
  );
}
