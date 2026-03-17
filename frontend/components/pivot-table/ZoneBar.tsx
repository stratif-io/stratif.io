import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ZoneCol, LeafMeta } from './types'

const DEFAULT_AGG_CYCLE = ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']
const AGG_LABELS: Record<string, string> = {
  sum: 'Σ', count: 'n', avg: 'avg', min: 'min', max: 'max', countDistinct: '#',
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

type ZoneName = 'rowGroups' | 'pivotCols' | 'valueCols'

export function ZoneBar({
  leafCols, rowGroups, pivotCols, valueCols,
  onRowGroupsChange, onPivotColsChange, onValueColsChange,
}: ZoneBarProps) {
  const [dragging, setDragging] = useState<{ colId: string; from: ZoneName | 'picker' } | null>(null)

  const usedIds = new Set([...rowGroups, ...pivotCols, ...valueCols].map((c) => c.colId))
  const available = leafCols.filter((c) => !usedIds.has(c.colId))

  function getZone(name: ZoneName) {
    if (name === 'rowGroups') return { cols: rowGroups, setter: onRowGroupsChange, canAdd: (m: LeafMeta) => m.enableRowGroup }
    if (name === 'pivotCols') return { cols: pivotCols, setter: onPivotColsChange, canAdd: (m: LeafMeta) => m.enablePivot }
    return { cols: valueCols, setter: onValueColsChange, canAdd: (m: LeafMeta) => m.enableValue }
  }

  function removeFromZone(name: ZoneName, colId: string) {
    const { cols, setter } = getZone(name)
    setter(cols.filter((c) => c.colId !== colId))
  }

  function addToZone(name: ZoneName, meta: LeafMeta) {
    const { cols, setter, canAdd } = getZone(name)
    if (!canAdd(meta)) return
    if (cols.some((c) => c.colId === meta.colId)) return // guard against duplicates
    setter([...cols, {
      colId: meta.colId,
      label: meta.label,
      aggFunc: meta.allowedAggFuncs?.[0] ?? 'sum',
      allowedAggFuncs: meta.allowedAggFuncs,
    }])
  }

  function handleDrop(e: React.DragEvent, targetZone: ZoneName) {
    e.preventDefault()
    if (!dragging) return
    const meta = leafCols.find((c) => c.colId === dragging.colId)
    if (!meta) return
    if (dragging.from !== 'picker') removeFromZone(dragging.from, dragging.colId)
    addToZone(targetZone, meta)
    setDragging(null)
  }

  function cycleAggFunc(colId: string) {
    const col = valueCols.find((c) => c.colId === colId)
    if (!col) return
    const cycle = col.allowedAggFuncs ?? DEFAULT_AGG_CYCLE
    const idx = cycle.indexOf(col.aggFunc ?? cycle[0])
    const next = cycle[(idx + 1) % cycle.length]
    onValueColsChange(valueCols.map((c) => c.colId === colId ? { ...c, aggFunc: next } : c))
  }

  return (
    <div className="border-b border-border bg-muted/20 px-4 py-2 space-y-2">
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1">Available:</span>
          {available.map((col) => (
            <span
              key={col.colId}
              draggable
              onDragStart={() => setDragging({ colId: col.colId, from: 'picker' })}
              className="text-xs px-2 py-0.5 rounded border border-border bg-background cursor-grab active:cursor-grabbing hover:bg-accent/50"
            >
              {col.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        {(['rowGroups', 'pivotCols', 'valueCols'] as ZoneName[]).map((zoneName) => {
          const labels: Record<ZoneName, string> = { rowGroups: 'Rows', pivotCols: 'Columns', valueCols: 'Values' }
          const { cols } = getZone(zoneName)
          return (
            <div
              key={zoneName}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, zoneName)}
              className={cn(
                'flex-1 min-h-[36px] rounded border border-dashed border-border px-2 py-1 flex flex-wrap gap-1 items-center transition-colors',
                dragging && 'border-primary/40 bg-primary/5',
              )}
            >
              <span className="text-xs text-muted-foreground mr-1 shrink-0">{labels[zoneName]}:</span>
              {cols.map((col) => (
                <span
                  key={col.colId}
                  draggable
                  onDragStart={() => setDragging({ colId: col.colId, from: zoneName })}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary cursor-grab"
                >
                  {col.label}
                  {zoneName === 'valueCols' && col.aggFunc && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleAggFunc(col.colId) }}
                      className="ml-0.5 px-1 rounded text-[10px] bg-primary/20 hover:bg-primary/30"
                      title="Click to cycle agg function"
                    >
                      {AGG_LABELS[col.aggFunc] ?? col.aggFunc}
                    </button>
                  )}
                  <button
                    onClick={() => removeFromZone(zoneName, col.colId)}
                    className="hover:opacity-70"
                    aria-label={`Remove ${col.label}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {cols.length === 0 && (
                <span className="text-xs text-muted-foreground/50 italic">drag here</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
