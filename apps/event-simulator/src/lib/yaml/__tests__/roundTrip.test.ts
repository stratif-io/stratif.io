import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseConfigYaml, stringifyConfigYaml } from "../roundTrip";

const fixturesDir = path.join(__dirname, "fixtures");
const fixtures = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".yaml"));

describe("YAML round-trip", () => {
  it.each(fixtures)("parses %s into a valid config", (file) => {
    const raw = fs.readFileSync(path.join(fixturesDir, file), "utf8");
    const result = parseConfigYaml(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.name).toBeTruthy();
      expect(result.config.markov).toBeTruthy();
    }
  });

  it.each(fixtures)(
    "round-trips %s (parse → stringify → parse is fixed-point)",
    (file) => {
      const raw = fs.readFileSync(path.join(fixturesDir, file), "utf8");
      const first = parseConfigYaml(raw);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const restringified = stringifyConfigYaml(first.config);
      const second = parseConfigYaml(restringified);
      expect(second.ok).toBe(true);
      if (second.ok) expect(second.config).toEqual(first.config);
    },
  );

  it("emits keys in the documented stable order", () => {
    const yaml = stringifyConfigYaml({
      name: "x",
      description: "d",
      axes: { growth: "strong" },
      markov: {
        events: [{ name: "PageView" }],
        start: { PageView: 1.0 },
        transitions: { PageView: { "[end]": 1.0 } },
      },
      random_seed: 7,
      scale_config: { total_users: 1000 },
      growth_config: { rate: 0.1 },
      anomalies: [],
    });
    const lines = yaml.split("\n").filter((l) => /^[a-z_]+:/.test(l));
    const topKeys = lines.map((l) => l.split(":")[0]);
    expect(topKeys).toEqual([
      "name",
      "description",
      "axes",
      "markov",
      "random_seed",
      "scale_config",
      "growth_config",
      "anomalies",
    ]);
  });

  it("returns ok=false with a line number on malformed YAML", () => {
    const r = parseConfigYaml("name: [unclosed\n");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(typeof r.error.line).toBe("number");
  });

  it("returns ok=false on schema-violating YAML", () => {
    const r = parseConfigYaml("name: x\naxes: 123\n");
    expect(r.ok).toBe(false);
  });
});
