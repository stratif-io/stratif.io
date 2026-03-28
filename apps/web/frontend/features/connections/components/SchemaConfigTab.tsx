import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, ScanSearch, FolderSearch, Lock } from 'lucide-react'
import { SaveStatus } from '@/components/ui/save-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingState } from '@/components/ui/loading-state'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useSchemaConfig,
  useUpsertSchemaConfig,
  useDetectSchema,
  useFilterConfig,
  useUpsertFilterConfig,
} from '../hooks/useConnectionsData'
import { TableBrowserPicker } from './TableBrowserPicker'
import dimensionCategories from '@/config/dimension-categories.json'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import { cn } from '@/lib/utils'
import type { CustomProperty, PropertyType, DimensionCategoryConfig, FilterField } from '@/types'

const PROPERTY_TYPES: PropertyType[] = ['string', 'number', 'boolean', 'timestamp']

function defaultLabel(field: string) {
  return field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')
}

function ColumnSelect({
  value,
  detectedColumns,
  onChange,
  disabled,
}: {
  value: string
  detectedColumns: string[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const options = Array.from(new Set([value, ...detectedColumns].filter(Boolean)))
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn('h-8 text-sm font-mono', disabled && 'opacity-50 cursor-not-allowed')}
      >
        <SelectValue placeholder="Select column…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((col) => (
          <SelectItem key={col} value={col} className="font-mono text-xs">
            {col}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = (dimensionCategories as DimensionCategoryConfig[]).find((c) => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-full truncate rounded-md border border-input bg-background px-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none"
        >
          {selected ? selected.label : '— none —'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <button
          type="button"
          className="w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
          onClick={() => {
            onChange(null)
            setOpen(false)
          }}
        >
          — none —
        </button>
        {(dimensionCategories as DimensionCategoryConfig[]).map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
            onClick={() => {
              onChange(cat.id)
              setOpen(false)
            }}
          >
            {cat.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

interface Props {
  connId: string
}

export function SchemaConfigTab({ connId }: Props) {
  const { data, isLoading, isError } = useSchemaConfig(connId)
  const upsert = useUpsertSchemaConfig(connId)
  const detect = useDetectSchema(connId)
  const { data: filterData, isLoading: filterLoading } = useFilterConfig(connId)
  const upsertFilter = useUpsertFilterConfig(connId)
  const [browseOpen, setBrowseOpen] = useState(false)

  const [userIdField, setUserIdField] = useState('user_id')
  const [timestampField, setTimestampField] = useState('timestamp')
  const [eventNameField, setEventNameField] = useState('event_name')
  const [eventsTable, setEventsTable] = useState('events')
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30)
  const [customProps, setCustomProps] = useState<CustomProperty[]>([])
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])

  const [enabledFields, setEnabledFields] = useState<
    Record<string, { label: string; icon: string }>
  >({})

  const initialized = useRef(false)
  const filterInitialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    if (isLoading || isError) return
    if (data) {
      setUserIdField(data.user_id_field)
      setTimestampField(data.timestamp_field)
      setEventNameField(data.event_name_field)
      setEventsTable(data.events_table ?? 'events')
      setSessionTimeoutMinutes(data.session_timeout_minutes ?? 30)
      setCustomProps(data.custom_properties)
    }
    initialized.current = true
  }, [data, isLoading, isError])

  useEffect(() => {
    if (filterInitialized.current || filterLoading) return
    if (filterData) {
      const map: Record<string, { label: string; icon: string }> = {}
      for (const ff of filterData.filter_fields) {
        map[ff.field] = { label: ff.label, icon: ff.icon }
      }
      setEnabledFields(map)
    }
    filterInitialized.current = true
  }, [filterData, filterLoading])

  // Auto-save schema (debounced 800ms)
  useEffect(() => {
    if (!initialized.current) return
    const timer = setTimeout(() => {
      upsert.mutate({
        user_id_field: userIdField,
        timestamp_field: timestampField,
        event_name_field: eventNameField,
        events_table: eventsTable,
        custom_properties: customProps,
        session_timeout_minutes: sessionTimeoutMinutes,
      })
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdField, timestampField, eventNameField, eventsTable, sessionTimeoutMinutes, customProps])

  // Auto-save filter (debounced 600ms)
  useEffect(() => {
    if (!filterInitialized.current) return
    const timer = setTimeout(() => {
      const filter_fields: FilterField[] = Object.entries(enabledFields).map(
        ([field, { label, icon }]) => ({ field, label, icon })
      )
      upsertFilter.mutate({ filter_fields })
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledFields])

  function addProp() {
    setCustomProps((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', path: '', type: 'string', category: undefined },
    ])
  }

  function removeProp(idx: number) {
    setCustomProps((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateProp(idx: number, patch: Partial<CustomProperty>) {
    setCustomProps((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function toggleFilter(field: string, label: string, categoryId?: string) {
    setEnabledFields((prev) => {
      const next = { ...prev }
      if (next[field]) {
        delete next[field]
      } else {
        const cat = categoryId
          ? (dimensionCategories as DimensionCategoryConfig[]).find((c) => c.id === categoryId)
          : undefined
        next[field] = { label, icon: cat?.icon ?? 'Tag' }
      }
      return next
    })
  }

  function handleDetect() {
    detect.mutate(eventsTable || undefined, {
      onSuccess(result) {
        initialized.current = true
        const { suggestions, proposed_custom_properties, events_table, columns } = result
        if (suggestions.user_id_field) setUserIdField(suggestions.user_id_field)
        if (suggestions.timestamp_field) setTimestampField(suggestions.timestamp_field)
        if (suggestions.event_name_field) setEventNameField(suggestions.event_name_field)
        if (events_table) setEventsTable(events_table)
        const columnNames = columns.map((c) => c.name)
        const nestedPaths = proposed_custom_properties.map((p) => p.path)
        setDetectedColumns(Array.from(new Set([...columnNames, ...nestedPaths])))

        const existingPaths = new Set(customProps.map((p) => p.path))
        const newProps = proposed_custom_properties.filter((p) => !existingPaths.has(p.path))
        if (newProps.length > 0) {
          const allCategories = dimensionCategories as DimensionCategoryConfig[]
          const groups = groupDimensionsByCategory(
            newProps.map((p) => ({ value: p.name, label: p.name })),
            allCategories
          )
          const categoryMap = new Map<string, string>()
          for (const group of groups) {
            for (const dim of group.dimensions) {
              categoryMap.set(dim.value, group.category.id)
            }
          }
          const propsWithCategory = newProps.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            category: categoryMap.get(p.name),
          }))
          setCustomProps((prev) => [...prev, ...propsWithCategory])
        }
      },
    })
  }

  if (isLoading || filterLoading) return <LoadingState message="Loading schema config…" />

  const requiredRows = [
    { field: userIdField, setField: setUserIdField, label: 'User ID' },
    { field: timestampField, setField: setTimestampField, label: 'Timestamp' },
    { field: eventNameField, setField: setEventNameField, label: 'Event Name' },
  ]

  const sortedCustomProps = [...customProps.map((prop, idx) => ({ prop, idx }))].sort((a, b) =>
    a.prop.name.localeCompare(b.prop.name)
  )

  const TABLE_GRID = 'grid-cols-[120px_1fr_90px_110px_120px_28px]'

  return (
    <div className="space-y-8">
      {/* ── Section 1: Setup ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Setup</h3>
          <SaveStatus
            status={
              upsert.isPending
                ? 'saving'
                : upsert.isSuccess
                  ? 'saved'
                  : upsert.isError
                    ? 'error'
                    : 'idle'
            }
            onRetry={() =>
              upsert.mutate({
                user_id_field: userIdField,
                timestamp_field: timestampField,
                event_name_field: eventNameField,
                events_table: eventsTable,
                custom_properties: customProps,
                session_timeout_minutes: sessionTimeoutMinutes,
              })
            }
          />
        </div>

        {/* Events table + Detect */}
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={eventsTable}
            placeholder="events"
            className="font-mono text-sm text-muted-foreground bg-muted/40 cursor-default max-w-xs"
            onClick={() => setBrowseOpen(true)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setBrowseOpen((o) => !o)}
          >
            <FolderSearch className="h-3.5 w-3.5 mr-1.5" />
            Browse
          </Button>
          <Button size="sm" variant="outline" onClick={handleDetect} disabled={detect.isPending}>
            <ScanSearch className="h-3.5 w-3.5 mr-1.5" />
            {detect.isPending ? 'Detecting…' : 'Detect from Schema'}
          </Button>
        </div>

        {browseOpen && (
          <div className="max-w-sm">
            <TableBrowserPicker
              connId={connId}
              value={eventsTable}
              onChange={(v) => {
                setEventsTable(v)
                setBrowseOpen(false)
              }}
            />
          </div>
        )}

        {detect.isError && <p className="text-sm text-destructive">{detect.error?.message}</p>}

        {/* Session timeout */}
        <div className="flex items-center gap-3">
          <Label
            htmlFor="session_timeout_minutes"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            Session timeout
          </Label>
          <Input
            id="session_timeout_minutes"
            type="number"
            min={1}
            max={1440}
            value={sessionTimeoutMinutes}
            onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
            placeholder="30"
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
      </div>

      {/* ── Section 2: Properties ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Properties</h3>
          <Button size="sm" variant="outline" onClick={addProp}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Property
          </Button>
        </div>

        <div className="rounded-md border">
          {/* Column headers */}
          <div className={`grid ${TABLE_GRID} gap-3 px-3 py-2 border-b bg-muted/30`}>
            {['Field', 'Column', 'Type', 'Category', 'Add to Global Filters', ''].map((h) => (
              <span key={h} className="text-xs font-medium text-muted-foreground">
                {h}
              </span>
            ))}
          </div>

          {/* Required field rows */}
          {requiredRows.map(({ field, setField, label }) => {
            const isEnabled = field in enabledFields
            return (
              <div
                key={label}
                className={`grid ${TABLE_GRID} gap-3 px-3 py-2.5 border-b last:border-b-0 items-center opacity-70`}
              >
                <span className="text-xs text-muted-foreground">{label}</span>
                <ColumnSelect
                  value={field}
                  detectedColumns={detectedColumns}
                  onChange={setField}
                  disabled={detectedColumns.length === 0}
                />
                <span className="text-xs text-muted-foreground/50">—</span>
                <span className="text-xs text-muted-foreground/50">—</span>
                <div className="flex items-center">
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={() => toggleFilter(field, label)}
                  />
                </div>
                <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
            )
          })}

          {/* Dashed divider */}
          {sortedCustomProps.length > 0 && <div className="border-t border-dashed" />}

          {/* Custom property rows */}
          {sortedCustomProps.map(({ prop, idx }) => {
            const isEnabled = prop.name in enabledFields
            return (
              <div
                key={prop.id ?? String(idx)}
                className={`grid ${TABLE_GRID} gap-3 px-3 py-2 border-b last:border-b-0 items-center`}
              >
                <Input
                  value={prop.name}
                  onChange={(e) => updateProp(idx, { name: e.target.value })}
                  placeholder="campaign_source"
                  className="h-8 text-sm"
                />
                <ColumnSelect
                  value={prop.path}
                  detectedColumns={detectedColumns}
                  onChange={(v) => updateProp(idx, { path: v })}
                  disabled={detectedColumns.length === 0}
                />
                <Select
                  value={prop.type}
                  onValueChange={(v) => updateProp(idx, { type: v as PropertyType })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CategoryPicker
                  value={prop.category ?? null}
                  onChange={(cat) => updateProp(idx, { category: cat ?? undefined })}
                />
                <div className="flex items-center">
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={() =>
                      toggleFilter(prop.name, defaultLabel(prop.name), prop.category)
                    }
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeProp(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}

          {/* Empty state */}
          {sortedCustomProps.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No custom properties. Use "Detect from Schema" or add one manually.
            </div>
          )}
        </div>

        {(upsert.isError || upsertFilter.isError) && (
          <p className="text-sm text-destructive">
            {upsert.error?.message ?? upsertFilter.error?.message}
          </p>
        )}
      </div>
    </div>
  )
}
