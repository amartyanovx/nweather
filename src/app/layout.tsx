import type { Metadata } from 'next';
import './globals.css';
import BaseContainer from '@/components/BaseContainer';

export const metadata: Metadata = {
  title: 'Nweather',
};

/**
 * Тема из `localStorage` до первой отрисовки: без этого сохранённая тёмная страница мигнёт светлой.
 * Приём и причину описывает `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`.
 */
const THEME_SCRIPT = `(function(){try{if(localStorage.getItem("theme")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Атрибут `data-theme` ставит скрипт, а не React: иначе гидратация вернула бы светлую тему.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <BaseContainer>{children}</BaseContainer>
      </body>
    </html>
  );
}
