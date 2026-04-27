import { z } from "zod";
import { SimulationConfigSchema } from "@/lib/yaml/schema";

const SEED_SERVER_URL =
  import.meta.env.VITE_SEED_SERVER_URL ?? "http://localhost:8001";

const PresetEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
  config: SimulationConfigSchema,
});

export type PresetEntry = z.infer<typeof PresetEntrySchema>;

export async function fetchPresets(): Promise<PresetEntry[]> {
  const res = await fetch(`${SEED_SERVER_URL}/presets`);
  if (!res.ok) throw new Error(`Failed to fetch presets: ${res.status}`);
  const raw: unknown = await res.json();
  return z.array(PresetEntrySchema).parse(raw);
}
