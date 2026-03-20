import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, X, Plus, Filter } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { fetchPivotGridFilterValues } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Dimension {
  value: string
  label: string
}

// ── Value multi-select ──────────────────────────────────────────────────────

function ValueMultiSelect({
  dimension,
  selected,
  connectionId,
  onChange,
}: {
  dimension: Dimension
  selected: string[]
  connectionId: string | undefined
  onChange: (values: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['trend-filter-values', dimension.value, connectionId],
    queryFn: () => fetchPivotGridFilterValues({ field: dimension.value, connection_id: connectionId }),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  const options = (data?.values ?? []).map(String).filter(Boolean)
  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options

  function toggle(val: string) {
    onChange(
      selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]
    )
  }

  const label =
    selected.length === 0
      ? 'Any value'
      : selected.length === 1
      ? selected[0]
      : `${selected.length} values`

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch('') }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'h-7 flex items-center gap-1 px-2.5 rounded-r-md text-xs font-medium border border-l-0 transition-colors',
            selected.length > 0
              ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
              : 'border-border text-muted-foreground hover:bg-accent/60'
          )}
        >
          <span className="max-w-[140px] truncate">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            ref={inputRef}
            placeholder={`Search…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          <div className="p-1">
            {isLoading ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">No results</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm truncate flex items-center gap-2',
                    'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                    selected.includes(opt) && 'font-medium'
                  )}
                  onClick={() => toggle(opt)}
                >
                  <span
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 rounded-sm border',
                      selected.includes(opt)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/40'
                    )}
                  />
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
        {selected.length > 0 && (
          <div className="p-2 border-t">
            <button
              className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
              onClick={() => onChange([])}
            >
              Clear selection
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── Dimension picker ────────────────────────────────────────────────────────

function DimensionSelect({
  dimensions,
  value,
  usedFields,
  onChange,
}: {
  dimensions: Dimension[]
  value: string
  usedFields: string[]
  onChange: (field: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const available = dimensions.filter(
    (d) => d.value === value || !usedFields.includes(d.value)
  )
  const filtered = search
    ? available.filter((d) => d.label.toLowerCase().includes(search.toLowerCase()))
    : available

  const current = dimensions.find((d) => d.value === value)

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch('') }}>
      <PopoverTrigger asChild>
        <button
          className="h-7 flex items-center gap-1 px-2.5 rounded-l-md text-xs font-medium border border-border text-foreground bg-muted/40 hover:bg-accent/60 transition-colors"
        >
          <span>{current?.label ?? 'Dimension'}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          <div className="p-1">
            {filtered.map((d) => (
              <button
                key={d.value}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-sm truncate',
                  'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                  d.value === value && 'bg-accent font-medium'
                )}
                onClick={() => { onChange(d.value); setOpen(false); setSearch('') }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
}

export function TrendFilters({ dimensions, filters, connectionId, onChange }: TrendFiltersProps) {
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

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{activeCount}</Badge>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.field} className="flex items-center gap-2">
              <DimensionSelect
                dimensions={dimensions}
                value={row.field}
                usedFields={usedFields}
                onChange={(newField) => changeField(row.field, newField)}
              />
              <ValueMultiSelect
                dimension={dimensions.find((d) => d.value === row.field) ?? { value: row.field, label: row.field }}
                selected={row.values}
                connectionId={connectionId}
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
