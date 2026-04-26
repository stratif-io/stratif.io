#!/usr/bin/env bash
set -euo pipefail

SAMPLE_DB="/data/sample.duckdb"

# Write connections.yaml so seed-duckdb knows where to write the DuckDB file.
cat > /app/connections.yaml << YAML
backends:
  duckdb:
    enabled: true
    credentials:
      file_path: $SAMPLE_DB
    expected_columns: []
YAML

if [ ! -f "$SAMPLE_DB" ]; then
  echo "[stratifio] Seeding sample analytics data (first run)…"
  SEED_USERS=5000 \
  SEED_DAYS=90 \
  seed-duckdb
  echo "[stratifio] Seeding complete → $SAMPLE_DB"
fi

python -m services.event_simulator.bootstrap_connection --path "$SAMPLE_DB"

echo "[stratifio] Open http://localhost:9999 in your browser"
exec uvicorn services.analytics.main:app --host 0.0.0.0 --port 8000
