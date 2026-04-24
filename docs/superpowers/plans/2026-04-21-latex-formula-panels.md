# LaTeX Formula Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain-text formula captions with KaTeX-rendered math, a "where:" values line, a per-chart info popover, and a global collapsible reference panel.

**Architecture:** Install KaTeX; create a `MathFormula` component and a `formulaRegistry.ts` data file; update `KpiChart` to show inline formula + where line + `ⓘ` popover; add a `SimMathPanel` collapsible at the bottom of `PreviewGrid`. `Popover` and `Collapsible` come from `@stratif-io/web`.

**Tech Stack:** React 18, TypeScript, KaTeX, `@stratif-io/web` (Popover, Collapsible), Vitest + React Testing Library

---

## File Map

- **Install**: `katex` + `@types/katex`
- **Create**: `apps/seeder-studio/src/lib/math/MathFormula.tsx` — renders a LaTeX string via KaTeX
- **Create**: `apps/seeder-studio/src/features/preview/formulaRegistry.ts` — static per-metric formula data (LaTeX, explanation, variable descriptions)
- **Modify**: `apps/seeder-studio/src/features/preview/KpiChart.tsx` — replace `formula` prop with `formulaLatex` + `formulaWhere` + `formulaExplanation`; add inline formula + where line + `ⓘ` popover
- **Create**: `apps/seeder-studio/src/features/preview/SimMathPanel.tsx` — global collapsible reference panel
- **Modify**: `apps/seeder-studio/src/features/preview/PreviewGrid.tsx` — pass new props, add `<SimMathPanel>`
- **Modify**: `apps/seeder-studio/src/main.tsx` (or entry CSS) — import `katex/dist/katex.min.css`
- **Tests**: `src/lib/math/__tests__/MathFormula.test.tsx`, `src/features/preview/__tests__/KpiChart.test.tsx`, `src/features/preview/__tests__/SimMathPanel.test.tsx`, `src/features/preview/__tests__/PreviewGrid.test.tsx`

---

### Task 1: Install KaTeX and create `MathFormula` component

**Files:**

- Install: `katex` + `@types/katex`
- Create: `apps/seeder-studio/src/lib/math/MathFormula.tsx`
- Create: `apps/seeder-studio/src/lib/math/__tests__/MathFormula.test.tsx`
- Modify: `apps/seeder-studio/src/main.tsx` — import KaTeX CSS

- [ ] **Step 1: Install KaTeX**

```bash
cd apps/seeder-studio && bun add katex && bun add -d @types/katex
```

Expected: `katex` and `@types/katex` appear in `package.json`.

- [ ] **Step 2: Write failing test**

Create `apps/seeder-studio/src/lib/math/__tests__/MathFormula.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MathFormula } from "../MathFormula";

describe("MathFormula", () => {
  it("renders a container with data-testid", () => {
    render(<MathFormula latex="\text{DAU}(t) = \sum_c N_c" />);
    expect(screen.getByTestId("math-formula")).toBeInTheDocument();
  });

  it("renders display mode with block element when display=true", () => {
    const { container } = render(
      <MathFormula latex="\frac{a}{b}" display />,
    );
    expect(container.querySelector(".katex-display")).toBeTruthy();
  });

  it("renders inline mode (no katex-display class) when display is false", () => {
    const { container } = render(<MathFormula latex="x^2" />);
    expect(container.querySelector(".katex-display")).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/seeder-studio && bun run test:run -- src/lib/math/__tests__/MathFormula.test.tsx
```

Expected: FAIL — `MathFormula` not found.

- [ ] **Step 4: Create `MathFormula.tsx`**

Create `apps/seeder-studio/src/lib/math/MathFormula.tsx`:

