import { fireEvent, render, screen } from '@testing-library/react';
import LoginForm from '@/components/LoginForm';

const renderForm = () => {
  const onAuthenticated = jest.fn();
  render(<LoginForm onAuthenticated={onAuthenticated} />);
  return { onAuthenticated };
};

const submitCredentials = (login: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Логин'), { target: { value: login } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
};

describe('LoginForm', () => {
  test('показывает заголовок, поля ввода и кнопку входа', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByLabelText('Логин')).toHaveValue('');
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Пароль')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  test('не перезагружает страницу при отправке формы', () => {
    renderForm();

    const form = document.querySelector('form');
    if (!form) throw new Error('Форма входа не отрендерена');

    // preventDefault: иначе браузер ушёл бы на тот же URL и сбросил счётчик попыток.
    expect(fireEvent.submit(form)).toBe(false);
  });

  test('верные данные вызывают onAuthenticated без ошибки', () => {
    const { onAuthenticated } = renderForm();

    submitCredentials('admin', '123456');

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('неверный пароль показывает ошибку с остатком попыток и очищает поле пароля', () => {
    const { onAuthenticated } = renderForm();

    submitCredentials('admin', 'wrong');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Неверный логин или пароль. Осталось попыток: 2.',
    );
    expect(screen.getByLabelText('Пароль')).toHaveValue('');
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  test('неверный логин с верным паролем не пускает', () => {
    const { onAuthenticated } = renderForm();

    submitCredentials('user', '123456');

    expect(screen.getByRole('alert')).toHaveTextContent('Неверный логин или пароль.');
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  test('вход возможен, пока попытки не исчерпаны', () => {
    const { onAuthenticated } = renderForm();

    submitCredentials('admin', 'wrong');
    submitCredentials('admin', '123456');

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Доступ запрещён')).toBeNull();
  });

  test('пустые поля не расходуют попытки', () => {
    renderForm();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    }

    expect(screen.getByRole('alert')).toHaveTextContent('Введите логин и пароль.');
    expect(screen.queryByText('Доступ запрещён')).toBeNull();
  });

  test('логин из одних пробелов считается пустым', () => {
    renderForm();

    submitCredentials('   ', '123456');

    expect(screen.getByRole('alert')).toHaveTextContent('Введите логин и пароль.');
  });

  test('пустой пароль не расходует попытку', () => {
    renderForm();

    submitCredentials('admin', '');

    expect(screen.getByRole('alert')).toHaveTextContent('Введите логин и пароль.');
  });

  test('после трёх ошибок блокирует вход до перезагрузки страницы', () => {
    const { onAuthenticated } = renderForm();

    submitCredentials('admin', 'wrong');
    submitCredentials('admin', 'wrong');
    submitCredentials('admin', 'wrong');

    expect(screen.getByRole('heading', { name: 'Доступ запрещён' })).toBeInTheDocument();
    expect(screen.getByText('Обновите страницу, чтобы попробовать снова.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Войти' })).toBeNull();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
