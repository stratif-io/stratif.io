import { useState } from 'react'
import { ComponentSection, ComponentRow } from '../ComponentSection'
import { PageTransition } from '@/components/layout/PageTransition'
import { ConnectionSelector } from '@/components/layout/ConnectionSelector'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TYPOGRAPHY } from '@/lib/constants'

function PageTransitionDemo() {
  const [key, setKey] = useState(0)
  return (
    <div className="flex flex-col gap-3">
      <Button size="sm" variant="outline" onClick={() => setKey((k) => k + 1)}>
        Replay animation
      </Button>
      <div className="border rounded-md p-4 w-64">
        <PageTransition key={key}>
          <p className="text-sm text-muted-foreground">Page content fades in on mount.</p>
        </PageTransition>
      </div>
    </div>
  )
}

function LayoutDiagram() {
  return (
    <div className="border rounded-md overflow-hidden w-72 h-48 flex text-xs text-muted-foreground select-none">
      {/* Sidebar */}
      <div className="w-10 bg-muted/40 border-r flex flex-col items-center pt-3 gap-2 shrink-0">
        <div className="w-5 h-5 rounded bg-muted" />
        <div className="w-5 h-1 rounded bg-muted/60" />
        <div className="w-5 h-1 rounded bg-muted/60" />
        <div className="w-5 h-1 rounded bg-muted/60" />
      </div>
      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="h-8 border-b bg-muted/20 flex items-center px-2 gap-2 shrink-0">
          <div className="w-12 h-3 rounded bg-muted" />
          <div className="flex-1" />
          <div className="w-4 h-4 rounded bg-muted" />
        </div>
        {/* Content */}
        <div className="flex-1 p-2 space-y-1.5">
          <div className="w-full h-2 rounded bg-muted/40" />
          <div className="w-3/4 h-2 rounded bg-muted/40" />
          <div className="w-1/2 h-2 rounded bg-muted/40" />
        </div>
      </div>
    </div>
  )
}

export function LayoutSection() {
  return (
    <ComponentSection id="layout" title="Layout">
      <ComponentRow label="DashboardLayout">
        <LayoutDiagram />
      </ComponentRow>

      <ComponentRow label="Header">
        <div
          className={cn(
            'border rounded-md overflow-hidden w-full max-w-xl',
            '[&_header]:static [&_header]:z-auto'
          )}
        >
          {/* Rendered inline — position:sticky is neutralised by overflow:hidden */}
          <div className="relative overflow-hidden rounded-md border">
            <div className="flex h-14 items-center gap-3 px-4 bg-background border-b">
              <div className="h-8 w-32 rounded border flex items-center gap-1.5 px-2">
                <div className="h-3.5 w-3.5 rounded bg-muted" />
                <div className="flex-1 h-2 rounded bg-muted" />
              </div>
              <div className="flex-1 min-w-0 h-8 rounded border bg-muted/20" />
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-7 w-7 rounded border bg-muted/20" />
                <div className="h-7 w-7 rounded border bg-muted/20" />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-3 py-2">
            Shown above as a structural preview. The live Header renders in the app shell at the top
            of every page.
          </p>
        </div>
      </ComponentRow>

      <ComponentRow label="Sidebar">
        <div className="border rounded-md overflow-hidden w-48 h-48 flex text-xs">
          <div className="flex flex-col w-full bg-background">
            <div className="h-10 border-b flex items-center px-3 gap-2">
              <div className="h-5 w-5 rounded bg-primary/20" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
            <nav className="flex-1 p-2 space-y-0.5">
              {['Mission Control', 'Trends', 'Retention'].map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md',
                    i === 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
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

      <ComponentRow label="PageTransition">
        <PageTransitionDemo />
      </ComponentRow>

      <ComponentRow label="ConnectionSelector">
        <ConnectionSelector />
      </ComponentRow>

      <ComponentRow label="Table Typography">
        <div className="flex flex-col gap-2 w-full max-w-lg">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={`text-left px-3 py-2 ${TYPOGRAPHY.tableHeader}`}>tableHeader</th>
                <th className={`text-left px-3 py-2 ${TYPOGRAPHY.tableHeader}`}>Column B</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className={`px-3 py-2 ${TYPOGRAPHY.tableCell}`}>tableCell — dimension label</td>
                <td className={`px-3 py-2 ${TYPOGRAPHY.tableCellNumeric}`}>1,204</td>
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
  )
}
