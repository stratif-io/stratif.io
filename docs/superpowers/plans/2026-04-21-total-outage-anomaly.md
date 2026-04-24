# Total Outage Anomaly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `total_outage` anomaly type that zeroes new signups, active users, and events for the full duration of the outage window, with natural recovery via the existing reactivation kernel.

**Architecture:** The existing `outage` type only reduces arrivals via a multiplier on the arrivals array. `total_outage` needs a stronger guarantee: arrivals = 0 AND active users = 0 AND events = 0. This is implemented by (1) registering the type in `anomalySpec.ts` with `effectFields: []` and a sentinel `effect.total_outage: 1`, (2) using the sentinel in `index.ts` to post-process the `simulateCohorts` output and zero `activeUsers[t]`, `events[t]`, and `stickiness[t]` for affected days, (3) adding the CSS variable to `index.css`. Arrivals are already zeroed by `applyAnomalies` (which reads `effect.arrivals ?? 1`), so we set `effect.arrivals: 0` in the spec to handle that path for free.

**Tech Stack:** TypeScript, Vitest, `src/lib/twin/anomalySpec.ts`, `src/lib/twin/index.ts`, `src/index.css`

---

## File Map

- Modify: `apps/seeder-studio/src/lib/twin/anomalySpec.ts` — add `total_outage` entry
- Modify: `apps/seeder-studio/src/index.css` — add `--anomaly-total-outage` CSS var (light + dark)
- Modify: `apps/seeder-studio/src/lib/twin/index.ts` — post-process output to zero outage days
- Modify: `apps/seeder-studio/src/lib/twin/__tests__/anomalySpec.test.ts` — cover new type
- Modify: `apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts` — integration test

---

### Task 1: Register `total_outage` in `anomalySpec.ts`

**Files:**

- Modify: `apps/seeder-studio/src/lib/twin/anomalySpec.ts`
- Test: `apps/seeder-studio/src/lib/twin/__tests__/anomalySpec.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `anomalySpec.test.ts`:

```typescript
it("includes total_outage type", () => {
  expect(ANOMALY_SPEC["total_outage"]).toBeDefined();
});

it("total_outage has no user-configurable effect fields", () => {
  expect(ANOMALY_SPEC["total_outage"].effectFields).toHaveLength(0);
});

it("defaultAnomaly for total_outage has effect.total_outage=1 and arrivals=0", () => {
  const a = defaultAnomaly("total_outage", 5, 3);
  expect(a.effect.total_outage).toBe(1);
  expect(a.effect.arrivals).toBe(0);
});

