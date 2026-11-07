# Active Context: nweather

## Текущий фокус

Юнит-тесты и мутационное тестирование доведены до целевого уровня.
Jest: 56 тестов, 10 сьютов, statements 98.48% / branches 100% / functions 95.23% / lines 98.36%.
Stryker: 98.47% mutation score (127 killed + 2 timeout + 2 эквивалентных survived), `npm run mutate` зелёный.

Тестами покрыты: API route `/api/weather`, `jsonFetcher`, хуки `useCities`/`useCityWeeklyWeather`,
компоненты `Header`/`BaseContainer`/`WeatherTabs`, главная страница `page.tsx` (город, день недели,
загрузка, ошибки, retry через `mutate`) и `layout.tsx` (metadata, `<html lang>`, children в BaseContainer).

По файлам mutation score: все модули 100%, кроме `page.tsx` — 96.30% (2 эквивалентных мутанта).

## Недавние изменения

- P2: новый `__tests__/page.test.tsx` (15 тестов): моки `@/hooks/useWeather`, `@/hooks/useCityWeeklyWeather`
  и `swr.mutate`, фиксированная дата через `jest.useFakeTimers()` + `jest.setSystemTime` (4 ноября 2026 → индекс 2)
- P3: новый `__tests__/layout.test.tsx` (3 теста); layout рендерится через `renderToStaticMarkup`,
  т.к. React DOM не вставляет `<html>`/`<body>` в тестовый контейнер; `@/app/globals.css` замокан
- В devDependencies добавлен `@types/react-dom` (типизация `react-dom/server`)
- P1/P4 (ранее): добиты мутанты `clearTimeout`, guard `!controller.signal.aborted`, текст `console.error`,
  className табов; конфиг Stryker переведён на `coverageAnalysis: 'perTest'` с `thresholds` и `mutate`-исключениями

## Следующие шаги (возможные)

- Рефакторинг `seed.ts` (вызов на уровне модуля, `Math.random`, `fs`, `dev.db`) и включение его в `mutate`
- Расширить E2E-тесты (Playwright), Suspense boundaries, реальный Weather API вместо mock данных

## Важные паттерны и предпочтения

- **Client Components**: только `page.tsx` и `WeatherTabs.tsx` (`'use client'`)
- **Path Alias**: `@/*` → `./src/*`; в тестах моки модулей — по алиасу (`jest.mock('@/hooks/useWeather')`)
- **CSS Modules**: замоканы в `jest.setup.ts` (`tab`, `active`, `container`, ...), поэтому классы проверяются буквально
- **Stryker perTest**: требует mixin-окружений `@stryker-mutator/jest-runner/jest-env/{jsdom,node}` в jest.config/docblock
