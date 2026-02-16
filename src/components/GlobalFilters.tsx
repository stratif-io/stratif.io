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

function CountryFilter() {
  const selectedCountry = useAppStore((state) => state.selectedCountry)
  const setSelectedCountry = useAppStore((state) => state.setSelectedCountry)
  const config = DIMENSION_FILTERS.find((f) => f.id === 'country')!
  const filterOptions = useFilterOptions(config)
  const Icon = ICON_MAP[config.icon]

  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedCountry || 'all'}
        onValueChange={(v) => setSelectedCountry(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-28 h-8">
          <SelectValue placeholder={config.label} />
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
    </div>
  )
}

function BrowserFilter() {
  const selectedBrowser = useAppStore((state) => state.selectedBrowser)
  const setSelectedBrowser = useAppStore((state) => state.setSelectedBrowser)
  const config = DIMENSION_FILTERS.find((f) => f.id === 'browser')!
  const filterOptions = useFilterOptions(config)
  const Icon = ICON_MAP[config.icon]

  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedBrowser || 'all'}
        onValueChange={(v) => setSelectedBrowser(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-28 h-8">
          <SelectValue placeholder={config.label} />
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
    </div>
  )
}

const FILTER_COMPONENTS: Record<string, React.ComponentType> = {
  country: CountryFilter,
  browser: BrowserFilter,
}

export function GlobalFilters() {
  const { dateRange, setDateRange } = useAppStore()

  return (
    <div className="flex items-center gap-3">
      {ENABLE_DATE_FILTER && (
        <DateRangePicker value={dateRange} onChange={setDateRange} className="h-8" />
      )}
      {DIMENSION_FILTERS.map((config) => {
        const FilterComponent = FILTER_COMPONENTS[config.id]
        return FilterComponent ? <FilterComponent key={config.id} /> : null
      })}
    </div>
  )
}
