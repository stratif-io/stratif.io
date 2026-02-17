import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/ui/loading-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFilterConfig, useSchemaConfig, useUpsertFilterConfig } from '../hooks/useConnectionsData'
import type { FilterField } from '@/types'

const ICON_OPTIONS = ['Globe', 'Chrome', 'Monitor', 'Building', 'Tag', 'Layers'] as const

interface Props {
  connId: string
}

export function FilterConfigTab({ connId }: Props) {
  const { data: schema, isLoading: schemaLoading } = useSchemaConfig(connId)
  const { data: filters, isLoading: filtersLoading } = useFilterConfig(connId)
  const upsert = useUpsertFilterConfig(connId)

  // Map field name → {label, icon} for enabled fields
  const [enabledFields, setEnabledFields] = useState<Record<string, { label: string; icon: string }>>({})

  // All candidate field names derived from the schema config
  const candidates: string[] = schema
    ? [
        schema.user_id_field,
        schema.timestamp_field,
        schema.event_name_field,
        ...schema.custom_properties.map((p) => p.name),
      ]
    : []

  // Sync from saved filter config
  useEffect(() => {
    if (!filters) return
    const map: Record<string, { label: string; icon: string }> = {}
    for (const ff of filters.filter_fields) {
      map[ff.field] = { label: ff.label, icon: ff.icon }
    }
    setEnabledFields(map)
  }, [filters])

  function toggleField(field: string) {
    setEnabledFields((prev) => {
      const next = { ...prev }
      if (next[field]) {
        delete next[field]
      } else {
        // Default label: capitalize field name; default icon: Tag
        next[field] = { label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '), icon: 'Tag' }
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

  function handleSave() {
    const filter_fields: FilterField[] = Object.entries(enabledFields).map(
      ([field, { label, icon }]) => ({ field, label, icon })
    )
    upsert.mutate({ filter_fields })
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
        <h3 className="text-sm font-semibold">Global Filter Dimensions</h3>
        <p className="text-sm text-muted-foreground">
          Select which fields appear as filter dropdowns in the analytics header. Set a label and
          icon for each enabled dimension.
        </p>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
          No fields available. Add custom properties in the Schema tab.
        </p>
      ) : (
        <div className="space-y-3 rounded-md border p-4">
          {candidates.map((field) => {
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
                      <SelectTrigger className="h-8 text-sm w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            {icon}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {upsert.isError && (
        <p className="text-sm text-destructive">{upsert.error?.message}</p>
      )}
      {upsert.isSuccess && (
        <p className="text-sm text-green-600">Filter config saved.</p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending || candidates.length === 0}>
          {upsert.isPending ? 'Saving…' : 'Save Filter Config'}
        </Button>
      </div>
    </div>
  )
}
