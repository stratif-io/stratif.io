import { useEffect, useState } from 'react'
import { Plus, Trash2, ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/ui/loading-state'
import { useSchemaConfig, useUpsertSchemaConfig, useDetectSchema } from '../hooks/useConnectionsData'
import type { CustomProperty, PropertyType } from '@/types'

const PROPERTY_TYPES: PropertyType[] = ['string', 'number', 'boolean', 'timestamp']

interface Props {
  connId: string
}

export function SchemaConfigTab({ connId }: Props) {
  const { data, isLoading } = useSchemaConfig(connId)
  const upsert = useUpsertSchemaConfig(connId)
  const detect = useDetectSchema(connId)

  const [userIdField, setUserIdField] = useState('user_id')
  const [timestampField, setTimestampField] = useState('timestamp')
  const [eventNameField, setEventNameField] = useState('event_name')
  const [customProps, setCustomProps] = useState<CustomProperty[]>([])

  useEffect(() => {
    if (data) {
      setUserIdField(data.user_id_field)
      setTimestampField(data.timestamp_field)
      setEventNameField(data.event_name_field)
      setCustomProps(data.custom_properties)
    }
  }, [data])

  function addProp() {
    setCustomProps((prev) => [...prev, { name: '', path: '', type: 'string' }])
  }

  function removeProp(idx: number) {
    setCustomProps((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateProp(idx: number, patch: Partial<CustomProperty>) {
    setCustomProps((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function handleSave() {
    upsert.mutate({
      user_id_field: userIdField,
      timestamp_field: timestampField,
      event_name_field: eventNameField,
      custom_properties: customProps,
    })
  }

  function handleDetect() {
    detect.mutate(undefined, {
      onSuccess(result) {
        const { suggestions, columns } = result
        if (suggestions.user_id_field) setUserIdField(suggestions.user_id_field)
        if (suggestions.timestamp_field) setTimestampField(suggestions.timestamp_field)
        if (suggestions.event_name_field) setEventNameField(suggestions.event_name_field)

        // Add remaining columns as custom properties (skip the three core fields)
        const coreFieldValues = new Set([
          suggestions.user_id_field,
          suggestions.timestamp_field,
          suggestions.event_name_field,
        ])
        const existingPaths = new Set(customProps.map((p) => p.path))
        const newProps: CustomProperty[] = columns
          .filter((c) => !coreFieldValues.has(c.name) && !existingPaths.has(c.name))
          .map((c) => ({
            name: c.name,
            path: c.name,
            type: inferType(c.type),
          }))
        if (newProps.length > 0) {
          setCustomProps((prev) => [...prev, ...newProps])
        }
      },
    })
  }

  if (isLoading) return <LoadingState message="Loading schema config…" />

  return (
    <div className="space-y-6">
      {/* Core field mappings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Core Field Mappings</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDetect}
            disabled={detect.isPending}
          >
            <ScanSearch className="h-3.5 w-3.5 mr-1.5" />
            {detect.isPending ? 'Detecting…' : 'Detect from Schema'}
          </Button>
        </div>

        {detect.isError && (
          <p className="text-sm text-destructive">{detect.error?.message}</p>
        )}

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
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_1.5fr_100px_32px] gap-2 px-1">
              {['Name', 'Path', 'Type', ''].map((h) => (
                <span key={h} className="text-xs font-medium text-muted-foreground">
                  {h}
                </span>
              ))}
            </div>

            {customProps.map((prop, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1.5fr_100px_32px] gap-2 items-center">
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

      {upsert.isError && (
        <p className="text-sm text-destructive">{upsert.error?.message}</p>
      )}
      {upsert.isSuccess && (
        <p className="text-sm text-green-600">Schema config saved.</p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : 'Save Schema Config'}
        </Button>
      </div>
    </div>
  )
}

/** Map a DuckDB/SQL type string to a PropertyType. */
function inferType(sqlType: string): PropertyType {
  const t = sqlType.toUpperCase()
  if (t.includes('INT') || t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('DECIMAL') || t.includes('NUMERIC')) return 'number'
  if (t.includes('BOOL')) return 'boolean'
  if (t.includes('TIMESTAMP') || t.includes('DATE') || t.includes('TIME')) return 'timestamp'
  return 'string'
}
