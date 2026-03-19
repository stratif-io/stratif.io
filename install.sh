#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# stratif.io — one-line local installer
# Usage: curl -fsSL https://stratif.io/install.sh | bash
# ─────────────────────────────────────────────────────────────────────────────

REPO_URL="https://github.com/stratifio/stratifio-oss"
INSTALL_DIR="${STRATIFIO_DIR:-$HOME/.stratifio}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}  →  $*${NC}"; }
success() { echo -e "${GREEN}  ✓  $*${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠  $*${NC}"; }
die()     { echo -e "${RED}  ✗  $*${NC}" >&2; exit 1; }

echo ""
echo -e "${CYAN}  stratif.io Analytics — self-hosted product analytics${NC}"
echo ""

# ── Dependency checks ─────────────────────────────────────────────────────────

check_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not installed. See: $2"
}

check_cmd docker  "https://docs.docker.com/get-docker/"
check_cmd git     "https://git-scm.com/downloads"

# Docker must be running
docker info >/dev/null 2>&1 || die "Docker is not running. Start Docker and try again."

success "Dependencies OK"

# ── Clone or update ───────────────────────────────────────────────────────────

if [ -d "$INSTALL_DIR/.git" ]; then
  info "Updating existing install at $INSTALL_DIR"
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Cloning stratif.io to $INSTALL_DIR"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── Generate .env if missing ──────────────────────────────────────────────────

if [ ! -f .env ]; then
  info "Generating encryption key"
  KEY=$(openssl rand -base64 32)
  cp .env.example .env
  # Replace placeholder key
  sed -i.bak "s|STRATIFIO_ENCRYPTION_KEY=.*|STRATIFIO_ENCRYPTION_KEY=${KEY}|" .env
  rm -f .env.bak
  success ".env created with fresh encryption key"
else
  warn ".env already exists — skipping key generation"
fi

# ── Start ─────────────────────────────────────────────────────────────────────

info "Building and starting stratif.io (first run may take ~2 minutes)"
docker compose up --build -d

# ── Wait for health ───────────────────────────────────────────────────────────

info "Waiting for app to be ready"
ATTEMPTS=0
MAX_ATTEMPTS=30
until curl -sf http://localhost:8000/ >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    die "App did not start in time. Run: docker compose logs app"
  fi
  sleep 3
done

echo ""
success "stratif.io is running at http://localhost:8000"
echo ""
echo "  Next steps:"
echo "  1. Open http://localhost:8000"
echo "  2. Go to Connections → Add connection"
echo "  3. Choose DuckDB → path: /data/sample.duckdb  (pre-seeded sample data)"
echo ""
echo "  To stop:    docker compose -C $INSTALL_DIR down"
echo "  To update:  curl -fsSL https://stratif.io/install.sh | bash"
echo ""
