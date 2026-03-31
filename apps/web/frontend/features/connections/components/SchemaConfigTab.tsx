import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  Trash2,
  ScanSearch,
  FolderSearch,
  ChevronsUpDown,
  Check,
  ChevronDown,
  Search,
  X,
  Sparkles,
} from 'lucide-react'
import { SaveStatus } from '@/components/ui/save-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

// ── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES: PropertyType[] = ['string', 'number', 'boolean', 'timestamp']

const EVENT_GRID = 'grid-cols-[1fr_1fr_80px_28px_56px_28px]'

const USER_IDENTITY_FIELDS = [
  { key: 'email_field' as const, label: 'Email', icon: 'Mail' },
  { key: 'first_name_field' as const, label: 'First Name', icon: 'User' },
  { key: 'last_name_field' as const, label: 'Last Name', icon: 'User' },
  { key: 'date_of_birth_field' as const, label: 'Date of Birth', icon: 'Calendar' },
  { key: 'phone_field' as const, label: 'Phone', icon: 'Phone' },
] as const

type UserIdentityKey = (typeof USER_IDENTITY_FIELDS)[number]['key']

const FIELD_LABELS: Record<string, string> = {
  user_id_field: 'User ID',
  event_name_field: 'Event Name',
  timestamp_field: 'Timestamp',
  ...Object.fromEntries(USER_IDENTITY_FIELDS.map(({ key, label }) => [key, label])),
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PendingDetection = {
  fieldKey: string
  label: string
  proposedColumn: string
}

type SchemaFormState = {
  userIdField: string
  timestampField: string
  eventNameField: string
  eventsTable: string
  sessionTimeoutMinutes: number
  resurrectionWindowDays: number
  powerUserThresholdDays: number
  customProps: CustomProperty[]
  userIdentityFields: Record<UserIdentityKey, string | null>
}

const DEFAULT_FORM: SchemaFormState = {
  userIdField: 'user_id',
  timestampField: 'timestamp',
  eventNameField: 'event_name',
  eventsTable: 'events',
  sessionTimeoutMinutes: 30,
  resurrectionWindowDays: 30,
  powerUserThresholdDays: 4,
  customProps: [],
  userIdentityFields: {
    email_field: null,
    first_name_field: null,
    last_name_field: null,
    date_of_birth_field: null,
    phone_field: null,
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function defaultLabel(field: string) {
  return field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')
}

function ColumnCombobox({
  value,
  detectedColumns,
  onChange,
}: {
  value: string
  detectedColumns: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const options = Array.from(
    new Set([...(value ? [value] : []), ...detectedColumns.filter(Boolean)])
  ).sort((a, b) => (a === value ? -1 : b === value ? 1 : a.localeCompare(b)))

  const trimmed = search.trim()
  const showCreate =
    trimmed.length > 0 && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase())

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-8 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 text-sm font-mono text-left',
            'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring',
            !value && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{value || 'Select column…'}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type column…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!showCreate && options.length === 0 && (
              <CommandEmpty>Type a column name to set it.</CommandEmpty>
            )}
            {!showCreate && options.length > 0 && <CommandEmpty>No column found.</CommandEmpty>}
            {showCreate && (
              <CommandGroup>
                <CommandItem value={trimmed} onSelect={() => select(trimmed)}>
                  <Check className="mr-2 h-3.5 w-3.5 shrink-0 opacity-0" />
                  Use &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((col) => (
                <CommandItem key={col} value={col} onSelect={() => select(col)}>
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

function CompactCategoryButton({
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
          title={selected ? selected.label : 'No category'}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded border border-input text-xs font-medium hover:bg-accent transition-colors',
            value ? 'text-foreground' : 'text-muted-foreground/40'
          )}
        >
          {selected ? selected.label.charAt(0).toUpperCase() : '—'}
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

function PendingDetectionRow({
  pending,
  onAccept,
  onReject,
}: {
  pending: PendingDetection
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex-1 h-8 font-mono text-sm px-3 rounded-md border border-amber-400/60 bg-amber-50 dark:bg-amber-950/20 text-foreground truncate flex items-center">
        {pending.proposedColumn}
      </span>
      <button
        aria-label={`Accept ${pending.label}`}
        onClick={onAccept}
        className="h-6 w-6 flex items-center justify-center rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        aria-label={`Reject ${pending.label}`}
        onClick={onReject}
        className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function FilterToggle({
  enabled,
  onToggle,
  invisible,
  label,
}: {
  enabled: boolean
  onToggle: () => void
  invisible?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        enabled ? `Remove ${label} from global filters` : `Add ${label} to global filters`
      }
      className={cn('flex items-center gap-1.5 shrink-0 group', invisible && 'invisible')}
    >
      <span
        className={cn(
          'text-[9px] font-medium transition-colors',
          enabled
            ? 'text-teal-600 dark:text-teal-400'
            : 'text-muted-foreground/40 group-hover:text-muted-foreground/70'
        )}
      >
        filter
      </span>
      <span
        className={cn(
          'relative inline-flex w-6 h-3.5 rounded-full transition-colors shrink-0',
          enabled
            ? 'bg-teal-600 dark:bg-teal-500'
            : 'bg-muted-foreground/20 group-hover:bg-muted-foreground/30'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform',
            enabled ? 'translate-x-[11px]' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  )
}

function SectionHeader({
  title,
  open,
  onToggle,
  hint,
  action,
}: {
  title: string
  open: boolean
  onToggle: () => void
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 transition-colors text-left',
        open
          ? 'bg-teal-50 dark:bg-teal-950/20 hover:bg-teal-100/60 dark:hover:bg-teal-950/30'
          : 'bg-muted/20 hover:bg-muted/30'
      )}
    >
      <ChevronDown
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
          open ? 'text-teal-700 dark:text-teal-400' : 'text-muted-foreground',
          !open && '-rotate-90'
        )}
      />
      <span
        className={cn(
          'text-xs font-semibold flex-1',
          open ? 'text-teal-900 dark:text-teal-200' : 'text-muted-foreground'
        )}
      >
        {title}
      </span>
      {!open && hint && (
        <span className="text-xs text-muted-foreground font-normal font-mono">{hint}</span>
      )}
      {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

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
  const [openSections, setOpenSections] = useState({
    fields: true,
    identity: false,
    properties: true,
    advanced: false,
  })
  const [propSearch, setPropSearch] = useState('')

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  const [form, setForm] = useState<SchemaFormState>(DEFAULT_FORM)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [pendingDetections, setPendingDetections] = useState<PendingDetection[]>([])
  const [enabledFields, setEnabledFields] = useState<
    Record<string, { label: string; icon: string }>
  >({})

  // Refs prevent the auto-save effects from firing before server data has been
  // loaded into local state for the first time.
  const initialized = useRef(false)
  const filterInitialized = useRef(false)

  useEffect(() => {
    if (initialized.current || isLoading || isError) return
    if (data) {
      setForm({
        userIdField: data.user_id_field,
        timestampField: data.timestamp_field,
        eventNameField: data.event_name_field,
        eventsTable: data.events_table ?? 'events',
        sessionTimeoutMinutes: data.session_timeout_minutes ?? 30,
        resurrectionWindowDays: data.resurrection_window_days ?? 30,
        powerUserThresholdDays: data.power_user_threshold_days ?? 4,
        customProps: data.custom_properties,
        userIdentityFields: {
          email_field: data.email_field ?? null,
          first_name_field: data.first_name_field ?? null,
          last_name_field: data.last_name_field ?? null,
          date_of_birth_field: data.date_of_birth_field ?? null,
          phone_field: data.phone_field ?? null,
        },
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

  // Auto-save schema (debounced 800ms).
  // `upsert` is intentionally omitted from deps — it changes on every mutation
  // state transition and would cause an infinite save loop if included.
  useEffect(() => {
    if (!initialized.current) return
    const timer = setTimeout(() => upsert.mutate(buildSavePayload(form)), 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  // Auto-save filter (debounced 600ms). Same reasoning for omitting upsertFilter.
  useEffect(() => {
    if (!filterInitialized.current) return
    const filter_fields: FilterField[] = Object.entries(enabledFields).map(
      ([field, { label, icon }]) => ({ field, label, icon })
    )
    const timer = setTimeout(() => upsertFilter.mutate({ filter_fields }), 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledFields])

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function updateForm(patch: Partial<SchemaFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function addProp() {
    updateForm({
      customProps: [
        ...form.customProps,
        { id: crypto.randomUUID(), name: '', path: '', type: 'string', category: undefined },
      ],
    })
  }

  function removeProp(idx: number) {
    updateForm({ customProps: form.customProps.filter((_, i) => i !== idx) })
  }

  function updateProp(idx: number, patch: Partial<CustomProperty>) {
    updateForm({
      customProps: form.customProps.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    })
  }

  function setUserIdentityField(key: UserIdentityKey, value: string | null) {
    const previous = form.userIdentityFields[key]
    setForm((prev) => ({
      ...prev,
      userIdentityFields: { ...prev.userIdentityFields, [key]: value },
    }))
    if (value === null && previous) {
      setEnabledFields((prev) => {
        const next = { ...prev }
        delete next[previous]
        return next
      })
    }
  }

  function applyDetection(fieldKey: string, value: string) {
    const dispatch: Record<string, (v: string) => void> = {
      user_id_field: (v) => updateForm({ userIdField: v }),
      event_name_field: (v) => updateForm({ eventNameField: v }),
      timestamp_field: (v) => updateForm({ timestampField: v }),
      ...Object.fromEntries(
        USER_IDENTITY_FIELDS.map(({ key }) => [key, (v: string) => setUserIdentityField(key, v)])
      ),
    }
    dispatch[fieldKey]?.(value)
  }

  function acceptDetection(fieldKey: string) {
    const pending = pendingDetections.find((d) => d.fieldKey === fieldKey)
    if (!pending) return
    applyDetection(fieldKey, pending.proposedColumn)
    setPendingDetections((prev) => prev.filter((d) => d.fieldKey !== fieldKey))
  }

  function rejectDetection(fieldKey: string) {
    setPendingDetections((prev) => prev.filter((d) => d.fieldKey !== fieldKey))
  }

  function acceptAllDetections() {
    const identityKeys = new Set(USER_IDENTITY_FIELDS.map((f) => f.key as string))
    const hasIdentity = pendingDetections.some((d) => identityKeys.has(d.fieldKey))
    if (hasIdentity) setOpenSections((prev) => ({ ...prev, identity: true }))
    for (const d of pendingDetections) applyDetection(d.fieldKey, d.proposedColumn)
    setPendingDetections([])
  }

  function toggleFilter(field: string, label: string, icon: string) {
    setEnabledFields((prev) => {
      const next = { ...prev }
      if (next[field]) delete next[field]
      else next[field] = { label, icon }
      return next
    })
  }

  function toggleEventPropFilter(field: string, label: string, categoryId?: string) {
    const cat = categoryId
      ? (dimensionCategories as DimensionCategoryConfig[]).find((c) => c.id === categoryId)
      : undefined
    toggleFilter(field, label, cat?.icon ?? 'Tag')
  }

  function handleDetect() {
    detect.mutate(form.eventsTable || undefined, {
      onSuccess(result) {
        const { suggestions, proposed_custom_properties, events_table, columns } = result
        if (events_table) updateForm({ eventsTable: events_table })

        const pending: PendingDetection[] = []
        for (const [key, label] of Object.entries(FIELD_LABELS)) {
          const value = suggestions[key as keyof typeof suggestions] as string | null | undefined
          if (value) pending.push({ fieldKey: key, label, proposedColumn: value })
        }
        setPendingDetections(pending)

        const columnNames = columns.map((c: { name: string }) => c.name)
        const nestedPaths = proposed_custom_properties.map((p: { path: string }) => p.path)
        setDetectedColumns(Array.from(new Set([...columnNames, ...nestedPaths])))

        const existingPaths = new Set(form.customProps.map((p) => p.path))
        const newProps = proposed_custom_properties.filter(
          (p: { path: string }) => !existingPaths.has(p.path)
        )
        if (newProps.length > 0) {
          const allCategories = dimensionCategories as DimensionCategoryConfig[]
          const groups = groupDimensionsByCategory(
            newProps.map((p: { name: string }) => ({ value: p.name, label: p.name })),
            allCategories
          )
          const categoryMap = new Map<string, string>()
          for (const group of groups) {
            for (const dim of group.dimensions) categoryMap.set(dim.value, group.category.id)
          }
          const propsWithCategory: CustomProperty[] = newProps.map(
            (p: { name: string; path: string; type: PropertyType }) => ({
              ...p,
              id: crypto.randomUUID(),
              category: categoryMap.get(p.name),
            })
          )
          updateForm({ customProps: [...form.customProps, ...propsWithCategory] })
        }
      },
    })
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const sortedCustomProps = useMemo(
    () =>
      [...form.customProps.map((prop, idx) => ({ prop, idx }))].sort((a, b) =>
        a.prop.name.localeCompare(b.prop.name)
      ),
    [form.customProps]
  )

  const groupedProps = useMemo(() => {
    const q = propSearch.trim().toLowerCase()
    const filtered = sortedCustomProps.filter(
      ({ prop }) => !q || prop.name.toLowerCase().includes(q) || prop.path.toLowerCase().includes(q)
    )
    const groups = new Map<string, typeof filtered>()
    for (const item of filtered) {
      const key = item.prop.category ?? '__uncategorized__'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    const allCats = dimensionCategories as DimensionCategoryConfig[]
    const catLabel = (id: string) => allCats.find((c) => c.id === id)?.label ?? id
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === '__uncategorized__') return 1
      if (b === '__uncategorized__') return -1
      return catLabel(a).localeCompare(catLabel(b))
    })
  }, [sortedCustomProps, propSearch])

  if (isLoading || filterLoading) return <LoadingState message="Loading schema config…" />

  const {
    userIdField,
    timestampField,
    eventNameField,
    eventsTable,
    userIdentityFields,
    sessionTimeoutMinutes,
    resurrectionWindowDays,
    powerUserThresholdDays,
  } = form

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header row: table picker + detect ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setBrowseOpen((o) => !o)}
            className="font-mono"
          >
            <FolderSearch className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            {eventsTable || 'events'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDetect} disabled={detect.isPending}>
            <ScanSearch className="h-3.5 w-3.5 mr-1.5" />
            {detect.isPending ? 'Detecting…' : 'Detect from Schema'}
          </Button>
        </div>
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
          onRetry={() => upsert.mutate(buildSavePayload(form))}
        />
      </div>

      {browseOpen && (
        <div className="max-w-sm -mt-2">
          <TableBrowserPicker
            connId={connId}
            value={eventsTable}
            onChange={(v) => {
              updateForm({ eventsTable: v })
              setBrowseOpen(false)
            }}
          />
        </div>
      )}

      {detect.isError && <p className="text-sm text-destructive">{detect.error?.message}</p>}

      {/* ── Collapsible sections ── */}
      <div className="rounded-md border overflow-hidden">
        {/* ── Required Fields ── */}
        <SectionHeader
          title="Required Fields"
          open={openSections.fields}
          onToggle={() => toggleSection('fields')}
        />
        {openSections.fields && (
          <>
            {pendingDetections.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 border-b bg-amber-50/80 dark:bg-amber-950/20 border-amber-400/40">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {pendingDetections.length} field{pendingDetections.length !== 1 ? 's' : ''}{' '}
                  detected — review mappings below
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
            )}
            {[
              {
                label: 'User ID',
                fieldKey: 'user_id_field',
                value: userIdField,
                onChange: (v: string) => updateForm({ userIdField: v }),
              },
              {
                label: 'Event Name',
                fieldKey: 'event_name_field',
                value: eventNameField,
                onChange: (v: string) => updateForm({ eventNameField: v }),
              },
              {
                label: 'Timestamp',
                fieldKey: 'timestamp_field',
                value: timestampField,
                onChange: (v: string) => updateForm({ timestampField: v }),
              },
            ].map(({ label, fieldKey, value, onChange }) => {
              const pending = pendingDetections.find((d) => d.fieldKey === fieldKey)
              const isEnabled = value in enabledFields
              return (
                <div
                  key={fieldKey}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 border-b last:border-b-0',
                    pending && 'bg-amber-50/50 dark:bg-amber-950/10'
                  )}
                >
                  <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                  <div className="flex-1 min-w-0">
                    {pending ? (
                      <PendingDetectionRow
                        pending={pending}
                        onAccept={() => acceptDetection(fieldKey)}
                        onReject={() => rejectDetection(fieldKey)}
                      />
                    ) : (
                      <ColumnCombobox
                        value={value}
                        detectedColumns={detectedColumns}
                        onChange={onChange}
                      />
                    )}
                  </div>
                  <FilterToggle
                    enabled={isEnabled}
                    onToggle={() => toggleFilter(value, label, 'Tag')}
                    label={label}
                  />
                </div>
              )
            })}
          </>
        )}

        {/* ── User Identity ── */}
        <div className="border-t" />
        <SectionHeader
          title="User Identity"
          open={openSections.identity}
          onToggle={() => toggleSection('identity')}
          hint="Email, Name, Phone…"
        />
        {openSections.identity && (
          <>
            {USER_IDENTITY_FIELDS.map(({ key, label, icon }) => {
              const mapped = userIdentityFields[key]
              const isMapped = mapped !== null && mapped !== ''
              const isFilterEnabled = isMapped && mapped in enabledFields
              const pending = pendingDetections.find((d) => d.fieldKey === key)
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 border-b last:border-b-0',
                    pending && 'bg-amber-50/50 dark:bg-amber-950/10'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs w-28 shrink-0',
                      !isMapped && !pending && 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                  <div className="flex-1 min-w-0">
                    {pending ? (
                      <PendingDetectionRow
                        pending={pending}
                        onAccept={() => acceptDetection(key)}
                        onReject={() => rejectDetection(key)}
                      />
                    ) : (
                      <ColumnCombobox
                        value={mapped ?? ''}
                        detectedColumns={detectedColumns}
                        onChange={(v) => setUserIdentityField(key, v || null)}
                      />
                    )}
                  </div>
                  <FilterToggle
                    enabled={isFilterEnabled}
                    onToggle={() => isMapped && !pending && toggleFilter(mapped, label, icon)}
                    invisible={!isMapped || !!pending}
                    label={label}
                  />
                  <button
                    type="button"
                    className={cn(
                      'h-7 w-7 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors',
                      (!isMapped || pending) && 'invisible'
                    )}
                    onClick={() => setUserIdentityField(key, null)}
                    aria-label={`Clear ${label}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* ── Properties ── */}
        <div className="border-t" />
        <SectionHeader
          title={`Event Properties${sortedCustomProps.length > 0 ? ` (${sortedCustomProps.length})` : ''}`}
          open={openSections.properties}
          onToggle={() => toggleSection('properties')}
          action={
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={addProp}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          }
        />
        {openSections.properties && (
          <>
            {sortedCustomProps.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No custom properties yet.{' '}
                <button
                  type="button"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                  onClick={handleDetect}
                >
                  Detect from schema
                </button>{' '}
                or{' '}
                <button
                  type="button"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                  onClick={addProp}
                >
                  add one manually
                </button>
                .
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={propSearch}
                    onChange={(e) => setPropSearch(e.target.value)}
                    placeholder="Search properties…"
                    className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  {propSearch && (
                    <button
                      type="button"
                      onClick={() => setPropSearch('')}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {/* Column headers */}
                <div className={`grid ${EVENT_GRID} gap-2 px-3 py-2 border-b bg-muted/30`}>
                  {['Name', 'Path', 'Type', 'Cat.', '', ''].map((h, i) => (
                    <span key={i} className="text-xs font-medium text-muted-foreground">
                      {h}
                    </span>
                  ))}
                </div>
                {/* Grouped rows */}
                {groupedProps.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No properties match &ldquo;{propSearch}&rdquo;
                  </div>
                ) : (
                  groupedProps.map(([categoryId, items]) => {
                    const allCats = dimensionCategories as DimensionCategoryConfig[]
                    const catLabel =
                      categoryId === '__uncategorized__'
                        ? 'Uncategorized'
                        : (allCats.find((c) => c.id === categoryId)?.label ?? categoryId)
                    return (
                      <div key={categoryId}>
                        <div className="px-3 py-1.5 bg-muted/20 border-b text-xs font-medium text-muted-foreground flex items-center gap-2">
                          {catLabel}
                          <span className="text-muted-foreground/60 font-normal">
                            {items.length}
                          </span>
                        </div>
                        {items.map(({ prop, idx }) => {
                          const isEnabled = prop.name in enabledFields
                          return (
                            <div
                              key={prop.id ?? String(idx)}
                              className={`grid ${EVENT_GRID} gap-2 px-3 py-2 border-b last:border-b-0 items-center`}
                            >
                              <Input
                                value={prop.name}
                                onChange={(e) => updateProp(idx, { name: e.target.value })}
                                placeholder="campaign_source"
                                className="h-8 text-sm font-mono"
                              />
                              <ColumnCombobox
                                value={prop.path}
                                detectedColumns={detectedColumns}
                                onChange={(v) => updateProp(idx, { path: v })}
                              />
                              <Select
                                value={prop.type}
                                onValueChange={(v) => updateProp(idx, { type: v as PropertyType })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PROPERTY_TYPES.map((t) => (
                                    <SelectItem key={t} value={t} className="text-xs">
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <CompactCategoryButton
                                value={prop.category ?? null}
                                onChange={(cat) => updateProp(idx, { category: cat ?? undefined })}
                              />
                              <FilterToggle
                                enabled={isEnabled}
                                onToggle={() =>
                                  toggleEventPropFilter(
                                    prop.name,
                                    defaultLabel(prop.name),
                                    prop.category
                                  )
                                }
                                label={prop.name}
                              />
                              <button
                                type="button"
                                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => removeProp(idx)}
                                aria-label={`Remove ${prop.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </>
            )}
          </>
        )}

        {/* ── Advanced ── */}
        <div className="border-t" />
        <SectionHeader
          title="Advanced"
          open={openSections.advanced}
          onToggle={() => toggleSection('advanced')}
          hint={`${sessionTimeoutMinutes}m · ${resurrectionWindowDays}d · ${powerUserThresholdDays}d`}
        />
        {openSections.advanced && (
          <div className="px-3 py-3 space-y-3">
            <div className="flex items-center gap-3">
              <Label
                htmlFor="session_timeout_minutes"
                className="text-sm text-muted-foreground whitespace-nowrap w-44"
              >
                Session timeout
              </Label>
              <Input
                id="session_timeout_minutes"
                type="number"
                min={1}
                max={1440}
                value={sessionTimeoutMinutes}
                onChange={(e) => updateForm({ sessionTimeoutMinutes: Number(e.target.value) })}
                placeholder="30"
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="resurrection_window_days"
                className="text-sm text-muted-foreground whitespace-nowrap w-44"
              >
                Resurrection window
              </Label>
              <Input
                id="resurrection_window_days"
                type="number"
                min={1}
                max={365}
                value={resurrectionWindowDays}
                onChange={(e) => updateForm({ resurrectionWindowDays: Number(e.target.value) })}
                placeholder="30"
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="power_user_threshold_days"
                className="text-sm text-muted-foreground whitespace-nowrap w-44"
              >
                Power user threshold
              </Label>
              <Input
                id="power_user_threshold_days"
                type="number"
                min={1}
                max={31}
                value={powerUserThresholdDays}
                onChange={(e) => updateForm({ powerUserThresholdDays: Number(e.target.value) })}
                placeholder="4"
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">active days</span>
            </div>
          </div>
        )}
      </div>

      {(upsert.isError || upsertFilter.isError) && (
        <p className="text-sm text-destructive">
          {upsert.error?.message ?? upsertFilter.error?.message}
        </p>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSavePayload(form: SchemaFormState) {
  return {
    user_id_field: form.userIdField,
    timestamp_field: form.timestampField,
    event_name_field: form.eventNameField,
    events_table: form.eventsTable,
    custom_properties: form.customProps,
    session_timeout_minutes: form.sessionTimeoutMinutes,
    resurrection_window_days: form.resurrectionWindowDays,
    power_user_threshold_days: form.powerUserThresholdDays,
    ...form.userIdentityFields,
  }
}
