# Tech Context: nweather

## Стек

Состав, версии и скрипты — `package.json`; причины выбора библиотек — `systemPatterns.md`. Здесь — соглашения стека,
назначение команд, тесты, контракт API и данные.

## Соглашения Next.js

- Server Components по умолчанию; `'use client'` — только для интерактивности и браузерных API, минимальным островом.
  Данные — по возможности на сервере в Server Components; Suspense — там, где он реально улучшает загрузку
- `params` динамического маршрута читаются не в самой `page`, а в async-компоненте внутри `<Suspense>` — иначе оболочка
  маршрута зависела бы от URL (`partialPrefetching`); пример — `src/app/city/[slug]/page.tsx`
- Сущности Next.js — через `PageProps`, `LayoutProps`, `Metadata`; исключение — page с dynamic params: локальный
  `interface Props { params: Promise<...> }` (как `layout.tsx` без `LayoutProps`), потому что `PageProps<'/маршрут'>`
  появляется только после `next dev`/`build`/`typegen`, а `npm run typecheck` их не запускает
- Next.js-специфику сверяй по `node_modules/next/dist/docs/` (поиск по `node_modules` ограничен `.clineignore`)

## Неочевидные настройки

- `next.config.ts` включает `cacheComponents`, `partialPrefetching`: Router ведёт себя не как классический — сверяйся с
  документацией стека (§«Соглашения Next.js»)
- Миграции — `./drizzle`, не `./migrations` (последний в `.gitignore`); `dbCredentials` нужен только для `drizzle-kit migrate`
- Alias `@/*` живёт в `tsconfig.json` и в `moduleNameMapper` (`jest.config.ts`), но `@/types` там **нет** — runtime-значения
  держим в `@/lib/constants`, из `@/types` импортируем только типы
- `node scripts/seed.ts` печатает `MODULE_TYPELESS_PACKAGE_JSON`: в `package.json` нет `"type": "module"`, Node
  определяет ESM по синтаксису. Это ожидаемо, конфиг не меняем
- `.prettierrc.json` переопределяет `trailingComma: none` для `**/*.jsonc`: VS Code не принимает хвостовые запятые в
  `.jsonc`, а базовый `trailingComma: all` их добавлял

## Команды

| Команда                | Назначение                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | dev-сервер, порт 3000 — гаси после задачи                                                                |
| `npm run lint`         | oxlint                                                                                                   |
| `npm run typecheck`    | проверка типов (`tsc --noEmit`)                                                                          |
| `npm test`             | Jest с покрытием; порог и маппинг модулей — `jest.config.ts`                                             |
| `npm run e2e`          | Playwright; нужна наполненная база (`npm run db:seed`), `webServer` сам делает `build && start`          |
| `npm run mutate`       | Stryker, длительный прогон; пороги и globs — `.stryker.config.js`                                        |
| `npm run build`        | production-сборка (`.next/`, native `better-sqlite3`)                                                    |
| `npm run quality-gate` | AI Quality Gate: артефакты, guard Harness/CI, lint, typecheck, fallow audit (`scripts/quality-gate.mts`) |

- Точечное форматирование — `npx prettier --write <файлы>`, проверка — `npx prettier --check <файлы>`; `npm run format` и
  `format:check` берут весь репозиторий (LF зафиксирован в `.gitattributes`)
