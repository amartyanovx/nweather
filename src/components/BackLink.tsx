import Link from 'next/link';
import styles from '@/styles/page.module.css';

/** Ссылка, а не история браузера: с прямого deep link «назад» всё равно ведёт на экран поиска. */
export default function BackLink() {
  return (
    <Link href="/" className={styles.backLink}>
      <span className={styles.backArrow} aria-hidden="true">
        ←
      </span>
      <span>Назад</span>
    </Link>
  );
}
