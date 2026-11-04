# System Patterns: nweather

## Архитектура системы

```
nweather/
├── app/                          # Next.js App Router
│   ├── api/weather/route.ts      # API route (GET /api/weather)
│   │                             # Без query → список городов
│   │                             # С ?city=Название → данные погоды по городу
│   ├── components/               # UI компоненты
│   │   ├── BaseContainer.tsx     # Пустая обёртка для children
│   │   └── WeatherTabs.tsx       # Клиентский компонент табов дней недели
│   ├── hooks/                    # SWR хуки
│   │   ├── useWeather.ts         # useCities() + useCityWeather(city)
│   │   └── useCityWeeklyWeather.ts  # useCityWeeklyWeather(city) → WeatherDay[]
│   ├── page.tsx                  # Главная страница (Client Component)
│   ├── layout.tsx                # Корневой layout
│   ├── globals.css               # Глобальные стили
│   └── styles.module.css         # CSS Modules для страницы
├── lib/                          # Бизнес-логика
│   └── fetcher.ts                # jsonFetcher<T>(url) → Promise<T>
├── mocks/                        # Mock данные
│   └── weatherMock.json          # 7 городов с базовыми погодными данными
├── tests/                        # E2E тесты (Playwright)
│   ├── weather.spec.ts
│   └── WeatherTabs.test.tsx
├── __tests__/                    # Unit тесты (Jest)
│   └── api/
```

## Ключевые технические решения

### 1. Data Fetching паттерн (SWR + jsonFetcher)

- `jsonFetcher<T>(url)` — универсальная функция для fetch с типизацией
- SWR хуки кэшируют данные автоматически, предотвращая повторные запросы
- Conditional fetching: null ключ пропускает запрос

### 2. Server Components по умолчанию

- `layout.tsx` и API route — server components (без `'use client'`)
- `page.tsx` — client component из-за useState/useEffect
- `WeatherTabs.tsx` — client component из-за onClick обработчиков

### 3. Database Data Pattern (SQLite + Drizzle ORM)

- Данные хранятся в `dev.db` (SQLite) через Drizzle ORM
- API route выполняет SQL-запросы к таблицам `cities` и `daily_weather` через Drizzle
- Недельный прогноз хранится в БД: 7 записей на каждый город (по одной на день недели)
- Seed-скрипт `lib/seed.ts` загружает начальные данные из `mocks/weatherMock.json` в БД

### 4. Компонентная архитектура

- Один компонент = один файл
- Интерфейсы для пропсов (WeatherTabs.Props)
- CSS Modules для изоляции стилей

## Связь компонентов

```
layout.tsx (Server)
    └── BaseContainer (Server)
            └── page.tsx (Client)
                    ├── useCities() → select dropdown
                    ├── useCityWeeklyWeather(city) → weather data
                    └── WeatherTabs (Client) → day switcher
```

## API Route Pattern

```typescript
GET /api/weather           → { cities: string[] }
GET /api/weather?city=Лунный%20Берег → { name, daily: WeatherDay[] }
```

Данные для каждого дня недели хранятся в таблице `daily_weather` (city_id → 7 записей на город).

## Зависимости между файлами

```
page.tsx
├── useWeather.ts → lib/fetcher.ts
├── useCityWeeklyWeather.ts → lib/fetcher.ts
└── WeatherTabs.tsx

api/weather/route.ts → dev.db (SQLite + Drizzle ORM)
useCityWeeklyWeather.ts получает данные напрямую из API — без дублирования логики генерации
```

## Работа с базой данных

### SQLite + Drizzle ORM

- **База данных:** `dev.db` — локальный файл SQLite в корне проекта
- **Подключение:** `lib/db.ts` — singleton через модуль Node.js (один экземпляр на процесс)
- **Схема:** `lib/schema.ts` — таблицы: `cities` (id, name) и `daily_weather` (id, city_id, day_of_week, maxTempC, minTempC, precipitationMm, pressureHpa)
- **Seed-скрипт:** `lib/seed.ts` — загружает города из `mocks/weatherMock.json` в БД через Drizzle ORM
- **Конфигурация:** `drizzle.config.ts` — настройки drizzle-kit для SQLite

### Паттерн подключения к БД

```typescript
// lib/db.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database(path.join(process.cwd(), 'dev.db'));
export const db = drizzle(sqlite);
```

### Таблица cities

| Поле    | Тип      | Описание              |
|---------|----------|-----------------------|
| id      | INTEGER  | Первичный ключ (авто)|
| name    | TEXT     | Название города       |

### Таблица daily_weather

| Поле             | Тип     | Описание                      |
|------------------|---------|-------------------------------|
| id               | INTEGER | Первичный ключ (авто)         |
| city_id          | INTEGER | FK → cities.id                |
| day_of_week      | INTEGER | 0=Понедельник ... 6=Воскресенье |
| max_temp_c       | REAL    | Максимальная температура      |
| min_temp_c       | REAL    | Минимальная температура       |
| precipitation_mm | REAL    | Осадки в мм                   |
| pressure_hpa     | REAL    | Давление в гПа                |

