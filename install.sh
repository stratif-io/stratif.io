#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# stratif.io — one-line local installer (no Docker required)
# Usage: curl -fsSL https://stratif.io/install.sh | bash
# ─────────────────────────────────────────────────────────────────────────────

REPO="stratif-io/stratif.io"
REPO_URL="https://github.com/${REPO}"
INSTALL_DIR="${STRATIFIO_DIR:-$HOME/.stratifio}"
PORT="${STRATIFIO_PORT:-8000}"
DATA_DIR="${STRATIFIO_DATA_DIR:-$INSTALL_DIR/data}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}  →  $*${NC}"; }
success() { echo -e "${GREEN}  ✓  $*${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠  $*${NC}"; }
die()     { echo -e "${RED}  ✗  $*${NC}" >&2; exit 1; }

echo ""
echo -e "${CYAN}  stratif.io Analytics — self-hosted product analytics${NC}"
echo ""

# ── Dependency checks ─────────────────────────────────────────────────────────

check_cmd() { command -v "$1" >/dev/null 2>&1; }

# Python 3.12+
if ! check_cmd python3; then
  die "Python 3.12+ is required. Install it from https://python.org/downloads/"
fi
PY_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
PY_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 12 ]; }; then
  PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  die "Python 3.12+ is required (found $PY_VER). Install it from https://python.org/downloads/"
fi

check_cmd git    || die "'git' is required. See: https://git-scm.com/downloads"
check_cmd curl   || die "'curl' is required but not found."
check_cmd openssl || die "'openssl' is required but not found."

success "Python $(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'), git, openssl — OK"

# ── Install uv (if not already present) ──────────────────────────────────────

if check_cmd uv; then
  success "uv already installed"
else
  info "Installing uv (Python package manager)"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
  check_cmd uv || die "uv installation failed. Try manually: curl -LsSf https://astral.sh/uv/install.sh | sh"
  success "uv installed"
fi

# ── Resolve release tag ───────────────────────────────────────────────────────

# STRATIFIO_VERSION can be set to pin a specific tag (used by CI tests)
if [ -n "${STRATIFIO_VERSION:-}" ]; then
  LATEST="$STRATIFIO_VERSION"
  info "Using pinned version: $LATEST"
else
  info "Fetching latest release"
  LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' | head -1 \
    | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
  [ -n "$LATEST" ] || die "Could not fetch latest release. Check your internet connection."
  success "Latest release: $LATEST"
fi

# ── Clone or update repo ──────────────────────────────────────────────────────
# Disable interactive credential prompts — required when running via curl | bash
export GIT_TERMINAL_PROMPT=0

# STRATIFIO_REPO_DIR can point at an already-checked-out repo (used by CI tests)
# to skip the clone entirely.
if [ -n "${STRATIFIO_REPO_DIR:-}" ]; then
  info "Using local repo at $STRATIFIO_REPO_DIR"
  if [ "$STRATIFIO_REPO_DIR" != "$INSTALL_DIR" ]; then
    cp -r "$STRATIFIO_REPO_DIR/." "$INSTALL_DIR"
  fi
elif [ -d "$INSTALL_DIR/.git" ]; then
  info "Updating to $LATEST"
  git -C "$INSTALL_DIR" fetch --tags --quiet
  git -C "$INSTALL_DIR" checkout --quiet "$LATEST"
else
  info "Cloning stratif.io to $INSTALL_DIR"
  git clone --depth 1 --branch "$LATEST" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── Download pre-built frontend ───────────────────────────────────────────────

FRONTEND_DEST="$INSTALL_DIR/dist"
FRONTEND_VERSION_FILE="$INSTALL_DIR/.frontend-version"
INSTALLED_FRONTEND=$(cat "$FRONTEND_VERSION_FILE" 2>/dev/null || echo "")

if [ "$INSTALLED_FRONTEND" = "$LATEST" ] && [ -d "$FRONTEND_DEST" ]; then
  success "Frontend $LATEST already present — skipping download"
