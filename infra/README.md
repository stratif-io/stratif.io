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
2. Run `pulumi up` — Pulumi diffs and re-runs `fly secrets set` for the changed values

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
