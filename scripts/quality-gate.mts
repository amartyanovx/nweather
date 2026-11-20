/**
 * AI Quality Gate — статические проверки и Fallow audit по изменениям.
 *
 * Запуск: `npm run quality-gate` (все стадии) или `npm run quality-gate -- <стадии>` (подмножество).
 * Один файл без импортов проекта: Node запускает `.mts` без сборки (расширение снимает
 * `MODULE_TYPELESS_PACKAGE_JSON` у `scripts/seed.ts`), а импорт проектных модулей потребовал бы
 * расширения `.ts`, запрещённого tsconfig.
 *
 * Политика: содержимое файлов не читается — только имена; build-выходы и сгенерированные файлы
 * (`node_modules/`, `.next/`, `coverage/`, `dev.db`, `next-env.d.ts`, `*.tsbuildinfo`, …) вне охвата.
 * Guard сверяет изменения Harness/CI от `merge-base` с базой PR; миграции `drizzle/**` — данные,
 * а не harness, поэтому защищёнными не считаются.
 *
 * Подтверждение изменений Harness/CI — repository variable `HARNESS_ACK_SHA` (в CI её передают как
 * `QUALITY_GATE_HARNESS_ACK_SHA`): значение действует только для своего коммита, новый коммит требует
 * нового подтверждения. Локальное значение — сигнал, а не авторизация.
 *
 * Стадия `fallow-audit` запускает `fallow audit --gate new-only` относительно merge-base с базой PR:
 * новые нарушения блокируют, унаследованные — нет; ошибка определения базы — FAIL, а не SKIP.
 *
 * `SKIP` означает, что проверка не выполнялась, и в итоге печатается как «не проверено».
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

type StageName = 'artifact-hygiene' | 'guard-integrity' | 'lint' | 'typecheck' | 'fallow-audit';
type StageStatus = 'FAIL' | 'PASS' | 'SKIP';

interface StageResult {
  readonly name: StageName;
  readonly status: StageStatus;
  readonly reason: string;
  readonly details: readonly string[];
}

interface ArtifactRule {
  readonly pattern: RegExp;
  readonly reason: string;
}

interface GitResult {
  readonly ok: boolean;
  readonly stdout: string;
  readonly error: string | null;
}

interface BaseResolution {
  readonly base: string | null;
  readonly status: 'FAIL' | 'SKIP';
  readonly note: string;
}

const STAGE_ORDER: readonly StageName[] = [
  'artifact-hygiene',
  'guard-integrity',
  'lint',
  'typecheck',
  'fallow-audit',
];

/** Ограничение на печать: массовый артефакт не должен раздувать лог и `GITHUB_STEP_SUMMARY`. */
const MAX_DETAILS = 50;

/** Правила по basename в нижнем регистре: в CI (Linux) регистр значим, локально Windows — нет. */
const ARTIFACT_RULES: readonly ArtifactRule[] = [
  { pattern: /\.log(\.[0-9]+)?$/, reason: 'лог' },
  { pattern: /\.tmp$|\.temp$/, reason: 'временный файл' },
  { pattern: /\.bak$|\.orig$|\.rej$/, reason: 'резервная копия или патч' },
  { pattern: /\.swp$|\.swo$|~$/, reason: 'файл редактора' },
  { pattern: /^nul$/, reason: 'устройство Windows' },
  { pattern: /^\.ds_store$|^thumbs\.db$|^desktop\.ini$/, reason: 'артефакт ОС' },
  { pattern: /^\.env(\..+)?$/, reason: 'файл окружения: может содержать секреты' },
  { pattern: /^id_(rsa|dsa|ecdsa|ed25519)$/, reason: 'приватный ключ' },
  { pattern: /\.(pem|key|p12|pfx|keystore|jks)$/, reason: 'приватный ключ или хранилище' },
  {
    pattern: /^(credentials?|secrets?)[a-z0-9._-]*\.(json|ya?ml|txt|env)$/,
    reason: 'файл с секретами',
  },
  { pattern: /^cline_mcp_settings\.json$/, reason: 'настройки MCP: ключи и токены' },
];

/** Источник файла: от него зависит применение allowlist локальных env-файлов. */
type ArtifactSource = 'tracked' | 'untracked' | 'ignored';

/** Легитимные образцы окружения: в них нет значений, поэтому имена разрешены. */
const ARTIFACT_ALLOWLIST: readonly string[] = ['.env.example', '.env.sample', '.env.template'];

