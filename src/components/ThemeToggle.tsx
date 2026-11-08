'use client';

import { useEffect, useState } from 'react';
import styles from '@/styles/Header.module.css';

const STORAGE_KEY = 'theme';
const DARK = 'dark';

export default function ThemeToggle() {
  // Сервер не знает про localStorage, поэтому первый рендер светлый; фактическую тему читаем после монтирования.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') === DARK);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dark = event.target.checked;
    setIsDark(dark);

    if (dark) document.documentElement.setAttribute('data-theme', DARK);
    else document.documentElement.removeAttribute('data-theme');

    try {
      localStorage.setItem(STORAGE_KEY, dark ? DARK : 'light');
    } catch {
      // Приватный режим браузера: тема остаётся до перезагрузки, но переключатель не падает.
    }
  };

  return (
    <label className={styles.themeToggle}>
      <input
        type="checkbox"
        role="switch"
        className={styles.themeCheckbox}
        checked={isDark}
        onChange={handleChange}
        aria-label="Тёмная тема"
      />
      <span className={styles.themeTrack} aria-hidden="true">
        <span className={styles.themeThumb} />
      </span>
    </label>
  );
}
