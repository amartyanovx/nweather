# Tech Context: nweather

## Технологии

| Категория      | Технология       | Версия  | Назначение                           |
| -------------- | ---------------- | ------- | ------------------------------------ |
| Фреймворк      | Next.js          | 16.4.3  | App Router, SSR, API routes          |
| UI             | React + ReactDOM | 19.3.0  | Компоненты, хуки, рендеринг          |
| Язык           | TypeScript       | 5.9.3   | Статическая типизация                |
| Data Fetching  | SWR              | ^2.5.1  | Кэширование и фетчинг данных         |
| Линтинг        | oxlint           | ^1.90.0 | Проверка качества кода               |
| Unit-тесты     | Jest             | ^30.5.2 | Тестирование компонентов и утилит    |
| E2E-тесты      | Playwright       | ^1.45.2 | Сквозное тестирование                |
| Форматирование | Prettier         | ^3.9.10 | Единый стиль кода (.prettierrc.json) |
| База данных    | SQLite           | latest  | Локальная файловая БД                |
| ORM            | Drizzle          | latest  | Типизированные запросы к БД          |

## Зависимости

Полный список в файле `package.json`.

### Production-зависимости

`next`, `react`, `react-dom`, `swr`, `drizzle-orm`, `better-sqlite3`

### Development-зависимости

`@babel/core`, `@playwright/test`, `@types/jest`, `@babel/preset-env`, `@babel/preset-typescript`, `@types/react`, `babel-jest`, `eslint-config-next`, `jest`, `oxlint`, `typescript`, `@types/better-sqlite3`, `drizzle-kit`

## Настройка окружения

### Path Alias

Настройка в `tsconfig.json`:

- `paths["@/*"]` → `./*`

### TypeScript Configuration

Конфигурация в `tsconfig.json`:

- Target: ES2017
- Strict mode: enabled
- JSX: react-jsx (automatic runtime)
- Module resolution: bundler
- Types: node, jest

## Команды для разработки

Полный список скриптов в `package.json` в разделе scripts.

## Тестирование (Jest)

Конфигурация в `jest.config.ts`.

- **Transform**: babel-jest для .ts/.tsx файлов
- **Test Match**: `**/*.test.[jt]s`
- **Coverage**: собирается в папку `coverage/`
- **Clear Mocks**: автоматически перед каждым тестом

## API Endpoints

Исходники в `app/api/weather/route.ts`.

| Метод | Путь                               | Описание         | Ответ                                   |
| ----- | ---------------------------------- | ---------------- | --------------------------------------- |
| GET   | `/api/weather`                     | Список городов   | `{ cities: string[] }`                  |
| GET   | `/api/weather?city=Лунный%20Берег` | Погода по городу | `{ name: string, daily: WeatherDay[] }` |

## Constraints

- Запрещено использовать тип `any` — только строгая типизация
- Server Components по умолчанию, Client Components только где нужна интерактивность
- Один файл = один экспортируемый компонент (максимум 150-200 строк)
- PascalCase для компонентов и интерфейсов, camelCase для функций и переменных
- kebab-case для файлов роутов

## Форматирование (Prettier)

Конфигурация: `.prettierrc.json`  
Игнорируемый файл: `.prettierignore`

**Команды**

| Команда                | Описание                |
| ---------------------- | ----------------------- |
| `npm run format`       | Форматирование файлов   |
| `npm run format:check` | Проверка форматирования |

**Покрытие:** `.ts`, `.tsx`, `.js`, `.json`, `.css`, `.md`

**Соглашения** — автоформатируйте код перед коммитом, проверяйте через `npm run lint && npm run format:check`
