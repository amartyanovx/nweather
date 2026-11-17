'use client';

import { useEffect, useState } from 'react';
import LoginForm from '@/components/LoginForm';

// Ключ дублируется литералом в unit- и E2E-тестах, чтобы смена значения не прошла незамеченной.
const AUTH_STORAGE_KEY = 'nweather.auth';

interface Props {
  children: React.ReactNode;
}

export default function AuthGate({ children }: Props) {
  // До проверки хранилища не показываем ни форму входа, ни приложение: sessionStorage есть только в браузере.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setIsAuthenticated(sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true');
    } catch {
      // Приватный режим браузера: без хранилища вход не сохранится, считаем сессию отсутствующей.
      setIsAuthenticated(false);
    }
  }, []);

  const handleAuthenticated = () => {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } catch {
      // Вход продолжает работать до перезагрузки, но сессия не сохранится.
    }

    setIsAuthenticated(true);
  };

  if (isAuthenticated === null) return null;
  if (!isAuthenticated) return <LoginForm onAuthenticated={handleAuthenticated} />;

  return <>{children}</>;
}
