# System Patterns: nweather

## Архитектура системы

```
nweather/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/weather/route.ts      # GET /api/weather
│   │   │                             # без query → список городов
│   │   │                             # ?city=Название → погода по городу
│   │   ├── layout.tsx                # Корневой layout (Server Component)
│   │   ├── page.tsx                  # Главная страница (Client Component)
│   │   ├── globals.css               # Глобальные стили
│   │   └── favicon.ico
│   ├── components/                   # BaseContainer, Header, WeatherTabs
│   ├── hooks/                        # useWeather.ts (useCities), useCityWeeklyWeather.ts — SWR
│   ├── lib/                          # constants, db, fetcher, schema, seed
│   ├── styles/                       # CSS Modules (*.module.css)
│   └── types/                        # weather.ts — WeatherDay
├── mocks/                            # Пусто: weatherMock.json удалён в 430242c, seed.ts на него всё ещё ссылается
├── tests/                            # Playwright: weather.spec.ts
│                                     # + WeatherTabs.test.tsx (подхватывает Jest)
└── __tests__/                        # Jest: компоненты, хуки, lib, api/route.test.ts
```

## Ключевые технические решения

### 1. Data Fetching паттерн (SWR + jsonFetcher)

- `jsonFetcher<T>(url)` — универсальная функция для fetch с типизацией
- SWR хуки кэшируют данные автоматически, предотвращая повторные запросы
- Conditional fetching: null ключ пропускает запрос

### 2. Server Components по умолчанию

- `layout.tsx`, `BaseContainer.tsx` и API route — Server Components (без `'use client'`)
- `page.tsx` — Client Component из-за `useState`/`useEffect`
- `WeatherTabs.tsx` — Client Component из-за обработчиков `onClick`
- `Header.tsx` — Client Component (использует `next/image`)

### 3. Database Data Pattern (SQLite + Drizzle ORM)

- Данные хранятся в `dev.db` (SQLite) через Drizzle ORM
- API route выполняет SQL-запросы к таблицам `cities` и `daily_weather` через Drizzle
- Недельный прогноз хранится в БД: 7 записей на каждый город (по одной на день недели)
- Seed-скрипт `src/lib/seed.ts` загружает данные из `mocks/weatherMock.json` в БД; файл удалён в 430242c, поэтому seed
  сейчас не работает — см. раздел «Работа с базой данных»

### 4. Компонентная архитектура

- Один компонент = один файл
- Типизированные пропсы — локальный `interface Props` в файле компонента (`WeatherTabs.tsx`)
- CSS Modules для изоляции стилей

## Связь компонентов

```
layout.tsx (Server)
    └── BaseContainer (Server) ── Header (Client)
            └── page.tsx (Client)
                    ├── useCities() → select dropdown
                    ├── useCityWeeklyWeather(city) → weather data
                    └── WeatherTabs (Client) → day switcher
```

## API Route Pattern

Контракты, коды ошибок и источники — в `techContext.md`, раздел «API Endpoints». Особенность: route собирает 7 дней из
таблицы `daily_weather` в массив `WeatherDay[]` фиксированного порядка `DAYS_OF_WEEK` (`src/lib/constants.ts`);
отсутствующие значения остаются `undefined`.

## Зависимости между файлами

```
page.tsx
├── hooks/useWeather.ts (useCities) → lib/fetcher.ts
├── hooks/useCityWeeklyWeather.ts → lib/fetcher.ts
├── components/WeatherTabs.tsx
└── styles/page.module.css

lib/fetcher.ts — jsonFetcher: fetch + AbortController, таймаут 10 с
components/Header.tsx → components/BaseContainer.tsx → app/layout.tsx
app/api/weather/route.ts → lib/db.ts → lib/schema.ts → dev.db
lib/constants.ts (DAYS_OF_WEEK) → app/api/weather/route.ts
```

## Работа с базой данных

### SQLite + Drizzle ORM

- **База данных:** `dev.db` — локальный файл SQLite в корне проекта (вне git)
- **Подключение:** `src/lib/db.ts` — singleton `better-sqlite3` + `drizzle`; при импорте выполняет
  `CREATE TABLE IF NOT EXISTS` (побочный эффект модуля — учитывай в тестах)
- **Схема:** `src/lib/schema.ts` — `cities` (`id`, `name`) и `daily_weather` (`id`, `city_id`, `day_of_week`,
  `max_temp_c`, `min_temp_c`, `precipitation_mm`, `pressure_hpa`); в коде поля — camelCase через Drizzle
- **Seed-скрипт:** `src/lib/seed.ts` — читает `mocks/weatherMock.json`; файл удалён в 430242c, поэтому seed сейчас
  не запускается (БД уже наполнена: 7 городов, 49 записей `daily_weather`)
- **Конфигурация:** `drizzle.config.ts` — настройки drizzle-kit для SQLite

### Паттерн подключения к БД

Один экземпляр `better-sqlite3` + `drizzle` в `src/lib/db.ts` (singleton на процесс) плюс `CREATE TABLE IF NOT EXISTS`
при импорте. `src/lib/seed.ts` открывает собственное соединение напрямую через `better-sqlite3` и закрывает его в конце.
Код в документации не дублируется — читай `src/lib/db.ts` и `src/lib/seed.ts`.

### Таблица cities

| Поле | Тип     | Описание              |
| ---- | ------- | --------------------- |
| id   | INTEGER | Первичный ключ (авто) |
| name | TEXT    | Название города       |

### Таблица daily_weather

| Поле             | Тип     | Описание                        |
| ---------------- | ------- | ------------------------------- |
| id               | INTEGER | Первичный ключ (авто)           |
| city_id          | INTEGER | FK → cities.id                  |
| day_of_week      | INTEGER | 0=Понедельник ... 6=Воскресенье |
| max_temp_c       | REAL    | Максимальная температура        |
| min_temp_c       | REAL    | Минимальная температура         |
| precipitation_mm | REAL    | Осадки в мм                     |
| pressure_hpa     | REAL    | Давление в гПа                  |
