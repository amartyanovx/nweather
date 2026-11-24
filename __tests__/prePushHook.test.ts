/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Регрессия pre-push-хука через реальный `git push`: hook и скрипт копируются в песочницу,
 * `npm` подменяется стабом. Так проверяются разбор stdin, exit-коды и передача окружения,
 * а не только сам gate.
 */

const ROOT = path.resolve(__dirname, '..');
const HOOK_SOURCE = path.join(ROOT, '.githooks', 'pre-push');
const SCRIPT_SOURCE = path.join(ROOT, 'scripts', 'pre-push.mts');
const TIMEOUT_MS = 20_000;

/** Next.js дополняет `ProcessEnv` обязательным `NODE_ENV`-литералом, поэтому тип задаётся явно. */
type SandboxEnv = { readonly NODE_ENV: 'test' } & Record<string, string>;

interface Sandbox {
  readonly dir: string;
  readonly env: SandboxEnv;
  readonly logPath: string;
}

interface GateCall {
  readonly args: readonly string[];
  readonly ack: string;
  readonly ci: string;
}

const tempDirs: string[] = [];

const toPosix = (value: string): string => value.replace(/\\/g, '/');

const gitIn = (sandbox: Sandbox, ...args: string[]): string =>
  execFileSync('git', args, { cwd: sandbox.dir, env: sandbox.env, encoding: 'utf8' });

const commitAll = (sandbox: Sandbox, files: Record<string, string>, message: string): void => {
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(sandbox.dir, name), content);
  }
  gitIn(sandbox, 'add', '-A');
  gitIn(sandbox, 'commit', '-q', '-m', message);
};

