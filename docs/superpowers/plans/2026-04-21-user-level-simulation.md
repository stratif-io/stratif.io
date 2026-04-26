# User-Level Simulation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current cohort-aggregate retention model with a per-user state-machine simulation so that DAU, MAU, churn, reactivations, and stickiness are all computed by counting real simulated user records — no approximations, no artificial scaling of stickiness.

**Architecture:** A seeded PRNG drives a per-user simulation: each user steps through `active → dormant → (reactivated | permanently churned)` states day-by-day with age-dependent churn probability. All metrics are derived by counting/aggregating those user records, then scaled by `totalUsers / simulatedUsers` to handle large scales cheaply. The existing arrival-curve pipeline (growth + anomalies + jitter + virality + normalise) is kept unchanged upstream.

**Tech Stack:** TypeScript, Vitest, existing `@/lib/twin` module structure.

---

## File Map

| File                                               | Action     | Responsibility                                      |
| -------------------------------------------------- | ---------- | --------------------------------------------------- |
| `src/lib/twin/rng.ts`                              | **Create** | Mulberry32 seeded PRNG                              |
| `src/lib/twin/simulate.ts`                         | **Create** | Per-user state-machine simulation                   |
| `src/lib/twin/metricsFromUsers.ts`                 | **Create** | Aggregate SimulatedUser[] → TwinOutput fields       |
| `src/lib/twin/types.ts`                            | **Modify** | Add `reactivatedUsers` to TwinOutput                |
| `src/lib/twin/axisSpec.ts`                         | **Modify** | Replace stickiness params with new retention params |
| `src/lib/twin/index.ts`                            | **Modify** | Wire simulate + metricsFromUsers into runTwin       |
| `src/lib/twin/retention.ts`                        | **Delete** | Superseded by simulate.ts                           |
| `src/lib/twin/__tests__/retention.test.ts`         | **Delete** | Tests for deleted module                            |
| `src/lib/twin/__tests__/simulate.test.ts`          | **Create** | Tests for simulate.ts                               |
| `src/lib/twin/__tests__/metricsFromUsers.test.ts`  | **Create** | Tests for metricsFromUsers.ts                       |
| `src/lib/twin/__tests__/runTwin.test.ts`           | **Modify** | Update stickiness assertions + add reactivatedUsers |
| `src/lib/twin/__tests__/runTwin.property.test.ts`  | **Modify** | Add `reactivatedUsers` to property invariants       |
| `src/features/preview/PreviewGrid.tsx`             | **Modify** | Add Reactivations/day KPI chart                     |
| `src/features/preview/DayTable.tsx`                | **Modify** | Add Churned and Reactivated columns                 |
| `src/features/preview/__tests__/DayTable.test.tsx` | **Modify** | Add column header assertions                        |

---

## Task 1: Seeded PRNG

**Files:**

- Create: `apps/seeder-studio/src/lib/twin/rng.ts`
- Create: `apps/seeder-studio/src/lib/twin/__tests__/rng.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/seeder-studio/src/lib/twin/__tests__/rng.test.ts
import { describe, it, expect } from "vitest";
import { createRng } from "../rng";

describe("createRng", () => {
  it("returns same first value for same seed", () => {
    expect(createRng(42)()).toBe(createRng(42)());
  });

  it("returns values in [0, 1)", () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds produce different sequences", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it("sequential calls advance state", () => {
    const rng = createRng(42);
    const a = rng();
    const b = rng();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -A3 "rng"
```

Expected: `Cannot find module '../rng'`

- [ ] **Step 3: Implement `rng.ts`**

```typescript
// apps/seeder-studio/src/lib/twin/rng.ts

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
```

- [ ] **Step 4: Run to confirm PASS**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -A5 "createRng"
```

Expected: 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/lib/twin/rng.ts \
        apps/seeder-studio/src/lib/twin/__tests__/rng.test.ts
git commit -m "feat(sim): add mulberry32 seeded PRNG"
```

---

## Task 2: Per-user state-machine simulation

**Files:**

- Create: `apps/seeder-studio/src/lib/twin/simulate.ts`
- Create: `apps/seeder-studio/src/lib/twin/__tests__/simulate.test.ts`

### Types

```typescript
export interface RetentionParams {
  peakChurnRate: number; // churn prob on user's first day (age 0→1)
  baseChurnRate: number; // churn prob for long-tenured users (asymptote)
  churnDecayDays: number; // tenure half-life: at this tenure, extra churn is halved
  reactivationRate: number; // prob of reactivating on first dormant day
  reactivationDecay: number; // multiplicative decay per additional dormant day (0 < x < 1)
  maxDormantDays: number; // days dormant before permanent churn
}

export interface SimulatedUser {
  id: number;
  joinDay: number;
  activeDays: number[]; // sorted list of days this user was active
  reactivationDays: number[]; // subset of activeDays where user returned from dormant
  churnDay: number | null; // day permanently churned, null if still in window
}
```

### Simulation logic (per user, starting from joinDay+1)

