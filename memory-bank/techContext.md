# Tech Context: nweather

## Стек

Состав, версии и скрипты — `package.json`; причины выбора библиотек и отклонённые варианты — `systemPatterns.md`. Ниже
только то, что по файлам не выводится.

## Неочевидные настройки

- `next.config.ts` включает флаги нового поведения (`cacheComponents`, `partialPrefetching`): Router ведёт себя не как
  классический — сверяйся с `node_modules/next/dist/docs/`, значения и смысл флагов — конфиг и документация Next.js.
- Alias `@/*` живёт в двух местах — `tsconfig.json` и `moduleNameMapper` в `jest.config.ts`: новый путь добавляй в оба,
  иначе Jest не разрешит импорт.
- Jest шире Playwright по `testMatch` (оба конфига): E2E держим только в `tests/*.spec.ts`, иначе `.test.tsx` из `tests/`
  подхватит Jest.
- `testEnvironment` — Stryker-mixin ради `perTest` (объяснение — комментарий в `jest.config.ts`); Node-окружение
  подключается docblock-ом в `__tests__/api/route.test.ts`.

## API Endpoints

Контракт — `src/app/api/weather/route.ts`, типы ответа — `src/types/weather.ts`.

| Метод | Путь                 | Ответ                                   |
| ----- | -------------------- | --------------------------------------- |
| GET   | `/api/weather`       | `{ cities: string[] }`                  |
| GET   | `/api/weather?city=` | `{ name: string, daily: WeatherDay[] }` |

Ошибки: `404` — неизвестный город, `500` — ошибка БД (`console.error` в логах). Инвариант `daily` — в
`systemPatterns.md`, дни недели — `src/lib/constants.ts`.

## Тестовое окружение

- CSS-модули мокаются в `jest.setup.ts`: в тестах классы сравниваются буквально, а не по хэшам.
- Побочный эффект импорта `src/lib/db.ts` (создание таблиц) учитывай в тестах и при смене схемы — см.
  `systemPatterns.md`.
- Команды, лимиты и требования к проверкам — `AGENTS.md`.