/**
 * Локальные env-файлы (`.env.local`, `.env.development.local`, …): Next.js-соглашение и уже
 * `.gitignore`. Локально они ожидаемы (ignored/untracked), но в git попадать не должны.
 */
const LOCAL_ENV_PATTERN = /^\.env(\.[a-z0-9-]+)*\.local$/;

/** Исключения — пути от корня (сегменты), а не basename: правила по ним не применяются. */
const BUILD_ARTIFACT_PREFIXES: readonly string[] = [
  '.git',
  '.next',
  '.stryker-tmp',
  '.venv',
  'build',
  'coverage',
  'dist',
  'memory-bank/local',
  'node_modules',
  'out',
  'reports',
  'stryker-output',
  'test-results',
  'vendor',
];

const BUILD_ARTIFACT_FILES: readonly string[] = ['dev.db', 'next-env.d.ts'];
const BUILD_ARTIFACT_SUFFIXES: readonly string[] = ['.tsbuildinfo'];

/** Harness/CI: изменение этих путей требует подтверждения человеком. */
const PROTECTED_FILES: readonly string[] = [
  '.clineignore',
  '.fallowrc.jsonc',
  '.gitattributes',
  '.gitignore',
  '.gitmodules',
  '.node-version',
  '.npmrc',
  '.nvmrc',
  '.oxlintrc.json',
  '.prettierignore',
  '.prettierrc.json',
  '.stryker.config.js',
  'AGENTS.md',
  'babel.config.js',
  'drizzle.config.ts',
  'jest.config.ts',
  'jest.setup.ts',
  'next.config.ts',
  'package-lock.json',
  'package.json',
  'playwright.config.ts',
  'scripts/quality-gate.mts',
  '__tests__/qualityGate.test.ts',
  'tsconfig.json',
];

const PROTECTED_DIRS: readonly string[] = ['.github'];

const write = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const runGit = (args: readonly string[]): GitResult => {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) {
    return { ok: false, stdout: '', error: result.error.message };
  }
  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    return {
      ok: false,
      stdout: '',
      error: stderr.length > 0 ? stderr : `git ${args.join(' ')}: код ${result.status}`,
    };
  }
  return { ok: true, stdout: result.stdout, error: null };
};

const toPaths = (stdout: string): string[] => stdout.split('\0').filter((path) => path.length > 0);

const listGitPaths = (args: readonly string[]): { files: string[]; error: string | null } => {
  const result = runGit(args);
  return { files: result.ok ? toPaths(result.stdout) : [], error: result.error };
};

const normalizePath = (file: string): string => file.replace(/\\/g, '/');

const basename = (file: string): string => file.slice(file.lastIndexOf('/') + 1).toLowerCase();

const isBuildArtifact = (file: string): boolean => {
  const normalized = normalizePath(file).toLowerCase().replace(/\/+$/, '');
  const inPrefix = BUILD_ARTIFACT_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
  if (inPrefix) return true;
  if (BUILD_ARTIFACT_FILES.includes(normalized)) return true;
  return BUILD_ARTIFACT_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};

const matchArtifactRule = (file: string, source: ArtifactSource): ArtifactRule | null => {
  const name = basename(file);
  if (ARTIFACT_ALLOWLIST.includes(name)) return null;
  // Локальный env-файл допустим только вне git: tracked `.env*.local` утекает в репозиторий.
  if (source !== 'tracked' && LOCAL_ENV_PATTERN.test(name)) return null;
  return ARTIFACT_RULES.find((rule) => rule.pattern.test(name)) ?? null;
};

const limitDetails = (items: readonly string[]): string[] => {
  if (items.length <= MAX_DETAILS) return [...items];
  return [...items.slice(0, MAX_DETAILS), `и ещё ${items.length - MAX_DETAILS}`];
};

