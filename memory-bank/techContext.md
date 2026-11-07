# Tech Context: nweather

## Стек

Next.js 16 (App Router) + React 19, TypeScript strict, SWR для клиентского фетчинга, SQLite через Drizzle ORM и
`better-sqlite3`, Jest + Testing Library для unit, Playwright для E2E, Stryker для мутаций, oxlint и Prettier.
Точные версии и скрипты — `package.json`.

## Неочевидные настройки

- `next.config.ts`: `cacheComponents: true`, `partialPrefetching: true` — поведение отличается от классического App
  Router; сверяйся с `node_modules/next/dist/docs/`.
- Path alias `@/*` → `./src/*` задан в `tsconfig.json` и продублирован в `jest.config.ts` (`moduleNameMapper`): новый
  alias нужно добавлять в оба файла, иначе Jest не разрешит импорт.
- `jest.config.ts`, `testMatch` — `**/*.test.[jt]s?(x)`: файлы `.test.tsx` внутри `tests/` подхватывает Jest, поэтому
  E2E держим только в `*.spec.ts` (`playwright.config.ts`, `testMatch` — `/\.spec\.ts$/`).
- `testEnvironment` — mixin `@stryker-mutator/jest-runner/jest-env/jsdom`, это требование Stryker при
  `coverageAnalysis: 'perTest'`. Node-вариант подключается docblock-ом в `__tests__/api/route.test.ts`; в обычном
  прогоне Jest оба окружения ведут себя как стандартные jsdom/node.
- Пороги покрытия, мутационные `thresholds` и Playwright `timeout` живут только в конфигах — в документации не
  дублируются.

## API Endpoints

Исходник — `src/app/api/weather/route.ts` (запросы через Drizzle к `dev.db`).

| Метод | Путь                               | Описание         | Ответ                                   |
| ----- | ---------------------------------- | ---------------- | --------------------------------------- |
| GET   | `/api/weather`                     | Список городов   | `{ cities: string[] }`                  |
| GET   | `/api/weather?city=Лунный%20Берег` | Погода по городу | `{ name: string, daily: WeatherDay[] }` |

Неизвестный город → `404 City not found`; ошибка БД → `500 Internal Server Error` (`console.error` в логах).
`daily` всегда 7 элементов в порядке `DAYS_OF_WEEK` (`src/lib/constants.ts`); отсутствующий день — `undefined`.

## Тестовое окружение

- `jest.setup.ts` мокает `next/image` и CSS-модули `@/styles/*.module.css`, поэтому классы в тестах сравниваются
  буквально, а не по хэшам.
- `src/lib/db.ts` выполняет `CREATE TABLE IF NOT EXISTS` при импорте — побочный эффект модуля, учитывай в тестах и при
  изменении схемы.
- Команды, лимиты и требования к проверкам — `AGENTS.md`.
