# Defects: nweather

Дефекты и долги — то, чего нет в коде и `git log`; причины решений — `systemPatterns.md`. `D-NN` не
перенумеровывается, закрытый переносится в «Закрытые» со ссылкой на исправление, а не удаляется.

## Открытые

- `D-03` мок `@/lib/db` не читает аргументы `select`, поэтому мутанты пустых наборов колонок в
  `src/lib/weather/service.ts` не ловятся (`__tests__/lib/weather/service.test.ts`); форму ответа покрывает E2E
  `tests/forecast-api.spec.ts`.
- `D-04` unit-тест лежит в E2E-каталоге: `tests/WeatherTabs.test.tsx` подхватывает Jest, Playwright его игнорирует;
  по `AGENTS.md` юнит-тесты — в `__tests__/`, наборы не смешиваются. Починка — перенести файл в `__tests__/`.

## Закрытые

- `D-01` сид и миграции неидемпотентны → upsert по `slug` (`scripts/seed.ts`) и миграции вместо DDL —
  `systemPatterns.md` §6.
- `D-02` `db.ts` создавал таблицы при импорте → только открывает базу — `systemPatterns.md` §6.
