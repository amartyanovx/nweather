# Tech Context: nweather

## Стек

Состав, версии и скрипты — `package.json`; причины выбора библиотек — `systemPatterns.md`. Ниже только неочевидное.

## Неочевидные настройки

- `next.config.ts` включает `cacheComponents`, `partialPrefetching`: Router ведёт себя не как классический — сверяйся с
  `node_modules/next/dist/docs/`.
- Миграции — `./drizzle`, не `./migrations` (последний в `.gitignore`); `dbCredentials` нужен только для `drizzle-kit migrate`.
- Alias `@/*` живёт в `tsconfig.json` и в `moduleNameMapper` (`jest.config.ts`), но `@/types` там **нет** — runtime-значения
  держим в `@/lib/constants`, из `@/types` импортируем только типы.
- Jest шире Playwright по `testMatch`: E2E — только `tests/*.spec.ts`, иначе `.test.tsx` из `tests/` подхватит Jest.
- `testEnvironment` — Stryker-mixin ради `perTest` (комментарий в `jest.config.ts`); Node-окружение подключается
  docblock-ом `@stryker-mutator/jest-runner/jest-env/node` в тестах API и модулей `src/lib`.
- `node scripts/seed.ts` печатает `MODULE_TYPELESS_PACKAGE_JSON`: в `package.json` нет `"type": "module"`, Node
  определяет ESM по синтаксису. Это ожидаемо, конфиг не меняем.

## API Endpoints

Контракт — `src/types/weather.ts`, реализация — `src/app/api/*/route.ts`, правила дат — `src/lib/weather/dates.ts`.

| Метод | Путь                                | Ответ                                                        |
| ----- | ----------------------------------- | ------------------------------------------------------------ |
| GET   | `/api/cities`                       | `{ cities: CityDTO[] }` (пустая БД — `{ cities: [] }`)       |
| GET   | `/api/forecast?city=<slug>[&date=]` | `{ city, weekStart, days: ForecastDay[] }` — 7 дней или один |

Ошибки — JSON `{ error: { code, message } }` с русским сообщением: `400 INVALID_QUERY` (нет `city`, невалидный `date`),
`404 CITY_NOT_FOUND`, `500 INTERNAL` (ошибка БД, логируется). Фронт тела ошибок не разбирает: показывает общий текст с
повтором. Поиск по городам — только на клиенте (`src/lib/cityQuery.ts`).

## Тестовое окружение

- CSS-модули мокаются в `jest.setup.ts` фиксированным списком: новые классы (поиск, подсказки, `skeletonInput`) в нём
  отсутствуют — тесты проверяют роли и тексты.
- Тесты API мокают `@/lib/db` и `connection` из `next/server`; кэш прогноза — реальный, со `resetWeatherCache()`.
- `npm run e2e` требует наполненной базы (правила — `AGENTS.md`); `webServer` сам делает `build && start`.
- Команды, лимиты и требования к проверкам — `AGENTS.md`.
