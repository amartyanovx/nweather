# Progress: nweather

[16:15][08-11-26] Бэкенд переписан по `backend-plan.md`.

## Состояние

- Каркас Next.js App Router, TypeScript strict, CSS Modules, alias `@/*`.
- БД: одна таблица `cities` — 100 реальных городов из `src/data/cities.json`; миграции — `./drizzle`, сид — `scripts/seed.ts`.
- API: `/api/cities`, `/api/forecast` (неделя и день в таймзоне города) и deprecated `/api/weather` под текущий UI.
- Прогноз генерируется по запросу и кэшируется в памяти — `src/lib/weather/` (generator, cache, dates, service, errors).
- UI не менялся: select городов, табы, карточка дня, skeleton, ошибка с повтором.
- Unit-тесты — `__tests__/**` и `tests/WeatherTabs.test.tsx`; E2E — `tests/weather.spec.ts`, `tests/forecast-api.spec.ts`.
- Дефекты 1–3 закрыты: сид один и рабочий, `dev.db` пересоздаётся только явным `db:reset`, импорт `db.ts` больше не
  создаёт таблицы.
- Memory Bank в бюджете: 14 025 символов при лимите 15 000 (`wc -m memory-bank/*.md`); бюджет и правила — `index.md`.

## Тесты и мутации

- `npm run mutate` мутирует прикладной код; что исключено и с какими порогами — `.stryker.config.js`.
- Эквивалентные мутанты в `generator.ts`: замена `<` на `<=` в границах весов и в сравнении с нулём — различия только в
  точках, недостижимых на практике (ровно граница весов, `minTempC === 0`).
- Мутанты пустых наборов колонок в `service.ts` не ловятся: мок БД не читает аргументы `select`, форму ответа проверяют
  E2E-спеки.
- Ловушка `testMatch`: `tests/*.test.tsx` подхватывает Jest, а не Playwright — см. `techContext.md`.

## Известные дефекты и ограничения

1. Deprecated-адаптер `/api/weather` и хуки `src/hooks/*` подлежат удалению в задаче переделки фронта: переход на
   `/api/cities` и `/api/forecast`, slug вместо русских названий (`src/app/api/weather/route.ts`).
2. Прогноз не детерминирован: день стабилен только в пределах процесса (кэш), после рестарта значения другие — ожидаемое
   следствие решения из `systemPatterns.md`.
