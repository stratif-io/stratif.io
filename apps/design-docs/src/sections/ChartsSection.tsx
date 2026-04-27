import { ComponentSection } from "../components/ComponentSection";

export function ChartsSection() {
  return (
    <ComponentSection id="charts" title="Charts">
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Chart components (AreaChart, BarChart, LineChart, DonutChart,
        FunnelChart, HeatmapChart, SparklineChart, ComparisonChart) are part of
        the analytics app and not re-exported from the design system package
        yet.
      </div>
    </ComponentSection>
  );
}
