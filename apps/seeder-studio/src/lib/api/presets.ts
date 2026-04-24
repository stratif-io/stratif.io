import { z } from "zod";
import { SimulationConfigSchema } from "@/lib/yaml/schema";
import type { SimulationConfig } from "@/types/simulation";

const PresetEntrySchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  domain: z.string(),
  config: SimulationConfigSchema,
});

const PresetsResponseSchema = z.object({
  presets: z.array(PresetEntrySchema),
});

export interface PresetEntry {
  name: string;
  description?: string | null;
  domain: string;
  config: SimulationConfig;
}

export async function fetchPresets(): Promise<PresetEntry[]> {
  const res = await fetch("/api/simulator/presets");
  if (!res.ok)
    throw new Error(`fetchPresets failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const parsed = PresetsResponseSchema.parse(json);
  return parsed.presets as PresetEntry[];
}
