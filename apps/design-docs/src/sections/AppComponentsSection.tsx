import { ComponentSection } from "../components/ComponentSection";

export function AppComponentsSection() {
  return (
    <ComponentSection id="app" title="App Components">
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        App components (DateRangePicker, FilterSelect, DbLogo, FilterBar,
        GlobalFilters, QueryStatusIndicator) are part of the analytics app and
        not re-exported from the design system package yet.
      </div>
    </ComponentSection>
  );
}
