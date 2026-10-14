# deploy

How the pieces of bonbon run together. Each deployable repo keeps its own `Dockerfile`; this folder only
wires them up.

| File | Purpose |
|---|---|
| `compose.dev.yaml` | Local PostgreSQL 17, Redis 7.4, Mailpit (catches outgoing email, inbox http://localhost:8025) and S3Mock (S3-compatible object storage on http://localhost:9090, buckets `bonbon-private` and `bonbon-public`, standing in for Cloudflare R2) |
| `.env.example` | Every variable used by compose and the backend, with dev-only values |
| `compose.prod.yaml` | Production on one VPS: Caddy (HTTPS, static web, `/api` and `/ws` proxied), backend, PostgreSQL, Redis; only Caddy publishes ports |
| `Caddyfile` | The edge: automatic HTTPS for `BONBON_DOMAIN`, SPA fallback, cache headers, CSP for the web app, `/actuator` closed |
| `.env.prod.example` | Every production setting, with placeholders; copy to `.env.prod` on the server (never committed) |
| `backup.sh` / `restore.sh` | Nightly `pg_dump` with retention and an optional copy to an R2 bucket; full restore from a dump |
| `compose.rehearsal.yaml` | Runs the production stack locally (HTTP on :8088, S3Mock, Mailpit) to rehearse deploys and restores |

## Local development

```bash
cp deploy/.env.example deploy/.env          # then set BONBON_JWT_SECRET
docker compose -f deploy/compose.dev.yaml --env-file deploy/.env up -d
docker compose -f deploy/compose.dev.yaml ps   # every service should be up (postgres and redis "healthy")
```

Run the backend against it (Git Bash):

```bash
cd backend
set -a && source ../deploy/.env && set +a
./mvnw spring-boot:run
```

Flyway migrates the schema on startup. Health: http://localhost:8080/actuator/health,
API docs (dev profile only): http://localhost:8080/swagger-ui.html

Stop with `docker compose -f deploy/compose.dev.yaml down` (add `-v` to also delete the database volume).

## Production (one VPS)

Images are built from each repo's `Dockerfile` (backend: JRE, non-root, readiness healthcheck; web: static build on
Caddy). On the server, from a checkout of this repo with the submodules:

```bash
docker build -t bonbon-backend:sprint-10 backend
docker build -t bonbon-web:sprint-10 --build-arg VITE_SITE_URL=https://<domain> --build-arg VITE_GOOGLE_CLIENT_ID=<web client id> web
cp deploy/.env.prod.example deploy/.env.prod && chmod 600 deploy/.env.prod   # fill in; set the two *_IMAGE tags
docker compose -f deploy/compose.prod.yaml --env-file deploy/.env.prod up -d
docker compose -f deploy/compose.prod.yaml --env-file deploy/.env.prod ps   # backend "healthy", caddy up
```

DNS for `BONBON_DOMAIN` must point at the server and ports 80/443 must be open: Caddy gets the certificate itself.
Flyway migrates the database on the backend's first start, and the first admin comes from `ADMIN_SEED_*`.

**Update**: back up first (`deploy/backup.sh`), build the new tags, change `BONBON_BACKEND_IMAGE` / `BONBON_WEB_IMAGE`
in `.env.prod`, then `up -d` again (only changed services restart; the backend drains requests on stop).

**Roll back**: put the previous image tags back and `up -d`. Migrations only go forward, so if the new version
migrated the schema, also restore the backup taken just before the update (`deploy/restore.sh <file>`).

**Backups**: cron `30 2 * * * /opt/bonbon/deploy/backup.sh >> /var/log/bonbon-backup.log 2>&1`. Dumps stay
`BACKUP_KEEP_DAYS` days in `BACKUP_DIR` and are copied to `BACKUP_S3_BUCKET` (give that bucket a lifecycle rule to
expire old copies). Uploaded files live in R2 and are not part of the dump.

**Restore**: `deploy/restore.sh /var/backups/bonbon/bonbon-<time>.dump` (asks for the database name to confirm).

**Logs**: `docker compose -f deploy/compose.prod.yaml logs -f backend`; every service rotates at 10 MB × 5 files.

### Rehearse locally

```bash
docker build -t bonbon-backend:rehearsal backend && docker build -t bonbon-web:rehearsal web
cp deploy/.env.prod.example deploy/.env.prod   # BONBON_DOMAIN=:80, the *_IMAGE tags :rehearsal, real secrets
docker compose -f deploy/compose.prod.yaml -f deploy/compose.rehearsal.yaml --env-file deploy/.env.prod up -d
# http://localhost:8088 ; mail at http://localhost:18025
COMPOSE_FILES="-f compose.prod.yaml -f compose.rehearsal.yaml" deploy/backup.sh
COMPOSE_FILES="-f compose.prod.yaml -f compose.rehearsal.yaml" deploy/restore.sh <dump>
```
