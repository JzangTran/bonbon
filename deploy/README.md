# deploy

How the pieces of bonbon run together. Each deployable repo keeps its own `Dockerfile`; this folder only
wires them up.

| File | Purpose |
|---|---|
| `compose.dev.yaml` | Local PostgreSQL 17, Redis 7.4, Mailpit (catches outgoing email, inbox http://localhost:8025) and S3Mock (S3-compatible object storage on http://localhost:9090, buckets `bonbon-private` and `bonbon-public`, standing in for Cloudflare R2) |
| `.env.example` | Every variable used by compose and the backend, with dev-only values |

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
