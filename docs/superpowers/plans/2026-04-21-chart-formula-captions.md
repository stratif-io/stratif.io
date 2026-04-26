# Chart Formula Captions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional plain-text formula caption below each KPI chart in the preview grid, explaining the mathematical function being plotted.

**Architecture:** Add an optional `formula` prop to `KpiChart` that renders a small muted caption line below the chart area. Pass the relevant formula string from `PreviewGrid` for each metric. No new dependencies — plain text only.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Vitest + React Testing Library

---

## File Map

- Modify: `apps/seeder-studio/src/features/preview/KpiChart.tsx` — add optional `formula?: string` prop, render caption
- Modify: `apps/seeder-studio/src/features/preview/PreviewGrid.tsx` — pass formula strings to each `KpiChart`
- Modify: `apps/seeder-studio/src/features/preview/__tests__/KpiChart.test.tsx` — test formula rendered / absent
- Modify: `apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx` — test formulas appear in grid

---

### Task 1: Add `formula` prop to `KpiChart`

**Files:**

- Modify: `apps/seeder-studio/src/features/preview/KpiChart.tsx`
- Test: `apps/seeder-studio/src/features/preview/__tests__/KpiChart.test.tsx`

- [ ] **Step 1: Write the failing tests**

Open `apps/seeder-studio/src/features/preview/__tests__/KpiChart.test.tsx` and add:

```typescript
it("renders formula caption when formula prop is provided", () => {
  render(
    <KpiChart
      title="Test"
      values={[1, 2, 3]}
      formula="DAU(t) = Σ Poisson(N꜀ × S[t−c])"
    />,
  );
  expect(
    screen.getByText("DAU(t) = Σ Poisson(N꜀ × S[t−c])"),
  ).toBeInTheDocument();
});

it("does not render formula caption when formula prop is absent", () => {
  render(<KpiChart title="Test" values={[1, 2, 3]} />);
  // No element with role or testid for formula
  expect(screen.queryByTestId("kpi-formula")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/KpiChart.test.tsx
```

Expected: FAIL — `kpi-formula` test id not found.

- [ ] **Step 3: Add `formula` prop and caption to `KpiChart.tsx`**

In the `Props` interface (around line 27), add:

```typescript
formula?: string;
```

In the function signature destructuring (around line 76), add `formula = ""` to the destructured props.

After the closing `</div>` of the chart container (the `ref={containerRef}` div, around line 229), and before the final closing `</div>` of the card, add:

```tsx
{
  formula && (
    <p
      data-testid="kpi-formula"
      className="text-[10px] text-muted-foreground/60 font-mono leading-tight mt-1 truncate"
      title={formula}
    >
      {formula}
    </p>
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
git commit -m "feat(preview): add optional formula caption to KpiChart"
```

---

### Task 2: Pass formula strings from `PreviewGrid`

**Files:**

- Modify: `apps/seeder-studio/src/features/preview/PreviewGrid.tsx`
- Test: `apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

Open `apps/seeder-studio/src/features/preview/__tests__/PreviewGrid.test.tsx` and add:

```typescript
it("renders formula captions for each KPI chart", () => {
  render(<PreviewGrid />);
  // Each formula contains a unique substring — check a representative sample
  expect(screen.getByText(/DAU\(t\)/)).toBeInTheDocument();
  expect(screen.getByText(/DAU \/ MAU/)).toBeInTheDocument();
  expect(screen.getByText(/S\[k−1\] − S\[k\]/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/seeder-studio && bun run test:run -- src/features/preview/__tests__/PreviewGrid.test.tsx
```

Expected: FAIL — formula text not found in DOM.

- [ ] **Step 3: Add formula strings to each `KpiChart` in `PreviewGrid.tsx`**

In `PreviewGrid.tsx`, update each `KpiChart` call to include a `formula` prop. Replace the existing `KpiChart` calls with the versions below (keep all existing props, only add `formula`):

```tsx
<KpiChart
  title="Events/day"
  values={out.events}
  headline={stats.events}
  color="hsl(var(--chart-6))"
  className="col-span-2"
  chartHeight="h-40"
  formula="events(t) = DAU(t) × events_per_user"
  {...sharedProps}
/>
<KpiChart
  title="Active users"
  values={out.activeUsers}
  headline={stats.active}
  color="hsl(var(--chart-8))"
  formula="DAU(t) = Σ꜀ Poisson(N꜀ × S[t−c])"
  {...sharedProps}
/>
<KpiChart
  title="New users/day"
  values={out.newUsers}
  headline={stats.news}
  color="hsl(var(--chart-3))"
  formula="N꜀ = Poisson(arrivals[c])"
  {...sharedProps}
/>
<KpiChart
  title="Stickiness"
  values={out.stickiness.map((v) => (v === null ? null : v * 100))}
  headline={stats.stickiness}
  color="hsl(var(--chart-7))"
  valueSuffix="%"
  formula="DAU / MAU  (28-day window)"
  {...sharedProps}
/>
<KpiChart
  title="Total users"
  values={out.totalUsers}
  headline={`total ${formatNum(out.totalUsers.at(-1) ?? 0)}`}
  color="hsl(var(--chart-2))"
  formula="total(t) = Σ꜀≤t N꜀"
  {...sharedProps}
/>
<KpiChart
  title="Churned/day"
  values={out.churnedUsers}
  headline={stats.churned}
  color="hsl(var(--destructive))"
  formula="churn(t) = Σ꜀ Poisson(N꜀ × (S[k−1] − S[k]))"
  {...sharedProps}
/>
<KpiChart
  title="Reactivated/day"
  values={out.reactivatedUsers}
  headline={stats.reactivated}
  color="hsl(var(--chart-4))"
  formula="react(t) = Σ꜀ Poisson(churned꜀ × r × δ^(d−1))"
  {...sharedProps}
/>
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
git commit -m "feat(preview): add formula captions to all KPI charts in preview grid"
```
