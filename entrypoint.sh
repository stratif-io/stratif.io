#!/usr/bin/env bash
set -euo pipefail

SAMPLE_DB="/data/sample.duckdb"

if [ ! -f "$SAMPLE_DB" ]; then
  echo "[openflow] Seeding sample analytics data (first run)…"
  DB_PATH_PREFIX=/data/sample \
  SEED_USERS=5000 \
  SEED_DAYS=90 \
  seed-duckdb
  echo "[openflow] Seeding complete → $SAMPLE_DB"
fi

exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
