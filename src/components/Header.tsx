import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';
import styles from '@/styles/Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <Image src="/logo.jpg" alt="Nweather logo" width={105} height={66} className={styles.logo} />
      <span className={styles.title}>Nweather</span>
      <ThemeToggle />
    </header>
  );
}
