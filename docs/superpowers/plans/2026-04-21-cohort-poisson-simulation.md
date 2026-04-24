# Cohort + Poisson Simulation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-user state-machine simulation (with its unrealistic SIM_CAP scaling) with a cohort-level Poisson simulation that produces statistically correct variance at any user count — no cap, no scaling factor.

**Architecture:** Each day's arrivals form a cohort. A precomputed survival curve `S[k]` gives the probability of a cohort member being active at tenure `k`. For each cohort and future day, active users are drawn from `Poisson(cohortSize × S[tenure])`, giving correct variance at any scale. Churn and reactivations use the same survival curve derivatives. MAU uses an exact 28-day window formula per cohort. The existing arrival pipeline (growth → anomalies → jitter → virality → normalise) is unchanged.

**Tech Stack:** TypeScript, Vitest, existing `@/lib/twin` module structure.

---

## File Map

| File                                              | Action     | Responsibility                                             |
| ------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `src/lib/twin/rng.ts`                             | **Modify** | Add `poissonDraw` function                                 |
| `src/lib/twin/types.ts`                           | **Modify** | Move `RetentionParams` here from `simulate.ts`             |
| `src/lib/twin/simulateCohorts.ts`                 | **Create** | Full cohort+Poisson simulation → `MetricsOutput`           |
| `src/lib/twin/simulate.ts`                        | **Delete** | Superseded by `simulateCohorts.ts`                         |
| `src/lib/twin/metricsFromUsers.ts`                | **Delete** | Merged into `simulateCohorts.ts`                           |
| `src/lib/twin/index.ts`                           | **Modify** | Wire `simulateCohorts` in place of old two-step            |
| `src/lib/twin/__tests__/simulateCohorts.test.ts`  | **Create** | Tests for the new module                                   |
| `src/lib/twin/__tests__/simulate.test.ts`         | **Delete** | Tests for deleted module                                   |
| `src/lib/twin/__tests__/metricsFromUsers.test.ts` | **Delete** | Tests for deleted module                                   |
| `src/lib/twin/__tests__/rng.test.ts`              | **Modify** | Add `poissonDraw` tests                                    |
| `src/lib/twin/__tests__/runTwin.test.ts`          | **Modify** | Remove `SIM_CAP` reference if any; tests should still pass |

---

## Task 1: Add `poissonDraw` to `rng.ts` and move `RetentionParams` to `types.ts`

**Files:**

- Modify: `apps/seeder-studio/src/lib/twin/rng.ts`
- Modify: `apps/seeder-studio/src/lib/twin/types.ts`
- Modify: `apps/seeder-studio/src/lib/twin/__tests__/rng.test.ts`

### Why `poissonDraw` lives in `rng.ts`

`rng.ts` owns all randomness primitives. `poissonDraw` needs an RNG instance and belongs here, not in `simulateCohorts.ts`.

### Step 1: Add `poissonDraw` tests

- [ ] **Step 1: Write the failing tests**

Append to `apps/seeder-studio/src/lib/twin/__tests__/rng.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createRng, poissonDraw } from "../rng";

// existing createRng tests stay unchanged above...

describe("poissonDraw", () => {
  it("returns 0 for lambda <= 0", () => {
    const rng = createRng(1);
    expect(poissonDraw(0, rng)).toBe(0);
    expect(poissonDraw(-5, rng)).toBe(0);
  });

  it("returns non-negative integers", () => {
    const rng = createRng(42);
    for (let i = 0; i < 200; i++) {
      const v = poissonDraw(10, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("mean of large sample is close to lambda (small lambda)", () => {
    const rng = createRng(1);
    const N = 5000;
    const lambda = 5;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += poissonDraw(lambda, rng);
    expect(sum / N).toBeCloseTo(lambda, 0); // within 1
  });

  it("mean of large sample is close to lambda (large lambda)", () => {
    const rng = createRng(1);
    const N = 2000;
    const lambda = 1000;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += poissonDraw(lambda, rng);
    expect(sum / N).toBeCloseTo(lambda, -1); // within 10%
  });

  it("deterministic: same rng state same draw", () => {
    expect(poissonDraw(7, createRng(99))).toBe(poissonDraw(7, createRng(99)));
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -E "poissonDraw|Cannot"
```

