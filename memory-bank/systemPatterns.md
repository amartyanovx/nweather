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

`jsonFetcher<T>(url)` в `src/lib/fetcher.ts` — единственная точка fetch (таймаут и сообщения об ошибках — там же). Хуки
SWR кэшируют ответы, ключ `null` отключает запрос (прогноз не грузится, пока город не выбран). React Query отклонили:
нужен только кэш и ревалидация через `mutate`.

### 2. Server Components по умолчанию

Server: `layout.tsx`, `BaseContainer.tsx`, `Header.tsx`, API route. Клиентские острова (`'use client'`): `page.tsx`
(состояние города и дня), `WeatherTabs.tsx` (обработчики `onClick`).

### 3. Skeleton вместо текста загрузки

Заглушка держит геометрию будущего контента и не выводит текст: состояние объявляется a11y-атрибутами, состав заглушки —
`components/LoadingSkeleton.tsx`; `'use client'` ему не нужен, это презентационная разметка внутри клиентского `page.tsx`.
Анимация отключается по `prefers-reduced-motion` (`page.module.css`). Suspense не используется: оба запроса клиентские
(SWR).

### 4. Данные из SQLite через Drizzle

Один экземпляр `better-sqlite3` + `drizzle` в `src/lib/db.ts` (singleton на процесс) и создание таблиц при импорте.
Поля, нумерация дней и типы — `src/lib/schema.ts`. Инварианты, которые держит код: 7 записей на город, порядок дней
берётся из `DAYS_OF_WEEK` (`src/lib/constants.ts`), а не из БД.

### 5. Компонентная архитектура

Неочевидное: пропсы — локальный `interface Props` в файле компонента, а не общий модуль типов. Остальное (файл на
компонент, CSS Modules, alias `@/*`) — `AGENTS.md`.

## Особенности API route

Route идёт по `DAYS_OF_WEEK` и ищет строку по `day_of_week`, поэтому пропущенные дни остаются `undefined` и доходят до UI
как `—`. Контракт — `techContext.md`.

## Работа с БД

- `dev.db` — локальный SQLite в корне проекта, вне git (правила — `AGENTS.md`); `drizzle.config.ts` — конфиг drizzle-kit
  для миграций и схемы.
- Seed существует в двух видах: `src/lib/seed.ts` (Drizzle, `seed()` вызывается на уровне модуля) и корневой
  `seed.js` (чистый `better-sqlite3`); состояние обоих и риски запуска — «Известные дефекты» в `progress.md`.
