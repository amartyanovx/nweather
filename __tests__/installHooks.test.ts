/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Установка хука проверяется во временном git-репозитории: core.hooksPath и executable-бит.
 * На Windows Git не хранит режим, поэтому бит проверяется только на POSIX (CI — Linux).
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

it(
  'включает hook, выставляет executable-бит и не пачкает рабочее дерево',
  () => {
    const { dir, sandboxEnv } = createRepo();
    const hookPath = path.join(dir, '.githooks', 'pre-push');
    mkdirSync(path.dirname(hookPath), { recursive: true });
    writeFileSync(hookPath, '#!/bin/sh\nexit 0\n');
    chmodSync(hookPath, 0o644);
    execFileSync('git', ['add', '.githooks/pre-push'], { cwd: dir, env: sandboxEnv });
    execFileSync('git', ['commit', '-q', '-m', 'hook'], { cwd: dir, env: sandboxEnv });

    execFileSync(process.execPath, [INSTALL_SCRIPT], { cwd: dir, env: sandboxEnv });

    const gitConfig = (key: string): string =>
      execFileSync('git', ['config', '--get', key], {
        cwd: dir,
        env: sandboxEnv,
        encoding: 'utf8',
      }).trim();
    expect(gitConfig('core.hooksPath')).toBe('.githooks');
    expect(gitConfig('core.fileMode')).toBe('false');
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
