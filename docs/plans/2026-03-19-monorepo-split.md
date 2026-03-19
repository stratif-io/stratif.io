# Monorepo Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the flat root into an `apps/` monorepo using npm workspaces so the root directory only contains project-level files.

**Architecture:** All JS tooling (vite, vitest, playwright, tsconfig, eslint, postcss) moves into `apps/web/` alongside the frontend source. `apps/video/` is moved from root. Python (`backend/`, `seeders/`, `pyproject.toml`, `uv.lock`) stays at root. A minimal root `package.json` declares workspaces and proxies key npm scripts.

**Tech Stack:** npm workspaces, Vite 6, Vitest 2, Playwright, FastAPI, Docker multi-stage build.

---

## File Map

### Created
- `apps/web/package.json` — web workspace package (contents of current root `package.json`)
- `apps/web/vite.config.ts` — moved, no content change needed (paths are __dirname-relative)
- `apps/web/vitest.config.ts` — moved, no content change needed
- `apps/web/playwright.config.ts` — moved, `testDir` updated to `./tests/e2e`
- `apps/web/tsconfig.json` — moved, `paths` unchanged (still `./frontend/*`)
- `apps/web/tsconfig.node.json` — moved, `include` unchanged
- `apps/web/eslint.config.js` — moved from root
- `apps/web/postcss.config.js` — moved from root

### Moved (git mv)
- `frontend/` → `apps/web/frontend/`
- `index.html` → `apps/web/index.html`
- `public/` → `apps/web/public/`
- `tests/` → `apps/web/tests/`
- `video/` → `apps/video/`

### Modified
- `package.json` (root) — replaced with minimal workspace root
- `Dockerfile` — updated COPY paths to `apps/web/`
- `.gitignore` — update any root-relative paths that move
- `CLAUDE.md` — update path references

### Deleted from root
- `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`
- `tsconfig.json`, `tsconfig.node.json`
- `eslint.config.js`, `.eslintrc.json`, `postcss.config.js`
- `package-lock.json` (regenerated at root by npm install)
- `skills-lock.json` (already untracked, gitignored)
- `stratifio_product.sqlite` (gitignored local artifact)

---

## Task 1: Create apps/web scaffold and move source files

**Files:**
- Create: `apps/web/` directory
- `git mv`: `frontend/` → `apps/web/frontend/`
- `git mv`: `index.html` → `apps/web/index.html`
- `git mv`: `public/` → `apps/web/public/`
- `git mv`: `tests/` → `apps/web/tests/`
- `git mv`: `video/` → `apps/video/`

- [ ] **Step 1: Create the apps directory structure**

```bash
mkdir -p apps/web apps/video
```

- [ ] **Step 2: Move frontend source, entry point, and public assets**

```bash
git mv frontend apps/web/frontend
git mv index.html apps/web/index.html
git mv public apps/web/public
```

- [ ] **Step 3: Move e2e tests**

```bash
git mv tests apps/web/tests
```

- [ ] **Step 4: Move the video app**

```bash
git mv video apps/video
```

- [ ] **Step 5: Verify moves**

```bash
git status --short | head -40
```
Expected: all moves shown as renames (R), no unexpected deletions.

---

## Task 2: Create apps/web package.json and tooling configs

**Files:**
- Create: `apps/web/package.json`
- `git mv`: `vite.config.ts` → `apps/web/vite.config.ts`
- `git mv`: `vitest.config.ts` → `apps/web/vitest.config.ts`
- `git mv`: `playwright.config.ts` → `apps/web/playwright.config.ts`
- `git mv`: `tsconfig.json` → `apps/web/tsconfig.json`
- `git mv`: `tsconfig.node.json` → `apps/web/tsconfig.node.json`
- `git mv`: `eslint.config.js` → `apps/web/eslint.config.js`
- `git mv`: `postcss.config.js` → `apps/web/postcss.config.js`

- [ ] **Step 1: Move all tooling config files into apps/web**

```bash
git mv vite.config.ts apps/web/vite.config.ts
git mv vitest.config.ts apps/web/vitest.config.ts
git mv playwright.config.ts apps/web/playwright.config.ts
git mv tsconfig.json apps/web/tsconfig.json
git mv tsconfig.node.json apps/web/tsconfig.node.json
git mv eslint.config.js apps/web/eslint.config.js
git mv postcss.config.js apps/web/postcss.config.js
```

- [ ] **Step 2: Move .eslintrc.json (legacy flat config fallback)**

```bash
git mv .eslintrc.json apps/web/.eslintrc.json
```

- [ ] **Step 3: Create apps/web/package.json**

This is the current root `package.json` with the name updated. The scripts stay identical — they resolve correctly once Vite/Vitest/Playwright run from `apps/web/` as cwd.

