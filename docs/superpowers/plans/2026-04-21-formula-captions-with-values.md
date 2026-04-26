# Formula Captions With Resolved Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the KPI chart formula captions with the actual parameter values resolved from the simulation config axes, so users can see both the formula and the live numbers driving it.

**Architecture:** Extract a `resolveSimParams(config)` helper from `runTwin` in `index.ts` — it returns `{ depth, retentionParams, totalUsers, windowDays }`. Call this helper in `PreviewGrid` to build dynamic formula strings that embed the resolved values. No new files; minimal refactor of `index.ts`.

**Tech Stack:** TypeScript, React 18, Vitest

---

## File Map

- Modify: `apps/seeder-studio/src/lib/twin/index.ts` — extract `resolveSimParams`, export it
- Modify: `apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts` — test `resolveSimParams`
- Modify: `apps/seeder-studio/src/features/preview/PreviewGrid.tsx` — call `resolveSimParams`, build dynamic formula strings
- Modify: `apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx` — update formula tests to check for interpolated values

---

### Task 1: Extract and export `resolveSimParams` from `index.ts`

**Files:**

- Modify: `apps/seeder-studio/src/lib/twin/index.ts`
- Test: `apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts`

The goal is to pull the axis-resolution logic that currently sits inline in `runTwin` into a named, exported function so `PreviewGrid` can call it without duplicating logic.

- [ ] **Step 1: Write the failing test**

Add to `apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts`:

```typescript
import { runTwin, resolveSimParams } from "..";
```

Then add a new describe block:

```typescript
describe("resolveSimParams", () => {
  it("returns depth from engagement_depth axis", () => {
    const p = resolveSimParams(base);
    // base uses engagement_depth: "medium" → events_per_user: 10
    expect(p.depth).toBe(10);
  });

  it("returns retentionParams from stickiness axis", () => {
    const p = resolveSimParams(base);
    // base uses stickiness: "sticky"
    expect(p.retentionParams.peakChurnRate).toBe(0.5);
    expect(p.retentionParams.baseChurnRate).toBe(0.05);
    expect(p.retentionParams.churnDecayDays).toBe(10);
    expect(p.retentionParams.reactivationRate).toBe(0.05);
    expect(p.retentionParams.reactivationDecay).toBe(0.8);
  });

  it("returns totalUsers and windowDays from scale axis", () => {
    const p = resolveSimParams(base);
    // base uses scale: "tiny" → 1000 users, 30 days
    expect(p.totalUsers).toBe(1000);
    expect(p.windowDays).toBe(30);
  });

  it("respects scale_config overrides", () => {
    const p = resolveSimParams({
      ...base,
      scale_config: { window_days: 60 },
    });
    expect(p.windowDays).toBe(60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/seeder-studio && bun run test:run -- src/lib/twin/__tests__/runTwin.test.ts
```

Expected: FAIL — `resolveSimParams` is not exported.

- [ ] **Step 3: Extract `resolveSimParams` in `index.ts`**

Currently `runTwin` in `apps/seeder-studio/src/lib/twin/index.ts` has this inline logic (lines 15–63):

```typescript
const scaleAxis = config.axes.scale ?? "small";
const { total_users, window_days } = resolveScale(
  scaleAxis,
  config.scale_config,
);
// ... retentionParams, depth resolution
```

Extract it into an exported function **above** `runTwin`. Add the return type inline:

```typescript
export function resolveSimParams(config: TwinInput["config"]): {
  depth: number;
  retentionParams: RetentionParams;
  totalUsers: number;
  windowDays: number;
} {
  const scaleAxis = config.axes.scale ?? "small";
  const { total_users, window_days } = resolveScale(
    scaleAxis,
    config.scale_config,
  );

  const stickinessParams = getAxisValue(
    "stickiness",
    config.axes.stickiness ?? "sticky",
  )?.params as RetentionParams | undefined;

  const retentionParams: RetentionParams = stickinessParams ?? {
    peakChurnRate: 0.5,
    baseChurnRate: 0.05,
    churnDecayDays: 10,
    reactivationRate: 0.05,
    reactivationDecay: 0.8,
    maxDormantDays: 45,
  };

  const depth =
    (getAxisValue("engagement_depth", config.axes.engagement_depth ?? "medium")
      ?.params.events_per_user as number | undefined) ?? 10;

  return {
    depth,
    retentionParams,
    totalUsers: total_users,
    windowDays: window_days,
  };
}
```

Then update `runTwin` to call `resolveSimParams` instead of repeating the logic:

