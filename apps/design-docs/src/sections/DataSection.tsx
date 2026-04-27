import { ComponentSection } from "../components/ComponentSection";

export function DataSection() {
  return (
    <ComponentSection id="data" title="Data Display">
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Data components (DataTable, EventsTable, PivotTable, VirtualList,
        Pagination) are part of the analytics app and not re-exported from the
        design system package yet.
      </div>
    </ComponentSection>
  );
}
