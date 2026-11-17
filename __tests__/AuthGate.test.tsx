import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import AuthGate from '@/components/AuthGate';

const AUTH_STORAGE_KEY = 'nweather.auth';

const submitCredentials = (login: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Логин'), { target: { value: login } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
};

describe('AuthGate', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('без сохранённой сессии показывает вход вместо приложения', async () => {
    render(
      <AuthGate>
        <p>Приложение</p>
      </AuthGate>,
    );

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.queryByText('Приложение')).toBeNull();
  });

  test('на сервере не показывает ни вход, ни приложение до проверки сессии', () => {
    const markup = renderToStaticMarkup(
      <AuthGate>
        <p>Приложение</p>
      </AuthGate>,
    );

    // Иначе до гидратации мелькал бы неверный экран — всегда форма или всегда приложение.
    expect(markup).toBe('');
  });

  test('с сохранённой сессией показывает приложение', async () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');

    render(
      <AuthGate>
        <p>Приложение</p>
      </AuthGate>,
    );

    expect(await screen.findByText('Приложение')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Вход' })).toBeNull();
  });

  test('не считает входом любое значение ключа', async () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'false');

    render(
      <AuthGate>
        <p>Приложение</p>
      </AuthGate>,
    );

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });

  test('успешный вход открывает приложение и сохраняет сессию', async () => {
    render(
      <AuthGate>
        <p>Приложение</p>
      </AuthGate>,
    );

    await screen.findByRole('heading', { name: 'Вход' });
    submitCredentials('admin', '12345');

    expect(await screen.findByText('Приложение')).toBeInTheDocument();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBe('true');
  });

  test('при недоступном хранилище показывает вход', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage is disabled');
    });

    render(
      <AuthGate>
        <p>Приложение</p>
      </AuthGate>,
    );

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });

  test('не блокирует вход, если запись в хранилище запрещена', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is disabled');
    });

    render(
      <AuthGate>
        <p>Приложение</p>
      </AuthGate>,
    );

    await screen.findByRole('heading', { name: 'Вход' });
    submitCredentials('admin', '123456');

    expect(await screen.findByText('Приложение')).toBeInTheDocument();
  });
});