Expected: `poissonDraw is not a function`

- [ ] **Step 3: Implement `poissonDraw` in `rng.ts`**

Replace the entire file with:

```typescript
// Mulberry32 — fast, good quality, single 32-bit state, easy to seed.
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller: two uniform draws → one standard normal.
function normalDraw(rng: () => number): number {
  const u1 = Math.max(Number.EPSILON, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Draw a Poisson-distributed integer with mean `lambda`.
 * - lambda <= 30: Knuth algorithm (exact).
 * - lambda > 30: normal approximation Poisson(λ) ≈ Normal(λ, √λ) (fast, accurate).
 */
export function poissonDraw(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    return Math.max(
      0,
      Math.round(lambda + Math.sqrt(lambda) * normalDraw(rng)),
    );
  }
  // Knuth algorithm
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}
```

- [ ] **Step 4: Move `RetentionParams` to `types.ts`**

Open `apps/seeder-studio/src/lib/twin/types.ts` and add `RetentionParams` before `TwinOutput`:

```typescript
import type { SimulationConfig } from "@/types/simulation";

export interface RetentionParams {
  peakChurnRate: number; // churn prob on user's first day (age 0→1)
  baseChurnRate: number; // churn prob for long-tenured users (asymptote)
  churnDecayDays: number; // tenure half-life: at this tenure, extra churn is halved
  reactivationRate: number; // prob of reactivating on first dormant day
  reactivationDecay: number; // multiplicative decay per additional dormant day (0 < x < 1)
  maxDormantDays: number; // days dormant before permanent churn
}

export interface TwinOutput {
  days: number;
  events: number[];
  activeUsers: number[];
  newUsers: number[];
  churnedUsers: number[];
  reactivatedUsers: number[];
  stickiness: (number | null)[];
  totalUsers: number[];
}

export interface TwinInput {
  config: SimulationConfig;
}
```

- [ ] **Step 5: Update `simulate.ts` to re-export `RetentionParams` from `types.ts`**

`simulate.ts` is deleted in Task 3, but the `axisSpec.ts` and `index.ts` currently import `RetentionParams` from `./simulate`. Before deleting, update those imports. For now just update `simulate.ts` to re-export from `types.ts` so the existing tests keep passing:

Open `apps/seeder-studio/src/lib/twin/simulate.ts` and change the `RetentionParams` interface to a re-export:

```typescript
export type { RetentionParams } from "./types";
```

Keep the rest of `simulate.ts` unchanged (the re-export makes existing tests compile).

- [ ] **Step 6: Run tests to confirm all pass**

```bash
cd apps/seeder-studio && bun run test:run 2>&1 | tail -6
```

