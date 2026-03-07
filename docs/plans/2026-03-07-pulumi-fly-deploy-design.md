# Pulumi + Fly.io Deployment as Code — Design

**Date:** 2026-03-07
**Goal:** Replace imperative `fly secrets set` CLI commands with a Pulumi TypeScript program that declares all Fly.io infrastructure as code.

---

## Problem

The current deployment approach requires running CLI commands to set secrets and configure the Fly.io app. This is hard to reproduce, easy to forget, and not version-controlled.

## Scope

Pulumi manages **infrastructure**: app creation, persistent volume, and secrets.
`fly deploy` (or CI/CD) continues to handle **image deployments** — this is the right split.

The existing `Dockerfile` and `fly.toml` remain at the repo root. Pulumi does not replace `fly.toml`; it creates and owns the Fly app resource and its secrets.

---

## Architecture

### Directory structure

```
infra/
├── Pulumi.yaml           # Project definition (name, runtime: nodejs)
├── Pulumi.prod.yaml      # Non-secret stack config — committed to git
├── package.json          # Pulumi + dotenv deps
├── tsconfig.json
└── index.ts              # Declares app, volume, secrets
.env.secrets              # Gitignored — actual secret values (never committed)
.env.secrets.example      # Committed — documents all required vars
```

### Pulumi resources

| Resource | Pulumi type | Notes |
|---|---|---|
| Fly app | `fly.App` | App name, org, region |
| Persistent volume | `fly.Volume` | 1GB, same region, mounts at `/data` |
| Secrets | `fly.Secret` (one per secret) | JWT secret, encryption key, API key, allow-registration flag |

### Non-secret config

Lives in `Pulumi.prod.yaml` (stack config) and in `fly.toml` `[env]` section:

```
OPENFLOW_DEBUG=false
OPENFLOW_CORS_ORIGINS=["https://<app>.fly.dev"]
PORT=8000
```

### Secret loading

`infra/index.ts` calls `require('dotenv').config({ path: '../.env.secrets' })` at startup. Pulumi reads secrets from `process.env` — they are passed to `fly.Secret` resources. Secrets never touch Pulumi state or git.

---

## Workflow

### First-time setup

```bash
cp .env.secrets.example .env.secrets   # fill in generated values
cd infra
npm install
pulumi stack init prod
pulumi up                               # provisions app, volume, secrets
```

### Deploy new code

```bash
fly deploy                              # builds image, pushes to Fly
```

### Rotate a secret

```bash
# Edit .env.secrets with new value
cd infra && pulumi up                   # Pulumi diffs and updates only changed secrets
```

### Tear down

```bash
cd infra && pulumi destroy
```

---

## `.env.secrets.example`

```bash
# Generate each with: openssl rand -base64 32
OPENFLOW_JWT_SECRET=
OPENFLOW_ENCRYPTION_KEY=
OPENFLOW_API_KEY=
OPENFLOW_ALLOW_REGISTRATION=false
```

---

## Trade-offs considered

| Approach | Decision |
|---|---|
| Pulumi + `@pulumi/fly` provider | **Chosen** — real resource state, drift detection, preview |
| Pulumi + `@pulumi/command` (wraps flyctl) | Rejected — fragile, no drift detection |
| Pulumi + Fly REST API dynamic provider | Rejected — too much custom code for the same result |
| Pulumi secrets (encrypted in state) | Rejected for now — `.env.secrets` is simpler and sufficient |

---

## Required tools

- `pulumi` CLI
- `flyctl` CLI (still needed for `fly deploy`)
- Node.js (already used by the project)
