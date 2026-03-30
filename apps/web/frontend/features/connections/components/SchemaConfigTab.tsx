import { useEffect, useRef, useState } from 'react'
import {
  Plus,
  Trash2,
  ScanSearch,
  FolderSearch,
  Lock,
  ChevronsUpDown,
  Check,
  X,
  Sparkles,
} from 'lucide-react'
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
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
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

function ColumnCombobox({
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
  const [open, setOpen] = useState(false)
  const options = Array.from(
    new Set([...(value ? [value] : []), ...detectedColumns.filter(Boolean)])
  ).sort((a, b) => (a === value ? -1 : b === value ? 1 : a.localeCompare(b)))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'h-8 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 text-sm font-mono text-left',
            'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring',
            disabled && 'opacity-50 cursor-not-allowed',
            !value && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{value || 'Select column…'}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search columns…" />
          <CommandList>
            <CommandEmpty>No column found.</CommandEmpty>
            <CommandGroup>
              {options.map((col) => (
                <CommandItem
                  key={col}
                  value={col}
                  onSelect={(v) => {
                    onChange(v)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5 shrink-0',
                      col === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {col}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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

type PendingDetection = {
  fieldKey: string
  label: string
  proposedColumn: string
}

// The five optional user identity fields in display order
const USER_IDENTITY_FIELDS = [
  { key: 'email_field' as const, label: 'Email', icon: 'Mail' },
  { key: 'first_name_field' as const, label: 'First Name', icon: 'User' },
  { key: 'last_name_field' as const, label: 'Last Name', icon: 'User' },
  { key: 'date_of_birth_field' as const, label: 'Date of Birth', icon: 'Calendar' },
  { key: 'phone_field' as const, label: 'Phone', icon: 'Phone' },
] as const

type UserIdentityKey = (typeof USER_IDENTITY_FIELDS)[number]['key']

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
  const [resurrectionWindowDays, setResurrectionWindowDays] = useState(30)
  const [powerUserThresholdDays, setPowerUserThresholdDays] = useState(4)
  const [customProps, setCustomProps] = useState<CustomProperty[]>([])
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [pendingDetections, setPendingDetections] = useState<PendingDetection[]>([])

  // Optional user identity fields — null means not mapped
  const [userIdentityFields, setUserIdentityFields] = useState<
    Record<UserIdentityKey, string | null>
  >({
    email_field: null,
    first_name_field: null,
    last_name_field: null,
    date_of_birth_field: null,
    phone_field: null,
  })

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
      setResurrectionWindowDays(data.resurrection_window_days ?? 30)
      setPowerUserThresholdDays(data.power_user_threshold_days ?? 4)
      setCustomProps(data.custom_properties)
      setUserIdentityFields({
        email_field: data.email_field ?? null,
        first_name_field: data.first_name_field ?? null,
        last_name_field: data.last_name_field ?? null,
        date_of_birth_field: data.date_of_birth_field ?? null,
        phone_field: data.phone_field ?? null,
      })
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
        resurrection_window_days: resurrectionWindowDays,
        power_user_threshold_days: powerUserThresholdDays,
        ...userIdentityFields,
      })
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userIdField,
    timestampField,
    eventNameField,
    eventsTable,
    sessionTimeoutMinutes,
    resurrectionWindowDays,
    powerUserThresholdDays,
    customProps,
    userIdentityFields,
  ])

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

  function toggleFilter(field: string, label: string, icon: string) {
    setEnabledFields((prev) => {
      const next = { ...prev }
      if (next[field]) {
        delete next[field]
      } else {
        next[field] = { label, icon }
      }
      return next
    })
  }

  function toggleEventPropFilter(field: string, label: string, categoryId?: string) {
    const cat = categoryId
      ? (dimensionCategories as DimensionCategoryConfig[]).find((c) => c.id === categoryId)
      : undefined
    toggleFilter(field, label, cat?.icon ?? 'Tag')
  }

  function setUserIdentityField(key: UserIdentityKey, value: string | null) {
    // Capture current column value before updating state
    const currentColumnValue = userIdentityFields[key]
    setUserIdentityFields((prev) => ({ ...prev, [key]: value }))
    // If clearing a field that was in filters, remove it from filters too
    if (value === null && currentColumnValue) {
      setEnabledFields((prev) => {
        const next = { ...prev }
        delete next[currentColumnValue]
        return next
      })
    }
  }

  const FIELD_LABELS: Record<string, string> = {
    user_id_field: 'User ID',
    event_name_field: 'Event Name',
    timestamp_field: 'Timestamp',
    email_field: 'Email',
    first_name_field: 'First Name',
    last_name_field: 'Last Name',
    date_of_birth_field: 'Date of Birth',
    phone_field: 'Phone',
  }

  function applyDetection(fieldKey: string, value: string) {
    if (fieldKey === 'user_id_field') setUserIdField(value)
    else if (fieldKey === 'event_name_field') setEventNameField(value)
    else if (fieldKey === 'timestamp_field') setTimestampField(value)
    else setUserIdentityField(fieldKey as UserIdentityKey, value)
  }

  function acceptDetection(fieldKey: string) {
    const pending = pendingDetections.find((d) => d.fieldKey === fieldKey)
    if (pending) {
      applyDetection(fieldKey, pending.proposedColumn)
      setPendingDetections((prev) => prev.filter((d) => d.fieldKey !== fieldKey))
    }
  }

  function acceptAllDetections() {
    for (const d of pendingDetections) {
      applyDetection(d.fieldKey, d.proposedColumn)
    }
    setPendingDetections([])
  }

  function handleDetect() {
    detect.mutate(eventsTable || undefined, {
      onSuccess(result) {
        initialized.current = true
        const { suggestions, proposed_custom_properties, events_table, columns } = result
        if (events_table) setEventsTable(events_table)

        // Build pending detections instead of auto-applying
        const pending: PendingDetection[] = []
        for (const [key, label] of Object.entries(FIELD_LABELS)) {
          const value = suggestions[key as keyof typeof suggestions] as string | null | undefined
          if (value) {
            pending.push({ fieldKey: key, label, proposedColumn: value })
          }
        }
        setPendingDetections(pending)

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

  const sortedCustomProps = [...customProps.map((prop, idx) => ({ prop, idx }))].sort((a, b) =>
    a.prop.name.localeCompare(b.prop.name)
  )

  const EVENT_GRID = 'grid-cols-[120px_1fr_90px_110px_120px_28px]'

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
                resurrection_window_days: resurrectionWindowDays,
                power_user_threshold_days: powerUserThresholdDays,
                ...userIdentityFields,
              })
            }
          />
        </div>

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

        {pendingDetections.length > 0 && (
          <div className="rounded-md border border-amber-500 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-500/40">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {pendingDetections.length} field{pendingDetections.length !== 1 ? 's' : ''} detected
                — review mappings
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  onClick={acceptAllDetections}
                >
                  Accept all
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setPendingDetections([])}
                >
                  Dismiss
                </Button>
              </div>
            </div>
            {/* Rows */}
            {pendingDetections.map((d) => (
              <div
                key={d.fieldKey}
                className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0"
              >
                <span className="w-32 text-xs text-muted-foreground shrink-0">{d.label}</span>
                <span className="flex-1 font-mono text-xs px-2 py-1 rounded border border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/10 text-foreground truncate">
                  {d.proposedColumn}
                </span>
                <button
                  type="button"
                  aria-label={`Accept ${d.label}`}
                  className="h-6 w-6 flex items-center justify-center rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                  onClick={() => acceptDetection(d.fieldKey)}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Reject ${d.label}`}
                  className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    setPendingDetections((prev) => prev.filter((p) => p.fieldKey !== d.fieldKey))
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

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

        <div className="flex items-center gap-3">
          <Label
            htmlFor="resurrection_window_days"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            Resurrection window
          </Label>
          <Input
            id="resurrection_window_days"
            type="number"
            min={1}
            max={365}
            value={resurrectionWindowDays}
            onChange={(e) => setResurrectionWindowDays(Number(e.target.value))}
            placeholder="30"
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>

        <div className="flex items-center gap-3">
          <Label
            htmlFor="power_user_threshold_days"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            Power user threshold
          </Label>
          <Input
            id="power_user_threshold_days"
            type="number"
            min={1}
            max={31}
            value={powerUserThresholdDays}
            onChange={(e) => setPowerUserThresholdDays(Number(e.target.value))}
            placeholder="4"
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">active days</span>
        </div>
      </div>

      {/* ── Section 2: User Identity ── */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">User Identity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Map columns from your events table to known user attributes
          </p>
        </div>

        <div className="rounded-md border">
          {/* Header */}
          <div className="grid grid-cols-[140px_1fr_110px_28px] gap-3 px-3 py-2 border-b bg-muted/30">
            {['Field', 'Column', 'Filter', ''].map((h) => (
              <span key={h} className="text-xs font-medium text-muted-foreground">
                {h}
              </span>
            ))}
          </div>

          {/* User ID — required, no filter, no clear */}
          <div className="grid grid-cols-[140px_1fr_110px_28px] gap-3 px-3 py-2.5 border-b items-center opacity-70">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">User ID</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                required
              </span>
            </div>
            <ColumnCombobox
              value={userIdField}
              detectedColumns={detectedColumns}
              onChange={setUserIdField}
              disabled={detectedColumns.length === 0}
            />
            <span />
            <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>

          {/* Optional user identity fields */}
          {USER_IDENTITY_FIELDS.map(({ key, label, icon }) => {
            const mapped = userIdentityFields[key]
            const isMapped = mapped !== null && mapped !== ''
            const isFilterEnabled = isMapped && mapped in enabledFields
            return (
              <div
                key={key}
                className="grid grid-cols-[140px_1fr_110px_28px] gap-3 px-3 py-2.5 border-b last:border-b-0 items-center"
              >
                <span className={cn('text-xs', !isMapped && 'text-muted-foreground')}>{label}</span>
                <ColumnCombobox
                  value={mapped ?? ''}
                  detectedColumns={detectedColumns}
                  onChange={(v) => setUserIdentityField(key, v || null)}
                />
                <div className="flex items-center">
                  {isMapped && (
                    <Checkbox
                      checked={isFilterEnabled}
                      onCheckedChange={() => toggleFilter(mapped, label, icon)}
                    />
                  )}
                </div>
                <button
                  type="button"
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive text-sm',
                    !isMapped && 'invisible'
                  )}
                  onClick={() => setUserIdentityField(key, null)}
                  aria-label={`Clear ${label}`}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 3: Event Properties ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Event Properties</h3>
          <Button size="sm" variant="outline" onClick={addProp}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Property
          </Button>
        </div>

        <div className="rounded-md border">
          {/* Column headers */}
          <div className={`grid ${EVENT_GRID} gap-3 px-3 py-2 border-b bg-muted/30`}>
            {['Field', 'Column', 'Type', 'Category', 'Global Filter', ''].map((h) => (
              <span key={h} className="text-xs font-medium text-muted-foreground">
                {h}
              </span>
            ))}
          </div>

          {/* Event Name + Timestamp — required locked rows */}
          {[
            { field: eventNameField, setField: setEventNameField, label: 'Event Name' },
            { field: timestampField, setField: setTimestampField, label: 'Timestamp' },
          ].map(({ field, setField, label }) => {
            const isEnabled = field in enabledFields
            return (
              <div
                key={label}
                className={`grid ${EVENT_GRID} gap-3 px-3 py-2.5 border-b items-center opacity-70`}
              >
                <span className="text-xs text-muted-foreground">{label}</span>
                <ColumnCombobox
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
                    onCheckedChange={() => toggleFilter(field, label, 'Tag')}
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
                className={`grid ${EVENT_GRID} gap-3 px-3 py-2 border-b last:border-b-0 items-center`}
              >
                <Input
                  value={prop.name}
                  onChange={(e) => updateProp(idx, { name: e.target.value })}
                  placeholder="campaign_source"
                  className="h-8 text-sm"
                />
                <ColumnCombobox
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
                      toggleEventPropFilter(prop.name, defaultLabel(prop.name), prop.category)
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
              No custom properties. Use &quot;Detect from Schema&quot; or add one manually.
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
