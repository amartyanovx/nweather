# Active Context: nweather

## Текущий фокус

Memory Bank сверен с кодом и конфигами: актуализированы пути `src/**`, path alias, клиентские компоненты, контракты API,
схема БД. Ранее инструкции агентов были сжаты (постоянно загружаемые правила ~30 КБ → ~12 КБ) и репозиторий приведён к
Prettier. Открытая находка: `mocks/weatherMock.json` удалён в 430242c, но `src/lib/seed.ts` его читает — seed не
запускается, `dev.db` уже наполнена (7 городов, 49 записей).

Тесты и мутация в норме: Jest 56 тестов (statements 98.48% / branches 100% / functions 95.23% / lines 98.36%),
Stryker 98.47% (127 killed + 2 timeout + 2 эквивалентных survived), `npm run mutate` зелёный.

## Недавние изменения

- [2026-11-07] Разделены владельцы правил: проектные факты — `AGENTS.md`, процесс оркестрации — `.clinerules/core.md`,
  оболочка и пути — `.clinerules/directory.md`; в ролях остались только роль, обязанности и формат результата
- [2026-11-07] Устранены противоречия в `memory-bank/techContext.md` (`eslint-config-next`, «150-200 строк»,
  `format:check` как норма, `testMatch`) и устаревшее дерево структуры в `systemPatterns.md` (теперь `src/**`)
- [2026-11-07] Удалены пустые каталоги-артефакты в корне: `srcapp/`, `srccomponents/`, `srchooks/`, `srclib/`,
  `srcstyles/`, `srctypes/`
- [2026-11-07] Репозиторий приведён к Prettier (`format:check` зелёный), добавлен `.gitattributes` (`* text=auto eol=lf`);
  формулировка про `npm run format` в `AGENTS.md` переписана под актуальное состояние
- [2026-11-07] Memory Bank сверен с кодом: пути `src/**`, `paths["@/*"] → ./src/*`, состав Client Components (`page`,
  `WeatherTabs`, `Header`), контракты API и коды 404/500, схема `daily_weather`, находка про удалённый
  `mocks/weatherMock.json`
- P2/P3 (ранее): тесты `page.test.tsx` (15) и `layout.test.tsx` (3), фиксация даты через fake timers

## Следующие шаги (возможные)

- Рефакторинг `seed.ts` (вызов на уровне модуля, `Math.random`, `fs`, `dev.db`) и включение его в `mutate`
- Расширить E2E (Playwright), Suspense boundaries, реальный Weather API вместо mock данных

## Важные паттерны и предпочтения

- **Client Components**: `page.tsx`, `WeatherTabs.tsx`, `Header.tsx` (`'use client'`)
- **Path Alias**: `@/*` → `./src/*`; в тестах моки модулей — по алиасу (`jest.mock('@/hooks/useWeather')`)
- **CSS Modules**: замоканы в `jest.setup.ts`, поэтому классы проверяются буквально
- **Stryker perTest**: требует mixin-окружений `@stryker-mutator/jest-runner/jest-env/{jsdom,node}`
