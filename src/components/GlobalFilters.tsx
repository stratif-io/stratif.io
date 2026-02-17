import React from 'react'
import { useAppStore } from '@/stores'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Globe, Chrome, Monitor, Building, Tag, Layers, LucideIcon } from 'lucide-react'
import { DIMENSION_FILTERS, ENABLE_DATE_FILTER, DimensionFilterConfig } from '@/lib/config/filters'
import { fetchPivotOptions } from '@/lib/api/queries'

const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Chrome,
  Monitor,
  Building,
  Tag,
  Layers,
}

interface FilterOption {
  value: string
  label: string
}

function useFilterOptions(config: DimensionFilterConfig): FilterOption[] {
  const { data: options } = useQuery({
    queryKey: ['pivot-options'],
    queryFn: fetchPivotOptions,
    staleTime: 5 * 60 * 1000,
  })

  if (config.staticOptions) {
    return config.staticOptions.map((opt) => ({ value: opt, label: opt }))
  }

  if (config.optionsEndpoint && config.optionsPath && options) {
    const optionValues = options[config.optionsPath as keyof typeof options] as string[] | undefined
    return (optionValues || []).map((opt) => ({ value: opt, label: opt }))
  }

  return []
}

function DimensionFilter({ config }: { config: DimensionFilterConfig }) {
  const store = useAppStore()
  const filterOptions = useFilterOptions(config)
  const Icon = ICON_MAP[config.icon]

  const value =
    config.id === 'country'
      ? store.selectedCountry
      : config.id === 'browser'
        ? store.selectedBrowser
        : null

  const setValue = (v: string | null) => {
    if (config.id === 'country') store.setSelectedCountry(v)
    else if (config.id === 'browser') store.setSelectedBrowser(v)
  }

  const isActive = value !== null

  return (
    <Select
      value={value || 'all'}
      onValueChange={(v) => setValue(v === 'all' ? null : v)}
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
        <SelectValue placeholder={`All ${config.label.toLowerCase()}s`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {config.label.toLowerCase()}s</SelectItem>
        {filterOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function GlobalFilters() {
  const { dateRange, setDateRange } = useAppStore()
  const enabledFilters = DIMENSION_FILTERS

  return (
    <div className="flex items-center h-9 rounded-lg border bg-background shadow-sm overflow-hidden divide-x divide-border">
      {ENABLE_DATE_FILTER && (
        <DateRangePicker value={dateRange} onChange={setDateRange} inlineMode />
      )}
      {enabledFilters.map((config) => (
        <DimensionFilter key={config.id} config={config} />
      ))}
    </div>
  )
}
