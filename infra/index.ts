import * as pulumi from "@pulumi/pulumi";
import * as fly from "@ediri/pulumi-fly";
import * as command from "@pulumi/command";
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

// Secrets — set via flyctl since @ediri/pulumi-fly has no Secret resource
// Each secret is set individually so changes can be tracked
const secretsEnv = [
  `OPENFLOW_JWT_SECRET=${jwtSecret}`,
  `OPENFLOW_ENCRYPTION_KEY=${encryptionKey}`,
  `OPENFLOW_API_KEY=${apiKey}`,
  `OPENFLOW_ALLOW_REGISTRATION=${allowRegistration}`,
].join(" ");

new command.local.Command("set-secrets", {
  create: pulumi.interpolate`fly secrets set --app ${app.name} ${secretsEnv}`,
  // On update, re-set all secrets to keep them in sync
  update: pulumi.interpolate`fly secrets set --app ${app.name} ${secretsEnv}`,
  // Secrets are deleted when the app is destroyed via pulumi destroy
  triggers: [jwtSecret, encryptionKey, apiKey, allowRegistration],
});

// Outputs
export const flyAppName = app.name;
export const flyAppHostname = pulumi.interpolate`${app.name}.fly.dev`;
export const volumeId = volume.id;