```tsx
import katex from "katex";

interface Props {
  latex: string;
  display?: boolean;
  className?: string;
}

export function MathFormula({ latex, display = false, className = "" }: Props) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: display,
  });
  return (
    <span
      data-testid="math-formula"
      className={className}
      // Safe: all LaTeX strings are authored in this codebase, never user-supplied.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 5: Import KaTeX CSS**

Open `apps/seeder-studio/src/main.tsx` and add after the existing CSS imports:

```typescript
import "katex/dist/katex.min.css";
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd apps/seeder-studio && bun run test:run -- src/lib/math/__tests__/MathFormula.test.tsx
```

Expected: all 3 PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/seeder-studio/src/lib/math/MathFormula.tsx \
        apps/seeder-studio/src/lib/math/__tests__/MathFormula.test.tsx \
        apps/seeder-studio/src/main.tsx \
        apps/seeder-studio/package.json \
        bun.lockb
git commit -m "feat(math): install KaTeX, add MathFormula component"
```

---

### Task 2: Create `formulaRegistry.ts`

**Files:**

- Create: `apps/seeder-studio/src/features/preview/formulaRegistry.ts`
- Test: `apps/seeder-studio/src/features/preview/__tests__/formulaRegistry.test.ts`

This file holds the **static** per-metric data: LaTeX string, plain-English explanation, and a list of variable descriptions. Dynamic values (resolved axis params) are added separately in `PreviewGrid`.

- [ ] **Step 1: Write failing test**

Create `apps/seeder-studio/src/features/preview/__tests__/formulaRegistry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { FORMULA_REGISTRY } from "../formulaRegistry";

const EXPECTED_KEYS = [
  "events",
  "activeUsers",
  "newUsers",
  "stickiness",
  "totalUsers",
  "churnedUsers",
  "reactivatedUsers",
] as const;

describe("FORMULA_REGISTRY", () => {
  it("contains all 7 metrics", () => {
    for (const key of EXPECTED_KEYS) {
      expect(FORMULA_REGISTRY[key]).toBeDefined();
    }
  });

  it("every entry has latex, explanation, and variables", () => {
    for (const entry of Object.values(FORMULA_REGISTRY)) {
      expect(typeof entry.latex).toBe("string");
      expect(entry.latex.length).toBeGreaterThan(0);
      expect(typeof entry.explanation).toBe("string");
      expect(entry.explanation.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.variables)).toBe(true);
      expect(entry.variables.length).toBeGreaterThan(0);
    }
  });

  it("every variable entry has symbol and meaning", () => {
    for (const entry of Object.values(FORMULA_REGISTRY)) {
      for (const v of entry.variables) {
        expect(typeof v.symbol).toBe("string");
        expect(typeof v.meaning).toBe("string");
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/formulaRegistry.test.ts
```

Expected: FAIL — `formulaRegistry` not found.

- [ ] **Step 3: Create `formulaRegistry.ts`**

Create `apps/seeder-studio/src/features/preview/formulaRegistry.ts`:

