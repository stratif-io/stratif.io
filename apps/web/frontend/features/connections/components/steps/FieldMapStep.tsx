import { useMemo, useState } from 'react'
import {
  Check,
  X,
  ScanSearch,
  Plus,
  Trash2,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Timer,
  Activity,
  CircleUserRound,
  Globe2,
  Laptop,
  Target,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SaveStatus } from '@/components/ui/save-status'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useSchemaForm,
  type PendingDetection,
  type UserIdentityKey,
} from '../../hooks/useSchemaForm'
import { cn } from '@/lib/utils'
import dimensionCategories from '@/config/dimension-categories.json'
import type { CustomProperty, DimensionCategoryConfig, PropertyType } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: {
  key: 'userIdField' | 'eventNameField' | 'timestampField'
  label: string
}[] = [
  { key: 'userIdField', label: 'User ID' },
  { key: 'eventNameField', label: 'Event Name' },
  { key: 'timestampField', label: 'Timestamp' },
]

const USER_IDENTITY_FIELDS = [
  { key: 'email_field' as const, label: 'Email' },
  { key: 'first_name_field' as const, label: 'First Name' },
  { key: 'last_name_field' as const, label: 'Last Name' },
  { key: 'date_of_birth_field' as const, label: 'Date of Birth' },
  { key: 'phone_field' as const, label: 'Phone' },
]

const PROPERTY_TYPES: PropertyType[] = ['string', 'number', 'boolean', 'timestamp']

