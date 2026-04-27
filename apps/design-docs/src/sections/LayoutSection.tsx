import { useState } from "react";
import { ComponentSection, ComponentRow } from "../components/ComponentSection";
import {
  PageHeader,
  SectionHeader,
  Button,
  cn,
} from "@stratif-io/design-system";

const TYPOGRAPHY = {
  tableHeader: "text-sm font-medium text-muted-foreground",
  tableCell: "text-sm text-foreground",
  tableCellMono: "text-sm font-mono",
  tableCellMuted: "text-sm text-muted-foreground tabular-nums",
  tableCellNumeric: "text-sm tabular-nums font-medium",
};

function PageTransitionDemo() {
  const [key, setKey] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <Button size="sm" variant="outline" onClick={() => setKey((k) => k + 1)}>
        Replay animation
      </Button>
      <div className="border rounded-md p-4 w-64">
        <div key={key} className="animate-in fade-in duration-300">
          <p className="text-sm text-muted-foreground">
            Page content fades in on mount.
          </p>
        </div>
      </div>
    </div>
  );
}

function LayoutDiagram() {
  return (
    <div className="border rounded-md overflow-hidden w-72 h-48 flex text-xs text-muted-foreground select-none">
      <div className="w-10 bg-muted/40 border-r flex flex-col items-center pt-3 gap-2 shrink-0">
        <div className="w-5 h-5 rounded bg-muted" />
        <div className="w-5 h-1 rounded bg-muted/60" />
        <div className="w-5 h-1 rounded bg-muted/60" />
        <div className="w-5 h-1 rounded bg-muted/60" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="h-8 border-b bg-muted/20 flex items-center px-2 gap-2 shrink-0">
          <div className="w-12 h-3 rounded bg-muted" />
          <div className="flex-1" />
          <div className="w-4 h-4 rounded bg-muted" />
        </div>
        <div className="flex-1 p-2 space-y-1.5">
          <div className="w-full h-2 rounded bg-muted/40" />
          <div className="w-3/4 h-2 rounded bg-muted/40" />
          <div className="w-1/2 h-2 rounded bg-muted/40" />
        </div>
      </div>
    </div>
  );
}

export function LayoutSection() {
  return (
    <ComponentSection id="layout" title="Layout">
      <ComponentRow label="DashboardLayout">
        <LayoutDiagram />
      </ComponentRow>

      <ComponentRow label="PageTransition">
        <PageTransitionDemo />
      </ComponentRow>

      <ComponentRow label="PageHeader — page-level h1 title">
        <PageHeader title="Analytics" />
        <PageHeader title="People" subtitle="All tracked users" />
      </ComponentRow>

      <ComponentRow label="SectionHeader — section-level h2 heading">
        <SectionHeader title="Configuration" />
        <SectionHeader title="Schema" subtitle="Define your event fields" />
      </ComponentRow>

      <ComponentRow label="Sidebar">
        <div className="border rounded-md overflow-hidden w-48 h-48 flex text-xs">
          <div className="flex flex-col w-full bg-background">
            <div className="h-10 border-b flex items-center px-3 gap-2">
              <div className="h-5 w-5 rounded bg-primary/20" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
            <nav className="flex-1 p-2 space-y-0.5">
              {["Mission Control", "Trends", "Retention"].map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md",
                    i === 0
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <div className="h-3 w-3 rounded bg-current opacity-60 shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </ComponentRow>

      <ComponentRow label="Table Typography">
        <div className="flex flex-col gap-2 w-full max-w-lg">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={`text-left px-3 py-2 ${TYPOGRAPHY.tableHeader}`}>
                  tableHeader
                </th>
                <th className={`text-left px-3 py-2 ${TYPOGRAPHY.tableHeader}`}>
                  Column B
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className={`px-3 py-2 ${TYPOGRAPHY.tableCell}`}>
                  tableCell — dimension label
                </td>
                <td className={`px-3 py-2 ${TYPOGRAPHY.tableCellNumeric}`}>
                  1,204
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className={`px-3 py-2 ${TYPOGRAPHY.tableCellMono}`}>
                  tableCellMono — usr_a1b2c3
                </td>
                <td className={`px-3 py-2 ${TYPOGRAPHY.tableCellMuted}`}>
                  tableCellMuted — 2026-04-10 18:42
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ComponentRow>
    </ComponentSection>
  );
}
