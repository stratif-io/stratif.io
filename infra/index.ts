import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as dotenv from "dotenv";
import * as path from "path";

// Load secrets from repo root .env.secrets (gitignored, never committed)
// __dirname is infra/bin/ when compiled, so go up two levels
dotenv.config({ path: path.join(__dirname, "../../.env.secrets") });

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

// Fly.io app — idempotent: only creates if it doesn't exist
const app = new command.local.Command("openflow-app", {
  create: `flyctl apps create ${appName} --org personal 2>&1 | grep -v "already exists" || true`,
  delete: `flyctl apps destroy ${appName} --yes`,
});

// Persistent volume — idempotent: only creates if none exists for this app
const volume = new command.local.Command("openflow-data", {
  create: `flyctl volumes list --app ${appName} --json | grep -q openflow_data || flyctl volumes create openflow_data --app ${appName} --region ${region} --size 1 --yes`,
  // Volumes must be deleted manually to avoid accidental data loss
  delete: `echo "Volume openflow_data NOT deleted — remove manually with: flyctl volumes destroy <id>"`,
}, { dependsOn: app });

// Secrets — set all at once; flyctl restarts the app automatically
const secrets = new command.local.Command("openflow-secrets", {
  create: `flyctl secrets set --app ${appName} OPENFLOW_JWT_SECRET="${jwtSecret}" OPENFLOW_ENCRYPTION_KEY="${encryptionKey}" OPENFLOW_API_KEY="${apiKey}" OPENFLOW_ALLOW_REGISTRATION="${allowRegistration}"`,
  update: `flyctl secrets set --app ${appName} OPENFLOW_JWT_SECRET="${jwtSecret}" OPENFLOW_ENCRYPTION_KEY="${encryptionKey}" OPENFLOW_API_KEY="${apiKey}" OPENFLOW_ALLOW_REGISTRATION="${allowRegistration}"`,
  triggers: [jwtSecret, encryptionKey, apiKey, allowRegistration],
}, { dependsOn: app });

// Outputs
export const flyAppName = appName;
export const flyAppHostname = `${appName}.fly.dev`;