```
churnProb(tenure) = baseChurnRate + (peakChurnRate - baseChurnRate) * 2^(-tenure / churnDecayDays)
reactivationProb(dormantDays) = reactivationRate * reactivationDecay^(dormantDays - 1)
```

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/seeder-studio/src/lib/twin/__tests__/simulate.test.ts
import { describe, it, expect } from "vitest";
import { simulateUsers } from "../simulate";
import type { RetentionParams } from "../simulate";

const STICKY: RetentionParams = {
  peakChurnRate: 0.5,
  baseChurnRate: 0.05,
  churnDecayDays: 10,
  reactivationRate: 0.05,
  reactivationDecay: 0.8,
  maxDormantDays: 45,
};

const CHURNY: RetentionParams = {
  peakChurnRate: 0.9,
  baseChurnRate: 0.25,
  churnDecayDays: 5,
  reactivationRate: 0.02,
  reactivationDecay: 0.7,
  maxDormantDays: 20,
};

// Uniform arrivals: 10 users/day for 30 days = 300 total
const uniformArrivals = (days: number, perDay: number) =>
  new Array(days).fill(perDay);

describe("simulateUsers", () => {
  it("returns at most SIM_CAP users", () => {
    // arrivals sum to 100_000, but SIM_CAP is 5000
    const arrivals = new Array(90).fill(100_000 / 90);
    const users = simulateUsers(arrivals, 90, 100_000, STICKY, 42);
    expect(users.length).toBeLessThanOrEqual(5000);
  });

  it("every user's joinDay is in [0, days-1]", () => {
    const arrivals = uniformArrivals(30, 10);
    const users = simulateUsers(arrivals, 30, 300, STICKY, 42);
    users.forEach((u) => {
      expect(u.joinDay).toBeGreaterThanOrEqual(0);
      expect(u.joinDay).toBeLessThan(30);
    });
  });

  it("every user is active on their joinDay", () => {
    const arrivals = uniformArrivals(30, 10);
    const users = simulateUsers(arrivals, 30, 300, STICKY, 42);
    users.forEach((u) => expect(u.activeDays[0]).toBe(u.joinDay));
  });

  it("reactivationDays are a subset of activeDays", () => {
    const arrivals = uniformArrivals(30, 10);
    const users = simulateUsers(arrivals, 30, 300, STICKY, 42);
    const activeSet = new Set(
      users.flatMap((u) => u.activeDays.map((d) => `${u.id}:${d}`)),
    );
    users.forEach((u) =>
      u.reactivationDays.forEach((d) =>
        expect(activeSet.has(`${u.id}:${d}`)).toBe(true),
      ),
    );
  });

  it("churnDay is after all activeDays", () => {
    const arrivals = uniformArrivals(30, 10);
    const users = simulateUsers(arrivals, 30, 300, STICKY, 42);
    users.forEach((u) => {
      if (u.churnDay !== null && u.activeDays.length > 0) {
        expect(u.churnDay).toBeGreaterThan(u.activeDays.at(-1)!);
      }
    });
  });

  it("churny params produce more churned users than sticky params", () => {
    const arrivals = uniformArrivals(60, 10);
    const sticky = simulateUsers(arrivals, 60, 600, STICKY, 42);
    const churny = simulateUsers(arrivals, 60, 600, CHURNY, 42);
    const churned = (users: typeof sticky) =>
      users.filter((u) => u.churnDay !== null).length;
    expect(churned(churny)).toBeGreaterThan(churned(sticky));
  });

  it("deterministic: same seed same result", () => {
    const arrivals = uniformArrivals(30, 10);
    const a = simulateUsers(arrivals, 30, 300, STICKY, 42);
    const b = simulateUsers(arrivals, 30, 300, STICKY, 42);
    expect(a.map((u) => u.activeDays)).toEqual(b.map((u) => u.activeDays));
  });

  it("different seeds produce different results", () => {
    const arrivals = uniformArrivals(30, 10);
    const a = simulateUsers(arrivals, 30, 300, STICKY, 1);
    const b = simulateUsers(arrivals, 30, 300, STICKY, 2);
    // Extremely unlikely to be identical
    expect(a.map((u) => u.activeDays.length)).not.toEqual(
      b.map((u) => u.activeDays.length),
    );
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -E "simulate|Cannot"
```

Expected: `Cannot find module '../simulate'`

- [ ] **Step 3: Implement `simulate.ts`**

```typescript
// apps/seeder-studio/src/lib/twin/simulate.ts
import { createRng } from "./rng";

export interface RetentionParams {
  peakChurnRate: number;
  baseChurnRate: number;
  churnDecayDays: number;
  reactivationRate: number;
  reactivationDecay: number;
  maxDormantDays: number;
}

export interface SimulatedUser {
  id: number;
  joinDay: number;
  activeDays: number[];
  reactivationDays: number[];
  churnDay: number | null;
}

// Maximum users to actually simulate regardless of totalUsers.
// Counts are scaled up by totalUsers / SIM_CAP afterwards.
export const SIM_CAP = 5000;

function churnProb(tenure: number, p: RetentionParams): number {
  return (
    p.baseChurnRate +
    (p.peakChurnRate - p.baseChurnRate) *
      Math.pow(2, -tenure / p.churnDecayDays)
  );
}

function reactivationProb(dormantDays: number, p: RetentionParams): number {
  return p.reactivationRate * Math.pow(p.reactivationDecay, dormantDays - 1);
}

export function simulateUsers(
  arrivals: number[], // fractional arrivals per day, sums ≈ totalUsers
  days: number,
  totalUsers: number,
  params: RetentionParams,
  seed: number,
): SimulatedUser[] {
  const rng = createRng(seed);
  const simCount = Math.min(totalUsers, SIM_CAP);
  const scaleFactor = simCount / Math.max(1, totalUsers);

  const users: SimulatedUser[] = [];
  let nextId = 0;
  let acc = 0;

  for (let day = 0; day < days; day++) {
    // Scale arrivals down to simCount proportion, accumulate fractional users.
    acc += arrivals[day] * scaleFactor;
    const joining = Math.floor(acc);
    acc -= joining;

    for (let j = 0; j < joining; j++) {
      const user: SimulatedUser = {
        id: nextId++,
        joinDay: day,
        activeDays: [day],
        reactivationDays: [],
        churnDay: null,
      };

      let state: "active" | "dormant" = "active";
      let dormantDays = 0;

      for (let t = day + 1; t < days; t++) {
        const tenure = t - day;

        if (state === "active") {
          if (rng() < churnProb(tenure, params)) {
            state = "dormant";
            dormantDays = 1;
          } else {
            user.activeDays.push(t);
          }
        } else {
          // dormant
          if (dormantDays >= params.maxDormantDays) {
            user.churnDay = t;
            break;
          }
          if (rng() < reactivationProb(dormantDays, params)) {
            state = "active";
            dormantDays = 0;
            user.activeDays.push(t);
            user.reactivationDays.push(t);
          } else {
            dormantDays++;
          }
        }
      }

      users.push(user);
    }
  }

  return users;
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -A2 "simulateUsers"
```

Expected: all 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/lib/twin/simulate.ts \
        apps/seeder-studio/src/lib/twin/__tests__/simulate.test.ts
git commit -m "feat(sim): add per-user state-machine simulation"
```

---

## Task 3: Metrics aggregation from simulated users

**Files:**

- Create: `apps/seeder-studio/src/lib/twin/metricsFromUsers.ts`
- Create: `apps/seeder-studio/src/lib/twin/__tests__/metricsFromUsers.test.ts`

The function returns all fields of TwinOutput except `days` (which is just the `days` parameter).

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/seeder-studio/src/lib/twin/__tests__/metricsFromUsers.test.ts
import { describe, it, expect } from "vitest";
import { metricsFromUsers } from "../metricsFromUsers";
import type { SimulatedUser } from "../simulate";

// Helper: build a minimal SimulatedUser
const mkUser = (
  id: number,
  joinDay: number,
  activeDays: number[],
  reactivationDays: number[] = [],
  churnDay: number | null = null,
): SimulatedUser => ({ id, joinDay, activeDays, reactivationDays, churnDay });

describe("metricsFromUsers", () => {
  it("activeUsers[t] counts users active on day t, scaled", () => {
    // 2 simulated users, scale=5 → counts × 5
    const users = [mkUser(0, 0, [0, 1, 2]), mkUser(1, 0, [0, 2])];
    const m = metricsFromUsers(users, 3, 10, 1); // totalUsers=10, simCount=2 → scale=5
    expect(m.activeUsers[0]).toBe(10); // both active day 0, scaled
    expect(m.activeUsers[1]).toBe(5); // only user 0 active day 1, scaled
    expect(m.activeUsers[2]).toBe(10); // both active day 2, scaled
  });

  it("newUsers[t] counts users who joined on day t, scaled", () => {
    const users = [
      mkUser(0, 0, [0, 1]),
      mkUser(1, 1, [1, 2]),
      mkUser(2, 1, [1]),
    ];
    const m = metricsFromUsers(users, 3, 3, 1); // scale = 3/3 = 1
    expect(m.newUsers[0]).toBe(1);
    expect(m.newUsers[1]).toBe(2);
    expect(m.newUsers[2]).toBe(0);
  });

  it("totalUsers[t] is cumulative sum of newUsers", () => {
    const users = [mkUser(0, 0, [0]), mkUser(1, 1, [1]), mkUser(2, 2, [2])];
    const m = metricsFromUsers(users, 3, 3, 1);
    expect(m.totalUsers[0]).toBe(1);
    expect(m.totalUsers[1]).toBe(2);
    expect(m.totalUsers[2]).toBe(3);
  });

  it("churnedUsers[t] counts users whose churnDay === t, scaled", () => {
    const users = [mkUser(0, 0, [0], [], 5), mkUser(1, 0, [0, 1, 2], [], null)];
    const m = metricsFromUsers(users, 10, 2, 1); // scale = 2/2 = 1
    expect(m.churnedUsers[5]).toBe(1);
    expect(m.churnedUsers[3]).toBe(0);
  });

  it("reactivatedUsers[t] counts reactivations on day t, scaled", () => {
    const users = [mkUser(0, 0, [0, 3, 4], [3]), mkUser(1, 0, [0, 3], [3])];
    const m = metricsFromUsers(users, 5, 2, 1);
    expect(m.reactivatedUsers[3]).toBe(2);
    expect(m.reactivatedUsers[0]).toBe(0);
  });

  it("events[t] = floor(activeUsers[t] * eventsPerActiveUser)", () => {
    const users = [mkUser(0, 0, [0, 1, 2])];
    const m = metricsFromUsers(users, 3, 1, 5);
    expect(m.events[0]).toBe(5);
    expect(m.events[1]).toBe(5);
  });

  it("stickiness is null for t < 28, number in [0,1] for t >= 28", () => {
    // 40 days, active every day
    const activeDays = Array.from({ length: 40 }, (_, i) => i);
    const users = [mkUser(0, 0, activeDays)];
    const m = metricsFromUsers(users, 40, 1, 1);
    for (let t = 0; t < 28; t++) expect(m.stickiness[t]).toBeNull();
    for (let t = 28; t < 40; t++) {
      expect(m.stickiness[t]).not.toBeNull();
      expect(m.stickiness[t]!).toBeGreaterThanOrEqual(0);
      expect(m.stickiness[t]!).toBeLessThanOrEqual(1);
    }
  });

  it("stickiness equals 1 when user is active every day", () => {
    // Single user active every day — DAU = MAU = 1 → stickiness = 1
    const activeDays = Array.from({ length: 60 }, (_, i) => i);
    const users = [mkUser(0, 0, activeDays)];
    const m = metricsFromUsers(users, 60, 1, 1);
    expect(m.stickiness[59]).toBeCloseTo(1, 5);
  });

  it("all array lengths equal days", () => {
    const users = [mkUser(0, 0, [0, 1, 2])];
    const m = metricsFromUsers(users, 5, 1, 1);
    expect(m.activeUsers).toHaveLength(5);
    expect(m.newUsers).toHaveLength(5);
    expect(m.totalUsers).toHaveLength(5);
    expect(m.churnedUsers).toHaveLength(5);
    expect(m.reactivatedUsers).toHaveLength(5);
    expect(m.events).toHaveLength(5);
    expect(m.stickiness).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -E "metricsFromUsers|Cannot"
```

Expected: `Cannot find module '../metricsFromUsers'`

- [ ] **Step 3: Implement `metricsFromUsers.ts`**

```typescript
// apps/seeder-studio/src/lib/twin/metricsFromUsers.ts
import type { SimulatedUser } from "./simulate";

const MAU_WINDOW = 28;

export interface MetricsOutput {
  events: number[];
  activeUsers: number[];
  newUsers: number[];
  churnedUsers: number[];
  reactivatedUsers: number[];
  stickiness: (number | null)[];
  totalUsers: number[];
}

export function metricsFromUsers(
  users: SimulatedUser[],
  days: number,
  totalUsers: number,
  eventsPerActiveUser: number,
): MetricsOutput {
  const simCount = users.length;
  const scale = simCount > 0 ? totalUsers / simCount : 1;

  // Build day-indexed lookup arrays for O(1) daily counting.
  const activeDayCount = new Array(days).fill(0); // raw sim counts
  const newDayCount = new Array(days).fill(0);
  const churnDayCount = new Array(days).fill(0);
  const reactivationDayCount = new Array(days).fill(0);
  // For MAU: need to know which users were active in each day
  // Store active day sets per user for window queries.
  // activeDayCount is enough for DAU; for MAU we need a sliding window.

  // Per-day sorted user-activity lists for MAU sliding window.
  // activeDaysByUser[userId] = sorted activeDays (already sorted from simulate).
  // We'll compute MAU using a running set of "users seen in last 28 days".

  for (const u of users) {
    newDayCount[u.joinDay]++;
    for (const d of u.activeDays) activeDayCount[d]++;
    for (const d of u.reactivationDays) reactivationDayCount[d]++;
    if (u.churnDay !== null && u.churnDay < days) churnDayCount[u.churnDay]++;
  }

  // MAU: for each day t, count distinct users with at least one active day in [t-27, t].
  // Use a pointer-per-user approach: track each user's next active day index.
  // For each t, count users whose activeDays contains any value in [t-MAU_WINDOW+1, t].
  //
  // Efficient approach: sweep t from 0..days-1. Maintain a Set of user IDs currently
  // in the MAU window. Add users whose activeDays[ptr] <= t. Remove users whose last
  // active day < t - MAU_WINDOW + 1.
  //
  // Implementation: for each user track their active day pointers.
  const mauCounts = new Array(days).fill(0);

  // Build sorted list of (day, userId) entries — one per active day.
  // Then sweep with a sliding window.
  type Entry = { day: number; userId: number };
  const entries: Entry[] = [];
  for (const u of users) {
    for (const d of u.activeDays) entries.push({ day: d, userId: u.id });
  }
  entries.sort((a, b) => a.day - b.day || a.userId - b.userId);

  // For each user, track the latest active day seen (for eviction).
  const userLastActive = new Map<number, number>();
  for (const u of users) {
    if (u.activeDays.length > 0) userLastActive.set(u.id, u.activeDays.at(-1)!);
  }

  // Active user set in MAU window: userId → last seen day in window.
  const windowUsers = new Map<number, number>(); // userId → most recent active day
  let eIdx = 0;

  for (let t = 0; t < days; t++) {
    const windowStart = Math.max(0, t - MAU_WINDOW + 1);

    // Add all entries with day <= t.
    while (eIdx < entries.length && entries[eIdx].day <= t) {
      const { day, userId } = entries[eIdx];
      const prev = windowUsers.get(userId);
      if (prev === undefined || day > prev) windowUsers.set(userId, day);
      eIdx++;
    }

    // Evict users whose most recent active day is before windowStart.
    for (const [uid, lastDay] of windowUsers) {
      if (lastDay < windowStart) windowUsers.delete(uid);
    }

    mauCounts[t] = windowUsers.size;
  }

  // Build output arrays.
  const activeUsers = activeDayCount.map((c) => Math.round(c * scale));
  const newUsers = newDayCount.map((c) => Math.round(c * scale));
  const churnedUsers = churnDayCount.map((c) => Math.round(c * scale));
  const reactivatedUsers = reactivationDayCount.map((c) =>
    Math.round(c * scale),
  );
  const events = activeUsers.map((v) => Math.floor(v * eventsPerActiveUser));

  const totalUsers: number[] = [];
  let cumulative = 0;
  for (const n of newUsers) {
    cumulative += n;
    totalUsers.push(cumulative);
  }

  const mau = mauCounts.map((c) => Math.round(c * scale));
  const stickiness: (number | null)[] = activeUsers.map((dau, t) => {
    if (t < MAU_WINDOW) return null;
    const m = mau[t];
    return m > 0 ? Math.min(1, dau / m) : 0;
  });

  return {
    events,
    activeUsers,
    newUsers,
    churnedUsers,
    reactivatedUsers,
    stickiness,
    totalUsers,
  };
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -A2 "metricsFromUsers"
```

Expected: all 9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/lib/twin/metricsFromUsers.ts \
        apps/seeder-studio/src/lib/twin/__tests__/metricsFromUsers.test.ts
git commit -m "feat(sim): add metricsFromUsers — aggregate SimulatedUser[] → TwinOutput fields"
```

---

## Task 4: Update stickiness axis params + TwinOutput type

**Files:**

- Modify: `apps/seeder-studio/src/lib/twin/axisSpec.ts`
- Modify: `apps/seeder-studio/src/lib/twin/types.ts`

Replace `{ retention_day, dau_mau_target }` on the stickiness axis with the six `RetentionParams` fields. Update `TwinOutput` to include `reactivatedUsers`.

- [ ] **Step 1: Write the failing test** (add to `axisSpec.test.ts`)

Read the existing test file first:

```bash
cat apps/seeder-studio/src/lib/twin/__tests__/axisSpec.test.ts
```

Then append this describe block to the file:

```typescript
describe("stickiness axis RetentionParams", () => {
  it("every stickiness value has required RetentionParams fields", () => {
    const required = [
      "peakChurnRate",
      "baseChurnRate",
      "churnDecayDays",
      "reactivationRate",
      "reactivationDecay",
      "maxDormantDays",
    ];
    const values = AXIS_SPEC.stickiness.values;
    values.forEach((v) => {
      required.forEach((key) => {
        expect(v.params).toHaveProperty(key);
        expect(typeof (v.params as Record<string, unknown>)[key]).toBe(
          "number",
        );
      });
    });
  });

  it("churny has higher peakChurnRate than addictive", () => {
    const churny = getAxisValue("stickiness", "churny")!.params as Record<
      string,
      number
    >;
    const addictive = getAxisValue("stickiness", "addictive")!.params as Record<
      string,
      number
    >;
    expect(churny.peakChurnRate).toBeGreaterThan(addictive.peakChurnRate);
  });

  it("addictive has higher reactivationRate than churny", () => {
    const churny = getAxisValue("stickiness", "churny")!.params as Record<
      string,
      number
    >;
    const addictive = getAxisValue("stickiness", "addictive")!.params as Record<
      string,
      number
    >;
    expect(addictive.reactivationRate).toBeGreaterThan(churny.reactivationRate);
  });
});
```

Add the import at the top of the test file if not already present:

```typescript
import { AXIS_SPEC, getAxisValue } from "../axisSpec";
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -A3 "RetentionParams"
```

Expected: failing because `peakChurnRate` etc. don't exist yet.

- [ ] **Step 3: Update `axisSpec.ts` stickiness values**

Find the stickiness section in `apps/seeder-studio/src/lib/twin/axisSpec.ts` and replace the three stickiness value objects:

```typescript
      {
        value: "churny",
        label: "churny",
        description: "High early churn, low reactivation. Day-7 retention ~8%.",
        params: {
          peakChurnRate: 0.75,
          baseChurnRate: 0.20,
          churnDecayDays: 4,
          reactivationRate: 0.02,
          reactivationDecay: 0.70,
          maxDormantDays: 20,
        },
      },
      {
        value: "sticky",
        label: "sticky",
        description: "Moderate retention. Day-7 retention ~22%.",
        params: {
          peakChurnRate: 0.50,
          baseChurnRate: 0.05,
          churnDecayDays: 10,
          reactivationRate: 0.05,
          reactivationDecay: 0.80,
          maxDormantDays: 45,
        },
      },
      {
        value: "addictive",
        label: "addictive",
        description: "Low churn, strong reactivation. Day-7 retention ~45%.",
        params: {
          peakChurnRate: 0.25,
          baseChurnRate: 0.01,
          churnDecayDays: 14,
          reactivationRate: 0.10,
          reactivationDecay: 0.85,
          maxDormantDays: 90,
        },
      },
```

Also update the stickiness axis description:

```typescript
    description: "User retention profile: churn rate, reactivation probability, dormancy threshold.",
```

- [ ] **Step 4: Update `types.ts`** — add `reactivatedUsers`

```typescript
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
```

- [ ] **Step 5: Run to confirm PASS**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -E "RetentionParams|FAIL"
```

Expected: new axisSpec tests pass. Other tests may fail due to type errors (fixed in Task 5).

- [ ] **Step 6: Commit**

```bash
git add apps/seeder-studio/src/lib/twin/axisSpec.ts \
        apps/seeder-studio/src/lib/twin/types.ts \
        apps/seeder-studio/src/lib/twin/__tests__/axisSpec.test.ts
git commit -m "feat(sim): update stickiness axis to RetentionParams + add reactivatedUsers to TwinOutput"
```

---

## Task 5: Wire simulation into `runTwin`, delete old retention module

**Files:**

- Modify: `apps/seeder-studio/src/lib/twin/index.ts`
- Delete: `apps/seeder-studio/src/lib/twin/retention.ts`
- Delete: `apps/seeder-studio/src/lib/twin/__tests__/retention.test.ts`
- Modify: `apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts`
- Modify: `apps/seeder-studio/src/lib/twin/__tests__/runTwin.property.test.ts`

- [ ] **Step 1: Replace `index.ts` body**

The arrival-curve pipeline (growth → anomalies → jitter → virality → normalise) is unchanged. Replace everything after the `arrivals` computation:

```typescript
// apps/seeder-studio/src/lib/twin/index.ts
import { getAxisValue } from "./axisSpec";
import { resolveScale } from "./utils";
import { growthCurve } from "./growth";
import { applyAnomalies } from "./anomalies";
import { applyJitter } from "./jitter";
import { applyVirality } from "./virality";
import { simulateUsers } from "./simulate";
import type { RetentionParams } from "./simulate";
import { metricsFromUsers } from "./metricsFromUsers";
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

  const users = simulateUsers(
    arrivals,
    days,
    total_users,
    retentionParams,
    seed,
  );

  const depth =
    (getAxisValue("engagement_depth", config.axes.engagement_depth ?? "medium")
      ?.params.events_per_user as number | undefined) ?? 10;

  const metrics = metricsFromUsers(users, days, total_users, depth);

  return { days, ...metrics };
}
```

- [ ] **Step 2: Delete old files**

```bash
cd apps/seeder-studio
rm src/lib/twin/retention.ts
rm src/lib/twin/__tests__/retention.test.ts
```

- [ ] **Step 3: Update `runTwin.test.ts`**

Replace the entire file. The stickiness convergence test values change (no more artificial scaling), and `reactivatedUsers` is added:

```typescript
// apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts
import { describe, it, expect } from "vitest";
import { runTwin } from "..";
import type { SimulationConfig } from "@/types/simulation";

const base: SimulationConfig = {
  name: "test",
  domain: "saas",
  axes: {
    growth: "strong",
    stickiness: "sticky",
    engagement_depth: "medium",
    monetization: "subscription",
    virality: "weak",
    scale: "tiny",
    geography: "global",
    anomalies: "clean",
  },
  random_seed: 42,
};

describe("runTwin", () => {
  it("returns arrays of length window_days", () => {
    const out = runTwin({ config: base });
    expect(out.days).toBe(30);
    expect(out.events).toHaveLength(30);
    expect(out.activeUsers).toHaveLength(30);
    expect(out.newUsers).toHaveLength(30);
    expect(out.churnedUsers).toHaveLength(30);
    expect(out.reactivatedUsers).toHaveLength(30);
    expect(out.stickiness).toHaveLength(30);
    expect(out.totalUsers).toHaveLength(30);
  });

  it("stickiness is null for t < 28", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 60 } },
    });
    expect(out.stickiness.slice(0, 28).every((s) => s === null)).toBe(true);
  });

  it("stickiness is in [0, 1] after warmup", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 60 } },
    });
    expect(
      out.stickiness.slice(28).every((s) => s !== null && s >= 0 && s <= 1),
    ).toBe(true);
  });

  it("addictive stickiness > sticky stickiness > churny stickiness", () => {
    const avg = (arr: (number | null)[]) => {
      const vals = arr.filter((v): v is number => v !== null);
      return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    };
    const cfg = (s: string) => ({
      config: {
        ...base,
        axes: { ...base.axes, stickiness: s },
        scale_config: { window_days: 60 },
      },
    });
    const churny = runTwin(cfg("churny"));
    const sticky = runTwin(cfg("sticky"));
    const addictive = runTwin(cfg("addictive"));
    expect(avg(churny.stickiness)).toBeLessThan(avg(sticky.stickiness));
    expect(avg(sticky.stickiness)).toBeLessThan(avg(addictive.stickiness));
  });

  it("deeper engagement yields more events per DAU", () => {
    const shallow = runTwin({
      config: { ...base, axes: { ...base.axes, engagement_depth: "shallow" } },
    });
    const deep = runTwin({
      config: { ...base, axes: { ...base.axes, engagement_depth: "deep" } },
    });
    const ratio = (o: ReturnType<typeof runTwin>) =>
      o.events.reduce((a, b) => a + b, 0) /
      Math.max(
        1,
        o.activeUsers.reduce((a, b) => a + b, 0),
      );
    expect(ratio(deep)).toBeGreaterThan(ratio(shallow) * 2);
  });

  it("virality does not change total arrivals", () => {
    const weak = runTwin({
      config: { ...base, axes: { ...base.axes, virality: "weak" } },
    });
    const strong = runTwin({
      config: { ...base, axes: { ...base.axes, virality: "strong_viral" } },
    });
    expect(weak.totalUsers.at(-1)).toBeCloseTo(strong.totalUsers.at(-1)!, 0);
  });

  it("honors scale_config overrides", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 45 } },
    });
    expect(out.days).toBe(45);
  });

  it("totalUsers is monotonically non-decreasing", () => {
    const out = runTwin({ config: base });
    for (let i = 1; i < out.totalUsers.length; i++) {
      expect(out.totalUsers[i]).toBeGreaterThanOrEqual(out.totalUsers[i - 1]);
    }
  });

  it("reactivatedUsers is non-negative", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 60 } },
    });
    expect(out.reactivatedUsers.every((v) => v >= 0)).toBe(true);
  });

  it("churnedUsers is non-negative", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 60 } },
    });
    expect(out.churnedUsers.every((v) => v >= 0)).toBe(true);
  });

  it("deterministic: same config same output", () => {
    const a = runTwin({ config: base });
    const b = runTwin({ config: base });
    expect(a.activeUsers).toEqual(b.activeUsers);
  });
});
```

- [ ] **Step 4: Update `runTwin.property.test.ts`** — add `reactivatedUsers` invariant

Replace the property assertion body:

```typescript
return (
  out.events.every((v) => v >= 0) &&
  out.activeUsers.every((v) => v >= 0) &&
  out.newUsers.every((v) => v >= 0) &&
  out.churnedUsers.every((v) => v >= 0) &&
  out.reactivatedUsers.every((v) => v >= 0) &&
  out.stickiness.every((s) => s === null || (s >= 0 && s <= 1))
);
```

Also change `scale` in the property test from `fc.constantFrom("tiny", "small")` to just `fc.constantFrom("tiny")` so property tests run faster with the simulation.

- [ ] **Step 5: Run full test suite**

```bash
cd apps/seeder-studio && bun run test:run 2>&1 | tail -10
```

Expected: all tests passing. Fix any remaining type errors (TypeScript will catch references to deleted `dauFromArrivals`).

- [ ] **Step 6: Commit**

```bash
git add apps/seeder-studio/src/lib/twin/index.ts \
        apps/seeder-studio/src/lib/twin/__tests__/runTwin.test.ts \
        apps/seeder-studio/src/lib/twin/__tests__/runTwin.property.test.ts