it("every type declares its effect fields", () => {
  // This test already exists — it asserts effectFields.length > 0 for every type.
  // total_outage breaks this: effectFields is empty. Update the test to exclude total_outage.
  for (const spec of Object.values(ANOMALY_SPEC)) {
    if (spec.type === "total_outage") continue;
    expect(spec.effectFields.length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/seeder-studio && bun run test:run -- src/lib/twin/__tests__/anomalySpec.test.ts
```

Expected: FAIL — `total_outage` not defined, existing "every type declares its effect fields" test passes (no change yet).

- [ ] **Step 3: Add `total_outage` to `ANOMALY_SPEC` and update `defaultAnomaly`**

In `anomalySpec.ts`, add to `ANOMALY_SPEC` after `seasonal`:

```typescript
total_outage: {
  type: "total_outage",
  label: "Total outage",
  cssVar: "--anomaly-total-outage",
  effectFields: [],
},
```

`defaultAnomaly` builds `effect` by iterating `spec.effectFields`, so for `total_outage` that loop produces `{}`. We must inject the sentinel and arrivals=0 manually. Update `defaultAnomaly`:

```typescript
export function defaultAnomaly(
  type: string,
  startDay: number,
  duration: number,
): SimulationAnomaly {
  const spec = ANOMALY_SPEC[type] ?? ANOMALY_SPEC.marketing_campaign;
  const effect: Record<string, number> = {};
  for (const f of spec.effectFields) effect[f.key] = f.default;
  if (type === "total_outage") {
    effect.total_outage = 1;
    effect.arrivals = 0;
  }
  return {
    type,
    name: `${type}_${startDay}`,
    start: `${startDay}d`,
    duration: `${duration}d`,
    effect,
  };
}
```

Also update the existing test that asserts `effectFields.length > 0` for every type — add the `if (spec.type === "total_outage") continue;` guard as shown in Step 1.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/seeder-studio && bun run test:run -- src/lib/twin/__tests__/anomalySpec.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/lib/twin/anomalySpec.ts \
        apps/seeder-studio/src/lib/twin/__tests__/anomalySpec.test.ts
git commit -m "feat(twin): add total_outage anomaly type to ANOMALY_SPEC"
```

---

### Task 2: Add CSS variable for `total_outage`

**Files:**

- Modify: `apps/seeder-studio/src/index.css`

No test needed — CSS variables are visual only.

- [ ] **Step 1: Add `--anomaly-total-outage` in light mode**

In `index.css`, inside the `:root` block next to the other `--anomaly-*` variables (around line 123), add:

```css
--anomaly-total-outage: 0 84% 40%;
```

(A deep red, darker than the existing `--anomaly-outage: 0 68% 50%` to distinguish total outage visually.)

- [ ] **Step 2: Add `--anomaly-total-outage` in dark mode**

Inside the `.dark` block (around line 165), add:

```css
--anomaly-total-outage: 0 86% 55%;
```

- [ ] **Step 3: Verify build passes**

```bash
cd apps/seeder-studio && bun run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/seeder-studio/src/index.css
git commit -m "feat(ui): add CSS variable for total_outage anomaly color"
```

---

### Task 3: Zero active users and events during total outage in `index.ts`

**Files:**

- Modify: `apps/seeder-studio/src/lib/twin/index.ts`
- Test: `apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts`

- [ ] **Step 1: Write the failing integration test**

Add to `runTwin.test.ts`:

```typescript
it("total_outage zeroes activeUsers and events on outage days", () => {
  const out = runTwin({
    config: {
      ...base,
      axes: { ...base.axes, scale: "small" },
      scale_config: { window_days: 30 },
      anomalies: [
        {
          type: "total_outage",
          name: "total_outage_10",
          start: "10d",
          duration: "5d",
          effect: { total_outage: 1, arrivals: 0 },
        },
      ],
    },
  });
  // Days 10–14 (inclusive) must have activeUsers=0 and events=0
  for (let t = 10; t <= 14; t++) {
    expect(out.activeUsers[t]).toBe(0);
    expect(out.events[t]).toBe(0);
  }
  // Days outside the outage window should have non-zero active users in aggregate
  const outsideActive = out.activeUsers
    .filter((_, i) => i < 10 || i > 14)
    .reduce((a, b) => a + b, 0);
  expect(outsideActive).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/seeder-studio && bun run test:run -- src/lib/twin/__tests__/runTwin.test.ts
```

Expected: FAIL — `activeUsers[10..14]` are not zeroed.

- [ ] **Step 3: Implement post-processing in `index.ts`**

Add a helper that resolves the outage window (reusing the same offset logic as `applyAnomalies`). Then zero the affected days after `simulateCohorts`.

Replace the `return { days, ...metrics }` at the end of `runTwin` with:

```typescript
// Post-process total_outage anomalies: zero activeUsers, events, stickiness
const totalOutageDays = new Set<number>();
for (const anomaly of config.anomalies ?? []) {
  if (!anomaly.effect?.total_outage) continue;
  const rawStart = parseInt(anomaly.start.replace("d", ""), 10);
  const dur = parseInt(anomaly.duration.replace("d", ""), 10);
  const start = rawStart < 0 ? days + rawStart : rawStart;
  for (let t = start; t < Math.min(start + dur, days); t++) {
    totalOutageDays.add(t);
  }
}
if (totalOutageDays.size > 0) {
  for (const t of totalOutageDays) {
    metrics.activeUsers[t] = 0;
    metrics.events[t] = 0;
    metrics.stickiness[t] = null;
  }
}

return { days, ...metrics };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/seeder-studio && bun run test:run -- src/lib/twin/__tests__/runTwin.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd apps/seeder-studio && bun run test:run
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/seeder-studio/src/lib/twin/index.ts \
        apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts
git commit -m "feat(twin): zero activeUsers and events during total_outage anomaly window"
```