```typescript
export interface FormulaVariable {
  symbol: string;
  meaning: string;
}

export interface FormulaEntry {
  latex: string;
  explanation: string;
  variables: FormulaVariable[];
}

export const FORMULA_REGISTRY: Record<string, FormulaEntry> = {
  events: {
    latex: "\\text{events}(t) = \\text{DAU}(t) \\times d",
    explanation:
      "Total events fired by all active users on day t. Each active user fires d events per day on average, where d is set by the Depth axis.",
    variables: [
      { symbol: "d", meaning: "events per active user per day (Depth axis)" },
      { symbol: "\\text{DAU}(t)", meaning: "daily active users on day t" },
    ],
  },
  activeUsers: {
    latex:
      "\\text{DAU}(t) = \\sum_c \\text{Poisson}\\!\\left(N_c \\cdot S[t{-}c]\\right)",
    explanation:
      "Active users on day t, summed across all cohorts. For each cohort c, we sample the number of survivors at tenure t−c from a Poisson distribution using the survival probability S[k].",
    variables: [
      { symbol: "N_c", meaning: "cohort size: users who arrived on day c" },
      {
        symbol: "S[k]",
        meaning:
          "survival probability at tenure k — fraction of cohort still active",
      },
      { symbol: "t-c", meaning: "tenure of cohort c on day t" },
    ],
  },
  newUsers: {
    latex: "N_c = \\text{Poisson}(\\lambda_c)",
    explanation:
      "New users arriving on day c, sampled from a Poisson distribution. λ_c is the rescaled arrival rate from the growth curve, anomalies, jitter, and virality pipeline.",
    variables: [
      {
        symbol: "\\lambda_c",
        meaning:
          "expected arrivals on day c (growth × anomaly × jitter × virality, rescaled to target users)",
      },
    ],
  },
  stickiness: {
    latex: "\\text{stickiness}(t) = \\frac{\\text{DAU}(t)}{\\text{MAU}(t)}",
    explanation:
      "Ratio of daily to monthly active users, measuring how habitual usage is. MAU is computed over a 28-day rolling window using an independence approximation on the survival curve.",
    variables: [
      { symbol: "\\text{DAU}(t)", meaning: "daily active users on day t" },
      {
        symbol: "\\text{MAU}(t)",
        meaning: "monthly active users in the 28-day window ending at t",
      },
    ],
  },
  totalUsers: {
    latex: "\\text{total}(t) = \\sum_{c \\leq t} N_c",
    explanation:
      "Cumulative count of all users who have ever signed up through day t. Monotonically non-decreasing.",
    variables: [{ symbol: "N_c", meaning: "new users (cohort size) on day c" }],
  },
  churnedUsers: {
    latex:
      "\\text{churn}(t) = \\sum_c \\text{Poisson}\\!\\left(N_c \\cdot (S[k{-}1] - S[k])\\right)",
    explanation:
      "Users entering the dormant state today, summed across cohorts. The factor S[k−1]−S[k] is the probability of churning at exactly tenure k. Dormant users may reactivate within maxDormantDays.",
    variables: [
      { symbol: "S[k{-}1] - S[k]", meaning: "churn probability at tenure k" },
      { symbol: "k", meaning: "tenure t−c of cohort c on day t" },
    ],
  },
  reactivatedUsers: {
    latex:
      "\\text{react}(t) = \\sum_c \\text{Poisson}\\!\\left(\\text{ch}_c \\cdot r \\cdot \\delta^{d-1}\\right)",
    explanation:
      "Previously dormant users who return today. For each cohort, users who churned d days ago reactivate with probability r·δ^(d−1), a geometrically decaying kernel.",
    variables: [
      {
        symbol: "\\text{ch}_c",
        meaning: "users who went dormant from cohort c",
      },
      { symbol: "r", meaning: "base reactivation rate (day 1 of dormancy)" },
      {
        symbol: "\\delta",
        meaning: "reactivation decay factor per dormant day",
      },
      { symbol: "d", meaning: "number of days the user has been dormant" },
    ],
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/formulaRegistry.test.ts
```

Expected: all 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/features/preview/formulaRegistry.ts \
        apps/seeder-studio/src/features/preview/__tests__/formulaRegistry.test.ts
