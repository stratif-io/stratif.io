import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { format, subDays, startOfYear } from 'date-fns'
import { cn } from '@/lib/utils'
import type { DateRange } from '@/types'

interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  className?: string
  /** When true, renders as a borderless segment for use inside a filter container */
  inlineMode?: boolean
}

interface PresetConfig {
  label: string
  days?: number
  getValue?: () => DateRange
}

const PRESETS: PresetConfig[] = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Year to date', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: 'All time', getValue: () => ({ from: null, to: null }) },
]

export function DateRangePicker({ value, onChange, className, inlineMode }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const isAllTime = value?.from == null && value?.to == null
  const fromDate = value?.from ? new Date(value.from) : null
  const toDate = value?.to ? new Date(value.to) : null

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value ? new Date(e.target.value) : new Date()
    onChange({ from: newFrom, to: toDate ?? new Date() })
  }

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value ? new Date(e.target.value) : new Date()
    onChange({ from: fromDate ?? subDays(new Date(), 30), to: newTo })
  }

  const applyPreset = (preset: PresetConfig) => {
    if (preset.getValue) {
      onChange(preset.getValue())
    } else if (preset.days !== undefined) {
      const to = new Date()
      const from = subDays(to, preset.days)
      onChange({ from, to })
    }
    setIsOpen(false)
  }

  const displayText = (): string => {
    if (isAllTime) return 'All time'
    if (!fromDate || !toDate) return 'Select range'
    return `${format(fromDate, 'MMM d')} – ${format(toDate, 'MMM d, yyyy')}`
  }

  if (inlineMode) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-muted-foreground',
              'hover:bg-accent/60 hover:text-foreground transition-colors',
              'focus:outline-none',
              'whitespace-nowrap'
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{displayText()}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DatePickerContent
            fromDate={fromDate}
            toDate={toDate}
            isAllTime={isAllTime}
            onFromChange={handleFromChange}
            onToChange={handleToChange}
            onPreset={applyPreset}
            onClose={() => setIsOpen(false)}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-between text-left font-normal sm:min-w-[220px]', className)}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{displayText()}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <DatePickerContent
          fromDate={fromDate}
          toDate={toDate}
          isAllTime={isAllTime}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          onPreset={applyPreset}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function DatePickerContent({
  fromDate,
  toDate,
  isAllTime,
  onFromChange,
  onToChange,
  onPreset,
  onClose,
}: {
  fromDate: Date | null
  toDate: Date | null
  isAllTime: boolean
  onFromChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPreset: (preset: PresetConfig) => void
  onClose: () => void
}) {
  return (
    <div className="p-4 space-y-4 min-w-[260px] sm:min-w-[300px]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick select
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onPreset(preset)}
              className="text-xs font-medium px-2.5 py-1 rounded-md border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Custom range
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              value={fromDate && !isAllTime ? format(fromDate, 'yyyy-MM-dd') : ''}
              onChange={onFromChange}
              disabled={isAllTime}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              value={toDate && !isAllTime ? format(toDate, 'yyyy-MM-dd') : ''}
              onChange={onToChange}
              disabled={isAllTime}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      <Button size="sm" className="w-full" onClick={onClose}>
        Apply
      </Button>
    </div>
  )
}