const EVENT_GRID = 'grid-cols-[1fr_1fr_80px_90px_56px_28px]'

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Timer,
  Activity,
  CircleUserRound,
  Globe2,
  Laptop,
  Target,
  MoreHorizontal,
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FieldMapStepProps {
  connId: string
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-xs p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type column…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-52">
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
  value: string | null | undefined
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = (dimensionCategories as DimensionCategoryConfig[]).find((c) => c.id === value)
  const SelectedIcon = selected ? (CATEGORY_ICON_MAP[selected.icon] ?? null) : null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={selected ? selected.label : 'No category'}
          className={cn(
            'h-7 w-full flex items-center gap-1.5 rounded border border-input px-2 text-xs font-medium hover:bg-accent transition-colors truncate',
            value ? 'text-foreground' : 'text-muted-foreground/40'
          )}
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{selected!.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
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
        {(dimensionCategories as DimensionCategoryConfig[]).map((cat) => {
          const CatIcon = CATEGORY_ICON_MAP[cat.icon] ?? null
          return (
            <button
              key={cat.id}
              type="button"
              className="w-full rounded px-2 py-1 text-left text-xs hover:bg-accent flex items-center gap-2"
              onClick={() => {
                onChange(cat.id)
                setOpen(false)
              }}
            >
              {CatIcon && <CatIcon className="h-3 w-3 shrink-0 text-muted-foreground" />}
              {cat.label}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

function FilterToggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        enabled ? `Remove ${label} from global filters` : `Add ${label} to global filters`
      }
      className="flex items-center gap-1.5 shrink-0 group"
    >
      <span
        className={cn(
          'text-[9px] font-medium transition-colors',
          enabled ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground/70'
        )}
      >
        filter
      </span>
      <span
        className={cn(
          'relative inline-flex w-6 h-3.5 rounded-full transition-colors shrink-0',
          enabled ? 'bg-primary' : 'bg-muted-foreground/20 group-hover:bg-muted-foreground/30'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-primary-foreground shadow-sm transition-transform',
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
        'w-full flex items-center gap-2 px-3 py-2 transition-colors text-left rounded-md',
        open ? 'bg-primary/5 hover:bg-primary/10' : 'bg-muted/20 hover:bg-muted/30'
      )}
    >
      <ChevronDown
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
          open ? 'text-primary' : 'text-muted-foreground',
          !open && '-rotate-90'
        )}
      />
      <span
        className={cn(
          'text-xs font-semibold flex-1',
          open ? 'text-foreground' : 'text-muted-foreground'
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

// ── Component ─────────────────────────────────────────────────────────────────

export function FieldMapStep({ connId }: FieldMapStepProps) {
  const {
    form,
    updateForm,
    pendingDetections,
    detectedColumns,
    detect,
    handleDetect,
    acceptDetection,
    rejectDetection,
    acceptAllDetections,
    enabledFields,
    setEnabledFields,
    upsert,
  } = useSchemaForm(connId)

  const [openSections, setOpenSections] = useState({ identity: false, properties: true })
  const [propSearch, setPropSearch] = useState('')

  const colNames = detectedColumns.map((c) => (typeof c === 'string' ? c : c.name))

  function getPending(key: string): PendingDetection | undefined {
    return pendingDetections.find((d) => d.fieldKey === key)
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
    toggleFilter(field, label, cat?.icon ?? 'MoreHorizontal')
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
    updateForm({
      userIdentityFields: { ...form.userIdentityFields, [key]: value },
    })
    if (value === null && previous) {
      setEnabledFields((prev) => {
        const next = { ...prev }
        delete next[previous]
        return next
      })
    }
  }

  const sortedCustomProps = useMemo(
    () =>
      [...form.customProps.map((prop, idx) => ({ prop, idx }))].sort((a, b) =>
        a.prop.name.localeCompare(b.prop.name)
      ),
    [form.customProps]
  )

  const groupedProps = useMemo(() => {
    const reservedPaths = new Set([
      form.userIdField,
      form.eventNameField,
      form.timestampField,
      ...Object.values(form.userIdentityFields).filter(Boolean),
    ])
    const q = propSearch.trim().toLowerCase()
    const filtered = sortedCustomProps.filter(
      ({ prop }) =>
        !reservedPaths.has(prop.path) &&
        (!q || prop.name.toLowerCase().includes(q) || prop.path.toLowerCase().includes(q))
    )
    const groups = new Map<string, typeof filtered>()
    for (const item of filtered) {
      const key = item.prop.category ?? '__uncategorized__'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    const allCats = dimensionCategories as DimensionCategoryConfig[]
    const catName = (id: string) => allCats.find((c) => c.id === id)?.label ?? id
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === 'other') return 1
      if (b === 'other') return -1
      if (a === '__uncategorized__') return 1
      if (b === '__uncategorized__') return -1
      return catName(a).localeCompare(catName(b))
    })
  }, [
    sortedCustomProps,
    propSearch,
    form.userIdField,
    form.eventNameField,
    form.timestampField,
    form.userIdentityFields,
  ])

  return (
    <div className="space-y-6 p-1">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Field Mapping</h3>
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
            />
          </div>
          {form.eventsTable && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Table: <span className="font-mono text-foreground">{form.eventsTable}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingDetections.length > 0 && (
            <Button size="sm" variant="outline" onClick={acceptAllDetections}>
              Accept All
            </Button>
          )}
          {form.eventsTable && (
            <Button
              size="sm"
              variant="outline"
              data-testid="detect-btn"
              onClick={handleDetect}
              disabled={detect.isPending}
            >
              <ScanSearch className="h-3.5 w-3.5 mr-1.5" />
              {detect.isPending ? 'Detecting…' : 'Detect from schema'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Required Fields ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          Required Fields
        </p>
        {REQUIRED_FIELDS.map(({ key, label }) => {
          const pending = getPending(key)
          const value = form[key]
          return (
            <div
              key={key}
              data-testid={`field-row-${key}`}
              data-suggested={pending ? 'true' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md border px-3 py-2 text-sm',
                pending
                  ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-border'
              )}
            >
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                {label}
              </span>

              {pending ? (
                <>
                  <span className="flex-1 font-mono text-xs text-amber-700 dark:text-amber-400">
                    {pending.proposedColumn}
                  </span>
                  <span className="text-xs text-muted-foreground line-through">{value}</span>
                  <button
                    type="button"
                    data-testid={`accept-${key}`}
                    onClick={() => acceptDetection(key)}
                    className="h-6 w-6 flex items-center justify-center rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                    aria-label="Accept suggestion"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid={`reject-${key}`}
                    onClick={() => rejectDetection(key)}
                    className="h-6 w-6 flex items-center justify-center rounded text-destructive hover:bg-destructive/10"
                    aria-label="Reject suggestion"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex-1">
                  <ColumnCombobox
                    value={value}
                    detectedColumns={colNames}
                    onChange={(v) => updateForm({ [key]: v } as Parameters<typeof updateForm>[0])}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── User Identity ── */}
      <div className="rounded-md border border-border overflow-hidden">
        <SectionHeader
          title="User Identity"
          open={openSections.identity}
          onToggle={() => setOpenSections((s) => ({ ...s, identity: !s.identity }))}
          hint={
            Object.values(form.userIdentityFields).filter(Boolean).length
              ? `${Object.values(form.userIdentityFields).filter(Boolean).length} mapped`
              : undefined
          }
        />
        {openSections.identity && (
          <div className="p-3 space-y-2 border-t border-border">
            {USER_IDENTITY_FIELDS.map(({ key, label }) => {
              const pending = getPending(key)
              const value = form.userIdentityFields[key] ?? ''
              return (
                <div
                  key={key}
                  data-testid={`identity-row-${key}`}
                  className={cn(
                    'flex items-center gap-2',
                    pending &&
                      'rounded-md border border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20 px-2 py-1'
                  )}
                >
                  <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
                  {pending ? (
                    <>
                      <span className="flex-1 font-mono text-xs text-amber-700 dark:text-amber-400">
                        {pending.proposedColumn}
                      </span>
                      <button
                        type="button"
                        onClick={() => acceptDetection(key)}
                        className="h-6 w-6 flex items-center justify-center rounded text-green-600 hover:bg-green-100"
                        aria-label={`Accept ${label}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectDetection(key)}
                        className="h-6 w-6 flex items-center justify-center rounded text-destructive hover:bg-destructive/10"
                        aria-label={`Reject ${label}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <ColumnCombobox
                          value={value}
                          detectedColumns={colNames}
                          onChange={(v) => setUserIdentityField(key, v || null)}
                        />
                      </div>
                      <FilterToggle
                        enabled={!!value && !!enabledFields[value]}
                        onToggle={() => {
                          if (!value) return
                          toggleFilter(value, label, 'CircleUserRound')
                        }}
                        label={label}
                      />
                      {value && (
                        <button
                          type="button"
                          onClick={() => setUserIdentityField(key, null)}
                          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Clear ${label}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Event Properties ── */}
      <div className="rounded-md border border-border overflow-hidden">
        <SectionHeader
          title="Event Properties"
          open={openSections.properties}
          onToggle={() => setOpenSections((s) => ({ ...s, properties: !s.properties }))}
          hint={form.customProps.length ? `${form.customProps.length} props` : undefined}
          action={
            openSections.properties ? (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={addProp}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            ) : undefined
          }
        />
        {openSections.properties && (
          <div className="border-t border-border">
            {/* Search */}
            {form.customProps.length > 4 && (
              <div className="px-3 pt-2 pb-1 relative">
                <Search className="absolute left-5.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground mt-0.5" />
                <Input
                  value={propSearch}
                  onChange={(e) => setPropSearch(e.target.value)}
                  placeholder="Search properties…"
                  className="pl-7 h-7 text-xs"
                />
              </div>
            )}

            {/* Column headers */}
            {form.customProps.length > 0 && (
              <div
                className={cn(
                  'grid gap-1.5 px-3 pt-2 pb-1 text-[10px] text-muted-foreground',
                  EVENT_GRID
                )}
              >
                <span>Name</span>
                <span>Column path</span>
                <span>Type</span>
                <span>Category</span>
                <span>Filter</span>
                <span />
              </div>
            )}

            {/* Rows grouped by category */}
            <div className="px-3 pb-3 space-y-3">
              {groupedProps.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {propSearch
                    ? 'No matching properties.'
                    : 'No event properties yet. Click Add to create one.'}
                </p>
              )}
              {groupedProps.map(([catId, items]) => {
                const allCats = dimensionCategories as DimensionCategoryConfig[]
                const cat = allCats.find((c) => c.id === catId)
                const CatIcon = cat ? (CATEGORY_ICON_MAP[cat.icon] ?? null) : null
                return (
                  <div key={catId} className="space-y-1">
                    {catId !== '__uncategorized__' && (
                      <div className="flex items-center gap-1.5 mt-2 mb-1">
                        {CatIcon && <CatIcon className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {cat?.label ?? catId}
                        </span>
                      </div>
                    )}
                    {items.map(({ prop, idx }) => (
                      <div
                        key={prop.id}
                        data-testid={`prop-row-${idx}`}
                        className={cn('grid gap-1.5 items-center', EVENT_GRID)}
                      >
                        <Input
                          aria-label="Property name"
                          value={prop.name}
                          onChange={(e) => updateProp(idx, { name: e.target.value })}
                          className="h-7 text-xs"
                          placeholder="name"
                        />
                        <ColumnCombobox
                          value={prop.path}
                          detectedColumns={colNames}
                          onChange={(v) => updateProp(idx, { path: v })}
                        />
                        <Select
                          value={prop.type}
                          onValueChange={(v) => updateProp(idx, { type: v as PropertyType })}
                        >
                          <SelectTrigger className="h-7 text-xs">
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
                          onChange={(v) => updateProp(idx, { category: v ?? undefined })}
                        />
                        <FilterToggle
                          enabled={!!prop.path && !!enabledFields[prop.path]}
                          onToggle={() =>
                            toggleEventPropFilter(prop.path, prop.name, prop.category)
                          }
                          label={prop.name || 'property'}
                        />
                        <button
                          type="button"
                          onClick={() => removeProp(idx)}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label="Remove property"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Add button at bottom */}
            <div className="px-3 pb-3 border-t border-border pt-2">
              <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={addProp}>
                <Plus className="h-3 w-3 mr-1.5" />
                Add property
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
