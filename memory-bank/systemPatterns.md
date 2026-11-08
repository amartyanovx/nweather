# System Patterns: nweather

## Поток данных

```
page.tsx (client island: выбор города и дня)
├── useCities()       → lib/fetcher.ts → GET /api/cities
├── useCityForecast() → lib/fetcher.ts → GET /api/forecast?city=<slug>  (ключ null без города)
└── CitySearch.tsx (client island) + WeatherTabs, WeatherCard, LoadingSkeleton

Ввод → useDebouncedValue(200 мс) → searchCities (lib/cityQuery.ts); метки — lib/forecastFormat.ts; активный день — isToday

/api/cities    → service.listCities   → db → cities
/api/forecast  → service.getForecast  → кэш → generator; город и «сегодня» — db + dates
app/layout.tsx → components/BaseContainer.tsx → components/Header.tsx
```

## Принятые решения

### 1. SWR, Server Components, skeleton

`jsonFetcher<T>` (`src/lib/fetcher.ts`) — единственная точка fetch; SWR-хуки кэшируют и повторяют запрос (`mutate`), ключ
`null` отключает загрузку. Клиентские острова — `page.tsx`, `CitySearch.tsx`, `WeatherTabs.tsx`; загрузка — заглушки.

### 2. Прогноз генерируется, а не хранится

Внешнего провайдера нет: `generator.ts` выдаёт значения на `Math.random`. Детерминизм отклонён — он имитировал бы
климатическую модель. Инварианты полей — `projectbrief.md`.

### 3. Кэш в памяти без TTL

`cache.ts` — `lru-cache` на процесс, ключ `(slug, date)`, `resetWeatherCache()` для тестов. TTL отклонён: прогноз на
календарную дату не устаревает; HMR в `next dev` может обнулять синглтон — это ожидаемо.

### 4. Сервис — единственная точка сборки прогноза

`service.ts` ищет город, считает «сегодня» и начало недели в TZ города и собирает дни по схеме «кэш → генератор → кэш».
`isToday` пересчитывается при чтении — день не «залипает» на смене суток. Даты — `dates.ts`, ошибки — `errors.ts`.

### 5. Поиск города на клиенте вместо `<select>`

`<select>` заменён полем с подсказками: нужен поиск по русскому и английскому названию, нативный select его не даёт.
`/api/cities` отдаётся один раз и фильтруется на клиенте (`searchCities`); ручка поиска отклонена. Дебаунс 200 мс нужен
для стабильности списка, не для экономии запросов. Активный день — с сервера (`isToday`), даты — UTC-полночь.

### 6. Миграции вместо DDL при импорте

`db.ts` только открывает базу; схема — `drizzle-kit`, данные — `scripts/seed.ts` (идемпотентный upsert по `slug`). DDL при
импорте отклонён: расходился со схемой и ломал тесты. Команды — `techContext.md`.

### 7. Компонентная архитектура и route handlers

Пропсы — локальный `interface Props` в файле компонента, не общий модуль типов. Перед запросом к БД нужен `connection()`
(`better-sqlite3` синхронный, иначе ответ закэшируется пререндером), вызов — вне `try`: это сигнал Next.js, не ошибка API.

### 8. Тема: `data-theme` на `<html>`

Светлая — дефолт в `:root`, тёмная (Monokai) — `:root[data-theme='dark']`; `prefers-color-scheme` отклонён: дефолт задан
продуктом, не ОС. Выбор в `localStorage` применяет инлайн-скрипт в `<head>` до отрисовки (`useEffect` дал бы вспышку).
Заливка акцента `#c2185b`, а не Monokai-розовый `#f92672`: на розовом текст не добирает 4.5:1.
