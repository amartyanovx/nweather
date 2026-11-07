import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout, { metadata } from '@/app/layout';

// Глобальные CSS не нужны при серверном рендере: достаточно заглушки вместо файла.
jest.mock('@/app/globals.css', () => ({}));

/** Layout — серверный компонент, поэтому рендерим его как в Next.js: без DOM-контейнера. */
const renderLayout = (children: React.ReactNode) =>
  renderToStaticMarkup(<RootLayout>{children}</RootLayout>);

describe('RootLayout', () => {
  test('exposes the application metadata title', () => {
    expect(metadata.title).toBe('Weather App');
  });

  test('renders the html root with the english locale', () => {
    expect(renderLayout(<span>Контент</span>)).toContain('<html lang="en">');
  });

  test('renders children inside the base container next to the header', () => {
    const markup = renderLayout(<span data-testid="child">Контент</span>);

    expect(markup).toContain('<body><div class="container">');
    expect(markup).toContain('Nweather');
    // Ребёнок — последний элемент контейнера, сразу за ним обёртка и body закрываются.
    expect(markup).toMatch(/data-testid="child">Контент<\/span><\/div><\/body>/);
  });
});
