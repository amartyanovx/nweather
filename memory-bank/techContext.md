# Tech Context: nweather

## Технологии

| Категория     | Технология       | Версия  | Назначение                        |
| ------------- | ---------------- | ------- | --------------------------------- |
| Фреймворк     | Next.js          | 16.4.3  | App Router, SSR, API routes       |
| UI            | React + ReactDOM | 19.3.0  | Компоненты, хуки, рендеринг       |
| Язык          | TypeScript       | 5.9.3   | Статическая типизация             |
| Data Fetching | SWR              | ^2.5.1  | Кэширование и фетчинг данных      |
| Линтинг       | oxlint           | ^1.90.0 | Проверка качества кода            |
| Unit-тесты    | Jest             | ^30.5.2 | Тестирование компонентов и утилит |
| E2E-тесты     | Playwright       | ^1.45.2 | Сквозное тестирование             |
| База данных   | SQLite           |latest | Локальная файловая БД              |
| ORM           | Drizzle          | latest | Типизированные запросы к БД        |

## Зависимости

### Production

```json
{
  "next": "16.4.3",
  "react": "19.3.0",
  "react-dom": "19.3.0",
  "swr": "^2.5.1",
  "drizzle-orm": "latest",
  "better-sqlite3": "latest"
}
```

### Development

```json
{
  "@babel/core": "^7.24.0",
  "@playwright/test": "^1.45.2",
  "@types/jest": "^29.5.2",
  "@babel/preset-env": "^7.23.2",
  "@babel/preset-typescript": "^7.23.2",
  "@types/react": "19.3.0",
  "babel-jest": "^30.5.2",
  "eslint-config-next": "16.4.3",
  "jest": "^30.5.2",
  "oxlint": "^1.90.0",
  "typescript": "^5.9.3",
  "@types/better-sqlite3": "latest",
  "drizzle-kit": "latest"
}
```

## Настройка окружения

### Path Alias

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### TypeScript Configuration

- Target: ES2017
- Strict mode: enabled
- JSX: react-jsx (automatic runtime)
- Module resolution: bundler
- Types: node, jest

## Команды разработки

| Команда            | Описание                      |
| ------------------ | ----------------------------- |
| `npm run dev`      | Запуск dev-сервера (next dev) |
| `npm run build`    | Production build (next build) |
| `npm start`        | Запуск production-сервера     |
| `npm run lint`     | Линтинг через oxlint          |
| `npm run lint:fix` | Автофикс линтинга             |
| `npm run test`     | Unit-тесты через Jest         |
| `npm run e2e`      | E2E-тесты через Playwright    |

## Jest Configuration

- **Transform**: babel-jest для .ts/.tsx файлов
- **Test Match**: `**/*.test.[jt]s`
- **Coverage**: собирается в папку `coverage/`
- **Clear Mocks**: автоматически перед каждым тестом

## API Endpoints

```typescript
// Список городов
GET /api/weather
Response: { cities: string[] }

// Погода по городу
GET /api/weather?city=Лунный%20Берег
Response: { name: string, daily: WeatherDay[] }
```

## Constraints

- Запрещено использовать тип `any` — только строгая типизация
- Server Components по умолчанию, Client Components только где нужна интерактивность
- Один файл = один экспортируемый компонент (максимум 150-200 строк)
- PascalCase для компонентов и интерфейсов, camelCase для функций и переменных
- kebab-case для файлов роутов
