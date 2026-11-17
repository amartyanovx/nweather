'use client';

import { useState } from 'react';
import styles from '@/styles/page.module.css';

// Тестовые креды намеренно в компоненте: серверная проверка для этого экрана не предусмотрена.
const CREDENTIALS = { login: 'admin', password: '123456' } as const;
const MAX_ATTEMPTS = 3;

interface Props {
  onAuthenticated: () => void;
}

export default function LoginForm({ onAuthenticated }: Props) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const isAccessDenied = failedAttempts >= MAX_ATTEMPTS;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAccessDenied) return;

    const normalizedLogin = login.trim();

    if (normalizedLogin === '' || password === '') {
      setError('Введите логин и пароль.');
      return;
    }

    if (normalizedLogin === CREDENTIALS.login && password === CREDENTIALS.password) {
      setError(null);
      onAuthenticated();
      return;
    }

    const attempts = failedAttempts + 1;

    setFailedAttempts(attempts);
    setPassword('');
    // На третьей ошибке форма заменяется блокировкой, поэтому текст с нулём попыток не показывается.
    setError(`Неверный логин или пароль. Осталось попыток: ${MAX_ATTEMPTS - attempts}.`);
  };

  if (isAccessDenied) {
    return (
      <section className={styles.authCard} role="alert">
        <h2 className={styles.authTitle}>Доступ запрещён</h2>
        <p className={styles.authHint}>Обновите страницу, чтобы попробовать снова.</p>
      </section>
    );
  }

  return (
    <section className={styles.authCard}>
      <h2 className={styles.authTitle}>Вход</h2>
      <form className={styles.authForm} onSubmit={handleSubmit} noValidate>
        <label className={styles.authField}>
          <span>Логин</span>
          <input
            className={styles.authInput}
            type="text"
            name="login"
            autoComplete="username"
            required
            value={login}
            onChange={(event) => setLogin(event.target.value)}
          />
        </label>
        <label className={styles.authField}>
          <span>Пароль</span>
          <input
            className={styles.authInput}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className={styles.authError} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={styles.authButton}>
          Войти
        </button>
      </form>
    </section>
  );
}
