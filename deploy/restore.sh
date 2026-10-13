#!/usr/bin/env bash
# Restore the database from a backup made by backup.sh. Stops the backend, recreates the database, restores the dump,
# starts the backend again (Flyway then only validates). Usage:
#   deploy/restore.sh /var/backups/bonbon/bonbon-20270301T023000Z.dump
# From the bucket first:  aws s3 cp s3://<bucket>/db/<file> . --endpoint-url <endpoint>
# FORCE=yes skips the confirmation prompt (for scripted rehearsals).
set -euo pipefail

dump="${1:?usage: restore.sh <file.dump>}"
[ -f "$dump" ] || { echo "No such file: $dump" >&2; exit 1; }
dump="$(cd "$(dirname "$dump")" && pwd)/$(basename "$dump")"

cd "$(dirname "$0")"
ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE_FILES="${COMPOSE_FILES:--f compose.prod.yaml}"

# Reads one KEY=value from the env file without running it as shell (values may contain <, > and spaces).
env_get() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

db="$(env_get POSTGRES_DB)"; db="${db:-bonbon}"
user="$(env_get POSTGRES_USER)"; user="${user:-bonbon}"
# shellcheck disable=SC2086
compose() { docker compose $COMPOSE_FILES --env-file "$ENV_FILE" "$@"; }

if [ "${FORCE:-}" != "yes" ]; then
  read -r -p "This replaces the whole '$db' database with $(basename "$dump"). Type the database name to continue: " answer
  [ "$answer" = "$db" ] || { echo "Cancelled."; exit 1; }
fi

compose stop backend
compose exec -T postgres psql -U "$user" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"$db\";" \
  -c "CREATE DATABASE \"$db\" OWNER \"$user\";"
compose exec -T postgres pg_restore -U "$user" -d "$db" --no-owner --exit-on-error < "$dump"
compose start backend
echo "Restored $db from $(basename "$dump"); backend starting (watch: docker compose logs -f backend)."
