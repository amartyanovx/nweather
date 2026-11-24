/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Регрессия критической логики gate: hygiene и guard проверяются через реальный запуск скрипта
 * во временном git-репозитории. Импорт `.mts` невозможен (Jest не трансформирует `.mts`,
 * `main()` вызывается на уровне модуля), поэтому наблюдаемый контракт — CLI.
 */

const GATE_SCRIPT = path.resolve(__dirname, '..', 'scripts', 'quality-gate.mts');
const TIMEOUT_MS = 20_000;

/** Реальные правила `.gitignore` проекта, а не копия: ignored-состояние проверяется на них. */
const MCP_IGNORE_PATTERNS = readFileSync(path.resolve(__dirname, '..', '.gitignore'), 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#') && line.includes('mcp_settings'));

const MCP_FILES = [
  'mcp_settings.json',
  '_mcp_settings.json',
  'team_mcp_settings.json',
  'team-mcp_settings.json',
] as const;

interface Sandbox {
  readonly dir: string;
  readonly summaryPath: string;
  readonly env: GateEnv;
}

/** Next.js дополняет `ProcessEnv` обязательным `NODE_ENV`-литералом, поэтому тип задаётся явно. */
type GateEnv = { readonly NODE_ENV: 'test' } & Record<string, string>;

const tempDirs: string[] = [];

interface SandboxOptions {
  /** Содержимое `.gitignore` базового коммита. */
  readonly ignore?: string;
}

const createSandbox = (options: SandboxOptions = {}): Sandbox => {
  const dir = mkdtempSync(path.join(tmpdir(), 'quality-gate-'));
  const configDir = mkdtempSync(path.join(tmpdir(), 'quality-gate-cfg-'));
  tempDirs.push(dir, configDir);

  const hooks = path.join(configDir, 'hooks').replace(/\\/g, '/');
  mkdirSync(hooks);
  const globalConfig = path.join(configDir, 'gitconfig');
  writeFileSync(
    globalConfig,
    `[commit]\n  gpgsign = false\n[core]\n  hooksPath = ${hooks}\n[init]\n  defaultBranch = master\n`,
  );

  // env собирается с нуля: CI, QUALITY_GATE_*, GIT_* хоста и хук-конфиги не наследуются.
  const env: GateEnv = {
    NODE_ENV: 'test',
    PATH: process.env.PATH ?? '',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_AUTHOR_NAME: 'gate-test',
    GIT_AUTHOR_EMAIL: 'gate@example.com',
    GIT_COMMITTER_NAME: 'gate-test',
    GIT_COMMITTER_EMAIL: 'gate@example.com',
  };
  if (process.platform === 'win32') {
    env.SystemRoot = process.env.SystemRoot ?? '';
    env.ComSpec = process.env.ComSpec ?? '';
  }

  const sandbox: Sandbox = { dir, summaryPath: path.join(configDir, 'summary.md'), env };
  gitIn(sandbox, 'init', '-q', '-b', 'master');
  writeFileSync(path.join(dir, '.gitignore'), options.ignore ?? '.env*\n');
  writeFileSync(path.join(dir, 'README.md'), '# fixture\n');
  commitAll(sandbox, 'base');
  return sandbox;
};

const gitIn = (sandbox: Sandbox, ...args: string[]): string =>
  execFileSync('git', args, { cwd: sandbox.dir, env: sandbox.env, encoding: 'utf8' });

const commitAll = (sandbox: Sandbox, message: string): string => {
  gitIn(sandbox, 'add', '-A');
  gitIn(sandbox, 'commit', '-q', '-m', message);
  return gitIn(sandbox, 'rev-parse', 'HEAD').trim().toLowerCase();
};

const commitFiles = (sandbox: Sandbox, files: Record<string, string>, message: string): string => {
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(sandbox.dir, name), content);
  }
  return commitAll(sandbox, message);
};

