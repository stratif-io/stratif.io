#!/usr/bin/env bash
# Run all tests: backend (Python) + frontend (TypeScript)
# Usage:
#   ./test.sh                        # all tests (excludes integration)
#   ./test.sh --backend              # backend unit tests only
#   ./test.sh --frontend             # frontend only
#   ./test.sh --integration          # integration tests only (requires DB credentials)
#   ./test.sh --integration --env-file .env.test  # load credentials from a file
#   ./test.sh --e2e                  # e2e tests only (requires pre-configured connection IDs)
#   ./test.sh --e2e --env-file .env.test  # with credentials from file

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_ONLY=false
FRONTEND_ONLY=false
INTEGRATION_ONLY=false
E2E_ONLY=false
ENV_FILE=""
FILTER=""

for arg in "$@"; do
  case $arg in
    --backend)        BACKEND_ONLY=true ;;
    --frontend)       FRONTEND_ONLY=true ;;
    --integration)    INTEGRATION_ONLY=true ;;
    --e2e)            E2E_ONLY=true ;;
    --env-file)       shift; ENV_FILE="$1" ;;
    --env-file=*)     ENV_FILE="${arg#--env-file=}" ;;
    -k)               shift; FILTER="$1" ;;
    -k=*)             FILTER="${arg#-k=}" ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

FAILED=()

pytest_cmd() {
  if [ -n "$ENV_FILE" ]; then
    env $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) uv run pytest "$@"
  else
    uv run pytest "$@"
  fi
}

run_backend() {
  echo ""
  echo "━━━ Backend tests (Python) ━━━━━━━━━━━━━━━━━━━━━━"
  pytest_cmd "$ROOT/backend/tests/" -q -m "not integration" || FAILED+=("backend")
}

run_integration() {
  echo ""
  echo "━━━ Integration tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  local args=("$ROOT/backend/tests/integration/" -v -m integration)
  [ -n "$FILTER" ] && args+=(-k "$FILTER")
  pytest_cmd "${args[@]}" || FAILED+=("integration")
}

run_e2e() {
  echo ""
  echo "━━━ E2E tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  local args=("$ROOT/backend/tests/e2e/" -v -m e2e)
  [ -n "$FILTER" ] && args+=(-k "$FILTER")
  pytest_cmd "${args[@]}" || FAILED+=("e2e")
}

run_frontend() {
  echo ""
  echo "━━━ Frontend tests (TypeScript/Vitest) ━━━━━━━━━━━"
  npm run test:run --workspace=apps/web || FAILED+=("frontend")
}

if $E2E_ONLY; then
  run_e2e
elif $INTEGRATION_ONLY; then
  run_integration
elif $BACKEND_ONLY; then
  run_backend
elif $FRONTEND_ONLY; then
  run_frontend
else
  run_backend
  run_frontend
fi

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "✓ All tests passed"
else
  echo "✗ Failed: ${FAILED[*]}"
  exit 1
fi
