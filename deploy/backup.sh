#!/usr/bin/env bash
# Nightly database backup: a pg_dump (custom format) of the running stack, kept BACKUP_KEEP_DAYS days on the server
# and copied to an R2/S3 bucket when BACKUP_S3_BUCKET is set. Cron (as the deploy user, 02:30 server time):
#   30 2 * * * /opt/bonbon/deploy/backup.sh >> /var/log/bonbon-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")"
ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE_FILES="${COMPOSE_FILES:--f compose.prod.yaml}"

# Reads one KEY=value from the env file without running it as shell (values may contain <, > and spaces).
env_get() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

dir="$(env_get BACKUP_DIR)"; dir="${dir:-/var/backups/bonbon}"
keep="$(env_get BACKUP_KEEP_DAYS)"; keep="${keep:-14}"
db="$(env_get POSTGRES_DB)"; db="${db:-bonbon}"
user="$(env_get POSTGRES_USER)"; user="${user:-bonbon}"
bucket="$(env_get BACKUP_S3_BUCKET)"

mkdir -p "$dir"
name="bonbon-$(date -u +%Y%m%dT%H%M%SZ).dump"

# shellcheck disable=SC2086
docker compose $COMPOSE_FILES --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$user" -d "$db" --format=custom --no-owner > "$dir/$name.part"
mv "$dir/$name.part" "$dir/$name"
echo "$(date -u +%FT%TZ) backup $dir/$name ($(du -h "$dir/$name" | cut -f1))"

find "$dir" -name 'bonbon-*.dump' -mtime +"$keep" -print -delete

if [ -n "$bucket" ]; then
  docker run --rm -v "$dir:/backup:ro" \
    -e AWS_ACCESS_KEY_ID="$(env_get BACKUP_S3_ACCESS_KEY)" \
    -e AWS_SECRET_ACCESS_KEY="$(env_get BACKUP_S3_SECRET_KEY)" \
    -e AWS_DEFAULT_REGION=auto \
    amazon/aws-cli s3 cp "/backup/$name" "s3://$bucket/db/$name" --endpoint-url "$(env_get BACKUP_S3_ENDPOINT)" --only-show-errors
  echo "$(date -u +%FT%TZ) copied to s3://$bucket/db/$name"
fi
