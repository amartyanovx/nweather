/**
 * Мутационное тестирование только по прикладному коду.
 * `db.ts`, `schema.ts` и `seed.ts` — инфраструктура: покрываются отдельной задачей
 * (seed требует рефакторинга: вызов на уровне модуля, Math.random, fs, dev.db).
 * @type {import('@stryker-mutator/core').ConfigOptions}
 */
module.exports = {
  coverageAnalysis: 'perTest',
  testRunner: 'jest',
  mutate: ['src/**/*.{ts,tsx}', '!src/lib/{db,schema,seed}.ts'],
  // Многие файлы проекта (HTML-отчёты покрытия, .next) не проходят парсер Babel.
  disableTypeChecks: 'src/**/*.{ts,tsx}',
  ignorePatterns: ['coverage', 'reports', 'test-results', '.next', '.stryker-tmp'],
  timeoutMS: 10000,
  thresholds: {
    high: 90,
    low: 80,
    break: 75,
  },
};
