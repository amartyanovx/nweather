# Active Context: nweather

## Текущий фокус

Покрытие проекта unit-тестами доведено до целевого уровня 85% и выше.
Фактическое покрытие (Jest): statements 97.91%, branches 100%, functions 92.85%, lines 97.67%.

Тестами покрыты: API route `/api/weather` (200/404/500, пустые ответы БД), `jsonFetcher`
(успех, ошибки статусов, timeout через AbortController, невалидный JSON, пустой/null ответ),
хуки `useCities` и `useCityWeeklyWeather`, компоненты `Header`, `BaseContainer`, `WeatherTabs`.

Мутационное тестирование StrykerJS настроено (`.stryker.config.js`), скрипты: `npm run mutate`, `npm run stryker-ci`.

## Недавние изменения

- Добавлена папка `__tests__/api/` с тестами API route (обработка ошибок БД и краевые случаи)
- Расширены тесты `jsonFetcher`: timeout, abort-ветки, ошибка парсинга JSON
- Добавлены edge-case тесты хуков: пустая строка/null как ключ SWR, кодирование названия города
- Удалён нерабочий polyfill `node-fetch` из `jest.setup.ts` (Node 26 даёт `Request`/`Response` глобально)

## Следующие шаги (возможные)

- Расширить E2E-тесты пользовательских сценариев
- Оптимизация производительности через Suspense boundary
- Добавление реального Weather API вместо mock данных

## Важные паттерны и предпочтения

- **Client Components**: используются только для интерактивности (`use client` в `page.tsx` и `WeatherTabs.tsx`)
- **SWR кэширование**: данные кэшируются автоматически, повторные запросы не отправляются
- **Path Alias**: `@/*` → `./*` для импортов
- **CSS Modules**: стили изолированы через модули (styles.module.css)

## Инсайты проекта

- Mock данные генерируют недельный прогноз на основе базовых значений города (+idx для температуры, -idx для осадков)
- `useCityWeeklyWeather` дублирует логику из API route — возможно стоит унифицировать
- BaseContainer сейчас пустой обёртка (return <>{children}</>)
