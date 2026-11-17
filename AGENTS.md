<!-- BEGIN:nextjs-agent-rules -->

This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Overview

nweather — приложение погоды: Next.js 16 App Router + TypeScript. Знания о проекте — в `memory-bank/`.
Перед задачей открой `memory-bank/index.md` и читай только нужные документы; если документация противоречит коду —
выясни причину, а не предполагай.
Стек, технические соглашения, команды, тесты и операции с данными — `memory-bank/techContext.md`; открывай его, когда нужен
любой из этих разделов, а не перед каждой правкой кода.
Блок `nextjs-agent-rules` выше пишет `next dev`: не редактируй его, остальной файл править можно.

Правила работы — `.clinerules/`: `core.md` у основного агента, `reviewer.md` у независимого ревьюера. `reviewer.md` помечен
`disabled` и в контекст основной сессии не попадает: его читает reviewer, запущенный отдельной сессией Cline CLI по правилам
`core.md` §«Как запустить reviewer».

## Код

- Строгая типизация без `any` (`unknown` для неизвестного типа); типы пропсов и публичных API — явно; без необоснованных
  `as`.
- Один экспортируемый компонент на файл
- Размер файла — ориентир, а не лимит: заметно больше 200 строк — повод разделить по ответственности, если части
  меняются и тестируются независимо; дробление ради числа — искусственное усложнение (тесты и конфиги — без ориентира)
- Имена: компоненты и типы — PascalCase (`Header`), функции, переменные и хуки — camelCase (`useWeather`), файлы
  компонентов — `Header.tsx`, хуки — `useWeather.ts`, модули и роуты — kebab-case или по соглашению фреймворка.
- Комментарий — «почему», а не «что»: если знающему синтаксис читать нечего — комментарий лишний. В тестах намерение —
  в названии, комментарий — только про неочевидное. Без `console.log`, мёртвых блоков и временных флагов
- Сначала соглашения проекта, потом новые подходы; новые абстракции и зависимости — при обоснованной необходимости
- Фреймворк-специфику не додумывай: соглашения стека и ссылка на его документацию — `memory-bank/techContext.md`

## Проверки

- Линт, проверка типов и форматирование изменённых файлов обязательны; остальные проверки и их триггеры — по
  матрице `.clinerules/core.md` §«Проверки». Команды и их назначение — `memory-bank/techContext.md`
- Изменённые файлы форматируй точечно, а не `npm run format` (команды и их область — `memory-bank/techContext.md`).
  Критерий приёмки — `prettier --check` по изменённым файлам
- Списки оформляй через `-` с отступами для вложенности: символ `•` Prettier схлопывает в абзац

## Опасные операции

- Необратимые и разрушительные операции (данные и схема БД, зависимости, деплой) и правки инструкций либо конфигов
  проверок — только с явного разрешения пользователя; полный перечень полномочий — `.clinerules/core.md` §«Полномочия»
- Ослабление проверок запрещено безусловно (`oxlint-disable`, `@ts-expect-error`, снижение порогов, пропуск тестов)
- Конкретика данных проекта (файл БД, seed, миграции) — `memory-bank/techContext.md`

## Memory Bank

`memory-bank/index.md` — карта документов и маршрутизация; открывай его первым. Cостояние проекта в документах не
хранится (источник — код и `git log`), архитектуру и технические решения фиксируй при их изменении.
