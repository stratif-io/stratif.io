# @stratif-io/event-simulator

Interactive preset authoring tool for the `services/event_simulator/` simulator. Loads the
existing presets, lets you tune axes and anomalies, previews the four KPIs
live via a TypeScript axis-math twin, and emits copy-paste YAML.

## Dev

```bash
# backend (presets come from /api/simulator/presets)
uv run serve

# studio frontend
bun run dev:studio   # http://localhost:5180
```

## Tests

```bash
bun run --filter @stratif-io/event-simulator test:run
bun run --filter @stratif-io/event-simulator test:contract  # requires fixtures
```

See `tests/contract/README.md` for the cross-language harness.

## Output

The right-rail panel renders the current config as YAML. Copy it into
`services/event_simulator/presets/<name>.yaml` and run `uv run seed --preset <name>`. The
studio never writes to the presets directory itself.

## Twin fidelity

The TS twin is intentionally coarse — it powers the live preview, not the
actual data generation. The contract tests keep it directionally aligned
with `services/event_simulator/simulator/`. If you change an axis's Python parameters,
update `src/lib/twin/axisSpec.ts` alongside.
