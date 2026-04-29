#!/usr/bin/env sh
set -eu

# ─────────────────────────────────────────────────────────────────────────────
# stratif.io — one-line local installer (no Docker required)
# Usage: curl -fsSL https://stratif.io/install.sh | sh
# ─────────────────────────────────────────────────────────────────────────────

REPO="stratif-io/stratif.io"
REPO_URL="https://github.com/${REPO}"
INSTALL_DIR="${STRATIFIO_DIR:-$HOME/.stratifio}"
PORT="${STRATIFIO_PORT:-6870}"
DATA_DIR="${STRATIFIO_DATA_DIR:-$INSTALL_DIR/data}"

gh_curl() { curl ${GITHUB_TOKEN:+-H "Authorization: token $GITHUB_TOKEN"} "$@"; }

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { printf "${CYAN}  →  %s${NC}\n" "$*"; }
success() { printf "${GREEN}  ✓  %s${NC}\n" "$*"; }
warn()    { printf "${YELLOW}  ⚠  %s${NC}\n" "$*"; }
die()     { printf "${RED}  ✗  %s${NC}\n" "$*" >&2; exit 1; }
step()    { _n=$1 _total=$2; shift 2; printf "\n${BOLD}  [%s/%s] %s${NC}\n" "$_n" "$_total" "$*"; }

# Spinner: run a command, show animated progress, wait for completion.
# Usage: run_with_spinner "message" cmd args...
run_with_spinner() {
  _msg=$1; shift
  _frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  _i=0

  "$@" >"$_SPINNER_LOG" 2>&1 &
  _pid=$!

  if [ -t 1 ]; then
    tput civis 2>/dev/null || true
    while kill -0 "$_pid" 2>/dev/null; do
      _char=$(printf '%s' "$_frames" | cut -c$(( (_i % 10) + 1 )))
      printf "\r  ${CYAN}%s  %s${NC}  " "$_char" "$_msg"
      _i=$((_i + 1))
      sleep 0.08
    done
    tput cnorm 2>/dev/null || true
    printf "\r\033[K"
  fi

  if wait "$_pid"; then
    success "$_msg"
  else
    printf "\n"
    cat "$_SPINNER_LOG" >&2
    die "$_msg — failed (see output above)"
  fi
}

_SPINNER_LOG=$(mktemp /tmp/stratifio-install.XXXXXX)
trap 'rm -f "$_SPINNER_LOG"' EXIT

printf "\n${BOLD}${CYAN}  stratif.io Analytics${NC} — self-hosted product analytics\n\n"

# ── Step 1: Check dependencies ────────────────────────────────────────────────

step 1 5 "Checking dependencies"

check_cmd() { command -v "$1" >/dev/null 2>&1; }

check_cmd python3 || die "Python 3.12+ is required. Install from https://python.org/downloads/"
PY_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
PY_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 12 ]; }; then
  PY_VER=$(python3 -c 'import sys; print(str(sys.version_info.major) + "." + str(sys.version_info.minor))')
  die "Python 3.12+ is required (found $PY_VER). Install from https://python.org/downloads/"
fi
check_cmd git    || die "'git' is required. See: https://git-scm.com/downloads"
check_cmd curl   || die "'curl' is required but not found."
check_cmd openssl || die "'openssl' is required but not found."

success "Python $(python3 -c 'import sys; print(str(sys.version_info.major) + "." + str(sys.version_info.minor))'), git, openssl — OK"

if check_cmd uv; then
  success "uv already installed"
else
  run_with_spinner "Installing uv (Python package manager)" \
    sh -c 'curl -LsSf https://astral.sh/uv/install.sh | sh'
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
  check_cmd uv || die "uv installation failed. Try manually: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

# ── Step 2: Get the code ──────────────────────────────────────────────────────

step 2 5 "Getting stratif.io"

if [ -n "${STRATIFIO_VERSION:-}" ]; then
  LATEST="$STRATIFIO_VERSION"