- `npm run quality-gate` — первая стадия CI (`.github/workflows/ci.yml`), далее `Tests` и `Build`; подмножество стадий —
  `npm run quality-gate -- <стадия>`. Стадии gate: `artifact-hygiene` → `guard-integrity` → `lint` → `typecheck` →
  `fallow-audit`. Guard сверяет изменения от `merge-base` с базой PR. Подтверждение
  правки защищённых Harness/CI-файлов — repository variable `HARNESS_ACK_SHA` (меняет только владелец репозитория);
  значение действует только для своего коммита, поэтому новый коммит требует нового значения и повторного прогона
  (`gh run rerun`: установка переменной событий Actions не создаёт). Локально это сигнал, а не авторизация:
  `QUALITY_GATE_HARNESS_ACK_SHA=$(git rev-parse HEAD) npm run quality-gate`; барьер дают переменная, required status check
  и ревью diff. Асимметрия сознательная: ignored/untracked `.env*.local` допускается, tracked — блокируется; ignored
  `.env`/`.env.production` блокируются. PR исполняет свою копию `ci.yml` и скрипта, поэтому защита harness — ревью diff и
  required check, а не сам скрипт. Барьер включён ruleset `master` на default branch (не legacy branch protection):
  required status checks «AI Quality Gate (static)» и «Build», плюс запрет deletion и force-push; обязательных ревью нет
  (0 approvals), поэтому подтверждение harness держится на `HARNESS_ACK_SHA`. `SKIP` (нет базы) печатается как «не проверено»
  и блокировкой не становится: exit code 0, барьер — ревью и required check. Ограничение: одно значение `HARNESS_ACK_SHA`
  на репозиторий, поэтому параллельные PR с правкой harness конфликтуют; снятие — `--body ""`. CI — три стадии по
  цепочке `needs`: «AI Quality Gate (static)» → `Tests` (`npm test`, включая регрессию gate
  `__tests__/qualityGate.test.ts`) → `Build`; следующая стартует только при зелёной предыдущей. Lint/typecheck —
  однократно в первой стадии, тесты — однократно во второй. `fallow-audit` запускает `fallow audit --gate new-only` от
  merge-base: блокируют только новые нарушения, унаследованный долг gate исключает; ошибка определения базы — FAIL, а не
  SKIP. Конфиг `.fallowrc.jsonc` защищён guard'ом наравне со скриптом. `next build`
  дополнительно проверяет типы по всему проекту — дублирование `tsc` в CI принято, проверку сборки не отключаем
- Данные — `npm run db:generate`, `db:migrate`, `db:seed`, `db:reset` (необратимо, см. §«Данные»)

## API Endpoints

Контракт — `src/types/weather.ts`, реализация — `src/app/api/*/route.ts`, правила дат — `src/lib/weather/dates.ts`.

| Метод | Путь                                | Ответ                                                                      |
| ----- | ----------------------------------- | -------------------------------------------------------------------------- |
| GET   | `/api/cities`                       | `{ cities: CityDTO[] }` (пустая БД — `{ cities: [] }`)                     |
| GET   | `/api/forecast?city=<slug>[&date=]` | `{ city: ForecastCity, weekStart, days: ForecastDay[] }` — 7 дней или один |

`ForecastCity` (`src/types/weather.ts`) — все поля `CityDTO` плюс `timezone`; профиль для страницы города приходит тем
же ответом, что и неделя. `/api/cities` остаётся без `timezone` и без `id`.

Ошибки — JSON `{ error: { code, message } }` с русским сообщением: `400 INVALID_QUERY` (нет `city`, невалидный `date`),
`404 CITY_NOT_FOUND`, `500 INTERNAL` (ошибка БД, логируется). Фронт тела ошибок не разбирает: показывает общий текст с
повтором. Поиск по городам — только на клиенте (`src/lib/cityQuery.ts`).

## Тесты

- Unit — `__tests__/` (`__tests__/api/` для роутов), имя `<модуль>.test.ts(x)`; E2E — `tests/*.spec.ts`, проверяется
  наблюдаемое поведение. `.test.ts(x)` в `tests/` подхватывает Jest, Playwright его игнорирует — наборы не смешивай
- E2E, которым нужен экран погоды, авторизуются хелпером `authenticate` из `tests/auth.ts` (init script ставит
  `sessionStorage`); `tests/auth.spec.ts` проверяет сам вход без хелпера
- `CityView` получает `slug` пропом, поэтому его unit-тесты не мокают `next/navigation`; связка `params → slug` в
  `src/app/city/[slug]/page.tsx` покрыта E2E. E2E-локаторы при включённом `<Activity>` — ролевые и со скоупом видимой
  области: скрытые маршруты остаются в DOM
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
  недостижимы; в `src/components/CityView.tsx` — `?? []` (`days` — либо массив, либо `undefined`; при `undefined` экран
  отдаёт `null` по `!city`); в `CityView.tsx`/`page.tsx` — `{' '}` → `{""}` (пробел между текстом и кнопкой — оформление,
  не наблюдаемое поведение)
- Правила кода и критерии приёмки — `AGENTS.md`

## Данные

`dev.db` вне git: `npm run db:reset` пересоздаёт файл безвозвратно, seed и миграции меняют данные — политика разрешений в
`.clinerules/core.md` §«Полномочия». Схема — `src/lib/schema.ts`, подключение — `src/lib/db.ts`, конфиг —
`drizzle.config.ts`, потребители — `GET /api/cities` и `GET /api/forecast`.
