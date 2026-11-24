/**
 * Установка pre-push-хука: `core.hooksPath`, executable-бит и локальный `core.fileMode=false`.
 *
 * Git хранит режим в индексе и дереве, но рабочая копия Windows не материализует executable-бит.
 * Бит выставляется установкой; `core.fileMode=false` не даёт mode-only расхождению выглядеть
 * изменением защищённого `.githooks/**` (иначе guard в CI блокировал бы каждый PR после npm ci).
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';

const HOOK_PATH = '.githooks/pre-push';

const gitConfig = (key: string, value: string): boolean => {
  const result = spawnSync('git', ['config', key, value], { stdio: 'inherit' });
  if (result.error) {
    process.stderr.write(`hooks:install: git недоступен: ${result.error.message}\n`);
    return false;
  }
  if (result.status !== 0) {
    process.stderr.write(`hooks:install: git config ${key} завершился с кодом ${result.status}\n`);
    return false;
  }
  return true;
};

const install = (): void => {
  if (!existsSync(HOOK_PATH)) {
    process.stderr.write(`hooks:install: ${HOOK_PATH} не найден — pre-push не включён\n`);
    return;
  }

  if (!gitConfig('core.hooksPath', '.githooks')) {
    process.exitCode = 1;
    return;
  }
  if (!gitConfig('core.fileMode', 'false')) {
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