else
  info "Fetching latest version"
  LATEST=$(gh_curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' | head -1 \
    | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
  [ -n "$LATEST" ] || die "Could not fetch latest release. Check your internet connection."
fi
success "Version: $LATEST"

export GIT_TERMINAL_PROMPT=0

if [ -n "${STRATIFIO_REPO_DIR:-}" ]; then
  if [ "$STRATIFIO_REPO_DIR" != "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR"
    run_with_spinner "Copying files to $INSTALL_DIR" \
      sh -c "tar -c -C '$STRATIFIO_REPO_DIR' --exclude='.git' --exclude='.venv' --exclude='node_modules' --exclude='.worktrees' --exclude='dist' . | tar -x -C '$INSTALL_DIR'"
  else
    success "Using $INSTALL_DIR"
  fi
elif [ -d "$INSTALL_DIR/.git" ]; then
  # Unshallow if needed so older tags are reachable for version pinning
  if git -C "$INSTALL_DIR" rev-parse --is-shallow-repository 2>/dev/null | grep -q true; then
    run_with_spinner "Fetching full history" \
      git -C "$INSTALL_DIR" fetch --unshallow --tags --quiet
  else
    run_with_spinner "Fetching tags" \
      git -C "$INSTALL_DIR" fetch --tags --quiet
  fi
  git -C "$INSTALL_DIR" checkout --quiet "$LATEST"
else
  run_with_spinner "Downloading stratif.io" \
    git clone --depth 1 --branch "$LATEST" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── Step 3: Dependencies ──────────────────────────────────────────────────────

step 3 5 "Installing dependencies"

FRONTEND_DEST="$INSTALL_DIR/dist"
FRONTEND_VERSION_FILE="$INSTALL_DIR/.frontend-version"
INSTALLED_FRONTEND=$(cat "$FRONTEND_VERSION_FILE" 2>/dev/null || echo "")

if [ "$INSTALLED_FRONTEND" = "$LATEST" ] && [ -d "$FRONTEND_DEST" ]; then
  success "Frontend already up-to-date"
else
  if [ -n "${STRATIFIO_FRONTEND_TARBALL:-}" ]; then
    run_with_spinner "Extracting frontend" \
      sh -c "rm -rf '$FRONTEND_DEST' && tar -xzf '$STRATIFIO_FRONTEND_TARBALL' -C '$INSTALL_DIR'"
  else
    TMP=$(mktemp /tmp/stratifio-frontend.XXXXXX)
    ASSET_URL=$(gh_curl -fsSL \
      "https://api.github.com/repos/${REPO}/releases/tags/${LATEST}" \
      | grep -o '"url": *"https://api[^"]*/releases/assets/[0-9]*"' \
      | head -1 | sed 's/.*"url": *"\([^"]*\)".*/\1/')
    [ -n "$ASSET_URL" ] || die "Could not find frontend asset in release $LATEST"
    run_with_spinner "Downloading frontend ($LATEST)" \
      gh_curl -fsSL -H "Accept: application/octet-stream" "$ASSET_URL" -o "$TMP"
    run_with_spinner "Extracting frontend" \
      sh -c "rm -rf '$FRONTEND_DEST' && tar -xzf '$TMP' -C '$INSTALL_DIR' && rm -f '$TMP'"
  fi
  echo "$LATEST" > "$FRONTEND_VERSION_FILE"
fi

run_with_spinner "Installing Python packages" \
  uv sync --frozen --no-dev --quiet

# ── Step 4: Configuration ─────────────────────────────────────────────────────

step 4 5 "Configuring"

mkdir -p "$DATA_DIR"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  KEY=$(openssl rand -base64 32)
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  sed -i.bak "s|STRATIFIO_ENCRYPTION_KEY=.*|STRATIFIO_ENCRYPTION_KEY=${KEY}|" "$INSTALL_DIR/.env"
  rm -f "$INSTALL_DIR/.env.bak"
  success ".env created"
else
  warn ".env already exists — keeping existing config"
fi

if [ ! -f "$INSTALL_DIR/connections.yaml" ]; then
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
  warn "connections.yaml already exists — keeping existing config"
fi

cat > "$INSTALL_DIR/start.sh" << STARTSH
#!/usr/bin/env sh
set -eu
cd "$INSTALL_DIR"
export PATH="\$HOME/.local/bin:\$HOME/.cargo/bin:\$PATH"
SAMPLE_DB="$DATA_DIR/sample.duckdb"
if [ ! -f "\$SAMPLE_DB" ]; then
  echo "[stratifio] Seeding sample data (first run)…"
  SEED_USERS=5000 SEED_DAYS=90 "$INSTALL_DIR/.venv/bin/seed-duckdb"
fi
"$INSTALL_DIR/.venv/bin/python" -m services.event_simulator.bootstrap_connection --path "\$SAMPLE_DB"
echo ""
echo "  stratif.io is running at http://localhost:$PORT"
echo "  Press Ctrl+C to stop."
echo ""
exec STRATIFIO_LOG_LEVEL=error "$INSTALL_DIR/.venv/bin/uvicorn" services.analytics.main:app --host 0.0.0.0 --port $PORT --log-level error
STARTSH
chmod +x "$INSTALL_DIR/start.sh"

# ── Step 5: First run ─────────────────────────────────────────────────────────

step 5 5 "Starting"

SAMPLE_DB="$DATA_DIR/sample.duckdb"
if [ ! -f "$SAMPLE_DB" ]; then
  run_with_spinner "Seeding sample data — takes about 30 seconds" \
    sh -c "SEED_USERS=5000 SEED_DAYS=90 '$INSTALL_DIR/.venv/bin/seed-duckdb'"
fi
"$INSTALL_DIR/.venv/bin/python" -m services.event_simulator.bootstrap_connection --path "$SAMPLE_DB" >/dev/null 2>&1

printf "\n${GREEN}${BOLD}  ✓  Installation complete${NC}\n\n"
printf "  Open: http://localhost:${PORT}\n"
printf "  Sample data: Connections → DuckDB → $DATA_DIR/sample.duckdb\n"
printf "\n"
printf "  To stop:    Ctrl+C\n"
printf "  To restart: $INSTALL_DIR/start.sh\n"
printf "  To update:  curl -fsSL https://stratif.io/install.sh | sh\n"
printf "\n"

# exec replaces this installer shell with the server process so it stays
# running when the script was piped via "curl | sh".
exec "$INSTALL_DIR/start.sh"
