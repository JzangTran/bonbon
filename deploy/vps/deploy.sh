#!/usr/bin/env bash
# Rolls out one part of the demo: `deploy.sh backend`, `deploy.sh web`, or `deploy.sh config` (compose files and Caddyfile).
# Installed as /opt/bonbon/deploy.sh and forced on the GitHub Actions key in ~deploy/.ssh/authorized_keys, so that key can run
# nothing else: when called that way the part comes from SSH_ORIGINAL_COMMAND.
set -euo pipefail

cd /opt/bonbon
# one rollout at a time: backend and web can both be merged at once, and the web waits for a healthy backend
exec 9>/opt/bonbon/.deploy.lock
flock 9
target="${1:-${SSH_ORIGINAL_COMMAND:-}}"
case "$target" in
  backend) service=backend ;;
  web) service=caddy ;;
  config) service="" ;;
  *) echo "usage: deploy.sh backend|web|config" >&2; exit 2 ;;
esac

# the stack's files always come from the bonbon repo's main branch
raw=https://raw.githubusercontent.com/JzangTran/bonbon/main/deploy
for file in compose.prod.yaml compose.demo.yaml Caddyfile backup.sh restore.sh; do
  curl -fsSL "$raw/$file" -o "$file.new" && mv "$file.new" "$file"
done
chmod 750 backup.sh restore.sh
# and this script itself, for the next rollout (mv swaps the file; the running copy is not touched)
curl -fsSL "$raw/vps/deploy.sh" -o deploy.sh.new && chmod 750 deploy.sh.new && mv deploy.sh.new deploy.sh

export COMPOSE_FILE=compose.prod.yaml:compose.demo.yaml
compose() { docker compose --env-file .env.prod "$@"; }

if [ -z "$service" ]; then
  compose up -d --remove-orphans
  compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile || true
else
  compose pull "$service"
  compose up -d "$service"
fi
docker image prune -f >/dev/null
compose ps --format 'table {{.Service}}\t{{.Status}}'
