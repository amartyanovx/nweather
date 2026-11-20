/**
 * Снимок рабочего состояния для read-only контроля reviewer.
 *
 * Хеш покрывает HEAD, tracked/untracked файлы, staged/unstaged изменения и содержимое untracked-файлов.
 * Запуск до и после сессии reviewer: несовпадение означает, что проект изменился.
 * Ignored-файлы в снимок не входят.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import path from 'node:path';

const MAX_BUFFER = 64 * 1024 * 1024;

const runGit = (args: readonly string[]): Buffer => {
  const result = spawnSync('git', args, { maxBuffer: MAX_BUFFER });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} завершился с кодом ${result.status ?? 'unknown'}`);
  }
  return result.stdout;
};

const root = runGit(['rev-parse', '--show-toplevel']).toString('utf8').trim();
const git = (args: readonly string[]): Buffer => runGit(['-C', root, ...args]);

const hash = createHash('sha256');

const add = (label: string, value: Buffer | string): void => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  hash.update(`${label}\0${bytes.length}\0`);
  hash.update(bytes);
};

add('head', git(['rev-parse', 'HEAD']).toString('utf8').trim());
add('status', git(['status', '--porcelain=v1', '-z', '--untracked-files=all']));
add('unstaged', git(['diff', '--binary']));
add('staged', git(['diff', '--cached', '--binary']));

const untracked = git(['ls-files', '-z', '--others', '--exclude-standard', '--full-name'])
  .toString('utf8')
  .split('\0')
  .filter((file) => file.length > 0);

for (const file of untracked) {
  const absolute = path.join(root, file);
  if (lstatSync(absolute).isSymbolicLink()) {
    add(`untracked:${file}:link`, readlinkSync(absolute));
    continue;
  }
  add(`untracked:${file}:file`, readFileSync(absolute));
}

process.stdout.write(`${hash.digest('hex')}\n`);
