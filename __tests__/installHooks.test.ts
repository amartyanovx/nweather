/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Установка хука проверяется во временном git-репозитории: core.hooksPath, executable-бит и
 * неизменность core.fileMode. На Windows Git не материализует режим, поэтому бит проверяется
 * только на POSIX (CI — Linux); режим в индексе проекта проверяется отдельно.
 */

const INSTALL_SCRIPT = path.resolve(__dirname, '..', 'scripts', 'install-hooks.mts');
const TIMEOUT_MS = 20_000;

const tempDirs: string[] = [];

/** Next.js дополняет `ProcessEnv` обязательным `NODE_ENV`-литералом, поэтому тип задаётся явно. */
type InstallEnv = { readonly NODE_ENV: 'test' } & Record<string, string>;

const env: InstallEnv = {
  NODE_ENV: 'test',
  PATH: process.env.PATH ?? '',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '',
  GIT_AUTHOR_NAME: 'install-hooks-test',
  GIT_AUTHOR_EMAIL: 'install-hooks@example.com',
  GIT_COMMITTER_NAME: 'install-hooks-test',
  GIT_COMMITTER_EMAIL: 'install-hooks@example.com',
};
if (process.platform === 'win32') {
  env.SystemRoot = process.env.SystemRoot ?? '';
  env.ComSpec = process.env.ComSpec ?? '';
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined)
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

const createRepo = (): { dir: string; sandboxEnv: InstallEnv } => {
  const dir = mkdtempSync(path.join(tmpdir(), 'install-hooks-'));
  const configDir = mkdtempSync(path.join(tmpdir(), 'install-hooks-cfg-'));
  tempDirs.push(dir, configDir);
  const globalConfig = path.join(configDir, 'gitconfig');
  writeFileSync(globalConfig, '');
  const sandboxEnv: InstallEnv = { ...env, GIT_CONFIG_GLOBAL: globalConfig };
  execFileSync('git', ['init', '-q', '-b', 'master'], { cwd: dir, env: sandboxEnv });
  return { dir, sandboxEnv };
};

const readConfig = (dir: string, sandboxEnv: InstallEnv, key: string): string =>
  execFileSync('git', ['config', '--get', key], {
    cwd: dir,
    env: sandboxEnv,
    encoding: 'utf8',
  }).trim();

const writeHook = (dir: string): string => {
  const hookPath = path.join(dir, '.githooks', 'pre-push');
  mkdirSync(path.dirname(hookPath), { recursive: true });
  writeFileSync(hookPath, '#!/bin/sh\nexit 0\n');
  return hookPath;
};

it(
  'включает hook, выставляет executable-бит, не меняет core.fileMode и не пачкает дерево',
  () => {
    const { dir, sandboxEnv } = createRepo();
    const hookPath = writeHook(dir);
    execFileSync('git', ['add', '.githooks/pre-push'], { cwd: dir, env: sandboxEnv });
    // Режим хранится в индексе: на Windows `chmod` бит не материализует, `update-index` работает.
    execFileSync('git', ['update-index', '--chmod=+x', '.githooks/pre-push'], {
      cwd: dir,
      env: sandboxEnv,
    });
    execFileSync('git', ['commit', '-q', '-m', 'hook'], { cwd: dir, env: sandboxEnv });

    const fileModeBefore = readConfig(dir, sandboxEnv, 'core.fileMode');
    execFileSync(process.execPath, [INSTALL_SCRIPT], { cwd: dir, env: sandboxEnv });

    expect(readConfig(dir, sandboxEnv, 'core.hooksPath')).toBe('.githooks');
    expect(readConfig(dir, sandboxEnv, 'core.fileMode')).toBe(fileModeBefore);
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: dir,
        env: sandboxEnv,
        encoding: 'utf8',
      }),
    ).toBe('');

    if (process.platform !== 'win32') {
      expect(statSync(hookPath).mode & 0o111).not.toBe(0);
    }
  },
  TIMEOUT_MS,
);

it(
  'не перезаписывает явно заданный core.fileMode',
  () => {
    const { dir, sandboxEnv } = createRepo();
    writeHook(dir);
    execFileSync('git', ['config', 'core.fileMode', 'true'], { cwd: dir, env: sandboxEnv });

    const result = spawnSync(process.execPath, [INSTALL_SCRIPT], { cwd: dir, env: sandboxEnv });

    expect(result.status).toBe(0);
    expect(readConfig(dir, sandboxEnv, 'core.fileMode')).toBe('true');
  },
  TIMEOUT_MS,
);

it(
  'предупреждает о прежнем core.hooksPath и печатает команду восстановления',
  () => {
    const { dir, sandboxEnv } = createRepo();
    writeHook(dir);
    execFileSync('git', ['config', 'core.hooksPath', '.custom-hooks'], {
      cwd: dir,
      env: sandboxEnv,
    });

    const result = spawnSync(process.execPath, [INSTALL_SCRIPT], { cwd: dir, env: sandboxEnv });

    expect(result.status).toBe(0);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('core.hooksPath был ".custom-hooks"');
    expect(stderr).toContain('git config core.hooksPath ".custom-hooks"');
    expect(readConfig(dir, sandboxEnv, 'core.hooksPath')).toBe('.githooks');
  },
  TIMEOUT_MS,
);

it(
  'без hook-файла сообщает причину и не падает',
  () => {
    const { dir, sandboxEnv } = createRepo();

    const result = spawnSync(process.execPath, [INSTALL_SCRIPT], { cwd: dir, env: sandboxEnv });

    expect(result.status).toBe(0);
    expect(result.stderr.toString()).toContain('.githooks/pre-push не найден');
    const hooksPath = spawnSync('git', ['config', '--get', 'core.hooksPath'], {
      cwd: dir,
      env: sandboxEnv,
    });
    expect(hooksPath.status).not.toBe(0);
  },
  TIMEOUT_MS,
);

it(
  'фиксирует режим 100755 хука в индексе проекта',
  () => {
    const root = path.resolve(__dirname, '..');
    const entry = execFileSync('git', ['ls-files', '-s', '.githooks/pre-push'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();

    expect(entry.split(/\s+/)[0]).toBe('100755');
  },
  TIMEOUT_MS,
);
