import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { format, subDays, startOfYear } from 'date-fns'
import { cn } from '@/lib/utils'

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Year to date', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
]

export function DateRangePicker({ value, onChange, className }) {
  const [isOpen, setIsOpen] = useState(false)

  // Ensure we have valid dates
  const fromDate = value?.from ? new Date(value.from) : subDays(new Date(), 30)
  const toDate = value?.to ? new Date(value.to) : new Date()

  const handleFromChange = (e) => {
    const newFrom = e.target.value ? new Date(e.target.value) : null
    onChange({ from: newFrom, to: toDate })
  }

  const handleToChange = (e) => {
    const newTo = e.target.value ? new Date(e.target.value) : null
    onChange({ from: fromDate, to: newTo })
  }

  const applyPreset = (preset) => {
    if (preset.getValue) {
      onChange(preset.getValue())
    } else {
      const to = new Date()
      const from = subDays(to, preset.days)
      onChange({ from, to })
    }
    setIsOpen(false)
  }

  const formatDateForInput = (date) => {
    if (!date) return ''
    return format(date, 'yyyy-MM-dd')
  }

  const displayText = () => {
    if (!fromDate || !toDate) return 'Select date range'
    return `${format(fromDate, 'MMM dd')} - ${format(toDate, 'MMM dd, yyyy')}`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between text-left font-normal min-w-[240px]",
            className
          )}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{displayText()}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-4 space-y-4 min-w-[320px]">
          {/* Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Quick Select
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Custom Range */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Custom Range
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  value={formatDateForInput(fromDate)}
                  onChange={handleFromChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  value={formatDateForInput(toDate)}
                  onChange={handleToChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <Button 
            className="w-full" 
            onClick={() => setIsOpen(false)}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