git rm apps/seeder-studio/src/lib/twin/retention.ts \
       apps/seeder-studio/src/lib/twin/__tests__/retention.test.ts
git commit -m "feat(sim): wire user-level simulation into runTwin, remove old geometric retention"
```

---

## Task 6: Add Reactivations/day chart to PreviewGrid

**Files:**

- Modify: `apps/seeder-studio/src/features/preview/PreviewGrid.tsx`

- [ ] **Step 1: Update `stats` memo and add chart**

In `PreviewGrid.tsx`, add `reactivated` to the stats memo:

```typescript
const stats = useMemo(
  () => ({
    events: headlineStat(out.events, "count"),
    active: headlineStat(out.activeUsers, "count"),
    news: headlineStat(out.newUsers, "count"),
    churned: headlineStat(out.churnedUsers, "count"),
    reactivated: headlineStat(out.reactivatedUsers, "count"),
    stickiness: headlineStat(out.stickiness, "percent"),
  }),
  [out],
);
```

Add the chart after "Churned/day":

```tsx
<KpiChart
  title="Reactivated/day"
  values={out.reactivatedUsers}
  headline={stats.reactivated}
  color="hsl(var(--chart-4))"
  {...sharedProps}
/>
```

- [ ] **Step 2: Run full test suite**

```bash
cd apps/seeder-studio && bun run test:run 2>&1 | tail -6
```

Expected: all tests passing.

- [ ] **Step 3: Commit**

```bash
git add apps/seeder-studio/src/features/preview/PreviewGrid.tsx
git commit -m "feat(sim): add Reactivated/day KPI chart to preview grid"
```

---

## Task 7: Update DayTable with Churned and Reactivated columns

**Files:**

- Modify: `apps/seeder-studio/src/features/preview/DayTable.tsx`
- Modify: `apps/seeder-studio/src/features/preview/__tests__/DayTable.test.tsx`

- [ ] **Step 1: Update DayTable tests**

Add to the existing `DayTable.test.tsx` describe block:

```typescript
  it("renders Churned and Reactivated column headers", () => {
    render(<DayTable out={mkOut(5)} />);
    expect(screen.getByText(/churned/i)).toBeInTheDocument();
    expect(screen.getByText(/reactivated/i)).toBeInTheDocument();
  });

  it("renders churned value for day 1", () => {
    render(<DayTable out={mkOut(5)} />);
    // day 1 churned = 200 (index 1, value (1+1)*100 = 200)
    expect(screen.getByTestId("cell-churned-1")).toBeInTheDocument();
  });
