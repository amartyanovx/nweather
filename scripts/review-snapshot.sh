#!/usr/bin/env bash
#
# Снимок состояния проекта для независимого ревью. Скрипт фиксирует базу задачи,
# собирает расходную копию отфильтрованного набора файлов, формирует область ревью
# в _review/ копии, сверяет исходное дерево после ревью и убирает временные файлы.
#
#   base        зафиксировать базу задачи (один раз, до правок)
#   fingerprint отпечаток текущего содержимого проекта (для записей о прогонах)
#   create      снимок + _review/{scope.diff,changed-files.txt,state.txt}
#   run         запустить ревьюера (cline -p) в foreground на готовом снимке
#   verify      сверить исходное дерево и копию с записанным состоянием
#   clean       удалить снимок; clean --all — всю рабочую область задачи
#   status      что зафиксировано и что в дереве сейчас
#
# Рабочая область — системный temp вне репозитория, одна на проект
# (${TMPDIR:-/tmp}/nweather-review/<id>; REVIEW_WORKSPACE переопределяет).
#
# Копия не является sandbox: она ограждает ревью от правок проекта, но не проект
# от ревьюера. Изменения исходного дерева ловит verify; автоматического отката нет.
# Скрипт гасит только процесс ревьюера, запущенный им самим (run пишет его PID).

set -euo pipefail

say() { printf '[review] %s\n' "$*"; }
warn() { printf '[review] ВНИМАНИЕ: %s\n' "$*" >&2; }
# Ошибка при сборке снимка не оставляет неполную копию: иначе её легко принять за готовую.
die() {
  printf '[review] ОШИБКА: %s\n' "$*" >&2
  if [ "${IN_CREATE:-0}" = 1 ] && [ -n "${SNAP_DIR:-}" ]; then
    IN_CREATE=0
    remove_workspace_path "$SNAP_DIR" >/dev/null 2>&1 || true
    printf '[review] неполный снимок удалён: %s\n' "$SNAP_DIR" >&2
  fi
  exit 1
}

usage() {
  cat <<'EOF'
Использование: scripts/review-snapshot.sh <команда> [аргументы]

  base                     зафиксировать базу задачи до правок (base commit + текущие изменения)
  fingerprint              напечатать отпечаток текущего состояния проекта
  create                   собрать снимок и _review/ (scope.diff, changed-files.txt, state.txt, списки исключений)
  run --prompt <файл>      запустить ревьюера: cline -p -c <снимок> "<промпт>"
                           --timeout <сек> ограничивает прогон (по умолчанию 1800)
  verify                   сверить исходное дерево и снимок с записью state.txt
  clean [--all]            удалить снимок; --all удаляет рабочую область задачи целиком
  status                   показать зафиксированную базу, снимок и текущее состояние

Переменные окружения:
  REVIEW_WORKSPACE   каталог рабочей области (по умолчанию системный temp)
EOF
}

