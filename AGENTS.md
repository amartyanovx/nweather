<!-- BEGIN:nextjs-agent-rules -->

This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Overview

nweather — приложение погоды: Next.js 16 App Router + TypeScript. Знания о проекте — в `memory-bank/`.
Перед задачей открой `memory-bank/index.md` и читай только нужные документы; если документация противоречит коду —
выясни причину, а не предполагай.
Блок `nextjs-agent-rules` выше пишет `next dev`: не редактируй его, остальной файл править можно.

## Код

- Server Components по умолчанию; `'use client'` — только для интерактивности и браузерных API, минимальным островом.
  Данные — по возможности на сервере в Server Components; Suspense — там, где он реально улучшает загрузку.
- Next.js-специфику сверяй по `node_modules/next/dist/docs/` (поиск по `node_modules` ограничен `.clineignore`).
- Строгая типизация без `any` (`unknown` для неизвестного типа); типы пропсов и публичных API — явно; сущности
  Next.js — через `PageProps`, `LayoutProps`, `Metadata`; без необоснованных `as`.
- Один файл — один экспортируемый компонент, ≤200 строк для `src/**` (тесты и конфиги — без лимита).
- Имена: компоненты и типы — PascalCase (`Header`, `WeatherDay`), функции, переменные и хуки — camelCase
  (`useWeather`), файлы компонентов — `Header.tsx`, хуки — `useWeather.ts`, модули и роуты — kebab-case или по
  соглашению App Router (`fetcher.ts`, `route.ts`).
- Комментарий — «почему», а не «что»: если знающему синтаксис читать нечего — комментарий лишний. В тестах намерение —
  в названии, комментарий — только про неочевидное. Без `console.log`, мёртвых блоков и временных флагов.
- Сначала соглашения проекта, потом новые подходы; новые абстракции и зависимости — при обоснованной необходимости.

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

Форматируй изменённые файлы: `npx prettier --write <файлы>`, проверяй `npx prettier --check <файлы>`. Глобальный
`npm run format` безопасен (LF зафиксирован в `.gitattributes`), но затрагивает все `.md`, включая инструкции и конфиги —
запускай осознанно. `npm run format:check` зелёный и остаётся критерием приёмки. Списки оформляй через `-` с отступами
для вложенности — символ `•` Prettier схлопывает в абзац.

## Тесты

- Unit — `__tests__/` (`__tests__/api/` для роутов), имя `<модуль>.test.ts(x)`; CSS-модули мокаются в
  `jest.setup.ts`, модули проекта — по `@/*` через `jest.mock`. Покрывай граничные случаи, ошибки API, битый JSON,
  пустые ответы.
- E2E — `tests/*.spec.ts`, проверяй наблюдаемое поведение. `.test.ts(x)` в `tests/` подхватывает Jest — наборы не
  смешивай.
- После новых или существенно изменённых unit-тестов — `npx stryker run --mutate <модуль>` (полный `npm run mutate`,
  если модулей несколько). Выживших мутантов разбирай, эквивалентных фиксируй с обоснованием. Мутанты не проверяют
  типы — `typecheck` обязателен отдельно.
- После изменений: `npm run lint`, `npm run typecheck`, `npm test`; E2E — если затронуто поведение приложения.
  Не сообщай о пройденных проверках, которых не запускал.

## Данные

`dev.db` вне git — удаление необратимо. Без явного разрешения: `npm run db:seed` (`scripts/seed.ts`), `npm run db:migrate`,
`npm run db:reset`, пересоздание БД. Схема — `src/lib/schema.ts`, подключение — `src/lib/db.ts`, конфиг —
`drizzle.config.ts`, потребители — `GET /api/cities` и `GET /api/forecast` (для E2E нужна уже наполненная база).

## Memory Bank

`memory-bank/index.md` — карта документов и маршрутизация; открывай его первым.
`defects.md` — открытые дефекты и долги, которых нет в коде и `git log`; состояние проекта в документах не хранится
(источник — код и `git log`), архитектуру и технические решения фиксируй при их изменении.
Правила ведения: 
- `memory-bank/maintenance.md` - подгружай только когда обновляешь банк, в остальных задачах не нужны
- `memory-bank/activeContextRules.md`: подгружай только когда обновляешь `memory-bank/local/activeContext.md`
