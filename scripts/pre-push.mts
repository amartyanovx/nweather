/**
 * Pre-push: полный quality-gate перед отправкой объектов.
 *
 * Вызывается из `.githooks/pre-push` при cwd = корень worktree. stdin — строки
 * `local_ref local_sha remote_ref remote_sha` (githooks(5)); у удаления ветки/тега `local_sha`
 * нулевой — проверять нечего. Gate смотрит текущее worktree/HEAD, а не запушенный ref:
 * push другого ref из грязного или отставшего worktree валидируется только CI.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const ZERO_SHA = /^0+$/;

const readStdin = (): string => {
  // Ручной `npm run pre-push` в терминале: блокирующее чтение TTY ждало бы EOF.
  if (process.stdin.isTTY) return '';
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

/** Пустой stdin (up-to-date push) — не повод пропускать проверку: gate запускается. */
const isDeletionOnly = (input: string): boolean => {
  const refs = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/\s+/));
  if (refs.length === 0) return false;
  return refs.every((parts) => parts.length >= 2 && ZERO_SHA.test(parts[1] ?? ''));
};

const resolveHead = (): string => {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
};

const main = (): void => {
  if (isDeletionOnly(readStdin())) return;

  if (!existsSync('node_modules')) {
    process.stderr.write('pre-push: node_modules отсутствует — выполните npm ci перед push.\n');
    process.exitCode = 1;
    return;
  }

  // CI в окружении не должен превращать локальный guard в SKIP: gate запускается как локальный
  // (база — origin/HEAD/master), явный QUALITY_GATE_BASE по-прежнему имеет приоритет. SHA HEAD —
  // локальный сигнал для guard, а не авторизация: правка Harness/CI авторизуется прямым указанием
  // пользователя (AGENTS.md §«Полномочия»), барьер — repository variable, required checks и ревью diff.
  const head = resolveHead();
  const result = spawnSync('npm run quality-gate', {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: '',
      ...(head.length > 0 ? { QUALITY_GATE_HARNESS_ACK_SHA: head } : {}),
    },
  });
  if (result.error) {
    process.stderr.write(`pre-push: не удалось запустить quality-gate: ${result.error.message}\n`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = result.status ?? 1;
};

main();
