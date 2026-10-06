#!/bin/sh
# Start-up for Docker and single-service hosts (e.g. Railway): wait for PostgreSQL, apply pending migrations, ensure the crop
# catalogue exists, optionally add demo data to an EMPTY database, then start the API.
# Nothing here resets or deletes existing data.
set -e

MAX_ATTEMPTS="${DB_WAIT_ATTEMPTS:-30}"
attempt=1
echo "[entrypoint] Applying database migrations…"
until npx --no-install prisma migrate deploy; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "[entrypoint] Database not reachable after $attempt attempts — giving up." >&2
    exit 1
  fi
  echo "[entrypoint] Database not ready (attempt $attempt/$MAX_ATTEMPTS); retrying in 2s…"
  attempt=$((attempt + 1))
  sleep 2
done

echo "[entrypoint] Upserting crop knowledge catalogue…"
npx --no-install tsx prisma/seed.ts --catalog-only

case "${SEED_DEMO_DATA:-false}" in
  true)
    echo "[entrypoint] SEED_DEMO_DATA=true — adding demo account if the database has no users…"
    npx --no-install tsx prisma/seed.ts --if-empty
    ;;
  refresh)
    # Public demo deployments: rebuild ONLY the demo account so its dates stay current.
    echo "[entrypoint] SEED_DEMO_DATA=refresh — recreating the demo account (other users untouched)…"
    npx --no-install tsx prisma/seed.ts
    ;;
esac

echo "[entrypoint] Starting HarvestTrack API"
exec "$@"
