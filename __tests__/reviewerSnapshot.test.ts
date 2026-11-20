/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'reviewer-snapshot.mts');
const TIMEOUT_MS = 20_000;

interface Sandbox {
  readonly dir: string;
  readonly env: Env;
}

type Env = { readonly NODE_ENV: 'test' } & Record<string, string>;

const tempDirs: string[] = [];

const gitIn = (sandbox: Sandbox, ...args: string[]): string =>
  execFileSync('git', args, { cwd: sandbox.dir, env: sandbox.env, encoding: 'utf8' });

const createSandbox = (): Sandbox => {
  const dir = mkdtempSync(path.join(tmpdir(), 'reviewer-snapshot-'));
  const configDir = mkdtempSync(path.join(tmpdir(), 'reviewer-snapshot-cfg-'));
  tempDirs.push(dir, configDir);

  const hooks = path.join(configDir, 'hooks').replace(/\\/g, '/');
  mkdirSync(hooks);
  const globalConfig = path.join(configDir, 'gitconfig');
  writeFileSync(
    globalConfig,
    `[commit]\n  gpgsign = false\n[core]\n  hooksPath = ${hooks}\n[init]\n  defaultBranch = master\n`,
  );

  const env: Env = {
    NODE_ENV: 'test',
    PATH: process.env.PATH ?? '',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_AUTHOR_NAME: 'snapshot-test',
    GIT_AUTHOR_EMAIL: 'snapshot@example.com',
    GIT_COMMITTER_NAME: 'snapshot-test',
    GIT_COMMITTER_EMAIL: 'snapshot@example.com',
  };
  if (process.platform === 'win32') {
    env.SystemRoot = process.env.SystemRoot ?? '';
    env.ComSpec = process.env.ComSpec ?? '';
  }

  const sandbox: Sandbox = { dir, env };
  gitIn(sandbox, 'init', '-q', '-b', 'master');
  writeFileSync(path.join(dir, 'README.md'), '# base\n');
  gitIn(sandbox, 'add', '-A');
  gitIn(sandbox, 'commit', '-q', '-m', 'base');
  return sandbox;
};

const snapshot = (sandbox: Sandbox): { status: number | null; output: string } => {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: sandbox.dir,
    env: sandbox.env,
    encoding: 'utf8',
  });
  return { status: result.status, output: result.stdout.trim() };
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined)
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

describe('reviewer-snapshot', () => {
  it(
    'стабилен без изменений',
    () => {
      const sandbox = createSandbox();

      const first = snapshot(sandbox);
      const second = snapshot(sandbox);

      expect(first.status).toBe(0);
      expect(second.status).toBe(0);
      expect(second.output).toBe(first.output);
    },
    TIMEOUT_MS,
  );

  it(
    'замечает изменение tracked-файла',
    () => {
      const sandbox = createSandbox();
      const before = snapshot(sandbox).output;

      writeFileSync(path.join(sandbox.dir, 'README.md'), '# changed\n');
      const after = snapshot(sandbox).output;

      expect(after).not.toBe(before);
    },
    TIMEOUT_MS,
  );

  it(
    'замечает staged-изменение',
    () => {
      const sandbox = createSandbox();
      const before = snapshot(sandbox).output;

      writeFileSync(path.join(sandbox.dir, 'README.md'), '# staged\n');
      gitIn(sandbox, 'add', 'README.md');
      const after = snapshot(sandbox).output;

      expect(after).not.toBe(before);
    },
    TIMEOUT_MS,
  );

  it(
    'замечает добавление и изменение untracked-файла',
    () => {
      const sandbox = createSandbox();
      const before = snapshot(sandbox).output;

      mkdirSync(path.join(sandbox.dir, 'notes'), { recursive: true });
      writeFileSync(path.join(sandbox.dir, 'notes', 'draft.txt'), 'one\n');
      const added = snapshot(sandbox).output;
      writeFileSync(path.join(sandbox.dir, 'notes', 'draft.txt'), 'two\n');
      const edited = snapshot(sandbox).output;

      expect(added).not.toBe(before);
      expect(edited).not.toBe(added);
    },
    TIMEOUT_MS,
  );
});
