import styles from '@/styles/page.module.css';

interface Props {
  /** `cities` — заглушка вместо `<select>`, `weather` — заглушка табов и карточки прогноза. */
  variant: 'cities' | 'weather';
}

// Геометрия заглушек повторяет реальные элементы: 7 табов дней и 5 строк карточки.
const TAB_SLOTS = 7;
const CARD_ROWS = 5;

/**
 * Заглушка загрузки: держит место в разметке, чтобы контент не «прыгал» после ответа API.
 * Текст не выводится, состояние объявляется через `role="status"` и `aria-label`.
 */
export default function LoadingSkeleton({ variant }: Props) {
  if (variant === 'cities') {
    return (
      <div className={styles.skeletonSelect} role="status" aria-label="Загрузка списка городов" />
    );
  }

  return (
    <div className={styles.skeletonWeather} role="status" aria-label="Загрузка прогноза">
      <div className={styles.skeletonTabs}>
        {Array.from({ length: TAB_SLOTS }, (_, index) => (
          <span key={index} className={styles.skeletonTab} />
        ))}
      </div>
      <div className={styles.skeletonCard}>
        {Array.from({ length: CARD_ROWS }, (_, index) => (
          <span key={index} className={styles.skeletonLine} />
        ))}
      </div>
    </div>
  );
}