```

Update `mkOut` to include the new fields:

```typescript
const mkOut = (n: number) => ({
  days: n,
  events: Array.from({ length: n }, (_, i) => (i + 1) * 100),
  activeUsers: Array.from({ length: n }, (_, i) => (i + 1) * 50),
  newUsers: Array.from({ length: n }, (_, i) => (i + 1) * 10),
  totalUsers: Array.from({ length: n }, (_, i) => (i + 1) * 10),
  churnedUsers: Array.from({ length: n }, (_, i) => (i + 1) * 100),
  reactivatedUsers: Array.from({ length: n }, (_, i) => (i + 1) * 5),
  stickiness: Array.from({ length: n }, () => 0.5),
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/seeder-studio && bun run test:run --reporter=verbose 2>&1 | grep -E "DayTable|FAIL"
```

Expected: new tests failing — `churned` column not in DayTable yet.

- [ ] **Step 3: Update `DayTable.tsx`**

```typescript
// apps/seeder-studio/src/features/preview/DayTable.tsx
import { formatNum } from "@/lib/format";
import type { TwinOutput } from "@/lib/twin";

interface Props {
  out: TwinOutput;
  rows?: number;
}

export function DayTable({ out, rows = 7 }: Props) {
  const count = Math.min(rows, out.days);

  return (
    <table className="w-full text-xs tabular-nums border-collapse">
      <thead>
        <tr className="text-left text-muted-foreground border-b">
          <th className="py-1 pr-3 font-medium">Day</th>
          <th className="py-1 pr-3 font-medium">New users</th>
          <th className="py-1 pr-3 font-medium">Active users</th>
          <th className="py-1 pr-3 font-medium">Churned</th>
          <th className="py-1 pr-3 font-medium">Reactivated</th>
          <th className="py-1 font-medium">Events</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }, (_, i) => (
          <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
            <td className="py-1 pr-3 text-muted-foreground">{i + 1}</td>
            <td className="py-1 pr-3">{formatNum(Math.round(out.newUsers[i]))}</td>
            <td className="py-1 pr-3">{formatNum(Math.round(out.activeUsers[i]))}</td>
            <td
              className="py-1 pr-3 text-destructive/80"
              data-testid={`cell-churned-${i}`}
            >
              {formatNum(Math.round(out.churnedUsers[i]))}
            </td>
            <td
              className="py-1 pr-3 text-[hsl(var(--chart-4))]/80"
              data-testid={`cell-reactivated-${i}`}
            >
              {formatNum(Math.round(out.reactivatedUsers[i]))}
            </td>
            <td className="py-1" data-testid={`cell-events-${i}`}>
              {formatNum(Math.round(out.events[i]))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd apps/seeder-studio && bun run test:run 2>&1 | tail -6
```

Expected: all tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/features/preview/DayTable.tsx \
        apps/seeder-studio/src/features/preview/__tests__/DayTable.test.tsx
git commit -m "feat(sim): add Churned and Reactivated columns to DayTable"
```
