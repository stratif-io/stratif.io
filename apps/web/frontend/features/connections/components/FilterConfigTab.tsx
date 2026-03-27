import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Globe, Chrome, Monitor, Building, Tag, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/ui/loading-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  useFilterConfig,
  useSchemaConfig,
  useUpsertFilterConfig,
} from '../hooks/useConnectionsData'
import type { FilterField, DimensionCategoryConfig, DimensionOption } from '@/types'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

const ICON_OPTIONS = ['Globe', 'Chrome', 'Monitor', 'Building', 'Tag', 'Layers'] as const

const ICON_MAP: Record<string, LucideIcon> = { Globe, Chrome, Monitor, Building, Tag, Layers }

interface Props {
  connId: string
}

export function FilterConfigTab({ connId }: Props) {
  const { data: schema, isLoading: schemaLoading } = useSchemaConfig(connId)
  const { data: filters, isLoading: filtersLoading } = useFilterConfig(connId)
  const upsert = useUpsertFilterConfig(connId)

  const [enabledFields, setEnabledFields] = useState<
    Record<string, { label: string; icon: string }>
  >({})

  const initialized = useRef(false)

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(CATEGORIES.map((c) => c.id))
  )

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const candidateOptions: DimensionOption[] = schema
    ? [
        { value: schema.user_id_field, label: schema.user_id_field },
        { value: schema.timestamp_field, label: schema.timestamp_field },
        { value: schema.event_name_field, label: schema.event_name_field },
        ...schema.custom_properties.map((p) => ({
          value: p.name,
          label: p.name,
          category: p.category,
        })),
      ]
    : []

  // Sync from saved filter config (initial load only)
  useEffect(() => {
    if (filtersLoading || initialized.current) return
    if (filters) {
      const map: Record<string, { label: string; icon: string }> = {}
      for (const ff of filters.filter_fields) {
        map[ff.field] = { label: ff.label, icon: ff.icon }
      }
      setEnabledFields(map)
    }
    initialized.current = true
  }, [filters, filtersLoading])

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!initialized.current) return
    const timer = setTimeout(() => {
      const filter_fields: FilterField[] = Object.entries(enabledFields).map(
        ([field, { label, icon }]) => ({ field, label, icon })
      )
      upsert.mutate({ filter_fields })
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledFields])

  function toggleField(field: string) {
    setEnabledFields((prev) => {
      const next = { ...prev }
      if (next[field]) {
        delete next[field]
      } else {
        next[field] = {
          label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
          icon: 'Tag',
        }
      }
      return next
    })
  }

  function setLabel(field: string, label: string) {
    setEnabledFields((prev) => ({
      ...prev,
      [field]: { ...prev[field], label },
    }))
  }

  function setIcon(field: string, icon: string) {
    setEnabledFields((prev) => ({
      ...prev,
      [field]: { ...prev[field], icon },
    }))
  }

  if (schemaLoading || filtersLoading) return <LoadingState message="Loading filter config…" />

  if (!schema) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Define a schema mapping first before configuring global filters.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Global Filter Dimensions</h3>
          {upsert.isPending && <span className="text-xs text-muted-foreground">Saving…</span>}
          {upsert.isSuccess && !upsert.isPending && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Select which fields appear as filter dropdowns in the analytics header. Set a label and
          icon for each enabled dimension.
        </p>
      </div>

      {candidateOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
          No fields available. Add custom properties in the Schema tab.
        </p>
      ) : (
        <div className="rounded-md border divide-y">
          {groupDimensionsByCategory(candidateOptions, CATEGORIES).map((group) => {
            const isExpanded = expandedCategories.has(group.category.id)
            return (
              <div key={group.category.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => toggleCategory(group.category.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.category.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {group.dimensions.filter((d) => d.value in enabledFields).length}/
                    {group.dimensions.length}
                  </span>
                </button>
                {isExpanded && (
                  <div className="space-y-2 px-4 pb-3 pt-1">
                    {group.dimensions.map((dim) => {
                      const field = dim.value
                      const isEnabled = field in enabledFields
                      return (
                        <div key={field} className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`filter-${field}`}
                              checked={isEnabled}
                              onCheckedChange={() => toggleField(field)}
                            />
                            <Label
                              htmlFor={`filter-${field}`}
                              className="cursor-pointer font-mono text-sm flex-1"
                            >
                              {field}
                            </Label>
                          </div>
                          {isEnabled && (
                            <div className="ml-7 flex gap-2">
                              <Input
                                value={enabledFields[field].label}
                                onChange={(e) => setLabel(field, e.target.value)}
                                placeholder="Display label"
                                className="h-8 text-sm flex-1"
                              />
                              <Select
                                value={enabledFields[field].icon}
                                onValueChange={(v) => setIcon(field, v)}
                              >
                                <SelectTrigger className="h-8 text-sm w-12">
                                  {(() => {
                                    const Icon = ICON_MAP[enabledFields[field].icon] ?? Tag
                                    return <Icon className="h-3.5 w-3.5" />
                                  })()}
                                </SelectTrigger>
                                <SelectContent>
                                  {ICON_OPTIONS.map((icon) => {
                                    const Icon = ICON_MAP[icon]
                                    return (
                                      <SelectItem key={icon} value={icon}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-3.5 w-3.5" />
                                          {icon}
                                        </div>
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {upsert.isError && <p className="text-sm text-destructive">{upsert.error?.message}</p>}
    </div>
  )
}
