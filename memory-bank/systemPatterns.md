# System Patterns: nweather

## Поток данных

```
page.tsx (client)
├── useCities()            → lib/fetcher.ts → GET /api/weather        (адаптер)
├── useCityWeeklyWeather() → lib/fetcher.ts → GET /api/weather?city=  (адаптер)
└── WeatherTabs.tsx, LoadingSkeleton.tsx

/api/cities    → service.listCities   → db → cities
/api/forecast  → service.getForecast  → кэш → generator; город и «сегодня» — db + dates
/api/weather   → адаптер по имени     → service + generator, ошибки текстом
app/layout.tsx → components/BaseContainer.tsx → components/Header.tsx
```

## Принятые решения

### 1. SWR, Server Components, skeleton

`jsonFetcher<T>` (`src/lib/fetcher.ts`) — единственная точка fetch; SWR-хуки кэшируют и повторяют запрос (`mutate`), ключ
`null` отключает загрузку. Server Components по умолчанию, клиентские острова — `page.tsx` и `WeatherTabs.tsx`; загрузка —
геометрические заглушки (`LoadingSkeleton.tsx`), Suspense не нужен.

### 2. Прогноз генерируется, а не хранится

Внешнего провайдера нет: `generator.ts` выдаёт значения на `Math.random`. Детерминизм отклонён — он имитировал бы
климатическую модель и требовал синхронизации версий; сезонность не моделируется, крайние значения редки за счёт
усреднения. Инварианты полей — `projectbrief.md`.

### 3. Кэш в памяти без TTL

`cache.ts` — `lru-cache` на процесс, ключ `(slug, date)`, `resetWeatherCache()` для тестов. TTL отклонён: прогноз на
календарную дату не устаревает; HMR в `next dev` может обнулять синглтон — это ожидаемо.

### 4. Сервис — единственная точка сборки прогноза

`service.ts` ищет город, считает «сегодня» и начало недели в TZ города и собирает дни по схеме «кэш → генератор → кэш».
`isToday` пересчитывается при каждом чтении — день не «залипает» на смене суток. Даты — `dates.ts`, ошибки — `errors.ts`.

### 5. Deprecated-адаптер `/api/weather`

Фронтенд в этой задаче не менялся: старый контракт (русские названия, `WeatherDay[]`, текстовые тела ошибок) живёт в
`src/app/api/weather/route.ts` поверх нового сервиса и удаляется вместе с переделкой фронта (`progress.md`).

### 6. Миграции вместо DDL при импорте

`db.ts` только открывает `dev.db`; схема — `drizzle-kit`, данные — `scripts/seed.ts` (идемпотентный upsert по `slug`).
DDL при импорте отклонён: расходился со схемой и ломал тесты побочным эффектом. Команды — `techContext.md`.

### 7. Компонентная архитектура и route handlers

Пропсы — локальный `interface Props` в файле компонента, не общий модуль типов; остальное — `AGENTS.md`. Перед запросом
к БД нужен `connection()` (`better-sqlite3` синхронный, иначе ответ закэшируется пререндером на `next build`); вызов —
вне `try`: прерывание пререндера это сигнал Next.js, а не ошибка API.
