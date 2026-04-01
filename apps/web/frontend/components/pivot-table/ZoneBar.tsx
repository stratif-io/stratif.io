import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterSelect } from '@/components/FilterSelect'
import { AggBadge } from '@/components/AggBadge'
import { ValuePickerPopover } from './ValuePickerPopover'
import type { ZoneCol, LeafMeta } from './types'

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
    setter([
      ...current,
      {
        colId: meta.colId,
        label: meta.label,
        aggFunc: meta.allowedAggFuncs?.[0] ?? 'sum',
        allowedAggFuncs: meta.allowedAggFuncs,
      },
    ])
  }

  function removeFromZone(setter: (cols: ZoneCol[]) => void, current: ZoneCol[], colId: string) {
    setter(current.filter((c) => c.colId !== colId))
  }

  function changeAgg(colId: string, aggFunc: string) {
    onValueColsChange(valueCols.map((c) => (c.colId === colId ? { ...c, aggFunc } : c)))
  }

  function makeDimOptions(canAdd: (m: LeafMeta) => boolean) {
    return leafCols
      .filter(canAdd)
      .map((c) => ({ value: c.colId, label: c.label, disabled: usedIds.has(c.colId) }))
  }

  const addTrigger = (
    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Add">
      <Plus className="h-3 w-3" />
    </Button>
  )

  return (
    <div className="border-b border-border bg-muted/20 px-4 py-2">
      <div className="flex border border-border rounded-md bg-background overflow-hidden">
        <ZoneSection label="Rows">
          {rowGroups.map((col) => (
            <Chip
              key={col.colId}
              label={col.label}
              onRemove={() => removeFromZone(onRowGroupsChange, rowGroups, col.colId)}
            />
          ))}
          <FilterSelect
            mode="single"
            tree
            options={makeDimOptions((m) => m.enableRowGroup)}
            value={null}
            onChange={(colId) => addToZone(onRowGroupsChange, rowGroups, colId as string)}
            triggerContent={addTrigger}
          />
        </ZoneSection>

        <div className="w-px bg-border shrink-0" />

        <ZoneSection label="Columns">
          {pivotCols.map((col) => (
            <Chip
              key={col.colId}
              label={col.label}
              onRemove={() => removeFromZone(onPivotColsChange, pivotCols, col.colId)}
            />
          ))}
          <FilterSelect
            mode="single"
            tree
            options={makeDimOptions((m) => m.enablePivot)}
            value={null}
            onChange={(colId) => addToZone(onPivotColsChange, pivotCols, colId as string)}
            triggerContent={addTrigger}
          />
        </ZoneSection>

        <div className="w-px bg-border shrink-0" />

        <ZoneSection label="Values">
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
        </ZoneSection>
      </div>
    </div>
  )
}

function ZoneSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 px-3 py-2 flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1 items-center">{children}</div>
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-foreground">
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

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-foreground">
      {col.label}
      <AggBadge
        aggFunc={col.aggFunc ?? 'sum'}
        allowedAggFuncs={aggCycle}
        onAggChange={onAggChange}
      />
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
