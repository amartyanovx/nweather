<!-- BEGIN:nextjs-agent-rules -->

This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Project Overview

**nweather** — приложение погоды на Next.js 16 App Router с TypeScript, использующее SWR для кэширования данных.

### Технологии

| Категория | Технология | Версия |
|-----------|-----------|--------|
| Фреймворк | Next.js | 16.4.3 (App Router) |
| UI | React + ReactDOM | 19.3.0 |
| Язык | TypeScript | 5.9.3 |
| Data Fetching / Кэширование | SWR | ^2.5.1 |
| Линтинг | oxlint | ^1.90.0 |
| Unit-тесты | Jest | ^30.5.2 |
| E2E-тесты | Playwright | ^1.45.2 |

### Структура проекта

```
nweather/
├── app/                    # Next.js App Router
│   ├── api/weather/route.ts  # API route: GET /api/weather
│   ├── components/           # UI-компоненты (BaseContainer, WeatherTabs)
│   ├── hooks/                # Кастомные React-хуки (useCityWeeklyWeather, useWeather)
│   ├── layout.tsx            # Корневой layout
│   └── page.tsx              # Главная страница
├── lib/                    # Бизнес‑логика утилиты
├── tests/                  # E2E-тесты (Playwright)
├── __tests__/              # Unit‑тесты (Jest)
├── mocks/                  # Моки для тестирования
└── public/                 # Статические файлы
```

**Path Alias**: `@/*` → `./*` (настроено в `tsconfig.json`)

### Команды разработки

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск dev‑сервера |
| `npm run build` | Production build |
| `npm start` | Запуск production‑сервера |
| `npm run lint` / `npm run lint:fix` | Линтинг через oxlint (auto‑fix) |
| `npm run test` | Unit‑тесты через Jest |
| `npm run e2e` | E2E‑тесты через Playwright |

### TypeScript & Типизация

- **Строгая типизация**: Запрещено использовать тип `any`. Если тип неизвестен, используй `unknown`.
- **Интерфейсы для Props**: Всегда явно объявляй интерфейсы для пропсов компонентов (например, `interface ButtonProps {}`).
- **Типы для Next.js сущностей**: Используй встроенные типы для параметров страниц и роутов: `PageProps`, `LayoutProps`, `Metadata`.

### Архитектура (Next.js App Router)

- **Server Components по умолчанию**: Все компоненты в папке `app/` по умолчанию являются серверными. Не добавляй `'use client'`, если в компоненте нет интерактивности (хуки, события).
- **Минимизация Client Components**: Выноси интерактивные элементы (кнопки с обработчиками, формы) в отдельные мелкие клиентские компоненты.
- **Выборка данных (Data Fetching)**: Выполняй запросы к БД/API прямо в асинхронных Server Components (`async/await`). Не используй клиентские `useEffect` для первичной загрузки данных.
- **Оптимизация рендеринга**: Активно используй `<Suspense>` для стриминга тяжелых интерфейсов. Разделяй статические ракушки (static shells) и динамические данные.

### Качество кода и Чистота

- **Размер компонентов**: Один файл — один экспортируемый компонент. Максимальный размер файла — 150–200 строк. Если компонент растёт, разбивай его на подкомпоненты.
- **Современные подходы**: Стрелочные функции (`const fn = () => {}`) в приоритете перед `function`.
- **Декларативность**: Пиши код в декларативном стиле. Отдавай предпочтение методам массивов (`map`, `filter`, `reduce`) вместо циклов `for/while`.
- **Именование**:
  * Компоненты и интерфейсы: `PascalCase`.
  * Функции, переменные, хуки: `camelCase`.
  * Папки и файлы роутов: `kebab-case` (соответствует стандарту App Router).
- **Комментарии в коде**: не пиши комментарии в коде.

### Тестирование

- **Unit‑тесты** (`__tests__/`): Jest + TypeScript. Моки через `mocks/`. Покрывай edge‑cases, ошибку парсинга JSON, пустые ответы API.
- **E2E‑тесты** (`tests/`): Playwright. Тестируй пользовательские сценарии: загрузка данных, переключение табов, обработка ошибок.

```markdown
