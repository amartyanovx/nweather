# Project Brief: nweather

## Описание

nweather — приложение погоды на Next.js 16 App Router с TypeScript, использующее SWR для кэширования данных.

## Цели

- Отображение прогноза погоды по выбранному городу
- Удобный интерфейс с переключением дней недели через табы
- Быстрая загрузка данных благодаря SWR кэшированию и server components

## Ключевые требования

- Строгая типизация TypeScript (без `any`)
- SSR-first подход с минимальным использованием Client Components
- Данные хранятся в SQLite БД (`dev.db`) через Drizzle ORM
- Поддержка 7 городов с вымышленными названиями

## Архитектурные решения

- API route для работы с БД → `src/app/api/weather/route.ts`
- SWR хуки для кэширования и фетчинга → `src/hooks/` (`useWeather.ts`, `useCityWeeklyWeather.ts`)
- Server Components по умолчанию, Client Components только где нужна интерактивность

## Технологии

Стек и версии — в `techContext.md` (здесь не дублируются).
