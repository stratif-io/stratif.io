import { QUERY_STALE_TIME } from '@/lib/constants'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, X, Plus, Filter } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { fetchPivotGridFilterValues } from '@/lib/api'
import { FilterSelect } from '@/components/FilterSelect'

interface Dimension {
  value: string
  label: string
}

// ── Per-row value select (own query, avoids conditional hook call) ────────────

function FilterRowValueSelect({
  field,
  connectionId,
  selected,
  onChange,
}: {
  field: string
  connectionId: string | undefined
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['trend-filter-values', field, connectionId],
    queryFn: () =>
      fetchPivotGridFilterValues(
        { field, connection_id: connectionId },
        { meta: { cardName: 'Dimension Values', querySnippet: field, auxiliary: true } }
      ),
    staleTime: QUERY_STALE_TIME.default,
  })

  const options = (data?.values ?? [])
    .map(String)
    .filter(Boolean)
    .map((v) => ({ value: v, label: v }))

  return (
    <FilterSelect
      mode="multi"
      searchable={true}
      value={selected}
      onChange={(v) => onChange(v as string[])}
      options={options}
      isLoading={isLoading}
      size="sm"
      className="rounded-r-md rounded-l-none border-l-0"
    />
  )
}

// ── Main TrendFilters ───────────────────────────────────────────────────────

interface FilterRow {
  field: string
  values: string[]
}

interface TrendFiltersProps {
  dimensions: Dimension[]
  filters: Record<string, string[]>
  connectionId: string | undefined
  onChange: (filters: Record<string, string[]>) => void
  compact?: boolean
}

export function TrendFilters({
  dimensions,
  filters,
  connectionId,
  onChange,
  compact = false,
}: TrendFiltersProps) {
  const [open, setOpen] = useState(false)

  const rows: FilterRow[] = Object.entries(filters).map(([field, values]) => ({ field, values }))
  const activeCount = rows.filter((r) => r.values.length > 0).length
  const usedFields = rows.map((r) => r.field)

  function addRow() {
    const next = dimensions.find((d) => !usedFields.includes(d.value))
    if (!next) return
    onChange({ ...filters, [next.value]: [] })
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && rows.length === 0) addRow()
  }

  function removeRow(field: string) {
    const next = { ...filters }
    delete next[field]
    onChange(next)
  }

  function updateValues(field: string, values: string[]) {
    onChange({ ...filters, [field]: values })
  }

  function changeField(oldField: string, newField: string) {
    const next: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(filters)) {
      next[k === oldField ? newField : k] = v
    }
    onChange(next)
  }

  if (dimensions.length === 0) return null

  // ── Compact mode: chips + inline expand ───────────────────────────────────
  if (compact) {
    return (
      <div className="relative flex flex-wrap items-center gap-1.5">
        {rows
          .filter((r) => r.values.length > 0)
          .map((row) => {
            const label = dimensions.find((d) => d.value === row.field)?.label ?? row.field
            return (
              <span
                key={row.field}
                className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2 py-0.5 text-xs"
              >
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-medium">{row.values.join(', ')}</span>
                <button
                  type="button"
                  className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => removeRow(row.field)}
                  aria-label={`Remove ${label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        <Collapsible open={open} onOpenChange={handleOpenChange}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-input px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              aria-label="+ Filter"
            >
              <Plus className="h-3 w-3" />
              Filter
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="absolute z-10 mt-1 rounded-md border border-input bg-background p-2 shadow-md flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.field} className="flex items-center gap-2">
                  <FilterSelect
                    mode="single"
                    tree={true}
                    size="sm"
                    value={row.field}
                    onChange={(v) => changeField(row.field, v as string)}
                    options={dimensions
                      .filter((d) => d.value === row.field || !usedFields.includes(d.value))
                      .map((d) => ({ value: d.value, label: d.label }))}
                    className="w-40 rounded-l-md rounded-r-none"
                  />
                  <FilterRowValueSelect
                    field={row.field}
                    connectionId={connectionId}
                    selected={row.values}
                    onChange={(values) => updateValues(row.field, values)}
                  />
                  <button
                    className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => removeRow(row.field)}
                    aria-label="Remove filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {dimensions.length > usedFields.length && (
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
                  onClick={addRow}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add filter
                </button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.field} className="flex items-center gap-2">
              <FilterSelect
                mode="single"
                tree={true}
                size="sm"
                value={row.field}
                onChange={(v) => changeField(row.field, v as string)}
                options={dimensions
                  .filter((d) => d.value === row.field || !usedFields.includes(d.value))
                  .map((d) => ({ value: d.value, label: d.label }))}
                className="w-48 rounded-l-md rounded-r-none"
              />
              <FilterRowValueSelect
                field={row.field}
                connectionId={connectionId}
                selected={row.values}
                onChange={(values) => updateValues(row.field, values)}
              />
              <button
                className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => removeRow(row.field)}
                aria-label="Remove filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {dimensions.length > usedFields.length && (
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
              onClick={addRow}
            >
              <Plus className="h-3.5 w-3.5" />
              Add filter
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