Expected: all tests passing (235 + new poissonDraw tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/twin/rng.ts src/lib/twin/types.ts src/lib/twin/simulate.ts \
        src/lib/twin/__tests__/rng.test.ts
git commit -m "feat(sim): add poissonDraw to rng; move RetentionParams to types"
```

---

## Task 2: Create `simulateCohorts.ts`

**Files:**

- Create: `apps/seeder-studio/src/lib/twin/simulateCohorts.ts`
- Create: `apps/seeder-studio/src/lib/twin/__tests__/simulateCohorts.test.ts`

### Algorithm overview

For each cohort (one per day `c`):

1. Sample cohort size: `N = poissonDraw(arrivals[c], rng)`
2. For each future day `t`:
   - `tenure = t - c`
   - `activeUsers[t] += poissonDraw(N × S[tenure], rng)` where `S[tenure]` is survival probability
   - `churnedUsers[t] += poissonDraw(N × (S[tenure-1] - S[tenure]), rng)`
   - `reactivatedUsers[t] += poissonDraw(Σ_k N × (S[k-1]-S[k]) × R[tenure-k], rng)` where `R[d]` is reactivation prob after `d` dormant days
3. MAU(t) = `Σ_c N_c × (1 - Π_{k=wStart}^{wEnd} (1 - S[k]))` — exact 28-day window, no noise needed (already smooth over 28 days)

### Survival curve

`S[0] = 1` (everyone active on join day).
`S[k] = S[k-1] × (1 - churnProb(k))` for k ≥ 1.
`churnProb(k) = baseChurnRate + (peakChurnRate - baseChurnRate) × 2^(-k / churnDecayDays)`.

### Reactivation kernel

`R[d-1] = reactivationRate × reactivationDecay^(d-1)` for d = 1..maxDormantDays.
Users permanently churn when dormant for `maxDormantDays` days.

- [ ] **Step 1: Write the failing tests**

Create `apps/seeder-studio/src/lib/twin/__tests__/simulateCohorts.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { simulateCohorts } from "../simulateCohorts";
import type { RetentionParams } from "../types";

const STICKY: RetentionParams = {
  peakChurnRate: 0.5,
  baseChurnRate: 0.05,
  churnDecayDays: 10,
  reactivationRate: 0.05,
  reactivationDecay: 0.8,
  maxDormantDays: 45,
};

const CHURNY: RetentionParams = {
  peakChurnRate: 0.75,
  baseChurnRate: 0.2,
  churnDecayDays: 4,
  reactivationRate: 0.02,
  reactivationDecay: 0.7,
  maxDormantDays: 20,
};

const ADDICTIVE: RetentionParams = {
  peakChurnRate: 0.25,
  baseChurnRate: 0.01,
  churnDecayDays: 14,
  reactivationRate: 0.1,
  reactivationDecay: 0.85,
  maxDormantDays: 90,
};

const uniformArrivals = (days: number, perDay: number) =>
  new Array(days).fill(perDay);

describe("simulateCohorts", () => {
  it("all output arrays have length === days", () => {
    const m = simulateCohorts(
      uniformArrivals(30, 100),
      30,
      3000,
      STICKY,
      10,
      42,
    );
    expect(m.activeUsers).toHaveLength(30);
    expect(m.newUsers).toHaveLength(30);
    expect(m.churnedUsers).toHaveLength(30);
    expect(m.reactivatedUsers).toHaveLength(30);
    expect(m.stickiness).toHaveLength(30);
    expect(m.totalUsers).toHaveLength(30);
    expect(m.events).toHaveLength(30);
  });

  it("all numeric outputs are non-negative", () => {
    const m = simulateCohorts(
      uniformArrivals(60, 200),
      60,
      12000,
      CHURNY,
      5,
      1,
    );
    expect(m.activeUsers.every((v) => v >= 0)).toBe(true);
    expect(m.newUsers.every((v) => v >= 0)).toBe(true);
    expect(m.churnedUsers.every((v) => v >= 0)).toBe(true);
    expect(m.reactivatedUsers.every((v) => v >= 0)).toBe(true);
    expect(m.events.every((v) => v >= 0)).toBe(true);
  });

  it("stickiness is null for t < 28", () => {
    const m = simulateCohorts(
      uniformArrivals(60, 100),
      60,
      6000,
      STICKY,
      10,
      42,
    );
    expect(m.stickiness.slice(0, 28).every((s) => s === null)).toBe(true);
  });

  it("stickiness is in [0, 1] for t >= 28", () => {
    const m = simulateCohorts(
      uniformArrivals(60, 100),
      60,
      6000,
      STICKY,
      10,
      42,
    );
    expect(
      m.stickiness.slice(28).every((s) => s !== null && s >= 0 && s <= 1),
    ).toBe(true);
  });

  it("totalUsers is monotonically non-decreasing", () => {
    const m = simulateCohorts(uniformArrivals(30, 100), 30, 3000, STICKY, 5, 7);
    for (let i = 1; i < m.totalUsers.length; i++) {
      expect(m.totalUsers[i]).toBeGreaterThanOrEqual(m.totalUsers[i - 1]);
    }
  });

  it("churny produces more total churn than addictive", () => {
    const arrivals = uniformArrivals(60, 500);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const churny = simulateCohorts(arrivals, 60, 30000, CHURNY, 5, 42);
    const addictive = simulateCohorts(arrivals, 60, 30000, ADDICTIVE, 5, 42);
    expect(sum(churny.churnedUsers)).toBeGreaterThan(
      sum(addictive.churnedUsers),
    );
  });

  it("addictive stickiness > sticky > churny (average over post-warmup)", () => {
    const avg = (arr: (number | null)[]) => {
      const vals = arr.filter((v): v is number => v !== null);
      return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    };
    const arrivals = uniformArrivals(60, 300);
    const churny = simulateCohorts(arrivals, 60, 18000, CHURNY, 5, 42);
    const sticky = simulateCohorts(arrivals, 60, 18000, STICKY, 5, 42);
    const addictive = simulateCohorts(arrivals, 60, 18000, ADDICTIVE, 5, 42);
    expect(avg(churny.stickiness)).toBeLessThan(avg(sticky.stickiness));
    expect(avg(sticky.stickiness)).toBeLessThan(avg(addictive.stickiness));
  });

  it("higher eventsPerActiveUser yields proportionally more events", () => {
    const arrivals = uniformArrivals(30, 100);
    const low = simulateCohorts(arrivals, 30, 3000, STICKY, 5, 42);
    const high = simulateCohorts(arrivals, 30, 3000, STICKY, 50, 42);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    // events should be ~10× as much with 10× eventsPerActiveUser
    expect(sum(high.events) / sum(low.events)).toBeGreaterThan(5);
  });

  it("deterministic: same seed same output", () => {
    const arrivals = uniformArrivals(30, 100);
    const a = simulateCohorts(arrivals, 30, 3000, STICKY, 10, 42);
    const b = simulateCohorts(arrivals, 30, 3000, STICKY, 10, 42);
    expect(a.activeUsers).toEqual(b.activeUsers);
    expect(a.churnedUsers).toEqual(b.churnedUsers);
  });

  it("different seeds produce different outputs", () => {
    const arrivals = uniformArrivals(30, 200);
    const a = simulateCohorts(arrivals, 30, 6000, STICKY, 5, 1);
    const b = simulateCohorts(arrivals, 30, 6000, STICKY, 5, 2);
    expect(a.activeUsers).not.toEqual(b.activeUsers);
  });

  it("works correctly at 1M-scale totalUsers", () => {
    const arrivals = uniformArrivals(90, 1_000_000 / 90);
    // Should not throw and results should be in sensible range
    const m = simulateCohorts(arrivals, 90, 1_000_000, STICKY, 10, 42);
    expect(m.activeUsers[0]).toBeGreaterThan(0);
    expect(m.totalUsers[89]).toBeGreaterThan(100_000);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -E "simulateCohorts|Cannot"
```

Expected: `Cannot find module '../simulateCohorts'`

- [ ] **Step 3: Implement `simulateCohorts.ts`**

Create `apps/seeder-studio/src/lib/twin/simulateCohorts.ts`:

```typescript
import { createRng, poissonDraw } from "./rng";
import type { RetentionParams, TwinOutput } from "./types";

export type { RetentionParams };

// S[k] = probability a cohort member is active at tenure k (not permanently churned).
// S[0] = 1 (always active on join day).
// S[k] = S[k-1] * (1 - churnProb(k)).
function buildSurvival(
  params: RetentionParams,
  maxTenure: number,
): Float64Array {
  const S = new Float64Array(maxTenure + 1);
  S[0] = 1;
  for (let k = 1; k <= maxTenure; k++) {
    const cp =
      params.baseChurnRate +
      (params.peakChurnRate - params.baseChurnRate) *
        Math.pow(2, -(k / params.churnDecayDays));
    S[k] = S[k - 1] * (1 - cp);
  }
  return S;
}

// R[d-1] = probability of reactivating after d dormant days (d = 1..maxDormantDays).
function buildReactivationKernel(params: RetentionParams): Float64Array {
  const R = new Float64Array(params.maxDormantDays);
  for (let d = 1; d <= params.maxDormantDays; d++) {
    R[d - 1] =
      params.reactivationRate * Math.pow(params.reactivationDecay, d - 1);
  }
  return R;
}

export function simulateCohorts(
  arrivals: number[], // fractional arrivals per day, sums ≈ totalUsers
  days: number,
  totalUsers: number, // used only to validate scale (not for capping)
  params: RetentionParams,
  eventsPerActiveUser: number,
  seed: number,
): Omit<TwinOutput, "days"> {
  void totalUsers; // no SIM_CAP: each cohort is sampled at its natural scale

  const rng = createRng(seed);
  const S = buildSurvival(params, days);
  const R = buildReactivationKernel(params);

  const activeArr = new Float64Array(days);
  const newArr = new Float64Array(days);
  const churnArr = new Float64Array(days);
  const reactArr = new Float64Array(days);

  // Sample each cohort's size first so newUsers and activeUsers[joinDay] are consistent.
  const cohortSizes = new Float64Array(days);
  for (let c = 0; c < days; c++) {
    cohortSizes[c] = poissonDraw(arrivals[c], rng);
    newArr[c] = cohortSizes[c];
  }

  for (let c = 0; c < days; c++) {
    const N = cohortSizes[c];
    if (N <= 0) continue;

    // tenure 0: all cohort members are active on join day (S[0] = 1, no noise needed)
    activeArr[c] += N;

    for (let t = c + 1; t < days; t++) {
      const tenure = t - c;

      // Active today: Poisson(N × S[tenure])
      activeArr[t] += poissonDraw(N * S[tenure], rng);

      // Entered dormant today: Poisson(N × (S[tenure-1] - S[tenure]))
      const churnFrac = S[tenure - 1] - S[tenure];
      if (churnFrac > 0) churnArr[t] += poissonDraw(N * churnFrac, rng);

      // Reactivations: users who entered dormant at tenure k (dormant for tenure-k days)
      // reactivate today with prob R[dormant-1].
      let reactExp = 0;
      const dormantMin = 1;
      const dormantMax = Math.min(tenure - 1, params.maxDormantDays);
      for (let dormant = dormantMin; dormant <= dormantMax; dormant++) {
        const k = tenure - dormant; // tenure when they entered dormant
        const churnedAtK = N * (S[k - 1] - S[k]);
        if (churnedAtK > 0) reactExp += churnedAtK * R[dormant - 1];
      }
      if (reactExp > 0) reactArr[t] += poissonDraw(reactExp, rng);
    }
  }

  // MAU: for day t, count distinct users active at least once in [t-27, t].
  // P(cohort-c member active in window) = 1 - Π_{k=wStart}^{wEnd} (1 - S[k]).
  // Computed from sampled cohort sizes (no Poisson: window averaging dampens variance).
  const mauArr = new Float64Array(days);
  for (let t = 28; t < days; t++) {
    let mauSum = 0;
    for (let c = 0; c <= t; c++) {
      const N = cohortSizes[c];
      if (N <= 0) continue;
      const wStart = Math.max(0, t - 27 - c); // earliest tenure in the 28-day window
      const wEnd = t - c; // today's tenure
      // Probability of NOT being active on any day in [wStart, wEnd]
      let pInactive = 1;
      for (let k = wStart; k <= wEnd; k++) pInactive *= 1 - S[k];
      mauSum += N * (1 - pInactive);
    }
    mauArr[t] = mauSum;
  }

  // totalUsers: cumulative newUsers
  const totalUsersArr = new Array<number>(days);
  let cumulative = 0;
  for (let t = 0; t < days; t++) {
    cumulative += newArr[t];
    totalUsersArr[t] = cumulative;
  }

  // stickiness = DAU / MAU for t >= 28, null before warmup
  const stickiness: (number | null)[] = new Array(days).fill(null);
  for (let t = 28; t < days; t++) {
    const mau = mauArr[t];
    stickiness[t] = mau > 0 ? Math.min(1, activeArr[t] / mau) : 0;
  }

  return {
    events: Array.from(activeArr, (au) => Math.floor(au * eventsPerActiveUser)),
    activeUsers: Array.from(activeArr, Math.round),
    newUsers: Array.from(newArr, Math.round),
    churnedUsers: Array.from(churnArr, Math.round),
    reactivatedUsers: Array.from(reactArr, Math.round),
    stickiness,
    totalUsers: totalUsersArr,
  };
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
cd apps/seeder-studio && bun run test:run 2>&1 | tail -6
```

Expected: all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/twin/simulateCohorts.ts \
        src/lib/twin/__tests__/simulateCohorts.test.ts
git commit -m "feat(sim): add cohort+Poisson simulation engine (simulateCohorts)"
```

---

## Task 3: Wire `simulateCohorts` into `index.ts`, delete old modules

**Files:**

- Modify: `apps/seeder-studio/src/lib/twin/index.ts`
- Delete: `apps/seeder-studio/src/lib/twin/simulate.ts`
- Delete: `apps/seeder-studio/src/lib/twin/metricsFromUsers.ts`
- Delete: `apps/seeder-studio/src/lib/twin/__tests__/simulate.test.ts`
- Delete: `apps/seeder-studio/src/lib/twin/__tests__/metricsFromUsers.test.ts`
- Modify: `apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts`

### Notes on `runTwin.test.ts`

The existing test `"returns at most SIM_CAP users"` no longer applies — remove it if present (check the file; it's in `simulate.test.ts` not `runTwin.test.ts`, so `runTwin.test.ts` should need no change). The contract tests (stickiness ordering, churn ordering, determinism) must still pass.

### Notes on `metricsFromUsers.ts` deletion

`metricsFromUsers.ts` exports `MetricsOutput = Omit<TwinOutput, "days">`. After deletion, `index.ts` no longer needs this type — just use `Omit<TwinOutput, "days">` inline or rely on the return type of `simulateCohorts`.

- [ ] **Step 1: Replace `index.ts`**

Write the complete new `apps/seeder-studio/src/lib/twin/index.ts`:

```typescript
import { getAxisValue } from "./axisSpec";
import { resolveScale } from "./utils";
import { growthCurve } from "./growth";
import { applyAnomalies } from "./anomalies";
import { applyJitter } from "./jitter";
import { applyVirality } from "./virality";
import { simulateCohorts } from "./simulateCohorts";
import type { RetentionParams } from "./types";
import type { TwinInput, TwinOutput } from "./types";

export * from "./types";
export { AXIS_SPEC, getAxis, getAxisValue } from "./axisSpec";
export { ANOMALY_SPEC, anomalyTypeColor, defaultAnomaly } from "./anomalySpec";

export function runTwin({ config }: TwinInput): TwinOutput {
  const scaleAxis = config.axes.scale ?? "small";
  const { total_users, window_days } = resolveScale(
    scaleAxis,
    config.scale_config,
  );
  const days = window_days;
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

  const metrics = simulateCohorts(
    arrivals,
    days,
    total_users,
    retentionParams,
    depth,
    seed,
  );

  return { days, ...metrics };
}
```

- [ ] **Step 2: Delete old files**

```bash
cd apps/seeder-studio
git rm src/lib/twin/simulate.ts
git rm src/lib/twin/metricsFromUsers.ts
git rm src/lib/twin/__tests__/simulate.test.ts
git rm src/lib/twin/__tests__/metricsFromUsers.test.ts
```

- [ ] **Step 3: Run full test suite**

```bash
bun run test:run 2>&1 | tail -10
```

If there are import errors (e.g., `axisSpec.ts` importing `RetentionParams` from `./simulate`), fix them by updating the import to `./types`. Check with:

```bash
bun run test:run 2>&1 | grep -i "error\|cannot find"
```

Fix any such import: open the offending file and change `from "./simulate"` to `from "./types"`.

- [ ] **Step 4: Run lint and type-check**

```bash
bun run lint && bun run build 2>&1 | tail -20
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/twin/index.ts
git commit -m "feat(sim): replace per-user simulation with cohort+Poisson engine; delete simulate.ts + metricsFromUsers.ts"
```

---

## Self-Review

**Spec coverage:**

- ✅ Poisson draws on per-cohort per-day active users (Task 2)
- ✅ Survival curve `S[k]` used for churn + active users (Task 2)
- ✅ Reactivation kernel convolution (Task 2)
- ✅ MAU sliding window using survival curve (Task 2)
- ✅ `poissonDraw` in `rng.ts` (Task 1)
- ✅ `RetentionParams` moved to `types.ts` (Task 1)
- ✅ `index.ts` wired to `simulateCohorts` (Task 3)
- ✅ Old files deleted (Task 3)
- ✅ No SIM_CAP, works at any scale (design)

**Placeholder scan:** No TBDs or placeholders — all code is complete.

**Type consistency:**

- `RetentionParams` defined in `types.ts`, re-exported from `simulateCohorts.ts` for callers that need it
- `simulateCohorts` returns `Omit<TwinOutput, "days">` — consistent with what `runTwin` spreads
- `index.ts` imports `RetentionParams` from `"./types"` (not from `"./simulate"`)