const runPush = (
  sandbox: Sandbox,
  args: readonly string[],
  extraEnv: Record<string, string> = {},
): { status: number | null; output: string } => {
  const childEnv: SandboxEnv = { ...sandbox.env, ...extraEnv };
  const result = spawnSync('git', ['push', ...args], {
    cwd: sandbox.dir,
    env: childEnv,
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
};

const readLog = (sandbox: Sandbox): GateCall[] => {
  if (!existsSync(sandbox.logPath)) return [];
  return readFileSync(sandbox.logPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as GateCall);
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined)
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

const createSandbox = (): Sandbox => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pre-push-'));
  const remoteDir = mkdtempSync(path.join(tmpdir(), 'pre-push-remote-'));
  const stubDir = mkdtempSync(path.join(tmpdir(), 'pre-push-npm-'));
  const configDir = mkdtempSync(path.join(tmpdir(), 'pre-push-cfg-'));
  tempDirs.push(dir, remoteDir, stubDir, configDir);

  const logPath = path.join(configDir, 'gate.log');
  const stubScript = path.join(stubDir, 'stub-npm.mjs');
  writeFileSync(
    stubScript,
    [
      "import { appendFileSync } from 'node:fs';",
      '',
      "appendFileSync(process.env.STUB_LOG ?? '', JSON.stringify({",
      '  args: process.argv.slice(2),',
      "  ack: process.env.QUALITY_GATE_HARNESS_ACK_SHA ?? '',",
      "  ci: process.env.CI ?? '',",
      "}) + '\\n');",
      '',
      "if (process.env.STUB_EXIT !== undefined && process.env.STUB_EXIT !== '0') {",
      "  process.stderr.write('stub-gate: FAIL\\n');",
      '  process.exit(Number(process.env.STUB_EXIT));',
      '}',
      '',
    ].join('\n'),
  );

  const posixNpm = path.join(stubDir, 'npm');
  writeFileSync(posixNpm, `#!/bin/sh\nexec node "${toPosix(stubScript)}" "$@"\n`);
  chmodSync(posixNpm, 0o755);
  writeFileSync(path.join(stubDir, 'npm.cmd'), `@node "${stubScript}" %*\r\n`);

  const globalConfig = path.join(configDir, 'gitconfig');
  writeFileSync(globalConfig, '');

  const env: SandboxEnv = {
    NODE_ENV: 'test',
    PATH: `${stubDir}${path.delimiter}${process.env.PATH ?? ''}`,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_AUTHOR_NAME: 'pre-push-test',
    GIT_AUTHOR_EMAIL: 'pre-push@example.com',
    GIT_COMMITTER_NAME: 'pre-push-test',
    GIT_COMMITTER_EMAIL: 'pre-push@example.com',
    STUB_LOG: logPath,
  };
  if (process.platform === 'win32') {
    env.SystemRoot = process.env.SystemRoot ?? '';
    env.ComSpec = process.env.ComSpec ?? '';
  }

  const sandbox: Sandbox = { dir, env, logPath };

  execFileSync('git', ['init', '--bare', '-q', toPosix(remoteDir)], { env });
  gitIn(sandbox, 'init', '-q', '-b', 'master');
  writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  writeFileSync(path.join(dir, 'README.md'), '# fixture\n');

  mkdirSync(path.join(dir, '.githooks'));
  const hookPath = path.join(dir, '.githooks', 'pre-push');
  copyFileSync(HOOK_SOURCE, hookPath);
  chmodSync(hookPath, 0o755);

  mkdirSync(path.join(dir, 'scripts'));
  copyFileSync(SCRIPT_SOURCE, path.join(dir, 'scripts', 'pre-push.mts'));

  mkdirSync(path.join(dir, 'node_modules'));

  gitIn(sandbox, 'config', 'core.hooksPath', toPosix(path.join(dir, '.githooks')));
  gitIn(sandbox, 'remote', 'add', 'origin', toPosix(remoteDir));
  commitAll(sandbox, {}, 'base');
  gitIn(sandbox, 'push', '--no-verify', '-u', 'origin', 'master');

  gitIn(sandbox, 'checkout', '-q', '-b', 'doomed');
  commitAll(sandbox, { 'doomed.txt': 'delete me\n' }, 'doomed branch');
  gitIn(sandbox, 'push', '--no-verify', 'origin', 'doomed');
  gitIn(sandbox, 'checkout', '-q', 'master');

  writeFileSync(logPath, '');
  return sandbox;
};

it(
  'запускает gate на обновление ref, подставляет SHA HEAD как локальный ACK и очищает CI',
  () => {
    const sandbox = createSandbox();
    commitAll(sandbox, { 'note.txt': 'update\n' }, 'update');
    const head = gitIn(sandbox, 'rev-parse', 'HEAD').trim();

    const { status } = runPush(sandbox, ['origin', 'master'], {
      STUB_EXIT: '0',
      QUALITY_GATE_HARNESS_ACK_SHA: 'stale-ack',
      CI: '1',
    });

    expect(status).toBe(0);
    const calls = readLog(sandbox);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args).toEqual(['run', 'quality-gate']);
    expect(calls[0]?.ack).toBe(head);
    expect(calls[0]?.ci).toBe('');
  },
  TIMEOUT_MS,
);

it(
  'блокирует push, когда gate завершился с ошибкой',
  () => {
    const sandbox = createSandbox();
    commitAll(sandbox, { 'note.txt': 'update\n' }, 'update');

    const { status, output } = runPush(sandbox, ['origin', 'master'], { STUB_EXIT: '1' });

    expect(status).not.toBe(0);
    expect(output).toContain('stub-gate: FAIL');
    expect(readLog(sandbox)).toHaveLength(1);
  },
  TIMEOUT_MS,
);

it(
  'пропускает gate при удалении ветки',
  () => {
    const sandbox = createSandbox();

    const { status } = runPush(sandbox, ['origin', '--delete', 'doomed']);

    expect(status).toBe(0);
    expect(readLog(sandbox)).toHaveLength(0);
  },
  TIMEOUT_MS,
);

it(
  'блокирует push без установленных зависимостей',
  () => {
    const sandbox = createSandbox();
    rmSync(path.join(sandbox.dir, 'node_modules'), { recursive: true, force: true });
    commitAll(sandbox, { 'note.txt': 'update\n' }, 'update');

    const { status, output } = runPush(sandbox, ['origin', 'master']);

    expect(status).not.toBe(0);
    expect(output).toContain('node_modules отсутствует');
    expect(readLog(sandbox)).toHaveLength(0);
  },
  TIMEOUT_MS,
);
