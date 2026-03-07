# Pulumi + Fly.io Deployment as Code — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace imperative `fly secrets set` CLI commands with a Pulumi TypeScript program that declares the full Fly.io infrastructure (app, volume, secrets) as code.

**Architecture:** A self-contained `infra/` directory holds a Pulumi TypeScript project. It reads secrets from a gitignored `.env.secrets` file at `pulumi up` time and provisions a Fly.io app, a persistent volume for the SQLite product DB, and all required secrets. `fly deploy` (or CI) continues to handle image deployments — Pulumi owns infrastructure only.

**Tech Stack:** Pulumi CLI, `@pulumi/pulumi`, `@pulumi/fly`, `dotenv`, TypeScript, Fly.io (`flyctl`)

---

## Task 1: Add `infra/` Pulumi project scaffold

**Files:**
- Create: `infra/Pulumi.yaml`
- Create: `infra/package.json`
- Create: `infra/tsconfig.json`

**Step 1: Create `infra/Pulumi.yaml`**

```yaml
name: openflow
runtime: nodejs
description: OpenFlow Analytics — Fly.io infrastructure
```

**Step 2: Create `infra/package.json`**

```json
{
  "name": "openflow-infra",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@pulumi/pulumi": "^3.0.0",
    "@pulumi/fly": "^0.1.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**Step 3: Create `infra/tsconfig.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "outDir": "bin",
    "target": "es2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "sourceMap": true,
    "experimentalDecorators": true,
    "pretty": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "files": ["index.ts"]
}
```

**Step 4: Install dependencies**

```bash
cd infra && npm install
```

Expected: `node_modules/` created, `package-lock.json` written.

**Step 5: Commit**

```bash
git add infra/Pulumi.yaml infra/package.json infra/tsconfig.json infra/package-lock.json
git commit -m "infra: scaffold Pulumi TypeScript project for Fly.io"
```

---

## Task 2: Create `.env.secrets` example and gitignore entry

**Files:**
- Create: `.env.secrets.example`
- Modify: `.gitignore`

**Step 1: Create `.env.secrets.example`**

```bash
# Required secrets for OpenFlow on Fly.io
# Copy to .env.secrets and fill in values (never commit .env.secrets)
#
# Generate secrets with:  openssl rand -base64 32

OPENFLOW_JWT_SECRET=
OPENFLOW_ENCRYPTION_KEY=
OPENFLOW_API_KEY=
OPENFLOW_ALLOW_REGISTRATION=false
```

**Step 2: Add `.env.secrets` to `.gitignore`**

Open `.gitignore` and add at the bottom:

```
# Local secrets — never commit
.env.secrets
```

**Step 3: Verify `.env.secrets` is ignored**

```bash
touch .env.secrets
git status
```

Expected: `.env.secrets` does NOT appear in untracked files. If it does, the gitignore entry is missing or wrong.

```bash
rm .env.secrets
```

**Step 4: Commit**

```bash
git add .env.secrets.example .gitignore
git commit -m "infra: add .env.secrets.example and gitignore entry for secrets file"
```

---

## Task 3: Write the Pulumi program (`infra/index.ts`)

**Files:**
- Create: `infra/index.ts`

**Step 1: Create `infra/index.ts`**

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as fly from "@pulumi/fly";
import * as dotenv from "dotenv";
import * as path from "path";

// Load secrets from ../.env.secrets (gitignored, never committed)
dotenv.config({ path: path.join(__dirname, "../.env.secrets") });

const config = new pulumi.Config();
const region = config.get("region") ?? "iad";
const appName = config.get("appName") ?? "openflow-analytics";

// Required secrets — fail fast if missing
function requireSecret(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required secret: ${name}. Add it to .env.secrets`);
  return val;
}

const jwtSecret = requireSecret("OPENFLOW_JWT_SECRET");
const encryptionKey = requireSecret("OPENFLOW_ENCRYPTION_KEY");
const apiKey = requireSecret("OPENFLOW_API_KEY");
const allowRegistration = process.env["OPENFLOW_ALLOW_REGISTRATION"] ?? "false";

// Fly.io app
const app = new fly.App("openflow-app", {
  name: appName,
  org: "personal",
});

// Persistent volume for SQLite product DB (mounts at /data in fly.toml)
const volume = new fly.Volume("openflow-data", {
  app: app.name,
  name: "openflow_data",
  region: region,
  size: 1,
});

// Secrets — each is a separate resource so Pulumi can diff individually
new fly.Secret("jwt-secret", {
  app: app.name,
  name: "OPENFLOW_JWT_SECRET",
  value: jwtSecret,
});

new fly.Secret("encryption-key", {
  app: app.name,
  name: "OPENFLOW_ENCRYPTION_KEY",
  value: encryptionKey,
});

new fly.Secret("api-key", {
  app: app.name,
  name: "OPENFLOW_API_KEY",
  value: apiKey,
});

new fly.Secret("allow-registration", {
  app: app.name,
  name: "OPENFLOW_ALLOW_REGISTRATION",
  value: allowRegistration,
});