else
  TMP=$(mktemp /tmp/stratifio-frontend.XXXXXX.tar.gz)
  # STRATIFIO_FRONTEND_TARBALL can point to a local file (used by CI tests)
  if [ -n "${STRATIFIO_FRONTEND_TARBALL:-}" ]; then
    info "Using local frontend tarball"
    cp "$STRATIFIO_FRONTEND_TARBALL" "$TMP"
  else
    info "Downloading frontend build ($LATEST)"
    FRONTEND_URL="https://github.com/${REPO}/releases/download/${LATEST}/frontend.tar.gz"
    if ! curl -fsSL "$FRONTEND_URL" -o "$TMP"; then
      rm -f "$TMP"
      die "Failed to download frontend from GitHub release $LATEST"
    fi
  fi
  rm -rf "$FRONTEND_DEST"
  tar -xzf "$TMP" -C "$INSTALL_DIR"
  rm -f "$TMP"
  echo "$LATEST" > "$FRONTEND_VERSION_FILE"
  success "Frontend ready"
fi

# ── Install Python dependencies ───────────────────────────────────────────────

info "Installing Python dependencies"
uv sync --frozen --no-dev --quiet
success "Python dependencies ready"

# ── Data directory + .env + connections.yaml ──────────────────────────────────

mkdir -p "$DATA_DIR"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  info "Generating encryption key"
  KEY=$(openssl rand -base64 32)
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  sed -i.bak "s|STRATIFIO_ENCRYPTION_KEY=.*|STRATIFIO_ENCRYPTION_KEY=${KEY}|" "$INSTALL_DIR/.env"
  rm -f "$INSTALL_DIR/.env.bak"
  success ".env created"
else
  warn ".env already exists — skipping key generation"
fi

if [ ! -f "$INSTALL_DIR/connections.yaml" ]; then
  info "Creating connections.yaml"
  cat > "$INSTALL_DIR/connections.yaml" << YAML
backends:
  duckdb:
    enabled: true
    credentials:
      file_path: $DATA_DIR/sample.duckdb
    expected_columns: []
YAML
  success "connections.yaml created"
else
  warn "connections.yaml already exists — skipping"
fi

# ── Write start.sh helper ─────────────────────────────────────────────────────

cat > "$INSTALL_DIR/start.sh" << STARTSH
#!/usr/bin/env bash
set -euo pipefail
cd "$INSTALL_DIR"
export PATH="\$HOME/.local/bin:\$HOME/.cargo/bin:\$PATH"
SAMPLE_DB="$DATA_DIR/sample.duckdb"
if [ ! -f "\$SAMPLE_DB" ]; then
  echo "[stratifio] Seeding sample data (first run)…"
  DB_PATH_PREFIX="$DATA_DIR/sample" SEED_USERS=5000 SEED_DAYS=90 uv run seed-duckdb
fi
uv run python -m seeders.bootstrap_connection --path "\$SAMPLE_DB"
echo ""
echo "  stratif.io is running at http://localhost:$PORT"
echo "  Press Ctrl+C to stop."
echo ""
exec uv run uvicorn backend.main:app --host 0.0.0.0 --port $PORT
STARTSH
chmod +x "$INSTALL_DIR/start.sh"

# ── First run: seed sample data ───────────────────────────────────────────────

SAMPLE_DB="$DATA_DIR/sample.duckdb"
if [ ! -f "$SAMPLE_DB" ]; then
  info "Seeding sample analytics data (first run — ~30 seconds)"
  SEED_USERS=5000 SEED_DAYS=90 uv run seed-duckdb
fi
uv run python -m seeders.bootstrap_connection --path "$SAMPLE_DB"

# ── Start server ──────────────────────────────────────────────────────────────

info "Starting stratif.io"
uv run uvicorn backend.main:app --host 0.0.0.0 --port "$PORT" &
SERVER_PID=$!

# ── Wait for health ───────────────────────────────────────────────────────────

ATTEMPTS=0
until curl -sf "http://localhost:${PORT}/" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 30 ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    die "App did not start. Run '$INSTALL_DIR/start.sh' to try again."
  fi
  sleep 2
done

echo ""
success "stratif.io is running at http://localhost:${PORT}"
echo ""
echo "  Next steps:"
echo "  1. Open http://localhost:${PORT}"
echo "  2. Connections → Add connection"
echo "  3. DuckDB → path: $DATA_DIR/sample.duckdb  (pre-seeded sample data)"
echo ""
echo "  To stop:    Ctrl+C  (or kill $SERVER_PID)"
echo "  To restart: $INSTALL_DIR/start.sh"
echo "  To update:  curl -fsSL https://stratif.io/install.sh | bash"
echo ""

wait "$SERVER_PID"