const runArtifactHygiene = (): StageResult => {
  const name: StageName = 'artifact-hygiene';
  const tracked = listGitPaths(['ls-files', '-z', '--cached']);
  const untracked = listGitPaths(['ls-files', '-z', '--others', '--exclude-standard']);
  // --directory: игнорируемые каталоги отдаются одной записью, node_modules не обходится.
  const ignored = listGitPaths([
    'ls-files',
    '-z',
    '--others',
    '--ignored',
    '--exclude-standard',
    '--directory',
  ]);

  const error = tracked.error ?? untracked.error ?? ignored.error;
  if (error !== null) {
    return {
      name,
      status: 'FAIL',
      reason: 'git недоступен или каталог не репозиторий',
      details: [error],
    };
  }

  const collections: readonly { files: readonly string[]; source: ArtifactSource }[] = [
    { files: tracked.files, source: 'tracked' },
    { files: untracked.files, source: 'untracked' },
    { files: ignored.files, source: 'ignored' },
  ];

  const seen = new Set<string>();
  const violations: string[] = [];
  for (const collection of collections) {
    for (const file of collection.files) {
      if (isBuildArtifact(file) || seen.has(file)) continue;
      const rule = matchArtifactRule(file, collection.source);
      if (rule === null) continue;
      seen.add(file);
      violations.push(`${file} — ${rule.reason} (${collection.source})`);
    }
  }

  if (violations.length === 0) {
    return {
      name,
      status: 'PASS',
      reason: 'временных файлов, логов и файлов с секретами в именах нет',
      details: [],
    };
  }

  return {
    name,
    status: 'FAIL',
    reason: `найдено ${violations.length}: уберите артефакты из рабочего дерева`,
    details: [
      ...limitDetails(violations),
      'tracked — файл уже в git: удалите из индекса; untracked и ignored — удалите с диска.',
    ],
  };
};

const commitExists = (ref: string): boolean =>
  runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).ok;

const isZeroSha = (value: string): boolean => /^0+$/.test(value);

const resolveBase = (): BaseResolution => {
  const explicit = (process.env.QUALITY_GATE_BASE ?? '').trim();
  const inCi = (process.env.CI ?? '').length > 0;

  if (explicit.length > 0) {
    if (isZeroSha(explicit)) {
      return {
        base: null,
        status: 'SKIP',
        note: `QUALITY_GATE_BASE=${explicit} — нулевой SHA (первый push ветки)`,
      };
    }
    if (!commitExists(explicit)) {
      // В CI база приходит из события PR: недоступность — ошибка настройки (fetch), а не повод молчать.
      return {
        base: null,
        status: inCi ? 'FAIL' : 'SKIP',
        note: `QUALITY_GATE_BASE=${explicit} отсутствует в истории: нужен fetch базовой ветки`,
      };
    }
    return { base: explicit, status: 'SKIP', note: `база: ${explicit}` };
  }

  if (inCi) {
    return {
      base: null,
      status: 'SKIP',
      note: 'база не передана событием: guard применяется к PR, для push его нет',
    };
  }

  for (const candidate of ['origin/HEAD', 'master']) {
    if (commitExists(candidate)) {
      return { base: candidate, status: 'SKIP', note: `база: ${candidate}` };
    }
  }

  return {
    base: null,
    status: 'SKIP',
    note: 'нет базы сравнения: нет ни QUALITY_GATE_BASE, ни origin/HEAD, ни master',
  };
};

/**
 * База для `fallow audit`: возвращает merge-base или ошибку. В отличие от guard, ошибка здесь —
 * это FAIL, а не SKIP: пропуск проверки по изменениям недопустим.
 */
const resolveAuditBase = (): { base: string | null; error: string | null } => {
  const explicit = (process.env.QUALITY_GATE_BASE ?? '').trim();

  if (explicit.length > 0) {
    if (isZeroSha(explicit)) {
      return {
        base: null,
        error: `QUALITY_GATE_BASE=${explicit} — нулевой SHA (первый push ветки): база не определена`,
      };
    }
    if (!commitExists(explicit)) {
      return {
        base: null,
        error: `QUALITY_GATE_BASE=${explicit} отсутствует в истории: нужен fetch базовой ветки`,
      };
    }
    const mergeBase = runGit(['merge-base', explicit, 'HEAD']);
    if (!mergeBase.ok || mergeBase.stdout.trim().length === 0) {
      return {
        base: null,
        error: `не удалось вычислить merge-base с ${explicit}: ${mergeBase.error ?? 'нет общего предка'}`,
      };
    }
    return { base: mergeBase.stdout.trim(), error: null };
  }

  // Локально и при workflow_dispatch базы из события нет: берём расхождение с веткой по умолчанию.
  let lastError: string | null = null;
  for (const candidate of ['origin/HEAD', 'origin/main', 'origin/master', 'master', 'main']) {
    if (!commitExists(candidate)) continue;
    const mergeBase = runGit(['merge-base', candidate, 'HEAD']);
    if (mergeBase.ok && mergeBase.stdout.trim().length > 0) {
      return { base: mergeBase.stdout.trim(), error: null };
    }
    lastError = `не удалось вычислить merge-base с ${candidate}: ${mergeBase.error ?? 'нет общего предка'}`;
  }

  return {
    base: null,
    error:
      lastError ??
      'нет базы сравнения: нет ни QUALITY_GATE_BASE, ни origin/HEAD, ни origin/main, ни master',
  };
};

