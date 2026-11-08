import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout, { metadata } from '@/app/layout';

// Глобальные CSS не нужны при серверном рендере: достаточно заглушки вместо файла.
jest.mock('@/app/globals.css', () => ({}));

/** Layout — серверный компонент, поэтому рендерим его как в Next.js: без DOM-контейнера. */
const renderLayout = (children: React.ReactNode) =>
  renderToStaticMarkup(<RootLayout>{children}</RootLayout>);

describe('RootLayout', () => {
  test('exposes the application metadata title', () => {
    expect(metadata.title).toBe('Nweather');
  });

  test('renders the html root with the english locale', () => {
    expect(renderLayout(<span>Контент</span>)).toContain('<html lang="en">');
  });

  test('рендерит детей внутри базового контейнера рядом с хедером', () => {
    const markup = renderLayout(<span data-testid="child">Контент</span>);

    expect(markup).toContain('<body><div class="container">');
    expect(markup).toContain('Nweather');
    // Ребёнок — последний элемент контейнера, сразу за ним обёртка и body закрываются.
    expect(markup).toMatch(/data-testid="child">Контент<\/span><\/div><\/body>/);
  });

  test('ставит тему из localStorage до первой отрисовки', () => {
    const markup = renderLayout(<span>Контент</span>);

    // Скрипт в head: иначе гидратация вернула бы светлую тему поверх сохранённой.
    expect(markup).toContain('localStorage.getItem("theme")');
    expect(markup).toContain('data-theme","dark"');
  });
});
