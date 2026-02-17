import React from 'react'
import { useAppStore } from '@/stores'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Globe, Chrome, Monitor, Building, Tag, Layers, LucideIcon } from 'lucide-react'
import { useFilterConfig, useFilterOptions } from '@/features/connections/hooks/useConnectionsData'
import type { FilterField } from '@/types'

const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Chrome,
  Monitor,
  Building,
  Tag,
  Layers,
}

function DimensionFilter({
  field,
  options,
}: {
  field: FilterField
  options: string[]
}) {
  const activeFilters = useAppStore((s) => s.activeFilters)
  const setActiveFilter = useAppStore((s) => s.setActiveFilter)

  const value = activeFilters[field.field] ?? null
  const isActive = value !== null
  const Icon = ICON_MAP[field.icon] ?? Tag

  return (
    <Select
      value={value || 'all'}
      onValueChange={(v) => setActiveFilter(field.field, v === 'all' ? null : v)}
    >
      <SelectTrigger
        className={`
          h-9 border-0 shadow-none rounded-none bg-transparent
          gap-1.5 px-3 text-sm font-medium focus:ring-0 focus:ring-offset-0
          hover:bg-accent/60 transition-colors
          ${isActive ? 'text-foreground' : 'text-muted-foreground'}
        `}
        style={{ minWidth: 0, width: 'auto' }}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        <SelectValue placeholder={`All ${field.label.toLowerCase()}s`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {field.label.toLowerCase()}s</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function GlobalFilters() {
  const { dateRange, setDateRange, activeConnectionId } = useAppStore()

  const { data: filterConfig } = useFilterConfig(activeConnectionId ?? '')
  const { data: filterOptions } = useFilterOptions(activeConnectionId ?? '')

  const filterFields = filterConfig?.filter_fields ?? []

  return (
    <div className="flex items-center h-9 rounded-lg border bg-background shadow-sm overflow-hidden divide-x divide-border">
      <DateRangePicker value={dateRange} onChange={setDateRange} inlineMode />
      {filterFields.map((field) => (
        <DimensionFilter
          key={field.field}
          field={field}
          options={filterOptions?.[field.field] ?? []}
        />
      ))}
    </div>
  )
}
