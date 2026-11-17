import styles from '@/styles/page.module.css';

interface Props {
  variant: 'cities' | 'weather' | 'today';
}

const WEEK_SLOTS = 7;
const CARD_ROWS = 5;

/** Текст не выводится: состояние объявляется через `role="status"` и `aria-label`. */
export default function LoadingSkeleton({ variant }: Props) {
  if (variant === 'cities') {
    return (
      <div className={styles.skeletonInput} role="status" aria-label="Загрузка списка городов" />
    );
  }

  return (
    <div className={styles.skeletonWeather} role="status" aria-label="Загрузка прогноза">
      {variant === 'weather' ? (
        <div className={styles.skeletonWeek}>
          {Array.from({ length: WEEK_SLOTS }, (_, index) => (
            <span key={index} className={styles.skeletonPlate} />
          ))}
        </div>
      ) : (
        <div className={styles.skeletonCard}>
          {Array.from({ length: CARD_ROWS }, (_, index) => (
            <span key={index} className={styles.skeletonLine} />
          ))}
        </div>
      )}
    </div>
  );
}
