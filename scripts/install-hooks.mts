/**
 * Установка pre-push-хука: `core.hooksPath` и executable-бит.
 *
 * Режим `100755` зафиксирован в индексе Git: Linux материализует бит при checkout, Windows его не
 * представляет, но Git for Windows исполняет хук и без него. `core.fileMode` — пользовательская
 * настройка, установщик её не меняет.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';

const HOOK_PATH = '.githooks/pre-push';
const HOOKS_PATH = '.githooks';

interface PreviousHooksPath {
  readonly value: string;
  readonly origin: string | null;
}

const readHooksPath = (): { previous: PreviousHooksPath | null; error: string | null } => {
  const result = spawnSync('git', ['config', '--show-origin', '--get', 'core.hooksPath'], {
    encoding: 'utf8',
  });
  if (result.error) return { previous: null, error: result.error.message };
  // Код 1 — ключ не задан: перезаписывать нечего.
  if (result.status === 1) return { previous: null, error: null };
  if (result.status !== 0) {
    return { previous: null, error: result.stderr.trim() || `git config: код ${result.status}` };
  }

  const line = result.stdout.replace(/\r?\n$/, '');
  const tab = line.indexOf('\t');
  if (tab < 0) return { previous: { value: line, origin: null }, error: null };
  return {
    previous: { value: line.slice(tab + 1), origin: line.slice(0, tab) },
    error: null,
  };
};

const setHooksPath = (): boolean => {
  const result = spawnSync('git', ['config', 'core.hooksPath', HOOKS_PATH], { stdio: 'inherit' });
  if (result.error) {
    process.stderr.write(`hooks:install: git недоступен: ${result.error.message}\n`);
    return false;
  }
  if (result.status !== 0) {
    process.stderr.write(`hooks:install: git config core.hooksPath: код ${result.status}\n`);
    return false;
  }
  return true;
};

const install = (): void => {
  if (!existsSync(HOOK_PATH)) {
    process.stderr.write(`hooks:install: ${HOOK_PATH} не найден — pre-push не включён\n`);
    return;
  }

  const { previous, error } = readHooksPath();
  if (error !== null) {
    process.stderr.write(`hooks:install: не удалось прочитать core.hooksPath: ${error}\n`);
    process.exitCode = 1;
    return;
  }
  if (previous !== null && previous.value !== HOOKS_PATH) {
    const origin = previous.origin ?? 'источник неизвестен';
    process.stderr.write(
      `hooks:install: core.hooksPath был "${previous.value}" (${origin}) — заменён на ${HOOKS_PATH}.\n` +
        `Вернуть локальное значение: git config core.hooksPath "${previous.value}"; ` +
        `если оно было глобальным — git config --unset core.hooksPath.\n`,
    );
  }

  if (!setHooksPath()) {
    process.exitCode = 1;
    return;
  }

  try {
    chmodSync(HOOK_PATH, 0o755);
  } catch (error) {
    process.stderr.write(
      `hooks:install: не удалось выставить режим ${HOOK_PATH}: ${String(error)}\n`,
    );
    process.exitCode = 1;
  }
};

install();