const runGate = (
  sandbox: Sandbox,
  stages: readonly string[],
  extraEnv: Record<string, string> = {},
): { status: number | null; output: string } => {
  const childEnv: GateEnv = {
    ...sandbox.env,
    QUALITY_GATE_BASE: '',
    QUALITY_GATE_HARNESS_ACK_SHA: '',
    GITHUB_STEP_SUMMARY: '',
  };
  for (const [key, value] of Object.entries(extraEnv)) childEnv[key] = value;

  const result = spawnSync(process.execPath, [GATE_SCRIPT, ...stages], {
    cwd: sandbox.dir,
    env: childEnv,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined)
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

describe('artifact-hygiene', () => {
  it(
    'блокирует лог, добавленный в git',
    () => {
      const sandbox = createSandbox();
      commitFiles(sandbox, { 'debug.log': 'x\n' }, 'log');

      const { status, output } = runGate(sandbox, ['artifact-hygiene']);

      expect(status).toBe(1);
      expect(output).toContain('debug.log — лог (tracked)');
    },
    TIMEOUT_MS,
  );

  it(
    'блокирует лог из рабочего дерева',
    () => {
      const sandbox = createSandbox();
      writeFileSync(path.join(sandbox.dir, 'debug.log'), 'x\n');

      const { status, output } = runGate(sandbox, ['artifact-hygiene']);

      expect(status).toBe(1);
      expect(output).toContain('debug.log — лог (untracked)');
    },
    TIMEOUT_MS,
  );

  it(
    'блокирует tracked .env.local: локальный env-файл не должен попадать в git',
    () => {
      const sandbox = createSandbox();
      writeFileSync(path.join(sandbox.dir, '.env.local'), 'TOKEN=1\n');
      gitIn(sandbox, 'add', '-f', '.env.local');
      commitAll(sandbox, 'tracked env');

      const { status, output } = runGate(sandbox, ['artifact-hygiene']);

      expect(status).toBe(1);
      expect(output).toContain('.env.local — файл окружения: может содержать секреты (tracked)');
    },
    TIMEOUT_MS,
  );

  it(
    'допускает ignored .env.local',
    () => {
      const sandbox = createSandbox();
      writeFileSync(path.join(sandbox.dir, '.env.local'), 'TOKEN=1\n');

      const { status, output } = runGate(sandbox, ['artifact-hygiene']);

      expect(status).toBe(0);
      expect(output).toContain('Quality Gate: PASS');
    },
    TIMEOUT_MS,
  );

  it(
    'допускает untracked .env.local вне .gitignore',
    () => {
      const sandbox = createSandbox({ ignore: 'node_modules/\n' });
      writeFileSync(path.join(sandbox.dir, '.env.development.local'), 'TOKEN=1\n');

      const { status, output } = runGate(sandbox, ['artifact-hygiene']);

      expect(status).toBe(0);
      expect(output).toContain('Quality Gate: PASS');
    },
    TIMEOUT_MS,
  );

  it(
    'допускает tracked .env.example',
    () => {
      const sandbox = createSandbox();
      writeFileSync(path.join(sandbox.dir, '.env.example'), 'TOKEN=\n');
      gitIn(sandbox, 'add', '-f', '.env.example');
      commitAll(sandbox, 'env example');

      const { status } = runGate(sandbox, ['artifact-hygiene']);

      expect(status).toBe(0);
    },
    TIMEOUT_MS,
  );

  const sandboxWithMcpIgnore = (): Sandbox =>
    createSandbox({ ignore: `${MCP_IGNORE_PATTERNS.join('\n')}\n` });

  it.each(MCP_FILES)(
    'блокирует untracked MCP-конфигурацию %s',
    (file) => {
      const sandbox = createSandbox();
      writeFileSync(path.join(sandbox.dir, file), '{"token":"secret"}\n');

      const state = gitIn(sandbox, 'status', '--porcelain', '--', file).trim();
      const { status, output } = runGate(sandbox, ['artifact-hygiene']);

      expect(state).toBe(`?? ${file}`);
      expect(status).toBe(1);
      expect(output).toContain(`${file} — настройки MCP: ключи и токены (untracked)`);
    },
    TIMEOUT_MS,
  );

  it.each(MCP_FILES)(
    'блокирует ignored MCP-конфигурацию %s: .gitignore исключает файл из Git, gate видит его',
    (file) => {
      const sandbox = sandboxWithMcpIgnore();
      writeFileSync(path.join(sandbox.dir, file), '{"token":"secret"}\n');

      expect(gitIn(sandbox, 'check-ignore', '--quiet', '--', file)).toBe('');
      expect(gitIn(sandbox, 'status', '--porcelain', '--ignored', '--', file).trim()).toBe(
        `!! ${file}`,
      );

      const { status, output } = runGate(sandbox, ['artifact-hygiene']);

      expect(status).toBe(1);
      expect(output).toContain(`${file} — настройки MCP: ключи и токены (ignored)`);
    },
    TIMEOUT_MS,
  );

  it.each(MCP_FILES)(
    'блокирует tracked MCP-конфигурацию %s, добавленную через git add -f в обход .gitignore',
    (file) => {
      const sandbox = sandboxWithMcpIgnore();
      writeFileSync(path.join(sandbox.dir, file), '{"token":"secret"}\n');
      gitIn(sandbox, 'add', '-f', '--', file);
      commitAll(sandbox, 'forced mcp');

      expect(gitIn(sandbox, 'ls-files', '--', file).trim()).toBe(file);

      const { status, output } = runGate(sandbox, ['artifact-hygiene']);

      expect(status).toBe(1);
      expect(output).toContain(`${file} — настройки MCP: ключи и токены (tracked)`);
    },
    TIMEOUT_MS,
  );
});

describe('guard-integrity', () => {
  const branchWithHarnessChange = (): { sandbox: Sandbox; head: string } => {
    const sandbox = createSandbox();
    gitIn(sandbox, 'checkout', '-q', '-b', 'feature');
    const head = commitFiles(sandbox, { '.oxlintrc.json': '{}\n' }, 'harness');
    return { sandbox, head };
  };

  it(
    'блокирует изменение защищённого файла без подтверждения',
    () => {
      const { sandbox } = branchWithHarnessChange();

      const { status, output } = runGate(sandbox, ['guard-integrity']);

      expect(status).toBe(1);
      expect(output).toContain('изменены защищённые файлы Harness/CI (1)');
      expect(output).toContain('подтверждения для этого коммита нет');
      expect(output).toContain('HARNESS_ACK_SHA');
    },
    TIMEOUT_MS,
  );

  it(
    'не принимает подтверждение от другого коммита и от префикса SHA',
    () => {
      const { sandbox, head } = branchWithHarnessChange();
      const baseSha = gitIn(sandbox, 'rev-parse', 'master').trim().toLowerCase();

      const other = runGate(sandbox, ['guard-integrity'], {
        QUALITY_GATE_HARNESS_ACK_SHA: baseSha,
      });
      const prefix = runGate(sandbox, ['guard-integrity'], {
        QUALITY_GATE_HARNESS_ACK_SHA: head.slice(0, 12),
      });

      expect(other.status).toBe(1);
      expect(other.output).toContain(`подтверждение относится к ${baseSha.slice(0, 12)}`);
      expect(prefix.status).toBe(1);
    },
    TIMEOUT_MS,
  );

  it(
    'принимает подтверждение текущего коммита с регистром и пробелами',
    () => {
      const { sandbox, head } = branchWithHarnessChange();

      const { status, output } = runGate(sandbox, ['guard-integrity'], {
        QUALITY_GATE_HARNESS_ACK_SHA: ` ${head.toUpperCase()} `,
      });

      expect(status).toBe(0);
      expect(output).toContain(`изменения Harness/CI подтверждены для ${head.slice(0, 12)}`);
    },
    TIMEOUT_MS,
  );

  it(
    'не переиспользует подтверждение после нового коммита',
    () => {
      const { sandbox, head } = branchWithHarnessChange();
      const confirmed = runGate(sandbox, ['guard-integrity'], {
        QUALITY_GATE_HARNESS_ACK_SHA: head,
      });

      commitFiles(sandbox, { '.prettierrc.json': '{}\n' }, 'harness again');
      const afterCommit = runGate(sandbox, ['guard-integrity'], {
        QUALITY_GATE_HARNESS_ACK_SHA: head,
      });

      expect(confirmed.status).toBe(0);
      expect(afterCommit.status).toBe(1);
      expect(afterCommit.output).toContain('изменены защищённые файлы Harness/CI (2)');
    },
    TIMEOUT_MS,
  );

  it(
    'не мешает изменению обычных файлов',
    () => {
      const sandbox = createSandbox();
      gitIn(sandbox, 'checkout', '-q', '-b', 'feature');
      commitFiles(sandbox, { 'README.md': '# changed\n' }, 'readme');

      const { status, output } = runGate(sandbox, ['guard-integrity']);

      expect(status).toBe(0);
      expect(output).toContain('защищённые файлы не изменены');
    },
    TIMEOUT_MS,
  );

  it(
    'защищает изменения каталога .github',
    () => {
      const sandbox = createSandbox();
      gitIn(sandbox, 'checkout', '-q', '-b', 'feature');
      mkdirSync(path.join(sandbox.dir, '.github', 'workflows'), { recursive: true });
      commitFiles(sandbox, { '.github/workflows/ci.yml': 'name: CI\n' }, 'ci');

      const { status, output } = runGate(sandbox, ['guard-integrity']);

      expect(status).toBe(1);
      expect(output).toContain('изменены защищённые файлы Harness/CI (1)');
      expect(output).toContain('.github/workflows/ci.yml');
    },
    TIMEOUT_MS,
  );

  it(
    'защищает изменения каталога harness',
    () => {
      const sandbox = createSandbox();
      gitIn(sandbox, 'checkout', '-q', '-b', 'feature');
      mkdirSync(path.join(sandbox.dir, 'harness'), { recursive: true });
      commitFiles(sandbox, { 'harness/main-session.md': '# rules\n' }, 'rules');

      const { status, output } = runGate(sandbox, ['guard-integrity']);

      expect(status).toBe(1);
      expect(output).toContain('изменены защищённые файлы Harness/CI (1)');
      expect(output).toContain('harness/main-session.md');
    },
    TIMEOUT_MS,
  );

  it.each([
    'CLAUDE.md',
    '.claude/CLAUDE.md',
    '.omp/AGENTS.md',
    '.omp/RULES.md',
    '.rules',
    '.zed/settings.json',
  ])(
    'защищает точку входа инструкций %s',
    (file) => {
      const sandbox = createSandbox();
      gitIn(sandbox, 'checkout', '-q', '-b', 'feature');
      mkdirSync(path.dirname(path.join(sandbox.dir, file)), { recursive: true });
      commitFiles(sandbox, { [file]: '# rules\n' }, 'agent instructions');

      const { status, output } = runGate(sandbox, ['guard-integrity']);

      expect(status).toBe(1);
      expect(output).toContain('изменены защищённые файлы Harness/CI (1)');
      expect(output).toContain(file);
    },
    TIMEOUT_MS,
  );

  it(
    'не блокирует ветку, отставшую от базы: чужие изменения harness не считаются своими',
    () => {
      const sandbox = createSandbox();
      gitIn(sandbox, 'checkout', '-q', '-b', 'feature');
      commitFiles(sandbox, { 'README.md': '# feature\n' }, 'feature work');
      gitIn(sandbox, 'checkout', '-q', 'master');
      commitFiles(sandbox, { 'AGENTS.md': 'base change\n' }, 'base harness');
      gitIn(sandbox, 'checkout', '-q', 'feature');

      const { status, output } = runGate(sandbox, ['guard-integrity']);

      expect(status).toBe(0);
      expect(output).toContain('защищённые файлы не изменены');
    },
    TIMEOUT_MS,
  );

  it(
    'без базы в CI пишет SKIP как «не проверено», а не как успешную проверку',
    () => {
      const sandbox = createSandbox();

      const { status, output } = runGate(sandbox, ['guard-integrity'], {
        CI: '1',
        GITHUB_STEP_SUMMARY: sandbox.summaryPath,
      });

      expect(status).toBe(0);
      expect(output).toContain('[SKIP] guard-integrity — не проверено: база не передана событием');
      expect(output).toContain(
        'Quality Gate: PASS (не проверено: guard-integrity; запущено 1 из 5 стадий)',
      );
      expect(readFileSync(sandbox.summaryPath, 'utf8')).toContain('### Не проверено');
    },
    TIMEOUT_MS,
  );

  it(
    'в CI с недоступной базой падает, а не пропускает проверку',
    () => {
      const sandbox = createSandbox();

      const { status, output } = runGate(sandbox, ['guard-integrity'], {
        CI: '1',
        QUALITY_GATE_BASE: 'f'.repeat(40),
      });

      expect(status).toBe(1);
      expect(output).toContain('[FAIL] guard-integrity');
      expect(output).toContain('отсутствует в истории');
    },
    TIMEOUT_MS,
  );
});

describe('защищённые enforcement-файлы', () => {
  it.each([
    '.githooks/pre-push',
    'scripts/install-hooks.mts',
    'scripts/pre-push.mts',
    '__tests__/installHooks.test.ts',
    '__tests__/prePushHook.test.ts',
  ])(
    'защищает %s',
    (file) => {
      const sandbox = createSandbox();
      gitIn(sandbox, 'checkout', '-q', '-b', 'feature');
      mkdirSync(path.dirname(path.join(sandbox.dir, file)), { recursive: true });
      commitFiles(sandbox, { [file]: '#!/bin/sh\n' }, 'enforcement');

      const { status, output } = runGate(sandbox, ['guard-integrity']);

      expect(status).toBe(1);
      expect(output).toContain('изменены защищённые файлы Harness/CI (1)');
      expect(output).toContain(file);
    },
    TIMEOUT_MS,
  );
});

describe('fallow-audit', () => {
  it(
    'в CI с недоступной базой падает, а не пропускает проверку',
    () => {
      const sandbox = createSandbox();

      const { status, output } = runGate(sandbox, ['fallow-audit'], {
        CI: '1',
        QUALITY_GATE_BASE: 'f'.repeat(40),
      });

      expect(status).toBe(1);
      expect(output).toContain('[FAIL] fallow-audit');
      expect(output).toContain('отсутствует в истории');
    },
    TIMEOUT_MS,
  );

  it(
    'в CI с нулевым SHA базы падает, а не пропускает проверку',
    () => {
      const sandbox = createSandbox();

      const { status, output } = runGate(sandbox, ['fallow-audit'], {
        CI: '1',
        QUALITY_GATE_BASE: '0'.repeat(40),
      });

      expect(status).toBe(1);
      expect(output).toContain('[FAIL] fallow-audit');
      expect(output).toContain('нулевой SHA');
    },
    TIMEOUT_MS,
  );
});
