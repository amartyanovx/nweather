# System Patterns: nweather

## Поток данных

```
page.tsx (client)
├── useCities()            → lib/fetcher.ts → GET /api/weather
├── useCityWeeklyWeather() → lib/fetcher.ts → GET /api/weather?city=
├── WeatherTabs.tsx
└── LoadingSkeleton.tsx    (skeleton-заглушки загрузки)
app/api/weather/route.ts → lib/db.ts → lib/schema.ts → dev.db
app/layout.tsx → components/BaseContainer.tsx → components/Header.tsx
```

## Принятые решения

### 1. SWR + jsonFetcher

`jsonFetcher<T>(url)` в `src/lib/fetcher.ts` — единственная точка fetch: `AbortController` с таймаутом, ошибка на
`!res.ok`, отдельное сообщение для таймаута. Хуки SWR кэшируют ответы, ключ `null` отключает запрос (прогноз не
грузится, пока город не выбран). React Query отклонили: нужен только кэш и ревалидация через `mutate`.

### 2. Server Components по умолчанию

Server: `layout.tsx`, `BaseContainer.tsx`, `Header.tsx`, API route. Клиентские острова (`'use client'`): `page.tsx`
(состояние города и дня), `WeatherTabs.tsx` (обработчики `onClick`).

### 3. Skeleton вместо текста загрузки

`components/LoadingSkeleton.tsx` имеет `variant: 'cities' | 'weather'` и директивы `'use client'` не требует: это
чистая презентационная разметка внутри клиентского `page.tsx`. Заглушка держит геометрию будущего контента — пустой
блок под `<select>`, семь табов и пять строк карточки. Текст не выводится, состояние объявляется `role="status"` +
`aria-label`; анимация — `page.module.css` с отключением по `prefers-reduced-motion`. Suspense не используется: оба
запроса клиентские (SWR).

### 4. Данные из SQLite через Drizzle

Один экземпляр `better-sqlite3` + `drizzle` в `src/lib/db.ts` (singleton на процесс) и `CREATE TABLE IF NOT EXISTS`
при импорте. Поля и типы — `src/lib/schema.ts`. Инварианты, которые держит код: `day_of_week` 0–6 (0 = Пн), 7 записей
на город, порядок дней берётся из `DAYS_OF_WEEK`, а не из БД.

### 5. Компонентная архитектура

Один компонент — один файл; пропсы — локальный `interface Props` в файле компонента; стили — CSS Modules из
`src/styles/`; импорты только через alias `@/*`.

## Особенности API route

Route собирает ответ из БД в массив фиксированной длины: идёт по `DAYS_OF_WEEK` и ищет строку по `day_of_week`,
поэтому пропущенные дни остаются `undefined` и доходят до UI как `—`. Контракт и коды ошибок — `techContext.md`.

## Работа с БД

- `dev.db` — локальный файл SQLite в корне проекта, вне git; удаление необратимо.
- Seed существует в двух видах: `src/lib/seed.ts` (Drizzle, `seed()` вызывается на уровне модуля) и корневой
  `seed.js` (чистый `better-sqlite3`). Состояние обоих и риски запуска — «Известные дефекты» в `progress.md`.
- `drizzle.config.ts` — конфиг drizzle-kit для миграций и схемы.
