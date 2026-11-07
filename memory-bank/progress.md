# Progress: nweather

## Состояние

- Каркас Next.js 16 App Router, TypeScript strict, CSS Modules, alias `@/*`.
- `GET /api/weather` читает `cities` и `daily_weather` из `dev.db` через Drizzle; 404/500 обработаны.
- UI: select городов, недельные табы, карточка дня, состояния загрузки и ошибки с повтором.
- Unit-тесты — `__tests__/**` и `tests/WeatherTabs.test.tsx`; пороги покрытия — `jest.config.ts`.
- E2E: один сценарий выбора города — `tests/weather.spec.ts`.
- Не сделано: расширение E2E, Suspense boundaries, реальный Weather API вместо mock-данных.

## Тесты и мутации

- `npm run mutate` мутирует прикладной код, кроме `src/lib/{db,schema,seed}.ts`; пороги и globs — `.stryker.config.js`.
- Два выживших мутанта в `src/app/page.tsx` эквивалентны и не убиваются наблюдением: замена зависимостей
  `useEffect(..., [])` (сравнение массива поэлементное) и `value={selectedCity ?? ''}` (в `<select>` без совпадающей
  опции значение всё равно `''`).
- `tests/WeatherTabs.test.tsx` подхватывает Jest, а не Playwright — см. `techContext.md`.

## Известные дефекты

1. `mocks/weatherMock.json` удалён в коммите 430242c, но `src/lib/seed.ts` и `seed.js` его читают — оба seed-скрипта
   не работают; наполненная `dev.db` (7 городов, 49 записей) существует только как локальный файл.
2. `node seed.js` удаляет `dev.db` до чтения mock-файла: один запуск безвозвратно уничтожает данные.
3. `src/lib/seed.ts` не тестируется и не мутируется: `seed()` на уровне модуля, `Math.random`, `fs`, запись в `dev.db`.
4. `Header.tsx` помечен `'use client'` без необходимости — кандидат на перевод в Server Component.
5. Нет skeleton-загрузки: select не отрисован, пока города грузятся; индикатор прогноза — текст «Загрузка...».
