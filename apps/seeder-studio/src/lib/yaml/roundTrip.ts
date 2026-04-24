import YAML from "js-yaml";
import { SimulationConfigSchema } from "./schema";
import type { SimulationConfig } from "@/types/simulation";

const KEY_ORDER: (keyof SimulationConfig)[] = [
  "name",
  "description",
  "domain",
  "axes",
  "random_seed",
  "scale_config",
  "growth_config",
  "anomalies",
];

export type ParseResult =
  | { ok: true; config: SimulationConfig }
  | { ok: false; error: { message: string; line?: number } };

export function parseConfigYaml(raw: string): ParseResult {
  let doc: unknown;
  try {
    doc = YAML.load(raw);
  } catch (e) {
    const yamlErr = e as {
      reason?: string;
      mark?: { line?: number };
      message: string;
    };
    return {
      ok: false,
      error: {
        message: yamlErr.reason ?? yamlErr.message,
        line: yamlErr.mark?.line,
      },
    };
  }
  const parsed = SimulationConfigSchema.safeParse(doc);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: { message: first?.message ?? "invalid config" },
    };
  }
  return { ok: true, config: parsed.data as SimulationConfig };
}

export function stringifyConfigYaml(config: SimulationConfig): string {
  const ordered: Record<string, unknown> = {};
  for (const k of KEY_ORDER) {
    if (config[k] !== undefined) ordered[k] = config[k];
  }
  return YAML.dump(ordered, { sortKeys: false, lineWidth: 100, noRefs: true });
}