git commit -m "feat(preview): add formulaRegistry with LaTeX, explanations, and variable descriptions"
```

---

### Task 3: Update `KpiChart` — inline formula + where line + info popover

**Files:**

- Modify: `apps/seeder-studio/src/features/preview/KpiChart.tsx`
- Modify: `apps/seeder-studio/src/features/preview/__tests__/KpiChart.test.tsx`

Replace the existing `formula?: string` prop with three new props. Add inline KaTeX + where line below the chart and a `ⓘ` button in the header that opens a `Popover` with the full formula, where block, and explanation.

`Popover`, `PopoverTrigger`, `PopoverContent` are imported from `@stratif-io/web`.
`MathFormula` is imported from `@/lib/math/MathFormula`.

- [ ] **Step 1: Write failing tests**

In `apps/seeder-studio/src/features/preview/__tests__/KpiChart.test.tsx`, add a new describe block:

```typescript
describe("KpiChart formula display", () => {
  it("renders inline KaTeX formula when formulaLatex is provided", () => {
    render(
      <KpiChart
        title="Test"
        values={[1, 2, 3]}
        formulaLatex="\text{DAU}(t)"
        formulaWhere="where: d = 10"
        formulaExplanation="Daily active users."
      />,
    );
    expect(screen.getByTestId("math-formula")).toBeInTheDocument();
  });

  it("renders where line when formulaWhere is provided", () => {
    render(
      <KpiChart
        title="Test"
        values={[1, 2, 3]}
        formulaLatex="\text{DAU}(t)"
        formulaWhere="where: d = 10"
        formulaExplanation="Daily active users."
      />,
    );
    expect(screen.getByText("where: d = 10")).toBeInTheDocument();
  });

  it("renders info button when formulaExplanation is provided", () => {
    render(
      <KpiChart
        title="Test"
        values={[1, 2, 3]}
        formulaLatex="\text{DAU}(t)"
        formulaWhere="where: d = 10"
        formulaExplanation="Daily active users."
      />,
    );
    expect(screen.getByRole("button", { name: /info/i })).toBeInTheDocument();
  });

  it("renders nothing extra when no formula props are given", () => {
    render(<KpiChart title="Test" values={[1, 2, 3]} />);
    expect(screen.queryByTestId("math-formula")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-formula-where")).not.toBeInTheDocument();
  });
});
```

Also update any existing tests that reference `kpi-formula` testid — the old `formula` prop is removed, so remove those tests.

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/KpiChart.test.tsx
```

Expected: the 4 new tests FAIL.

- [ ] **Step 3: Update `KpiChart.tsx`**

Read `KpiChart.tsx` first. Then make these changes:

**Add imports at the top:**

```typescript
import { Popover, PopoverTrigger, PopoverContent } from "@stratif-io/web";
import { MathFormula } from "@/lib/math/MathFormula";
```

**Update `Props` interface** — remove `formula?: string`, add:

```typescript
formulaLatex?: string;
formulaWhere?: string;
formulaExplanation?: string;
```

**Update destructuring** — remove `formula = ""`, add:

```typescript
formulaLatex = "",
formulaWhere = "",
formulaExplanation = "",
```

**Update the header row** — add the `ⓘ` button next to the title when `formulaExplanation` is set:

Replace the header `<div className="flex items-baseline justify-between">` block with:

```tsx
<div className="flex items-baseline justify-between">
  <div className="flex items-baseline gap-1.5">
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
    <span className="text-xs font-semibold">{title}</span>
    {formulaExplanation && (
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="info"
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors leading-none"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
              <path
                d="M6 5.5v3M6 3.5v.5"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-4 flex flex-col gap-3"
          side="top"
          align="start"
        >
          <p className="text-xs font-semibold">{title}</p>
          {formulaLatex && (
            <MathFormula
              latex={formulaLatex}
              display
              className="overflow-x-auto"
            />
          )}
          {formulaWhere && (
            <p className="text-[11px] text-muted-foreground font-mono">
              {formulaWhere}
            </p>
          )}
          {formulaExplanation && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {formulaExplanation}
            </p>
          )}
        </PopoverContent>
      </Popover>
    )}
  </div>
  {headline && (
    <span className="text-[11px] text-muted-foreground tabular-nums">
      {headline}
    </span>
  )}
</div>
```

**Replace the old formula `<p>` block** below the chart container. Remove the old `{formula && <p data-testid="kpi-formula" ...>}` block and replace with:

```tsx
{
  formulaLatex && (
    <div className="flex flex-col gap-0.5 mt-1">
      <MathFormula
        latex={formulaLatex}
        className="text-[11px] text-muted-foreground/70 overflow-x-auto"
      />
      {formulaWhere && (
        <p
          data-testid="kpi-formula-where"
          className="text-[10px] text-muted-foreground/50 font-mono leading-tight"
        >
          {formulaWhere}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/KpiChart.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/features/preview/KpiChart.tsx \
        apps/seeder-studio/src/features/preview/__tests__/KpiChart.test.tsx
git commit -m "feat(preview): replace formula prop with KaTeX + where line + info popover on KpiChart"
```

---

### Task 4: Create `SimMathPanel` global reference panel

**Files:**

- Create: `apps/seeder-studio/src/features/preview/SimMathPanel.tsx`
- Create: `apps/seeder-studio/src/features/preview/__tests__/SimMathPanel.test.tsx`

A collapsible panel that lists all 7 metrics with their full formula, where block, and explanation. Uses `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@stratif-io/web`.

- [ ] **Step 1: Write failing tests**

Create `apps/seeder-studio/src/features/preview/__tests__/SimMathPanel.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SimMathPanel } from "../SimMathPanel";

const entries = [
  {
    metric: "Active users",
    latex: "\\text{DAU}(t) = \\sum_c N_c",
    where: "where: peak = 50%, τ = 10d",
    explanation: "Active users per day.",
    variables: [{ symbol: "N_c", meaning: "cohort size on day c" }],
  },
];

describe("SimMathPanel", () => {
  it("renders the panel title", () => {
    render(<SimMathPanel entries={entries} />);
    expect(screen.getByText(/simulation math/i)).toBeInTheDocument();
  });

  it("content is hidden before opening", () => {
    render(<SimMathPanel entries={entries} />);
    expect(screen.queryByText("Active users")).not.toBeInTheDocument();
  });

  it("opens and shows metric entries on trigger click", async () => {
    const user = userEvent.setup();
    render(<SimMathPanel entries={entries} />);
    await user.click(screen.getByRole("button", { name: /simulation math/i }));
    expect(screen.getByText("Active users")).toBeInTheDocument();
  });

  it("shows where line for each entry when open", async () => {
    const user = userEvent.setup();
    render(<SimMathPanel entries={entries} />);
    await user.click(screen.getByRole("button", { name: /simulation math/i }));
    expect(screen.getByText("where: peak = 50%, τ = 10d")).toBeInTheDocument();
  });

  it("shows explanation for each entry when open", async () => {
    const user = userEvent.setup();
    render(<SimMathPanel entries={entries} />);
    await user.click(screen.getByRole("button", { name: /simulation math/i }));
    expect(screen.getByText("Active users per day.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/SimMathPanel.test.tsx
```

Expected: FAIL — `SimMathPanel` not found.

- [ ] **Step 3: Create `SimMathPanel.tsx`**

Create `apps/seeder-studio/src/features/preview/SimMathPanel.tsx`:

```tsx
import { useState } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@stratif-io/web";
import { MathFormula } from "@/lib/math/MathFormula";

export interface SimMathEntry {
  metric: string;
  latex: string;
  where: string;
  explanation: string;
  variables: { symbol: string; meaning: string }[];
}

interface Props {
  entries: SimMathEntry[];
}

export function SimMathPanel({ entries }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          aria-label="Simulation math"
          className="flex w-full items-center justify-between py-1 text-xs uppercase text-muted-foreground font-semibold hover:text-foreground transition-colors"
        >
          <span>Simulation math</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <div key={entry.metric} className="py-3 flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold">{entry.metric}</p>
              <MathFormula
                latex={entry.latex}
                display
                className="overflow-x-auto"
              />
              <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                {entry.where}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {entry.explanation}
              </p>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {entry.variables.map((v) => (
                  <div key={v.symbol} className="flex gap-1.5 text-[10px]">
                    <span className="font-mono text-muted-foreground shrink-0">
                      <MathFormula latex={v.symbol} />
                    </span>
                    <span className="text-muted-foreground/70">
                      {v.meaning}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/SimMathPanel.test.tsx
```

Expected: all 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seeder-studio/src/features/preview/SimMathPanel.tsx \
        apps/seeder-studio/src/features/preview/__tests__/SimMathPanel.test.tsx
git commit -m "feat(preview): add SimMathPanel global collapsible formula reference"
```

---

### Task 5: Wire everything in `PreviewGrid`

**Files:**

- Modify: `apps/seeder-studio/src/features/preview/PreviewGrid.tsx`
- Modify: `apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx`

Build dynamic where strings from resolved params; pass `formulaLatex`, `formulaWhere`, `formulaExplanation` to each `KpiChart`; add `<SimMathPanel>` below the DayTable.

- [ ] **Step 1: Write failing tests**

Add to `apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx`:

```typescript
it("renders KaTeX formula for each chart", () => {
  render(<PreviewGrid />);
  // MathFormula renders a span with data-testid="math-formula"
  // There should be at least 7 (one per chart)
  const formulas = screen.getAllByTestId("math-formula");
  expect(formulas.length).toBeGreaterThanOrEqual(7);
});

it("renders where lines with resolved values", () => {
  render(<PreviewGrid />);
  // engagement_depth "medium" → depth=10
  expect(screen.getByText(/d = 10/)).toBeInTheDocument();
  // stickiness "sticky" → peak=50%
  expect(screen.getByText(/peak = 50%/)).toBeInTheDocument();
});

it("renders SimMathPanel", () => {
  render(<PreviewGrid />);
  expect(screen.getByText(/simulation math/i)).toBeInTheDocument();
});
```

Also update/remove the old formula caption tests that referenced static formula strings from the previous implementation (`× 10`, `peak=50%` etc.) if they no longer match.

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/PreviewGrid.test.tsx
```

Expected: the 3 new tests FAIL.

- [ ] **Step 3: Update `PreviewGrid.tsx`**

Read the file first. Then:

**Add imports:**

```typescript
import { FORMULA_REGISTRY } from "./formulaRegistry";
import { SimMathPanel } from "./SimMathPanel";
import type { SimMathEntry } from "./SimMathPanel";
```

**Remove** the old `import { resolveScale }` (already removed in the previous refactor) and the plain `formula` strings.

**After the `resolveSimParams` useMemo**, add the where-string builder and `SimMathEntry` array:

```typescript
const pct = (v: number) => `${Math.round(v * 100)}%`;
const fix1 = (v: number) => v.toFixed(1);

const formulaWhere: Record<string, string> = {
  events: `where: d = ${depth} events/user/day`,
  activeUsers: `where: peak churn = ${pct(rp.peakChurnRate)}, τ = ${rp.churnDecayDays}d`,
  newUsers: `where: target = ${formatNum(totalUsers)} users over ${windowDays}d`,
  stickiness: `where: 28-day rolling window`,
  totalUsers: `where: over ${windowDays}d`,
  churnedUsers: `where: peak = ${pct(rp.peakChurnRate)}, base = ${pct(rp.baseChurnRate)}, τ = ${rp.churnDecayDays}d`,
  reactivatedUsers: `where: r = ${pct(rp.reactivationRate)}, δ = ${fix1(rp.reactivationDecay)}`,
};

const simMathEntries = useMemo(
  (): SimMathEntry[] =>
    Object.entries(FORMULA_REGISTRY).map(([key, entry]) => ({
      metric: entry.explanation.split(".")[0], // first sentence as metric title — overridden below
      latex: entry.latex,
      where: formulaWhere[key] ?? "",
      explanation: entry.explanation,
      variables: entry.variables,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [depth, rp, totalUsers, windowDays],
);
```

Actually, use explicit metric names instead of parsing the explanation. Replace the `simMathEntries` useMemo with:

```typescript
const METRIC_LABELS: Record<string, string> = {
  events: "Events/day",
  activeUsers: "Active users",
  newUsers: "New users/day",
  stickiness: "Stickiness",
  totalUsers: "Total users",
  churnedUsers: "Churned/day",
  reactivatedUsers: "Reactivated/day",
};

const simMathEntries = useMemo(
  (): SimMathEntry[] =>
    Object.entries(FORMULA_REGISTRY).map(([key, entry]) => ({
      metric: METRIC_LABELS[key] ?? key,
      latex: entry.latex,
      where: formulaWhere[key] ?? "",
      explanation: entry.explanation,
      variables: entry.variables,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [depth, rp, totalUsers, windowDays],
);
```

**Update each `KpiChart` call** — remove the old `formula={...}` prop and add the three new props:

```tsx
<KpiChart
  title="Events/day"
  values={out.events}
  headline={stats.events}
  color="hsl(var(--chart-6))"
  className="col-span-2"
  chartHeight="h-40"
  formulaLatex={FORMULA_REGISTRY.events.latex}
  formulaWhere={formulaWhere.events}
  formulaExplanation={FORMULA_REGISTRY.events.explanation}
  {...sharedProps}
/>
<KpiChart
  title="Active users"
  values={out.activeUsers}
  headline={stats.active}
  color="hsl(var(--chart-8))"
  formulaLatex={FORMULA_REGISTRY.activeUsers.latex}
  formulaWhere={formulaWhere.activeUsers}
  formulaExplanation={FORMULA_REGISTRY.activeUsers.explanation}
  {...sharedProps}
/>
<KpiChart
  title="New users/day"
  values={out.newUsers}
  headline={stats.news}
  color="hsl(var(--chart-3))"
  formulaLatex={FORMULA_REGISTRY.newUsers.latex}
  formulaWhere={formulaWhere.newUsers}
  formulaExplanation={FORMULA_REGISTRY.newUsers.explanation}
  {...sharedProps}
/>
<KpiChart
  title="Stickiness"
  values={out.stickiness.map((v) => (v === null ? null : v * 100))}
  headline={stats.stickiness}
  color="hsl(var(--chart-7))"
  valueSuffix="%"
  formulaLatex={FORMULA_REGISTRY.stickiness.latex}
  formulaWhere={formulaWhere.stickiness}
  formulaExplanation={FORMULA_REGISTRY.stickiness.explanation}
  {...sharedProps}
/>
<KpiChart
  title="Total users"
  values={out.totalUsers}
  headline={`total ${formatNum(out.totalUsers.at(-1) ?? 0)}`}
  color="hsl(var(--chart-2))"
  formulaLatex={FORMULA_REGISTRY.totalUsers.latex}
  formulaWhere={formulaWhere.totalUsers}
  formulaExplanation={FORMULA_REGISTRY.totalUsers.explanation}
  {...sharedProps}
/>
<KpiChart
  title="Churned/day"
  values={out.churnedUsers}
  headline={stats.churned}
  color="hsl(var(--destructive))"
  formulaLatex={FORMULA_REGISTRY.churnedUsers.latex}
  formulaWhere={formulaWhere.churnedUsers}
  formulaExplanation={FORMULA_REGISTRY.churnedUsers.explanation}
  {...sharedProps}
/>
<KpiChart
  title="Reactivated/day"
  values={out.reactivatedUsers}
  headline={stats.reactivated}
  color="hsl(var(--chart-4))"
  formulaLatex={FORMULA_REGISTRY.reactivatedUsers.latex}
  formulaWhere={formulaWhere.reactivatedUsers}
  formulaExplanation={FORMULA_REGISTRY.reactivatedUsers.explanation}
  {...sharedProps}
/>
```

**Add `<SimMathPanel>` in the DayTable section** — replace:

```tsx
{
  !allZero && (
    <div className="border-t pt-2">
      <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-1">
        First days
      </h3>
      <DayTable out={out} />
    </div>
  );
}
```

With:

```tsx
{
  !allZero && (
    <div className="border-t pt-2 flex flex-col gap-4">
      <div>
        <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-1">
          First days
        </h3>
        <DayTable out={out} />
      </div>
      <SimMathPanel entries={simMathEntries} />
    </div>
  );
}
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
git commit -m "feat(preview): wire KaTeX formulas, where lines, and SimMathPanel into PreviewGrid"
```