// Outputs
export const flyAppName = app.name;
export const flyAppHostname = pulumi.interpolate`${app.name}.fly.dev`;
export const volumeId = volume.id;
```

**Step 2: Build to check TypeScript compiles**

```bash
cd infra && npm run build
```

Expected: `bin/index.js` created, no TypeScript errors.

**Step 3: Commit**

```bash
git add infra/index.ts
git commit -m "infra: add Pulumi program — app, volume, secrets for Fly.io"
```

---

## Task 4: Create `fly.toml`

**Files:**
- Create: `fly.toml`

**Step 1: Create `fly.toml` at the repo root**

Replace `openflow-analytics` with your actual Fly app name if different.

```toml
app = "openflow-analytics"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"
  OPENFLOW_DEBUG = "false"
  OPENFLOW_CORS_ORIGINS = '["https://openflow-analytics.fly.dev"]'
  OPENFLOW_PRODUCT_DB_PATH = "/data/openflow_product.sqlite"

[[services]]
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.ports]]
    handlers = ["http"]
    port = 80
    [services.ports.force_https]
      enabled = true

  [services.concurrency]
    type = "requests"
    hard_limit = 50
    soft_limit = 25

  [[services.http_checks]]
    interval = "30s"
    timeout = "5s"
    path = "/api/health"

[mounts]
  source = "openflow_data"
  destination = "/data"
```

**Step 2: Commit**

```bash
git add fly.toml
git commit -m "infra: add fly.toml with HTTPS redirect, volume mount, health check"
```

---

## Task 5: Add `infra/` to `.gitignore` for build artifacts

**Files:**
- Modify: `.gitignore`

**Step 1: Ignore Pulumi build output and state**

Add to `.gitignore`:

```
# Pulumi
infra/bin/
infra/node_modules/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "infra: ignore Pulumi build output and node_modules"
```

---

## Task 6: Write deployment README

**Files:**
- Create: `infra/README.md`

**Step 1: Create `infra/README.md`**

```markdown
# OpenFlow Infrastructure (Pulumi + Fly.io)

Manages Fly.io infrastructure as code: app, persistent volume, secrets.

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/install/) installed
- [flyctl](https://fly.io/docs/hands-on/install-flyctl/) installed and logged in
- Node.js 20+

## First-time setup

1. Copy and fill in secrets:

   ```bash
   cp ../.env.secrets.example ../.env.secrets
   # Edit .env.secrets — generate each value with: openssl rand -base64 32
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a Pulumi stack:

   ```bash
   pulumi stack init prod
   ```

4. Provision infrastructure:

   ```bash
   pulumi up
   ```

## Deploy new code

Pulumi only manages infrastructure. To deploy a new version of the app:

```bash
fly deploy
```

## Rotate a secret

1. Update the value in `.env.secrets`
2. Run `pulumi up` — Pulumi diffs and updates only the changed secret

## Tear down

```bash
pulumi destroy
```

## Stack config (`Pulumi.prod.yaml`)

Non-secret configuration lives here:

| Key | Default | Description |
|---|---|---|
| `openflow:region` | `iad` | Fly.io primary region |
| `openflow:appName` | `openflow-analytics` | Fly app name |
```

**Step 2: Commit**

```bash
git add infra/README.md
git commit -m "docs: add infra/README.md with Pulumi setup and deploy instructions"
```

---

## Task 7: Verify end-to-end (manual)

This task has no automated tests — it's a deployment smoke test.

**Step 1: Install Pulumi CLI (if not installed)**

```bash
curl -fsSL https://get.pulumi.com | sh
```

**Step 2: Copy and fill `.env.secrets`**

```bash
cp .env.secrets.example .env.secrets
# Fill in each value:
# OPENFLOW_JWT_SECRET=$(openssl rand -base64 32)
# OPENFLOW_ENCRYPTION_KEY=$(openssl rand -base64 32)
# OPENFLOW_API_KEY=$(openssl rand -base64 16)
# OPENFLOW_ALLOW_REGISTRATION=false
```

**Step 3: Log in to Pulumi (free local backend is fine)**

```bash
pulumi login --local
# OR use Pulumi Cloud: pulumi login
```

**Step 4: Init stack and preview**

```bash
cd infra
pulumi stack init prod
pulumi preview
```

Expected: preview shows `fly.App`, `fly.Volume`, and 4 `fly.Secret` resources to create. No errors.

**Step 5: Provision**

```bash
pulumi up
```

Expected: all resources created. Outputs show `flyAppHostname`.

**Step 6: Deploy app**

```bash
cd ..
fly deploy
```

Expected: Docker image built and pushed, app deployed.

**Step 7: Verify**

```bash
curl https://openflow-analytics.fly.dev/api/health
```

Expected: `{"status": "ok"}` or similar.

---

## Summary

| Task | Outcome |
|---|---|
| Task 1 | Pulumi project scaffold in `infra/` |
| Task 2 | `.env.secrets.example` + gitignore |
| Task 3 | `infra/index.ts` — app, volume, secrets |
| Task 4 | `fly.toml` — build, routing, health check |
| Task 5 | Gitignore for build artifacts |
| Task 6 | `infra/README.md` — setup docs |
| Task 7 | Manual smoke test — end-to-end verify |
