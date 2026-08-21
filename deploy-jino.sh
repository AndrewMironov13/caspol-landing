#!/usr/bin/env bash
# Выкладка лендинга CASPOL на виртуальный хостинг Джино (FTPS).
#
#   ./deploy-jino.sh backup     — скачать текущий сайт клиента в backup-ГГГГ-ММ-ДД/
#   ./deploy-jino.sh deploy     — залить dist/ поверх (ничего не удаляя)
#   ./deploy-jino.sh deploy --prune  — залить и удалить лишнее на сервере (только после backup!)
#
# Доступы берутся из ~/.jino-caspol.env (в репозиторий НЕ кладём):
#   JINO_HOST=j1234567.myjino.ru
#   JINO_USER=...
#   JINO_PASS=...
#   JINO_DIR=domains/caspol.ru
set -euo pipefail

ENV_FILE="${JINO_ENV:-$HOME/.jino-caspol.env}"
[ -f "$ENV_FILE" ] || { echo "Нет файла доступов $ENV_FILE"; exit 1; }
set -a; . "$ENV_FILE"; set +a
: "${JINO_HOST:?}" "${JINO_USER:?}" "${JINO_PASS:?}" "${JINO_DIR:?}"

command -v lftp >/dev/null || { echo "Нужен lftp:  brew install lftp"; exit 1; }

HERE="$(cd "$(dirname "$0")" && pwd)"
CMD="${1:-deploy}"
PRUNE=""
[ "${2:-}" = "--prune" ] && PRUNE="--delete"

case "$CMD" in
  backup)
    DEST="$HERE/backup-$(date +%F)"
    mkdir -p "$DEST"
    echo "Скачиваю $JINO_DIR → $DEST"
    lftp <<EOF
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate no
open -u "$JINO_USER","$JINO_PASS" "$JINO_HOST"
mirror --parallel=4 --verbose "$JINO_DIR" "$DEST"
bye
EOF
    echo "Готово: $DEST"
    ;;

  deploy)
    [ -d "$HERE/dist" ] || { echo "Нет dist/ — сначала npm run build"; exit 1; }
    echo "Заливаю dist/ → $JINO_DIR ${PRUNE:+(с удалением лишнего)}"
    lftp <<EOF
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate no
set net:timeout 20
set net:max-retries 3
open -u "$JINO_USER","$JINO_PASS" "$JINO_HOST"
mirror -R --parallel=6 --only-newer --verbose $PRUNE \
  --exclude-glob .DS_Store \
  "$HERE/dist" "$JINO_DIR"
bye
EOF
    echo "Залито. Проверь: https://caspol.ru/"
    ;;

  *) echo "Использование: $0 [backup|deploy] [--prune]"; exit 1 ;;
esac
