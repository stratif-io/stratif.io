#!/usr/bin/env bash
set -euo pipefail

SAMPLE_DB="/data/sample.duckdb"

if [ ! -f "$SAMPLE_DB" ]; then
  echo "[stratifio] Seeding sample analytics data (first run)…"
  DB_PATH_PREFIX=/data/sample \
  SEED_USERS=5000 \
  SEED_DAYS=90 \
  seed-duckdb
  echo "[stratifio] Seeding complete → $SAMPLE_DB"
fi

python -m seeders.bootstrap_connection --path "$SAMPLE_DB"

exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
