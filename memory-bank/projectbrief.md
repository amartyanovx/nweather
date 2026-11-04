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
- Mock данные из локального JSON-файла (`mocks/weatherMock.json`)
- Поддержка 7 городов с вымышленными названиями

## Архитектурные решения

- API route для работы с mock данными → `app/api/weather/route.ts`
- SWR хуки для кэширования и фетчинга → `app/hooks/`
- Server Components по умолчанию, Client Components только где нужна интерактивность

## Технологии

- Next.js 16.4.3 (App Router)
- React 19.3.0 + TypeScript 5.9.3
- SWR ^2.5.1 для data fetching и кэширования
- oxlint ^1.90.0 для линтинга
- Jest ^30.5.2 для unit-тестов
- Playwright ^1.45.2 для E2E-тестов