```typescript
export function runTwin({ config }: TwinInput): TwinOutput {
  const {
    depth,
    retentionParams,
    totalUsers: total_users,
    windowDays: days,
  } = resolveSimParams(config);
  const seed = config.random_seed ?? 42;

  const growthAxis = config.axes.growth ?? "strong";
  const baseline = growthCurve(
    growthAxis,
    days,
    total_users,
    config.growth_config,
  );
  const withAnomalies = applyAnomalies(baseline, config.anomalies);
  const jittered = applyJitter(
    withAnomalies,
    config.axes.anomalies ?? "moderate",
    seed,
  );
  const rawArrivals = applyVirality(
    jittered,
    config.axes.virality ?? "weak",
    config.axes.stickiness ?? "sticky",
  );
  const rawSum = rawArrivals.reduce((a, b) => a + b, 0);
  const arrivals =
    rawSum > 0
      ? rawArrivals.map((v) => (v * total_users) / rawSum)
      : rawArrivals;

  const metrics = simulateCohorts(
    arrivals,
    days,
    total_users,
    retentionParams,
    depth,
    seed,
  );

  // Post-process total_outage anomalies: zero activeUsers, events, stickiness, newUsers
  const totalOutageDays = new Set<number>();
  for (const anomaly of config.anomalies ?? []) {
    if (anomaly.type !== "total_outage") continue;
    const rawStart = parseDays(anomaly.start);
    const rawDuration = parseDays(anomaly.duration);
    if (rawStart === null || rawDuration === null || rawDuration <= 0) continue;
    const start = rawStart < 0 ? days + rawStart : rawStart;
    const end = start + rawDuration;
    if (end <= 0 || start >= days) continue;
    for (let t = Math.max(0, start); t < Math.min(end, days); t++) {
      totalOutageDays.add(t);
    }
  }
  if (totalOutageDays.size > 0) {
    for (const t of totalOutageDays) {
      metrics.activeUsers[t] = 0;
      metrics.newUsers[t] = 0;
      metrics.events[t] = 0;
      metrics.stickiness[t] = null;
    }
  }

  return { days, ...metrics };
}
```

Also add `resolveSimParams` to the barrel export at the top of `index.ts` if there is one, or ensure it is exported directly via `export function`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/seeder-studio && bun run test:run -- src/lib/twin/__tests__/runTwin.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/lib/twin/index.ts \
        apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts
git commit -m "refactor(twin): extract resolveSimParams helper, export from index"
```

---

### Task 2: Build dynamic formula strings in `PreviewGrid`

**Files:**

- Modify: `apps/seeder-studio/src/features/preview/PreviewGrid.tsx`
- Test: `apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx`:

```typescript
it("formula captions include resolved parameter values", () => {
  render(<PreviewGrid />);
  // The mock store uses engagement_depth "medium" → depth=10
  expect(screen.getByText(/× 10/)).toBeInTheDocument();
  // stickiness "sticky" → peakChurnRate=50%, churnDecayDays=10
  expect(screen.getByText(/peak=50%/)).toBeInTheDocument();
  expect(screen.getByText(/τ=10d/)).toBeInTheDocument();
  // reactivationRate=5%, reactivationDecay=0.8
  expect(screen.getByText(/r=5%/)).toBeInTheDocument();
  expect(screen.getByText(/δ=0\.8/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/PreviewGrid.test.tsx
```

Expected: FAIL — values not yet in formula strings.

- [ ] **Step 3: Import `resolveSimParams` and build dynamic formulas in `PreviewGrid.tsx`**

At the top of `PreviewGrid.tsx`, add the import:

```typescript
import { resolveSimParams } from "@/lib/twin";
```

Inside `PreviewGrid`, after the existing store selectors, add:

```typescript
const config = useSeederStore((s) => s.config);
const {
  depth,
  retentionParams: rp,
  totalUsers,
  windowDays,
} = useMemo(() => resolveSimParams(config), [config]);
```

Then replace the static `formula` strings on each `KpiChart` with dynamic ones. Use a helper formatter at the top of the component (or inline, whichever is cleaner):

```typescript
const pct = (v: number) => `${Math.round(v * 100)}%`;
const fix1 = (v: number) => v.toFixed(1);
```

Updated formula props:

```tsx
// Events/day
formula={`events(t) = DAU(t) × ${depth}`}

// Active users
formula={`DAU(t) = Σ꜀ Poisson(N꜀ × S[t−c])  peak=${pct(rp.peakChurnRate)} τ=${rp.churnDecayDays}d`}

// New users/day
formula={`N꜀ = Poisson(arrivals[c])  target=${formatNum(totalUsers)} users`}

// Stickiness
formula="DAU / MAU  (28-day window)"

// Total users
formula={`total(t) = Σ꜀≤t N꜀  over ${windowDays}d`}

// Churned/day
formula={`churn(t) = Σ꜀ Poisson(N꜀×(S[k−1]−S[k]))  peak=${pct(rp.peakChurnRate)} base=${pct(rp.baseChurnRate)} τ=${rp.churnDecayDays}d`}

// Reactivated/day
formula={`react(t) = Σ꜀ Poisson(churned꜀×r×δ^(d−1))  r=${pct(rp.reactivationRate)} δ=${fix1(rp.reactivationDecay)}`}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/PreviewGrid.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Run full suite**

```bash
cd apps/seeder-studio && bun run test:run
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/seeder-studio/src/features/preview/PreviewGrid.tsx \
        apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx
git commit -m "feat(preview): show resolved axis values in KPI chart formula captions"
```
