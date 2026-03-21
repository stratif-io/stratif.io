import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DimensionPickerPopover } from './DimensionPickerPopover'
import { ValuePickerPopover } from './ValuePickerPopover'
import type { ZoneCol, LeafMeta } from './types'

const AGG_LABELS: Record<string, string> = {
  sum: 'Σ',
  count: 'n',
  avg: 'avg',
  min: 'min',
  max: 'max',
  countDistinct: '#',
}

interface ZoneBarProps {
  leafCols: LeafMeta[]
  rowGroups: ZoneCol[]
  pivotCols: ZoneCol[]
  valueCols: ZoneCol[]
  onRowGroupsChange: (cols: ZoneCol[]) => void
  onPivotColsChange: (cols: ZoneCol[]) => void
  onValueColsChange: (cols: ZoneCol[]) => void
}

export function ZoneBar({
  leafCols,
  rowGroups,
  pivotCols,
  valueCols,
  onRowGroupsChange,
  onPivotColsChange,
  onValueColsChange,
}: ZoneBarProps) {
  const usedIds = new Set([...rowGroups, ...pivotCols, ...valueCols].map((c) => c.colId))

  function addToZone(setter: (cols: ZoneCol[]) => void, current: ZoneCol[], colId: string) {
    const meta = leafCols.find((c) => c.colId === colId)
    if (!meta) return
    setter([...current, {
      colId: meta.colId,
      label: meta.label,
      aggFunc: meta.allowedAggFuncs?.[0] ?? 'sum',
      allowedAggFuncs: meta.allowedAggFuncs,
    }])
  }

  function removeFromZone(setter: (cols: ZoneCol[]) => void, current: ZoneCol[], colId: string) {
    setter(current.filter((c) => c.colId !== colId))
  }

  function changeAgg(colId: string, aggFunc: string) {
    onValueColsChange(valueCols.map((c) => (c.colId === colId ? { ...c, aggFunc } : c)))
  }

  return (
    <div className="border-b border-border bg-muted/20 px-4 py-2">
      <div className="flex gap-3">
        {/* Rows */}
        <Zone label="Rows">
          {rowGroups.map((col) => (
            <Chip
              key={col.colId}
              label={col.label}
              onRemove={() => removeFromZone(onRowGroupsChange, rowGroups, col.colId)}
            />
          ))}
          <DimensionPickerPopover
            leafCols={leafCols}
            usedIds={usedIds}
            canAdd={(m) => m.enableRowGroup}
            onSelect={(colId) => addToZone(onRowGroupsChange, rowGroups, colId)}
          />
        </Zone>

        {/* Columns */}
        <Zone label="Columns">
          {pivotCols.map((col) => (
            <Chip
              key={col.colId}
              label={col.label}
              onRemove={() => removeFromZone(onPivotColsChange, pivotCols, col.colId)}
            />
          ))}
          <DimensionPickerPopover
            leafCols={leafCols}
            usedIds={usedIds}
            canAdd={(m) => m.enablePivot}
            onSelect={(colId) => addToZone(onPivotColsChange, pivotCols, colId)}
          />
        </Zone>

        {/* Values */}
        <Zone label="Values">
          {valueCols.map((col) => (
            <ValueChip
              key={`${col.colId}-${col.aggFunc}`}
              col={col}
              leafCols={leafCols}
              onRemove={() => removeFromZone(onValueColsChange, valueCols, col.colId)}
              onAggChange={(agg) => changeAgg(col.colId, agg)}
            />
          ))}
          <ValuePickerPopover
            leafCols={leafCols}
            onSelect={(colId, label, aggFunc) =>
              onValueColsChange([
                ...valueCols,
                {
                  colId,
                  label,
                  aggFunc,
                  allowedAggFuncs: leafCols.find((c) => c.colId === colId)?.allowedAggFuncs,
                },
              ])
            }
          />
        </Zone>
      </div>
    </div>
  )
}

function Zone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-[36px] rounded border border-dashed border-border px-2 py-1 flex flex-wrap gap-1 items-center">
      <span className="text-xs text-muted-foreground mr-1 shrink-0">{label}</span>
      {children}
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
      {label}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-4 w-4 p-0 hover:opacity-70 hover:bg-transparent"
        aria-label={`Remove ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </Button>
    </span>
  )
}

function ValueChip({
  col,
  leafCols,
  onRemove,
  onAggChange,
}: {
  col: ZoneCol
  leafCols: LeafMeta[]
  onRemove: () => void
  onAggChange: (agg: string) => void
}) {
  const meta = leafCols.find((c) => c.colId === col.colId)
  const aggCycle = meta?.allowedAggFuncs ?? ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']
  const currentIdx = aggCycle.indexOf(col.aggFunc ?? aggCycle[0])

  function cycleAgg() {
    const next = aggCycle[(currentIdx + 1) % aggCycle.length]
    onAggChange(next)
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
      {col.label}
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleAgg}
        className="ml-0.5 h-auto px-1 py-0 text-[10px] bg-primary/20 hover:bg-primary/30"
        title="Click to cycle aggregation"
      >
        {AGG_LABELS[col.aggFunc ?? ''] ?? col.aggFunc}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-4 w-4 p-0 hover:opacity-70 hover:bg-transparent"
        aria-label={`Remove ${col.label}`}
      >
        <X className="h-2.5 w-2.5" />
      </Button>
    </span>
  )
}