const isProtected = (file: string): boolean => {
  const normalized = normalizePath(file);
  if (PROTECTED_FILES.includes(normalized)) return true;
  return PROTECTED_DIRS.some((dir) => normalized === dir || normalized.startsWith(`${dir}/`));
};

const runGuardIntegrity = (): StageResult => {
  const name: StageName = 'guard-integrity';
  const resolution = resolveBase();
  if (resolution.base === null) {
    return { name, status: resolution.status, reason: resolution.note, details: [] };
  }

  // merge-base, а не двуточечный diff: иначе в изменения попадут файлы, которые база получила
  // после ветвления, и guard даст ложную блокировку на отставшей ветке.
  const mergeBase = runGit(['merge-base', resolution.base, 'HEAD']);
  if (!mergeBase.ok) {
    return {
      name,
      status: 'FAIL',
      reason: `не удалось вычислить merge-base с ${resolution.base}`,
      details: [mergeBase.error ?? 'git merge-base завершился с ошибкой'],
    };
  }
  const base = mergeBase.stdout.trim();

  const tracked = listGitPaths(['diff', '--name-only', '-z', base]);
  const untracked = listGitPaths(['ls-files', '-z', '--others', '--exclude-standard']);
  const error = tracked.error ?? untracked.error;
  if (error !== null) {
    return {
      name,
      status: 'FAIL',
      reason: 'git недоступен или каталог не репозиторий',
      details: [error],
    };
  }

  const changed = [...new Set([...tracked.files, ...untracked.files].map(normalizePath))].sort();
  const protectedChanges = changed.filter(isProtected);

  if (protectedChanges.length === 0) {
    return {
      name,
      status: 'PASS',
      reason: `защищённые файлы не изменены (база: ${base.slice(0, 12)})`,
      details: [],
    };
  }

  const details = limitDetails(protectedChanges);
  const head = runGit(['rev-parse', 'HEAD']).stdout.trim().toLowerCase();
  const ackSha = (process.env.QUALITY_GATE_HARNESS_ACK_SHA ?? '').trim().toLowerCase();

  if (ackSha.length > 0 && ackSha === head) {
    return {
      name,
      status: 'PASS',
      reason: `изменения Harness/CI подтверждены для ${head.slice(0, 12)} (${protectedChanges.length})`,
      details,
    };
  }

  return {
    name,
    status: 'FAIL',
    reason: `изменены защищённые файлы Harness/CI (${protectedChanges.length})`,
    details: [
      `база сравнения: ${base.slice(0, 12)}, текущий HEAD: ${head.slice(0, 12)}`,
      ...details,
      ackSha.length > 0
        ? `подтверждение относится к ${ackSha.slice(0, 12)} — для этого коммита нужно новое значение.`
        : 'подтверждения для этого коммита нет.',
      'Источник подтверждения: repository variable HARNESS_ACK_SHA = SHA коммита (ставит владелец репозитория).',
      'Локально значение — сигнал; барьер дают repository variable, required status check и ревью diff.',
    ],
  };
};

const runNpmScript = (name: StageName, script: string): StageResult => {
  // Одна строка команды без массива аргументов: на Node 26 массив вместе с shell даёт DEP0190.
  const result = spawnSync(`npm run ${script}`, { shell: true, stdio: 'inherit' });
  if (result.error) {
    return {
      name,
      status: 'FAIL',
      reason: `не удалось запустить npm run ${script}`,
      details: [result.error.message],
    };
  }
  if (result.status === 0) {
    return { name, status: 'PASS', reason: 'exit code 0', details: [] };
  }
  const status = result.status === null ? 'процесс прерван сигналом' : `exit code ${result.status}`;
  return { name, status: 'FAIL', reason: `npm run ${script}: ${status}`, details: [] };
};

const runFallowAudit = (): StageResult => {
  const name: StageName = 'fallow-audit';
  const resolution = resolveAuditBase();
  if (resolution.base === null) {
    return {
      name,
      status: 'FAIL',
      reason: 'не удалось определить базу для fallow audit',
      details: [resolution.error ?? 'неизвестная ошибка'],
    };
  }

  // new-only: блокируют только новые нарушения, унаследованный долг не мешает. База — merge-base.
  const result = spawnSync(
    `npx --no-install fallow audit --base ${resolution.base} --gate new-only`,
    { shell: true, stdio: 'inherit' },
  );
  if (result.error) {
    return {
      name,
      status: 'FAIL',
      reason: 'не удалось запустить fallow audit',
      details: [result.error.message],
    };
  }
  if (result.status === 0) {
    return {
      name,
      status: 'PASS',
      reason: `новых блокирующих нарушений нет (база: ${resolution.base.slice(0, 12)})`,
      details: [],
    };
  }
  const status = result.status === null ? 'процесс прерван сигналом' : `exit code ${result.status}`;
  return {
    name,
    status: 'FAIL',
    reason: `fallow audit: ${status}`,
    details: [`база сравнения: ${resolution.base.slice(0, 12)}`],
  };
};

