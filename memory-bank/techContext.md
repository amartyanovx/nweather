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

Полный список — `package.json` (scripts, dependencies, devDependencies). Сверх таблицы выше ключевое: `drizzle-orm` и
`better-sqlite3` (БД), `@stryker-mutator/*` (мутационное тестирование), `@testing-library/*` и `identity-obj-proxy`
(unit-тесты), `prettier` (форматирование), `drizzle-kit` (миграции и схема).

## Настройка окружения

### Path Alias

Настройка в `tsconfig.json`:

- `paths["@/*"]` → `./src/*`

### Next.js Configuration

Конфигурация в `next.config.ts`:

- `cacheComponents: true`, `partialPrefetching: true` — кэширование и префетчинг отличаются от классического App Router,
  поведение сверяй по `node_modules/next/dist/docs/`.

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
- **Test Match**: `**/*.test.[jt]s?(x)`
- **Coverage**: в `coverage/`, порог 85% по statements/branches/functions/lines (`coverageThreshold`)
- **Clear Mocks**: автоматически перед каждым тестом
- **Test Environment**: `@stryker-mutator/jest-runner/jest-env/jsdom` — mixin-окружение, нужен для Stryker `perTest`;
  в `__tests__/api/route.test.ts` через docblock подключается node-вариант

Мутационное тестирование — `.stryker.config.js` (`npm run mutate`): мутируются `src/**/*.{ts,tsx}`, кроме
`src/lib/{db,schema,seed}.ts`.

## API Endpoints

Исходники в `src/app/api/weather/route.ts` (запросы через Drizzle к `dev.db`).

| Метод | Путь                               | Описание         | Ответ                                   |
| ----- | ---------------------------------- | ---------------- | --------------------------------------- |
| GET   | `/api/weather`                     | Список городов   | `{ cities: string[] }`                  |
| GET   | `/api/weather?city=Лунный%20Берег` | Погода по городу | `{ name: string, daily: WeatherDay[] }` |

Неизвестный город → `404 City not found`; ошибка БД → `500 Internal Server Error` (`console.error` в логах).

## Constraints

Правила кода — типизация, Server/Client Components, лимит 200 строк на модуль `src/**`, именование — описаны в
`AGENTS.md`, раздел «Код». Здесь они не дублируются.

## Форматирование (Prettier)

Конфигурация: `.prettierrc.json`  
Игнорируемый файл: `.prettierignore`

Форматируй только изменённые файлы: `npx prettier --write <файлы>`, проверяй `npx prettier --check <файлы>`.
Покрытие: `.ts`, `.tsx`, `.js`, `.json`, `.css`, `.md`.

`npm run format:check` зелёный: расхождение формата — регрессия, её нужно исправлять. Глобальный `npm run format`
безопасен (LF зафиксирован в `.gitattributes`), но затрагивает все `.md`, включая `.clinerules/**` и `AGENTS.md`,
поэтому запускай его осознанно и просматривай diff.
