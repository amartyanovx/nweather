# Progress: nweather

## Что работает ✅

- [x] Базовая структура Next.js 16 App Router проекта
- [x] API route `/api/weather` — получение списка городов и погоды по городу
- [x] Исходные mock-данные (7 городов): `mocks/weatherMock.json` удалён в 430242c, данные уже загружены в `dev.db`
- [x] SWR хуки: `useCities()` (`useWeather.ts`) и `useCityWeeklyWeather(city)` — `useCityWeather` удалён при переходе на БД
- [x] Главная страница с выбором города через select dropdown
- [x] Отображение погодных данных: температура, осадки, давление
- [x] WeatherTabs компонент для переключения дней недели (кликабельные табы)
- [x] CSS Modules стилизация
- [x] TypeScript строгая типизация
- [x] Jest конфигурация для unit-тестов
- [x] Playwright конфигурация для E2E-тестов
- [x] SQLite база данных (`dev.db`)
- [x] Drizzle ORM: схема `lib/schema.ts`, подключение `lib/db.ts`
- [x] Seed-скрипт `src/lib/seed.ts` — загрузка городов из mock в БД (сейчас не работает: mock-файл удалён)

- [x] Unit-тесты для API route и хуков (папка `__tests__/api/`)
- [x] Unit-тесты главной страницы и layout: `__tests__/page.test.tsx`, `__tests__/layout.test.tsx`
- [x] Мутационное тестирование StrykerJS: score 98.47% (мутируются все прикладные модули, кроме db/schema/seed)
- [ ] Расширение E2E тестов для покрытия всех сценариев
- [ ] Suspense boundaries для оптимизации стриминга
- [x] Обработка edge cases: пустой ответ БД, timeout (AbortController), network error, невалидный JSON, 404/500 в API route
- [ ] Интеграция с реальным Weather API (замена mock данных)
- [x] Интеграция SQLite + Drizzle ORM — база данных создана, seed выполнен
- [x] API route читает данные из БД через Drizzle ORM (таблицы `cities` и `daily_weather`)
- [x] Обновление схемы БД: добавлена таблица `daily_weather` для хранения данных о погоде на неделю
- [x] Обновлён API route `/api/weather?city=` — теперь возвращает реальные данные из таблицы `daily_weather`
- [x] Обновлён хук `useCityWeeklyWeather.ts` — убирает дублирование логики генерации дней недели
- [x] Добавлен StrykerJS для мутационного тестирования. Конфигурация находится в `.stryker.config.js`. Скрипты: `npm run mutate`, `npm run stryker-ci`

## Мутационное тестирование (актуальное состояние)

- Конфиг `.stryker.config.js`: `coverageAnalysis: 'perTest'`, `mutate: ['src/**/*.{ts,tsx}', '!src/lib/{db,schema,seed}.ts']`,
  `disableTypeChecks: 'src/**/*.{ts,tsx}'`, `ignorePatterns: ['coverage','reports','test-results','.next','.stryker-tmp']`,
  `timeoutMS: 10000`, `thresholds: { high: 90, low: 80, break: 75 }`
- `perTest` требует mixin-окружений Stryker: `jest.config.ts` → `testEnvironment: '@stryker-mutator/jest-runner/jest-env/jsdom'`,
  `__tests__/api/route.test.ts` → docblock `@jest-environment @stryker-mutator/jest-runner/jest-env/node`
- Итоговый прогон `npx stryker run`: **98.47%** (127 killed + 2 timeout + 2 survived), exit code 0.
  По файлам: route.ts 100%, fetcher.ts 100%, WeatherTabs.tsx 100%, хуки 100%, Header.tsx 100%,
  BaseContainer.tsx 100%, layout.tsx 100%, page.tsx 96.30%
- Два выживших мутанта в `page.tsx` эквивалентны поведению и не убиваются наблюдением:
  `useEffect(..., [])` → `['Stryker was here']` (сравнение deps поэлементное) и `value={selectedCity ?? ''}`
  → `'Stryker was here!'` (в `<select>` без совпадающей опции `value` всё равно `''`)
- Непокрытые ранее `page.tsx` и `layout.tsx` закрыты тестами `__tests__/page.test.tsx` (15 тестов) и
  `__tests__/layout.test.tsx` (3 теста); layout проверяется через `renderToStaticMarkup`, т.к. React DOM
  не рендерит `<html>`/`<body>` внутрь тестового контейнера

Проект находится на начальной стадии. Основная функциональность реализована и работает, но требует расширения покрытия тестами.

## Известные проблемы и замечания

1. **`mocks/weatherMock.json` удалён** (коммит 430242c), но `src/lib/seed.ts` его читает — seed сейчас не запускается;
   `dev.db` уже наполнена (7 городов, 49 записей `daily_weather`)
2. **`seed.ts` не покрыт и не мутируется**: `seed()` вызывается на уровне модуля, используются `Math.random`, `fs`,
   `dev.db` — нужен рефакторинг перед тестированием
3. **Нет skeleton loader**: индикатор загрузки — текст `Загрузка...`, до выбора города select пустой
4. **`BaseContainer`** — обёртка с `base.module.css` и `<Header />`, собственной логики нет
5. **`@types/react-dom` добавлен в devDependencies**: нужен для типизации `react-dom/server` в тесте layout

## Эволюция проектных решений

1. **Initial decision**: Использовать Server Components по умолчанию → подтверждено как правильный выбор для производительности
2. **SWR vs React Query**: Выбран SWR из-за простой интеграции с Next.js и встроенного кэширования
3. **Mock данные вместо API**: Временное решение для разработки, позже заменить на реальный API

## Сжатие инструкций агентов (2026-11-07)

- `AGENTS.md`, `.clinerules/core.md`, `.clinerules/directory.md` и `.clinerules/roles/*.md` переписаны компактнее:
  постоянно загружаемые правила ~30 КБ → ~12 КБ, роли — 8.5 КБ → ~4 КБ.
- Введено разделение владельцев: проектные факты — `AGENTS.md`, процесс оркестрации — `core.md`, оболочка и
  файловые операции — `directory.md`, знания — `memory-bank/`. Дубли (8 правил в 2–4 местах) убраны ссылками.
- Значения порогов (`coverageThreshold`, Stryker `thresholds`, Playwright `timeout`) больше не пересказываются в
  инструкциях — источник истины только конфиги.
- Синхронизированы `memory-bank/techContext.md` и `systemPatterns.md`: убраны `eslint-config-next`, «150-200 строк»,
  `format:check` как норма и `testMatch` без `?(x)`, дерево структуры приведено к `src/**`.
- Удалены пустые каталоги в корне: `srcapp/`, `srccomponents/`, `srchooks/`, `srclib/`, `srcstyles/`, `srctypes/`.
- Репозиторий отформатирован: `npm run format:check` зелёный (раньше baseline — 25 файлов). Добавлен `.gitattributes`
  (`* text=auto eol=lf`), чтобы CRLF не возвращался после checkout на Windows и проверка формата не краснела.