const STAGE_RUNNERS: Readonly<Record<StageName, () => StageResult>> = {
  'artifact-hygiene': runArtifactHygiene,
  'guard-integrity': runGuardIntegrity,
  lint: () => runNpmScript('lint', 'lint'),
  typecheck: () => runNpmScript('typecheck', 'typecheck'),
  'fallow-audit': runFallowAudit,
};

const isStageName = (value: string): value is StageName =>
  STAGE_ORDER.some((name) => name === value);

const selectStages = (
  args: readonly string[],
): { stages: readonly StageName[]; unknown: readonly string[] } => {
  const unknown = args.filter((arg) => !isStageName(arg));
  if (args.length === 0) return { stages: STAGE_ORDER, unknown };
  return { stages: STAGE_ORDER.filter((name) => args.includes(name)), unknown };
};

const skippedNote = (results: readonly StageResult[]): string => {
  const names = results.filter((result) => result.status === 'SKIP').map((result) => result.name);
  return names.length > 0 ? `не проверено: ${names.join(', ')}` : '';
};

const printResults = (results: readonly StageResult[]): number => {
  write('AI Quality Gate (static)');
  write('');
  for (const result of results) {
    const reason = result.status === 'SKIP' ? `не проверено: ${result.reason}` : result.reason;
    write(`[${result.status}] ${result.name} — ${reason}`);
    for (const detail of result.details) write(`  - ${detail}`);
  }

  const failed = results.filter((result) => result.status === 'FAIL').length;
  const notes = [skippedNote(results)];
  if (results.length < STAGE_ORDER.length) {
    notes.push(`запущено ${results.length} из ${STAGE_ORDER.length} стадий`);
  }
  const suffix = notes.filter((note) => note.length > 0).join('; ');

  write('');
  if (failed > 0) {
    write(`Quality Gate: FAIL (${failed} из ${results.length})`);
    if (suffix.length > 0) write(suffix);
  } else {
    write(suffix.length > 0 ? `Quality Gate: PASS (${suffix})` : 'Quality Gate: PASS');
  }
  return failed === 0 ? 0 : 1;
};

/** Краткий отчёт для GitHub Actions: статусы стадий и причины блокировки. */
const appendStepSummary = (results: readonly StageResult[]): void => {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath === undefined || summaryPath.length === 0) return;

  const lines = [
    '## AI Quality Gate',
    '',
    '| Стадия | Статус | Причина |',
    '| :--- | :--- | :--- |',
  ];
  for (const result of results) {
    lines.push(`| ${result.name} | ${result.status} | ${result.reason} |`);
  }
  lines.push('');

  const blocked = results.filter((result) => result.status === 'FAIL');
  if (blocked.length > 0) {
    lines.push('### Причины блокировки', '');
    for (const stage of blocked) {
      lines.push(`- **${stage.name}**: ${stage.reason}`);
      for (const detail of stage.details) lines.push(`  - ${detail}`);
    }
    lines.push('');
  }

  const skipped = results.filter((result) => result.status === 'SKIP');
  if (skipped.length > 0) {
    lines.push('### Не проверено', '');
    for (const stage of skipped) lines.push(`- **${stage.name}**: ${stage.reason}`);
    lines.push('');
  }

  try {
    appendFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
  } catch (error) {
    process.stderr.write(`Не удалось записать GITHUB_STEP_SUMMARY: ${String(error)}\n`);
  }
};

const main = (): void => {
  const { stages, unknown } = selectStages(process.argv.slice(2));
  if (unknown.length > 0) {
    write(`Неизвестные стадии: ${unknown.join(', ')}`);
    write(`Доступные: ${STAGE_ORDER.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const results: StageResult[] = [];
  for (const stage of stages) results.push(STAGE_RUNNERS[stage]());

  appendStepSummary(results);
  // exitCode, а не exit(): так stdout успевает дописаться в пайп.
  process.exitCode = printResults(results);
};

main();
