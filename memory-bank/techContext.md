# Tech Context: nweather

## Стек

Состав, версии и скрипты — `package.json`; причины выбора библиотек — `systemPatterns.md`. Здесь — соглашения стека,
назначение команд, тесты, контракт API и данные.

## Соглашения Next.js

- Server Components по умолчанию; `'use client'` — только для интерактивности и браузерных API, минимальным островом.
  Данные — по возможности на сервере в Server Components; Suspense — там, где он реально улучшает загрузку
- Сущности Next.js — через `PageProps`, `LayoutProps`, `Metadata`
- Next.js-специфику сверяй по `node_modules/next/dist/docs/` (поиск по `node_modules` ограничен `.clineignore`)

## Неочевидные настройки

- `next.config.ts` включает `cacheComponents`, `partialPrefetching`: Router ведёт себя не как классический — сверяйся с
  документацией стека (§«Соглашения Next.js»)
- Миграции — `./drizzle`, не `./migrations` (последний в `.gitignore`); `dbCredentials` нужен только для `drizzle-kit migrate`
- Alias `@/*` живёт в `tsconfig.json` и в `moduleNameMapper` (`jest.config.ts`), но `@/types` там **нет** — runtime-значения
  держим в `@/lib/constants`, из `@/types` импортируем только типы
- `node scripts/seed.ts` печатает `MODULE_TYPELESS_PACKAGE_JSON`: в `package.json` нет `"type": "module"`, Node
  определяет ESM по синтаксису. Это ожидаемо, конфиг не меняем

## Команды

| Команда             | Назначение                                                                  |
| ------------------- | --------------------------------------------------------------------------- |
| `npm run dev`       | dev-сервер, порт 3000 — гаси после задачи                                   |
| `npm run lint`      | oxlint                                                                      |
| `npm run typecheck` | проверка типов (`tsc --noEmit`)                                             |
| `npm test`          | Jest с покрытием; порог и маппинг модулей — `jest.config.ts`                |
| `npm run e2e`       | Playwright; нужен готовый `dev.db`, `webServer` сам делает `build && start` |
| `npm run mutate`    | Stryker, длительный прогон; пороги и globs — `.stryker.config.js`           |
| `npm run build`     | production-сборка (`.next/`, native `better-sqlite3`)                       |

- Точечное форматирование — `npx prettier --write <файлы>`, проверка — `npx prettier --check <файлы>`; `npm run format` и
  `format:check` берут весь репозиторий (LF зафиксирован в `.gitattributes`)
- Данные — `npm run db:generate`, `db:migrate`, `db:seed`, `db:reset` (необратимо, см. §«Данные»)

## API Endpoints

Контракт — `src/types/weather.ts`, реализация — `src/app/api/*/route.ts`, правила дат — `src/lib/weather/dates.ts`.

| Метод | Путь                                | Ответ                                                        |
| ----- | ----------------------------------- | ------------------------------------------------------------ |
| GET   | `/api/cities`                       | `{ cities: CityDTO[] }` (пустая БД — `{ cities: [] }`)       |
| GET   | `/api/forecast?city=<slug>[&date=]` | `{ city, weekStart, days: ForecastDay[] }` — 7 дней или один |

Ошибки — JSON `{ error: { code, message } }` с русским сообщением: `400 INVALID_QUERY` (нет `city`, невалидный `date`),
`404 CITY_NOT_FOUND`, `500 INTERNAL` (ошибка БД, логируется). Фронт тела ошибок не разбирает: показывает общий текст с
повтором. Поиск по городам — только на клиенте (`src/lib/cityQuery.ts`).

## Тесты

- Unit — `__tests__/` (`__tests__/api/` для роутов), имя `<модуль>.test.ts(x)`; E2E — `tests/*.spec.ts`, проверяется
  наблюдаемое поведение. `.test.ts(x)` в `tests/` подхватывает Jest, Playwright его игнорирует — наборы не смешивай
- Покрывай граничные случаи, ошибки API, битый JSON, пустые ответы
- CSS-модули мокаются в `jest.setup.ts` фиксированным списком: новые классы (поиск, подсказки, `skeletonInput`) в нём
  отсутствуют — тесты проверяют роли и тексты; модули проекта — по `@/*` через `jest.mock`
- Тесты API мокают `@/lib/db` и `connection` из `next/server`; кэш прогноза — реальный, со `resetWeatherCache()`
- `testEnvironment` — Stryker-mixin ради `perTest` (комментарий в `jest.config.ts`); Node-окружение подключается
  docblock-ом `@stryker-mutator/jest-runner/jest-env/node` в тестах API и модулей `src/lib`
- Мутации — `npx stryker run --mutate <модуль>`; выживших разбирай, эквивалентных фиксируй с обоснованием; типы мутанты не
  проверяют — `typecheck` обязателен отдельно. Когда запускать — матрица в `.clinerules/core.md` §«Проверки»
- Эквивалентные мутанты зафиксированы: квантор `+` в `WORD_SEPARATORS` (`src/lib/cityQuery.ts`) — `splitWords`
  отбрасывает пустые строки; `<` → `<=` в весах и в сравнении с нулём (`src/lib/weather/generator.ts`) — различия
  недостижимы
- Правила кода и критерии приёмки — `AGENTS.md`

## Данные

`dev.db` вне git: `npm run db:reset` пересоздаёт файл безвозвратно, seed и миграции меняют данные — политика разрешений в
`.clinerules/core.md` §«Полномочия и конфигурация». Схема — `src/lib/schema.ts`, подключение — `src/lib/db.ts`, конфиг —
`drizzle.config.ts`, потребители — `GET /api/cities` и `GET /api/forecast`.