init_context() {
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) ||
    die "команда выполняется внутри git-репозитория проекта"
  REPO_ROOT=$(cd "$REPO_ROOT" && pwd)
  local id
  id=$(printf '%s' "$REPO_ROOT" | sha256sum | cut -c1-12)
  WS="${REVIEW_WORKSPACE:-${TMPDIR:-/tmp}/nweather-review/$id}"
  WS="${WS%/}"
  case "$WS" in
    '' | / | . | ..) die "недопустимый путь рабочей области: '${REVIEW_WORKSPACE:-$WS}'" ;;
    "$REPO_ROOT" | "$REPO_ROOT"/*) die "рабочая область не должна быть внутри проекта: $WS" ;;
  esac
  BASE_DIR="$WS/base"
  BASE_META="$WS/base.txt"
  BASE_STATUS="$WS/base.status.txt"
  BASE_TREE_INDEX="$WS/base.index"
  SNAP_POINTER="$WS/current-snapshot"
  GIT_DIR_TMP="$WS/git"
  SKIPPED_FILE="$WS/base.skipped.txt"
  WORK_TMP="$WS/tmp"
}

# Каждый круг ревью получает свой каталог: удаление каталога, который держит
# нативный процесс, на Windows может быть заблокировано, и новый снимок от этого
# зависеть не должен.
current_snapshot_name() {
  local name
  [ -f "$SNAP_POINTER" ] || return 1
  name=$(cat "$SNAP_POINTER" 2>/dev/null || true)
  case "$name" in
    snap-*) ;;
    *) return 1 ;;
  esac
  [ -d "$WS/$name" ] || return 1
  printf '%s' "$name"
}

load_snapshot() {
  local name
  name=$(current_snapshot_name) ||
    die "снимка нет: сначала scripts/review-snapshot.sh create"
  SNAP_DIR="$WS/$name"
  SNAP_INDEX="$WS/$name.index"
}

# --- выбор файлов -----------------------------------------------------------

# Секреты и локальные данные не попадают в копию ни при каких условиях. Список общий
# для фильтра и для проверки готового снимка, поэтому расхождению между ними взяться неоткуда.
# Регистр не важен: имена вроде `appSecrets.json` встречаются не реже `secrets.json`.
is_secret_path() {
  local name="${1##*/}" result=1 prev
  prev=$(shopt -p nocasematch 2>/dev/null || true)
  shopt -s nocasematch
  case "$name" in
    cline_mcp_settings.json | mcp*.json | .npmrc | .netrc) result=0 ;;
    *.pem | *.key | *.crt | *.p12 | *.pfx | id_rsa* | id_ed25519*) result=0 ;;
    *.db | *.sqlite | *.sqlite3) result=0 ;;
    secrets.* | credentials.* | *.token | *secret* | *credential* | *passw*) result=0 ;;
  esac
  case "$name" in
    .env.example | .env.sample | .env.template) result=1 ;;
    .env | .env.*) result=0 ;;
  esac
  if [ -n "$prev" ]; then eval "$prev"; else shopt -u nocasematch; fi
  return "$result"
}

