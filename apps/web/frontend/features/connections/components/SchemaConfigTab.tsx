import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, ScanSearch, FolderSearch } from 'lucide-react'
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
  useSchemaConfig,
  useUpsertSchemaConfig,
  useDetectSchema,
} from '../hooks/useConnectionsData'
import { TableBrowserPicker } from './TableBrowserPicker'
import dimensionCategories from '@/config/dimension-categories.json'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import type { CustomProperty, PropertyType, DimensionCategoryConfig } from '@/types'

const PROPERTY_TYPES: PropertyType[] = ['string', 'number', 'boolean', 'timestamp']

function CategoryPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
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
          onClick={() => { onChange(null); setOpen(false) }}
        >
          — none —
        </button>
        {(dimensionCategories as DimensionCategoryConfig[]).map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
            onClick={() => { onChange(cat.id); setOpen(false) }}
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
  const [browseOpen, setBrowseOpen] = useState(false)

  const [userIdField, setUserIdField] = useState('user_id')
  const [timestampField, setTimestampField] = useState('timestamp')
  const [eventNameField, setEventNameField] = useState('event_name')
  const [eventsTable, setEventsTable] = useState('events')
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30)
  const [customProps, setCustomProps] = useState<CustomProperty[]>([])

  const initialized = useRef(false)

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

  // Auto-save on any field change (debounced)
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

  function addProp() {
    setCustomProps((prev) => [...prev, { name: '', path: '', type: 'string', category: undefined }])
  }

  function removeProp(idx: number) {
    setCustomProps((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateProp(idx: number, patch: Partial<CustomProperty>) {
    setCustomProps((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function handleDetect() {
    detect.mutate(eventsTable || undefined, {
      onSuccess(result) {
        initialized.current = true
        const { suggestions, proposed_custom_properties, events_table } = result
        if (suggestions.user_id_field) setUserIdField(suggestions.user_id_field)
        if (suggestions.timestamp_field) setTimestampField(suggestions.timestamp_field)
        if (suggestions.event_name_field) setEventNameField(suggestions.event_name_field)
        if (events_table) setEventsTable(events_table)

        const existingPaths = new Set(customProps.map((p) => p.path))
        const newProps = proposed_custom_properties.filter((p) => !existingPaths.has(p.path))
        if (newProps.length > 0) {
          // Auto-suggest categories using regex config
          const allCategories = dimensionCategories as DimensionCategoryConfig[]
          const groups = groupDimensionsByCategory(
            newProps.map((p) => ({ value: p.name, label: p.name })),
            allCategories,
          )
          const categoryMap = new Map<string, string>()
          for (const group of groups) {
            for (const dim of group.dimensions) {
              categoryMap.set(dim.value, group.category.id)
            }
          }
          const propsWithCategory = newProps.map((p) => ({
            ...p,
            category: categoryMap.get(p.name),
          }))
          setCustomProps((prev) => [...prev, ...propsWithCategory])
        }
      },
    })
  }

  if (isLoading) return <LoadingState message="Loading schema config…" />

  return (
    <div className="space-y-6">
      {/* Events table picker */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Events Table</h3>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={eventsTable}
            placeholder="events"
            className="font-mono text-sm text-muted-foreground bg-muted/40 cursor-default max-w-sm"
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
        </div>
        {browseOpen && (
          <div className="max-w-sm">
            <TableBrowserPicker
              connId={connId}
              value={eventsTable}
              onChange={(v) => { setEventsTable(v); setBrowseOpen(false) }}
            />
          </div>
        )}
      </div>

      {/* Core field mappings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Core Field Mappings</h3>
          <div className="flex items-center gap-3">
            {upsert.isPending && (
              <span className="text-xs text-muted-foreground">Saving…</span>
            )}
            {upsert.isSuccess && !upsert.isPending && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
            <Button size="sm" variant="outline" onClick={handleDetect} disabled={detect.isPending}>
              <ScanSearch className="h-3.5 w-3.5 mr-1.5" />
              {detect.isPending ? 'Detecting…' : 'Detect from Schema'}
            </Button>
          </div>
        </div>

        {detect.isError && <p className="text-sm text-destructive">{detect.error?.message}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="user_id_field">User ID Column</Label>
            <Input
              id="user_id_field"
              value={userIdField}
              onChange={(e) => setUserIdField(e.target.value)}
              placeholder="user_id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timestamp_field">Timestamp Column</Label>
            <Input
              id="timestamp_field"
              value={timestampField}
              onChange={(e) => setTimestampField(e.target.value)}
              placeholder="timestamp"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event_name_field">Event Name Column</Label>
            <Input
              id="event_name_field"
              value={eventNameField}
              onChange={(e) => setEventNameField(e.target.value)}
              placeholder="event_name"
            />
          </div>
        </div>

        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="session_timeout_minutes">Session Timeout (minutes)</Label>
          <Input
            id="session_timeout_minutes"
            type="number"
            min={1}
            max={1440}
            value={sessionTimeoutMinutes}
            onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">
            Inactivity gap that starts a new session. Default: 30 min.
          </p>
        </div>
      </div>

      {/* Custom properties */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Custom Properties</h3>
          <Button size="sm" variant="outline" onClick={addProp}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Property
          </Button>
        </div>

        {customProps.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
            No custom properties defined. Use "Detect from Schema" to auto-populate.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_1.5fr_100px_110px_32px] gap-2 px-1">
              {['Name', 'Path', 'Type', 'Category', ''].map((h) => (
                <span key={h} className="text-xs font-medium text-muted-foreground">
                  {h}
                </span>
              ))}
            </div>

            {[...customProps.map((prop, idx) => ({ prop, idx }))].sort((a, b) =>
              a.prop.name.localeCompare(b.prop.name)
            ).map(({ prop, idx }) => (
              <div key={idx} className="grid grid-cols-[1fr_1.5fr_100px_110px_32px] gap-2 items-center">
                <Input
                  value={prop.name}
                  onChange={(e) => updateProp(idx, { name: e.target.value })}
                  placeholder="campaign_source"
                  className="h-8 text-sm"
                />
                <Input
                  value={prop.path}
                  onChange={(e) => updateProp(idx, { path: e.target.value })}
                  placeholder="properties.campaign.source"
                  className="h-8 text-sm font-mono"
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
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeProp(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {upsert.isError && <p className="text-sm text-destructive">{upsert.error?.message}</p>}
    </div>
  )
}