```bash
cat > apps/web/package.json << 'EOF'
{
  "name": "@stratifio/web",
  "version": "0.1.0",
  "description": "stratif.io Analytics — open source analytics dashboard",
  "main": "./frontend/index.ts",
  "exports": {
    ".": "./frontend/index.ts"
  },
  "files": [
    "frontend",
    "dist"
  ],
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"frontend/**/*.{ts,tsx,css,json}\"",
    "format:check": "prettier --check \"frontend/**/*.{ts,tsx,css,json}\"",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "bundle:analyze": "vite-bundle-visualizer"
  },
  "dependencies": {
    "@fontsource-variable/geist": "^5.2.8",
    "@heroicons/react": "^2.1.1",
    "@kanaries/graphic-walker": "^0.4.80",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@tanstack/react-query": "^5.60.0",
    "@tanstack/react-table": "^8.20.5",
    "@tanstack/react-virtual": "^3.13.18",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "duckdb-async": "^0.10.2",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.469.0",
    "react": "^18.0.0",
    "react-day-picker": "^9.6.3",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.15.0",
    "sonner": "^2.0.7",
    "styled-components": "^5.3.11",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@types/node": "^22.10.0",
    "@types/react": "^18.3.14",
    "@types/react-dom": "^18.3.5",
    "@typescript-eslint/eslint-plugin": "^8.15.0",
    "@typescript-eslint/parser": "^8.15.0",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.15.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "jsdom": "^28.1.0",
    "postcss": "^8.4.49",
    "prettier": "^3.4.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vite-bundle-visualizer": "^1.2.0",
    "vitest": "^2.1.0"
  }
}
EOF
```

- [ ] **Step 4: Verify structure so far**

```bash
ls apps/web/ && ls apps/video/
```
Expected: `apps/web/` contains `frontend/`, `index.html`, `public/`, `tests/`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `postcss.config.js`, `package.json`.

---

## Task 3: Replace root package.json with workspace root

**Files:**
- Modify: `package.json` (root) — replace with minimal workspace config

- [ ] **Step 1: Write new root package.json**

```bash
cat > package.json << 'EOF'
{
  "name": "stratifio-oss",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspace=apps/web",
    "preview": "npm run preview --workspace=apps/web",
    "lint": "npm run lint --workspace=apps/web",
    "format": "npm run format --workspace=apps/web",
    "format:check": "npm run format:check --workspace=apps/web",
    "test": "npm run test --workspace=apps/web",
    "test:run": "npm run test:run --workspace=apps/web",
    "test:coverage": "npm run test:coverage --workspace=apps/web",
    "test:e2e": "npm run test:e2e --workspace=apps/web",
    "test:e2e:ui": "npm run test:e2e:ui --workspace=apps/web"
  },
  "devDependencies": {
    "eslint": "^9.15.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.4.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,json,md}": [
      "prettier --write"
    ]
  },
  "prepare": "husky"
}
EOF
```

- [ ] **Step 2: Reinstall from workspace root to regenerate lockfile**

```bash
rm -f package-lock.json
npm install
```
Expected: new `package-lock.json` at root, `node_modules/` at root (hoisted), no `node_modules/` inside `apps/web/` (or symlinked).

- [ ] **Step 3: Verify workspace is recognized**

```bash
npm ls --workspaces --depth=0 2>/dev/null | head -20
```
Expected: lists `@stratifio/web` and `stratifio-video` as workspaces.

---

## Task 4: Update apps/web config file paths

The configs reference paths relative to their own location — most don't need changes since `__dirname` resolves correctly. Only `playwright.config.ts` needs a `testDir` check and the `webServer` command needs to run vite from apps/web.

**Files:**
- Modify: `apps/web/playwright.config.ts` — verify `testDir` and `webServer`
- Modify: `apps/web/tsconfig.node.json` — add `vite.config.ts` to include if missing

- [ ] **Step 1: Verify playwright testDir points correctly**

The tests moved to `apps/web/tests/e2e/`. The config already has `testDir: './tests/e2e'` which is correct relative to `apps/web/`. No change needed — confirm by reading the file:

```bash
grep "testDir\|webServer\|command" apps/web/playwright.config.ts
```
Expected output includes `testDir: './tests/e2e'` and `command: 'npm run dev'`.

- [ ] **Step 2: Verify vitest setupFiles path**

```bash
grep "setupFiles\|include" apps/web/vitest.config.ts
```
Expected: `setupFiles: ['./frontend/test/setup.ts']` — correct relative to `apps/web/`.

- [ ] **Step 3: Verify tsconfig paths**

```bash
grep -A2 "paths\|include" apps/web/tsconfig.json
```
Expected: `"@/*": ["./frontend/*"]` — correct relative to `apps/web/`.

- [ ] **Step 4: Verify tsconfig.node.json includes vite config**

```bash
cat apps/web/tsconfig.node.json
```
Expected: `"include": ["vite.config.ts"]` — correct, file is in same directory.

---

## Task 5: Update Dockerfile COPY paths

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Update the frontend build stage**

The old stage copies from root. After the restructure, frontend files are in `apps/web/`.

Edit `Dockerfile` — replace the frontend stage:

```dockerfile
# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
COPY apps/web/index.html apps/web/tsconfig.json apps/web/tsconfig.node.json \
     apps/web/vite.config.ts apps/web/postcss.config.js ./apps/web/
COPY apps/web/frontend ./apps/web/frontend
RUN npm run build
```

The `dist/` output lands in `apps/web/dist/` — update the copy in the final stage:

```dockerfile
# Copy built frontend (from apps/web/dist)
COPY --from=frontend /app/apps/web/dist ./dist
```

- [ ] **Step 2: Apply the Dockerfile edits**

Read the current Dockerfile carefully, then make the two targeted edits above (frontend stage COPY instructions, and the final stage `COPY --from=frontend` path).

- [ ] **Step 3: Verify Dockerfile syntax**

```bash
docker build --no-cache --progress=plain . 2>&1 | tail -20
```
Expected: build completes successfully. If it fails at an npm or COPY step, fix the path.

---

## Task 6: Clean up orphan files at root

**Files:**
- Delete from root: `stratifio_product.sqlite`, `skills-lock.json` (disk only, not tracked)
- `git rm` from root: old config files already moved via `git mv` in Tasks 1-2

- [ ] **Step 1: Remove lingering untracked/gitignored files**

```bash
rm -f stratifio_product.sqlite skills-lock.json
```

- [ ] **Step 2: Confirm root is clean**

```bash
ls -p | grep -v /
```
Expected root files: `CLAUDE.md`, `Dockerfile`, `LICENSE`, `README.md`, `docker-compose.yml`, `entrypoint.sh`, `install.sh`, `package.json`, `package-lock.json`, `pyproject.toml`, `uv.lock`, `.env.example`, `.gitignore`, `.prettierrc`, `.prettierignore`, `.pre-commit-config.yaml`, `.dockerignore`.

---

## Task 7: Update .gitignore, CLAUDE.md, and README

**Files:**
- Modify: `.gitignore` — update any paths that moved
- Modify: `CLAUDE.md` — update `src/` path references to `apps/web/frontend/`
- Modify: `README.md` — update architecture diagram paths

- [ ] **Step 1: Update .gitignore paths**

Replace video-specific ignores and dist path:

Old lines to update:
```
video/node_modules/
video/out/
video/public/*.webm
video/public/*.mp3
```

New lines:
```
apps/video/node_modules/
apps/video/out/
apps/video/public/*.webm
apps/video/public/*.mp3
apps/web/dist/
apps/web/coverage/
apps/web/playwright-report/
apps/web/test-results/
```

Keep the bare `dist/` and `build/` lines in `.gitignore` — these patterns match anywhere in the tree (no leading slash), so they already cover `apps/web/dist/`, `apps/video/dist/`, etc. Do NOT remove them.

- [ ] **Step 2: Update CLAUDE.md**

Replace all occurrences of `src/features/` → `apps/web/frontend/features/`, `src/components/` → `apps/web/frontend/components/`, `src/` → `apps/web/frontend/` where referring to frontend source paths.

Also update commands section — `npm run dev` and `npm run test:run` etc. still work from root (proxied via workspaces), so those stay the same.

- [ ] **Step 3: Update README architecture diagram**

The current diagram already uses `frontend/` and `backend/`. Update to reflect new paths:

```
apps/
  web/           # React 18, Vite 6, Tailwind CSS v4
    frontend/    # source code
    tests/       # Playwright e2e
  video/         # Remotion demo video
backend/         # FastAPI, DuckDB, SQLGlot
seeders/         # sample data generators
```

- [ ] **Step 4: Commit documentation updates**

```bash
git add .gitignore CLAUDE.md README.md
git commit -m "docs: update paths for monorepo restructure"
```

---

## Task 8: Verify everything works end-to-end

- [ ] **Step 1: Verify frontend dev server starts**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
kill %1
```
Expected: `302` (redirect to /dashboard).

- [ ] **Step 2: Verify unit tests pass**

```bash
npm run test:run
```
Expected: all tests pass.

- [ ] **Step 3: Verify production build**

```bash
npm run build
```
Expected: `apps/web/dist/` is populated with compiled assets.

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint
```
Expected: zero warnings, zero errors.

- [ ] **Step 5: Commit everything**

```bash
git add -A
git commit -m "chore: restructure into apps/ monorepo with npm workspaces"
```

---

## Task 9: Smoke-test Docker build

- [ ] **Step 1: Build the Docker image**

```bash
docker build -t stratifio-test .
```
Expected: build completes, all three stages succeed.

- [ ] **Step 2: Run the container**

```bash
docker run --rm -e STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32) -p 8001:8000 stratifio-test &
sleep 15
curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/
kill %1
```
Expected: `200` or `302`.

- [ ] **Step 3: Clean up test image**

```bash
docker rmi stratifio-test
```

- [ ] **Step 4: Final commit**

```bash
git add Dockerfile
git commit -m "chore: update Dockerfile COPY paths for apps/web layout"
```