# Отбор безопасный: в копию попадают только файлы, видимые git (отслеживаемые и
# новые вне .gitignore), а поверх действует запрет на секреты, зависимости,
# артефакты и инструкции основного агента.
is_excluded() {
  local path="$1"
  case "$path" in
    .clinerules/core.md) return 0 ;;
    node_modules/* | .git/* | .next/* | out/* | build/* | dist/*) return 0 ;;
    coverage/* | reports/* | test-results/* | stryker-output/* | .stryker-tmp/*) return 0 ;;
    .venv/* | vendor/* | target/* | memory-bank/local/* | .idea/* | .vscode/*) return 0 ;;
    *.tsbuildinfo) return 0 ;;
  esac
  is_secret_path "$path"
}

collect_paths() {
  local list="$1" skipped="$2" path
  local tracked="$WORK_TMP/ls-files.tracked" untracked="$WORK_TMP/ls-files.untracked"
  mkdir -p "$WORK_TMP"
  git -C "$REPO_ROOT" ls-files -z >"$tracked" ||
    die "git ls-files не отработал: список файлов проекта не получен"
  git -C "$REPO_ROOT" ls-files -z --others --exclude-standard >"$untracked" ||
    die "git ls-files --others не отработал: новые файлы проекта не получены"
  : >"$list"
  : >"$skipped"
  while IFS= read -r -d '' path; do
    if is_excluded "$path"; then
      printf '%s (исключено фильтром)\n' "$path" >>"$skipped"
    elif [ -L "$REPO_ROOT/$path" ]; then
      printf '%s (символическая ссылка)\n' "$path" >>"$skipped"
    elif [ ! -f "$REPO_ROOT/$path" ]; then
      printf '%s (удалён в рабочем дереве)\n' "$path" >>"$skipped"
    else
      printf '%s\0' "$path" >>"$list"
    fi
  done < <(cat "$tracked" "$untracked")
}

copy_paths() {
  local list="$1" dest="$2" path
  while IFS= read -r -d '' path; do
    mkdir -p "$dest/$(dirname "$path")"
    cp "$REPO_ROOT/$path" "$dest/$path"
  done <"$list"
}


# --- отпечатки и состояние --------------------------------------------------

repo_head() { git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo none; }

repo_branch() { git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo none; }

repo_subject() { git -C "$REPO_ROOT" log -1 --format='%s' 2>/dev/null || echo none; }

status_hash() { git -C "$REPO_ROOT" status --porcelain -uall | sha256sum | cut -d' ' -f1; }

# Отпечаток содержимого проекта по тому же набору файлов, что попадает в копию.
# Сравним между вызовами: набор и порядок путей задаёт git.
source_fingerprint() {
  local list="$WORK_TMP/source.list" skipped="$WORK_TMP/source.skipped"
  mkdir -p "$WORK_TMP"
  collect_paths "$list" "$skipped"
  (cd "$REPO_ROOT" && xargs -0 -r sha256sum <"$list") | sha256sum | cut -d' ' -f1
}

# Отпечаток каталога копии: пути и содержимое; служебный _review/ не учитывается.
dir_fingerprint() {
  (cd "$1" && find . -type f ! -path './_review/*' -print0 | LC_ALL=C sort -z |
    xargs -0 -r sha256sum) | sha256sum | cut -d' ' -f1
}

dir_file_count() {
  (cd "$1" && find . -type f ! -path './_review/*' | wc -l | tr -d ' ')
}

dir_files() {
  (cd "$1" && find . -type f ! -path './_review/*' -print0 | LC_ALL=C sort -z |
    sed -z 's|^\./||')
}

# core.md в копию не попадает (правила основного агента), поэтому его состояние
# фиксируется только хешем и числом строк — иначе правку этого файла после снимка
# не заметит ни один отпечаток.
core_md_sha() {
  if [ -f "$REPO_ROOT/.clinerules/core.md" ]; then
    sha256sum "$REPO_ROOT/.clinerules/core.md" | cut -d' ' -f1
  else
    echo absent
  fi
}

core_md_lines() {
  if [ -f "$REPO_ROOT/.clinerules/core.md" ]; then
    wc -l <"$REPO_ROOT/.clinerules/core.md" | tr -d ' '
  else
    echo 0
  fi
}

# Отпечаток служебных файлов ревью: подмена scope.diff или changed-files.txt
# иначе осталась бы незамеченной.
review_files_fingerprint() {
  (cd "$SNAP_DIR" && find _review -type f ! -name state.txt -print0 | LC_ALL=C sort -z |
    xargs -0 -r sha256sum) | sha256sum | cut -d' ' -f1
}

meta_get() {
  local file="$1" key="$2" value
  [ -f "$file" ] || return 1
  value=$(grep -m1 "^$key=" "$file" | cut -d= -f2- || true)
  [ -n "$value" ] || return 1
  printf '%s' "$value"
}

# --- git-объекты во временном каталоге --------------------------------------

# Деревья строятся в собственном git-каталоге рабочей области: объекты проекта
# не создаются, .git и индекс проекта не меняются.
init_temp_git() {
  [ -d "$GIT_DIR_TMP" ] || git init --quiet --bare "$GIT_DIR_TMP" ||
    die "не удалось создать временный git-каталог $GIT_DIR_TMP"
  git --git-dir="$GIT_DIR_TMP" config core.autocrlf false
  git --git-dir="$GIT_DIR_TMP" config core.safecrlf false
  git --git-dir="$GIT_DIR_TMP" config core.quotepath false
  git --git-dir="$GIT_DIR_TMP" config core.fileMode false
  git --git-dir="$GIT_DIR_TMP" config core.attributesFile /dev/null
  # `.gitattributes` проекта (text=auto) нормализует EOL при индексации: атрибуты берём из
  # пустого дерева, чтобы деревья описывали байты. Текст патча при этом всё равно может
  # выглядеть как перезапись файла при правке EOL — поэтому смотри changed-files.txt и копию.
  EMPTY_ATTR_TREE=$(GIT_DIR="$GIT_DIR_TMP" git hash-object -t tree /dev/null 2>/dev/null || true)
  if [ -n "$EMPTY_ATTR_TREE" ]; then
    export GIT_ATTR_SOURCE="$EMPTY_ATTR_TREE"
  fi
}

write_tree() {
  local dir="$1" index="$2" list="$WORK_TMP/tree.list"
  mkdir -p "$WORK_TMP"
  dir_files "$dir" >"$list"
  rm -f "$index"
  GIT_DIR="$GIT_DIR_TMP" GIT_INDEX_FILE="$index" git read-tree --empty
  if [ -s "$list" ]; then
    GIT_DIR="$GIT_DIR_TMP" GIT_INDEX_FILE="$index" git --work-tree="$dir" add -f \
      --pathspec-from-file="$list" --pathspec-file-nul >/dev/null
  fi
  GIT_DIR="$GIT_DIR_TMP" GIT_INDEX_FILE="$index" git write-tree
}

# --- уборка -----------------------------------------------------------------

# Удаляется только путь внутри рабочей области скрипта.
remove_workspace_path() {
  local target="$1" attempt
  case "$target" in
    "$WS" | "$WS"/*) ;;
    *) die "отказ удалять путь вне рабочей области: $target" ;;
  esac
  [ -e "$target" ] || return 0
  chmod -R u+w "$target" 2>/dev/null || true
  for attempt in 1 2 3; do
    rm -r "$target" 2>/dev/null || true
    [ -e "$target" ] || return 0
    sleep 1
  done
  return 1
}

# Завершается только процесс, PID которого записал run: чужие процессы не трогаем.
process_cmdline() {
  local pid="$1"
  if [ -r "/proc/$pid/cmdline" ]; then
    tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null || true
  else
    ps -p "$pid" -o args= 2>/dev/null || true
  fi
}

kill_own_reviewer() {
  local pidfile="$WS/reviewer.pid" pid cmdline ws_id
  [ -f "$pidfile" ] || return 0
  pid=$(cat "$pidfile" 2>/dev/null || true)
  case "$pid" in
    '' | *[!0-9]*)
      rm -f "$pidfile"
      return 0
      ;;
  esac
  if kill -0 "$pid" 2>/dev/null; then
    ws_id=$(basename "$WS")
    cmdline=$(process_cmdline "$pid")
    case "$cmdline" in
      *"$ws_id"*) ;;
      *) die "процесс $pid не похож на запущенного скриптом ревьюера — не завершаю его" ;;
    esac
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
      sleep 1
    fi
    kill -0 "$pid" 2>/dev/null && die "процесс ревьюера $pid не завершился — заверши его вручную"
    say "завершён процесс ревьюера $pid (запущен скриптом)"
  fi
  rm -f "$pidfile"
}


# --- команды -----------------------------------------------------------------

require_snapshot() {
  load_snapshot
  if [ ! -f "$SNAP_DIR/_review/state.txt" ]; then
    die "снимок $SNAP_DIR неполон: нет _review/state.txt — собери его заново через create"
  fi
}

cmd_base() {
  if [ -e "$BASE_META" ]; then
    die "база задачи уже зафиксирована (commit $(meta_get "$BASE_META" commit || echo '?') в $BASE_META); повторная фиксация после правок недопустима — новая задача начинается с clean --all"
  fi
  mkdir -p "$WS" "$WORK_TMP"
  remove_workspace_path "$BASE_DIR" || die "не удалось очистить $BASE_DIR"
  remove_workspace_path "$GIT_DIR_TMP" || die "не удалось очистить $GIT_DIR_TMP"
  rm -f "$BASE_TREE_INDEX" "$WS/reviewer.pid" "$WS/reviewer.exit" "$SNAP_POINTER"

  mkdir -p "$BASE_DIR"
  collect_paths "$WORK_TMP/base.list" "$SKIPPED_FILE"
  copy_paths "$WORK_TMP/base.list" "$BASE_DIR"
  init_temp_git
  local tree fingerprint
  tree=$(write_tree "$BASE_DIR" "$BASE_TREE_INDEX") || die "не удалось построить дерево базы"
  fingerprint=$(dir_fingerprint "$BASE_DIR")
  git -C "$REPO_ROOT" status --porcelain -uall >"$BASE_STATUS"
  cat >"$BASE_META" <<EOF
captured-utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
commit=$(repo_head)
branch=$(repo_branch)
commit-subject=$(repo_subject)
tree=$tree
files=$(dir_file_count "$BASE_DIR")
fingerprint=$fingerprint
core-md-sha256=$(core_md_sha)
core-md-lines=$(core_md_lines)
excluded=$(wc -l <"$SKIPPED_FILE" | tr -d ' ')
EOF
  say "база задачи зафиксирована: commit $(repo_head), файлов $(dir_file_count "$BASE_DIR")"
  say "незакоммиченные изменения до задачи: $(grep -c . "$BASE_STATUS" || true) путей (в область ревью не войдут)"
  say "исключено фильтром: $(wc -l <"$SKIPPED_FILE" | tr -d ' ') путей — список в $SKIPPED_FILE"
}

check_snapshot_safety() {
  local path relative
  while IFS= read -r -d '' path; do
    relative="${path#./}"
    if is_secret_path "$relative"; then
      die "в снимке оказался секрет или локальные данные: $relative"
    fi
  done < <(cd "$SNAP_DIR" && find . -type f -print0)
  if [ -e "$SNAP_DIR/.clinerules/core.md" ]; then
    die "в снимке оказались инструкции основного агента: .clinerules/core.md"
  fi
  [ -f "$SNAP_DIR/.clinerules/reviewer.md" ] ||
    die "в снимке нет .clinerules/reviewer.md — ревьюеру нечем работать"
  [ -f "$SNAP_DIR/AGENTS.md" ] || die "в снимке нет AGENTS.md"
}

# Файлы копии переводим в read-only и проверяем, действует ли запрет записи в этом
# окружении: план ревьюера ограничивает инструменты, а не файловую систему.
apply_readonly_files() {
  local note=effective probe="$WORK_TMP/probe"
  if ! find "$SNAP_DIR" -type f -exec chmod a-w {} + 2>/dev/null; then
    printf 'off'
    return 0
  fi
  if printf x >"$probe" 2>/dev/null; then
    chmod a-w "$probe" 2>/dev/null || true
    if (printf y >"$probe") 2>/dev/null; then
      note=not-enforced
    fi
    chmod u+w "$probe" 2>/dev/null || true
    rm -f "$probe"
  else
    note=unverified
  fi
  printf '%s' "$note"
}

write_state() {
  local readonly_note="$1" state="$SNAP_DIR/_review/state.txt"
  cat >"$state" <<EOF
# Состояние ревью. Снимок — расходная копия проекта; проверки выполнялись на исходном дереве.
# Read-only ставится на файлы копии и каталог _review/; остальные каталоги копии
# остаются записываемыми — целостность держат отпечатки snapshot-fingerprint и review-files-fingerprint.
generated-utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
snapshot-fingerprint=$(dir_fingerprint "$SNAP_DIR")
snapshot-files=$(dir_file_count "$SNAP_DIR")
files-readonly=$readonly_note
review-files-fingerprint=$(review_files_fingerprint)
source-branch=$(repo_branch)
source-head=$(repo_head)
source-head-subject=$(repo_subject)
source-status-hash=$(status_hash)
source-fingerprint=$(source_fingerprint)
core-md-sha256=$(core_md_sha)
core-md-lines=$(core_md_lines)
base-commit=$(meta_get "$BASE_META" commit || echo unknown)
base-commit-subject=$(meta_get "$BASE_META" commit-subject || echo unknown)
base-tree=$(meta_get "$BASE_META" tree || echo unknown)
base-fingerprint=$(meta_get "$BASE_META" fingerprint || echo unknown)
base-core-md-sha256=$(meta_get "$BASE_META" core-md-sha256 || echo unknown)
base-core-md-lines=$(meta_get "$BASE_META" core-md-lines || echo unknown)
base-captured-utc=$(meta_get "$BASE_META" captured-utc || echo unknown)
changed-files=$(wc -l <"$SNAP_DIR/_review/changed-files.txt" | tr -d ' ')
preexisting-status=_review/preexisting-status.txt
excluded-files=_review/excluded-files.txt
base-excluded-files=_review/base-excluded-files.txt
checks-note=прогоны и отпечаток состояния передаются в задании ревью
EOF
}

cmd_create() {
  if [ ! -f "$BASE_META" ]; then
    die "база задачи не зафиксирована: base выполняется до правок (scripts/review-snapshot.sh base)"
  fi
  mkdir -p "$WORK_TMP"
  local snap_name
  snap_name="snap-$(date -u +%Y%m%dT%H%M%SZ)"
  SNAP_DIR="$WS/$snap_name"
  SNAP_INDEX="$WS/$snap_name.index"
  if [ -e "$SNAP_DIR" ]; then
    die "каталог снимка уже существует: $SNAP_DIR"
  fi
  mkdir -p "$SNAP_DIR"
  IN_CREATE=1
  trap 'create_failed' ERR

  collect_paths "$WORK_TMP/snap.list" "$WS/snap.skipped.txt"
  copy_paths "$WORK_TMP/snap.list" "$SNAP_DIR"
  check_snapshot_safety

  init_temp_git
  local base_tree snap_tree readonly_note
  base_tree=$(meta_get "$BASE_META" tree) || die "в $BASE_META нет дерева базы"
  snap_tree=$(write_tree "$SNAP_DIR" "$SNAP_INDEX") || die "не удалось построить дерево снимка"

  mkdir -p "$SNAP_DIR/_review"
  git --git-dir="$GIT_DIR_TMP" diff-tree -p --binary --no-color "$base_tree" "$snap_tree" \
    >"$SNAP_DIR/_review/scope.diff"
  git --git-dir="$GIT_DIR_TMP" diff-tree -r --no-commit-id --name-status "$base_tree" "$snap_tree" \
    >"$SNAP_DIR/_review/changed-files.txt"
  cp "$BASE_STATUS" "$SNAP_DIR/_review/preexisting-status.txt"
  cp "$WS/snap.skipped.txt" "$SNAP_DIR/_review/excluded-files.txt"
  cp "$SKIPPED_FILE" "$SNAP_DIR/_review/base-excluded-files.txt"

  readonly_note=$(apply_readonly_files)
  write_state "$readonly_note"
  chmod a-w "$SNAP_DIR/_review/state.txt" 2>/dev/null || true
  chmod a-w "$SNAP_DIR/_review" 2>/dev/null || true

  trap - ERR
  IN_CREATE=0
  printf '%s\n' "$snap_name" >"$SNAP_POINTER"
  say "снимок: $SNAP_DIR"
  say "база: commit $(meta_get "$BASE_META" commit): $(meta_get "$BASE_META" commit-subject)"
  say "изменённых путей: $(wc -l <"$SNAP_DIR/_review/changed-files.txt" | tr -d ' ')"
  say "отпечаток снимка: $(meta_get "$SNAP_DIR/_review/state.txt" snapshot-fingerprint)"
  say "read-only: $readonly_note"
  say "дальше: scripts/review-snapshot.sh run --prompt <файл>, затем verify и clean"
}

create_failed() {
  rm -f "$WORK_TMP/probe" 2>/dev/null || true
  remove_workspace_path "$SNAP_DIR" >/dev/null 2>&1 || true
  printf '[review] ОШИБКА: снимок не создан, неполная копия удалена (диагностика выше)\n' >&2
  exit 1
}

cmd_fingerprint() {
  mkdir -p "$WORK_TMP"
  printf 'source-head=%s\n' "$(repo_head)"
  printf 'source-head-subject=%s\n' "$(repo_subject)"
  printf 'source-status-hash=%s\n' "$(status_hash)"
  printf 'source-fingerprint=%s\n' "$(source_fingerprint)"
}

cmd_verify() {
  require_snapshot
  mkdir -p "$WORK_TMP"
  local state="$SNAP_DIR/_review/state.txt" rc=0
  local rec_head rec_status rec_source rec_snapshot rec_review rec_core
  rec_head=$(meta_get "$state" source-head) || die "в state.txt нет source-head"
  rec_status=$(meta_get "$state" source-status-hash) || die "в state.txt нет source-status-hash"
  rec_source=$(meta_get "$state" source-fingerprint) || die "в state.txt нет source-fingerprint"
  rec_snapshot=$(meta_get "$state" snapshot-fingerprint) || die "в state.txt нет snapshot-fingerprint"
  rec_review=$(meta_get "$state" review-files-fingerprint) || die "в state.txt нет review-files-fingerprint"
  rec_core=$(meta_get "$state" core-md-sha256) || rec_core=""

  local cur_head cur_status cur_source cur_snapshot cur_review cur_core cur_base
  cur_head=$(repo_head)
  cur_status=$(status_hash)
  cur_source=$(source_fingerprint)
  cur_snapshot=$(dir_fingerprint "$SNAP_DIR")
  cur_review=$(review_files_fingerprint)
  cur_core=$(core_md_sha)

  local rec_base="" cur_base=""
  rec_base=$(meta_get "$BASE_META" fingerprint || true)
  if [ -n "$rec_base" ]; then
    if [ -d "$BASE_DIR" ]; then
      cur_base=$(dir_fingerprint "$BASE_DIR")
      if [ "$cur_base" != "$rec_base" ]; then
        warn "копия базы изменилась после фиксации: в записи $rec_base, сейчас $cur_base"
        rc=1
      fi
    else
      warn "копия базы $BASE_DIR исчезла, хотя база задачи зафиксирована"
      rc=1
    fi
  fi

  if [ "$cur_head" != "$rec_head" ]; then
    warn "HEAD изменился после снимка: было $rec_head, сейчас $cur_head"
    rc=1
  fi
  if [ "$cur_source" != "$rec_source" ] || [ "$cur_status" != "$rec_status" ]; then
    warn "исходное дерево изменилось после снимка: проверки из записи относятся к другому содержимому"
    git -C "$REPO_ROOT" status --porcelain -uall >&2 || true
    rc=1
  fi
  if [ "$cur_snapshot" != "$rec_snapshot" ]; then
    warn "содержимое снимка изменилось после создания: было $rec_snapshot, сейчас $cur_snapshot"
    rc=1
  fi
  if [ "$cur_review" != "$rec_review" ]; then
    warn "служебные файлы _review/ изменились после создания снимка"
    rc=1
  fi
  if [ -n "$rec_core" ] && [ "$cur_core" != "$rec_core" ]; then
    warn "core.md изменился после снимка: в записи $rec_core, сейчас $cur_core"
    rc=1
  fi
  if [ "$rc" -eq 0 ]; then
    say "исходное дерево и снимок совпадают с записью: ревью относится к актуальному состоянию"
  else
    warn "расхождение зафиксировано; откат не выполняется — разберись в причине и сообщи пользователю"
  fi
  return "$rc"
}

cmd_clean() {
  local all=0 name leftovers=0
  case "${1:-}" in
    "") ;;
    --all) all=1 ;;
    *) usage_error "неизвестный аргумент: $1" ;;
  esac
  kill_own_reviewer
  if [ "$all" -eq 1 ]; then
    remove_workspace_path "$WS" ||
      die "не удалось удалить рабочую область $WS — каталог держит процесс (на Windows: ps -W, затем taskkill //F //PID); повтори clean --all"
    if [ -e "$WS" ]; then
      die "рабочая область на месте: $WS"
    fi
    say "рабочая область удалена: $WS"
    return 0
  fi
  rm -f "$SNAP_POINTER" "$WS/reviewer.exit" "$WS/snap.skipped.txt"
  remove_workspace_path "$WORK_TMP" || die "не удалось удалить временные файлы $WORK_TMP"
  # Снимки прошлых кругов тоже убираются: брошенных копий оставаться не должно.
  for name in "$WS"/snap-*; do
    [ -e "$name" ] || continue
    rm -f "$name.index"
    if remove_workspace_path "$name"; then
      say "удалён снимок: $name"
    else
      warn "каталог $name не удаляется — его держит процесс (на Windows: ps -W, затем taskkill //F //PID); повтори clean"
      leftovers=1
    fi
  done
  [ "$leftovers" -eq 0 ] || die "уборка неполная: см. предупреждения выше"
  say "снимки удалены; база задачи сохранена для следующего круга (clean --all — вся область)"
}

cmd_run() {
  local prompt_file="" timeout=1800
  while [ $# -gt 0 ]; do
    case "$1" in
      --prompt)
        [ $# -ge 2 ] || usage_error "после --prompt нужен путь к файлу с текстом задания"
        prompt_file="$2"
        shift 2
        ;;
      --timeout)
        [ $# -ge 2 ] || usage_error "после --timeout нужно число секунд"
        timeout="$2"
        shift 2
        ;;
      *) usage_error "неизвестный аргумент: $1" ;;
    esac
  done
  case "$timeout" in
    '' | *[!0-9]*) usage_error "--timeout принимает целое число секунд" ;;
  esac
  [ -n "$prompt_file" ] || usage_error "нужен --prompt <файл> с текстом задания ревьюеру"
  [ -f "$prompt_file" ] || die "файл промпта не найден: $prompt_file"
  require_snapshot
  if [ -f "$WS/reviewer.pid" ]; then
    die "ревьюер уже запущен (PID $(cat "$WS/reviewer.pid")): дождись отчёта или заверши его clean"
  fi
  command -v cline >/dev/null 2>&1 ||
    die "cline CLI не найден в PATH: независимое ревью недоступно, сообщи пользователю"

  local prompt
  prompt=$(cat "$prompt_file")
  [ -n "$prompt" ] || die "промпт пуст: $prompt_file"

  say "запуск ревьюера: cline -p -t $timeout -c $SNAP_DIR"
  cline -p -t "$timeout" -c "$SNAP_DIR" "$prompt" &
  local pid=$! rc=0
  printf '%s\n' "$pid" >"$WS/reviewer.pid"
  trap 'kill "$pid" 2>/dev/null || true' INT TERM HUP
  wait "$pid" || rc=$?
  trap - INT TERM HUP
  rm -f "$WS/reviewer.pid"
  printf '%s\n' "$rc" >"$WS/reviewer.exit"
  if [ "$rc" -ne 0 ]; then
    warn "ревьюер завершился с кодом $rc"
  else
    say "ревьюер завершил работу"
  fi
  say "сохрани отчёт в контекст задачи, затем: scripts/review-snapshot.sh verify && scripts/review-snapshot.sh clean"
  return "$rc"
}

cmd_status() {
  say "рабочая область: $WS"
  if [ -f "$BASE_META" ]; then
    say "база: commit $(meta_get "$BASE_META" commit): $(meta_get "$BASE_META" commit-subject)"
    say "база зафиксирована: $(meta_get "$BASE_META" captured-utc), файлов $(meta_get "$BASE_META" files)"
  else
    say "база задачи не зафиксирована"
  fi
  if [ -f "$SNAP_POINTER" ] && [ -n "$(current_snapshot_name || true)" ]; then
    say "снимок: $(meta_get "$WS/$(current_snapshot_name)/_review/state.txt" snapshot-fingerprint), файлов $(meta_get "$WS/$(current_snapshot_name)/_review/state.txt" snapshot-files)"
  else
    say "снимка нет"
  fi
  mkdir -p "$WORK_TMP"
  say "сейчас: head=$(repo_head) branch=$(repo_branch) fingerprint=$(source_fingerprint)"
}

usage_error() {
  printf '[review] ОШИБКА: %s\n' "$1" >&2
  usage >&2
  exit 2
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    '' | -h | --help | help)
      usage
      exit 0
      ;;
  esac
  init_context
  shift || true
  case "$cmd" in
    base) cmd_base "$@" ;;
    fingerprint) cmd_fingerprint "$@" ;;
    create) cmd_create "$@" ;;
    run) cmd_run "$@" ;;
    verify) cmd_verify "$@" ;;
    clean) cmd_clean "$@" ;;
    status) cmd_status "$@" ;;
    *) usage_error "неизвестная команда: $cmd" ;;
  esac
}

main "$@"
