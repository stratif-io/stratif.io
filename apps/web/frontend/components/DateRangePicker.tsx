import { useState, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import type { DateRange as DayPickerRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import {
  format,
  subDays, subWeeks, subMonths, subQuarters,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear,
} from 'date-fns'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores'
import type { DateRange } from '@/types'

// ─── Preset definitions ────────────────────────────────────────────────────

interface Preset {
  id: string
  label: string
  shortLabel?: string
  getValue: () => DateRange
  group: 'rolling' | 'calendar'
}

const WS = { weekStartsOn: 1 } as const  // Monday

function buildPresets(): Preset[] {
  const now = new Date()
  return [
    { id: 'today',        label: 'Today',          group: 'rolling',  getValue: () => ({ from: startOfDay(now), to: endOfDay(now) }) },
    { id: 'yesterday',    label: 'Yesterday',      group: 'rolling',  getValue: () => ({ from: startOfDay(subDays(now,1)), to: endOfDay(subDays(now,1)) }) },
    { id: '7d',           label: 'Last 7 days',    shortLabel: '7D',  group: 'rolling',  getValue: () => ({ from: startOfDay(subDays(now,7)),  to: endOfDay(now) }) },
    { id: '14d',          label: 'Last 14 days',   group: 'rolling',  getValue: () => ({ from: startOfDay(subDays(now,14)), to: endOfDay(now) }) },
    { id: '30d',          label: 'Last 30 days',   shortLabel: '30D', group: 'rolling',  getValue: () => ({ from: startOfDay(subDays(now,30)), to: endOfDay(now) }) },
    { id: '90d',          label: 'Last 90 days',   shortLabel: '90D', group: 'rolling',  getValue: () => ({ from: startOfDay(subDays(now,90)), to: endOfDay(now) }) },
    { id: '6m',           label: 'Last 6 months',  group: 'rolling',  getValue: () => ({ from: startOfDay(subMonths(now,6)),  to: endOfDay(now) }) },
    { id: '12m',          label: 'Last 12 months', group: 'rolling',  getValue: () => ({ from: startOfDay(subMonths(now,12)), to: endOfDay(now) }) },
    { id: 'this_week',    label: 'This week',      group: 'calendar', getValue: () => ({ from: startOfWeek(now,WS), to: endOfDay(now) }) },
    { id: 'last_week',    label: 'Last week',      group: 'calendar', getValue: () => ({ from: startOfWeek(subWeeks(now,1),WS), to: endOfWeek(subWeeks(now,1),WS) }) },
    { id: 'this_month',   label: 'This month',     group: 'calendar', getValue: () => ({ from: startOfMonth(now), to: endOfDay(now) }) },
    { id: 'last_month',   label: 'Last month',     group: 'calendar', getValue: () => ({ from: startOfMonth(subMonths(now,1)), to: endOfMonth(subMonths(now,1)) }) },
    { id: 'this_quarter', label: 'This quarter',   group: 'calendar', getValue: () => ({ from: startOfQuarter(now), to: endOfDay(now) }) },
    { id: 'last_quarter', label: 'Last quarter',   group: 'calendar', getValue: () => ({ from: startOfQuarter(subQuarters(now,1)), to: endOfQuarter(subQuarters(now,1)) }) },
    { id: 'ytd',          label: 'Year to date',   shortLabel: 'YTD', group: 'calendar', getValue: () => ({ from: startOfYear(now), to: endOfDay(now) }) },
    { id: 'all_time',     label: 'All time',       shortLabel: 'All time', group: 'calendar', getValue: () => ({ from: null, to: null }) },
  ]
}

const QUICK_CHIP_IDS = ['7d', '30d', '90d', 'ytd', 'all_time']

// ─── Helpers ──────────────────────────────────────────────────────────────

function hasNonMidnightTime(d: Date | null): boolean {
  if (!d) return false
  return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0
}

function getDisplayText(value: DateRange, presetId: string | null): string {
  if (value.from === null && value.to === null) return 'All time'
  if (!value.from || !value.to) return 'Select range'
  const showTime = presetId === null && (hasNonMidnightTime(value.from) || hasNonMidnightTime(value.to))
  if (showTime) {
    return `${format(value.from, 'MMM d')} – ${format(value.to, "MMM d, yyyy HH:mm:ss")}`
  }
  return `${format(value.from, 'MMM d')} – ${format(value.to, 'MMM d, yyyy')}`
}

function toTimeString(d: Date | null): string {
  if (!d) return '00:00:00'
  return format(d, 'HH:mm:ss')
}

function toDateInputValue(d: Date | null): string {
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

function applyTimeToDate(dateStr: string, timeStr: string): Date {
  const [h, m, s] = timeStr.split(':').map(Number)
  const d = new Date(dateStr)
  d.setHours(h ?? 0, m ?? 0, s ?? 0, 0)
  return d
}

// ─── Component ────────────────────────────────────────────────────────────

interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  className?: string
  inlineMode?: boolean
}

export function DateRangePicker({ value, onChange, className, inlineMode }: DateRangePickerProps) {
  const { presetId, applyPreset } = useAppStore()
  const [open, setOpen] = useState(false)

  const presets = buildPresets()
  const quickChips = presets.filter((p) => QUICK_CHIP_IDS.includes(p.id))
  const rollingPresets = presets.filter((p) => p.group === 'rolling')
  const calendarPresets = presets.filter((p) => p.group === 'calendar')

  // Pending custom range state (local only until Apply)
  const [pending, setPending] = useState<DayPickerRange | undefined>(
    value.from && value.to ? { from: value.from, to: value.to } : undefined
  )
  const [fromTime, setFromTime] = useState(toTimeString(value.from))
  const [toTime, setToTime] = useState(toTimeString(value.to))
  const [fromDateStr, setFromDateStr] = useState(toDateInputValue(value.from))
  const [toDateStr, setToDateStr] = useState(toDateInputValue(value.to))

  // Sync pending state when popover opens
  useEffect(() => {
    if (open) {
      setPending(value.from && value.to ? { from: value.from, to: value.to } : undefined)
      setFromTime(toTimeString(value.from))
      setToTime(toTimeString(value.to))
      setFromDateStr(toDateInputValue(value.from))
      setToDateStr(toDateInputValue(value.to))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePreset(preset: Preset) {
    const range = preset.getValue()
    applyPreset(range, preset.id)
    onChange(range)
    setOpen(false)
  }

  function handleQuickChip(preset: Preset) {
    const range = preset.getValue()
    applyPreset(range, preset.id)
    onChange(range)
  }

  function handleDayPickerSelect(range: DayPickerRange | undefined) {
    if (!range) return
    const from = range.from ?? null
    const to = range.to ?? null
    setPending(range)
    if (from) {
      setFromDateStr(toDateInputValue(from))
      setFromTime('00:00:00')
    }
    if (to) {
      setToDateStr(toDateInputValue(to))
      setToTime('23:59:59')
    }
  }

  function handleApply() {
    const from = fromDateStr ? applyTimeToDate(fromDateStr, fromTime) : null
    const to = toDateStr ? applyTimeToDate(toDateStr, toTime) : null
    applyPreset({ from, to }, null)
    onChange({ from, to })
    setOpen(false)
  }

  function handleFromDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    setFromDateStr(e.target.value)
    if (e.target.value) {
      const d = new Date(e.target.value)
      setPending((prev) => ({ from: d, to: prev?.to }))
    }
  }

  function handleToDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    setToDateStr(e.target.value)
    if (e.target.value) {
      const d = new Date(e.target.value)
      setPending((prev) => ({ from: prev?.from, to: d }))
    }
  }

  // Calendar opening month: show `to` month on right, previous on left
  const calendarMonth = value.to
    ? new Date(value.to.getFullYear(), value.to.getMonth() - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)

  const triggerText = getDisplayText(value, presetId)

  const triggerEl = inlineMode ? (
    <button
      className={cn(
        'flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-muted-foreground',
        'hover:bg-accent/60 hover:text-foreground transition-colors focus:outline-none whitespace-nowrap',
      )}
    >
      <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
      <span>{triggerText}</span>
      <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
    </button>
  ) : (
    <Button
      variant="outline"
      className={cn('justify-between text-left font-normal sm:min-w-[220px]', className)}
    >
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span>{triggerText}</span>
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </Button>
  )

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerEl}</PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3 min-w-[520px]">
            {/* Rolling presets */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Rolling
              </p>
              <div className="flex flex-wrap gap-1">
                {rollingPresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePreset(p)}
                    className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
                      presetId === p.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar-aligned presets */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Calendar
              </p>
              <div className="flex flex-wrap gap-1">
                {calendarPresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePreset(p)}
                    className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
                      presetId === p.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Dual-month calendar */}
            <DayPicker
              mode="range"
              numberOfMonths={2}
              selected={pending}
              onSelect={handleDayPickerSelect}
              month={calendarMonth}
              onMonthChange={() => {}}
            />

            {/* Date + time inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={fromDateStr}
                    onChange={handleFromDateInput}
                    className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <input
                    type="time"
                    step="1"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    className="flex h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={toDateStr}
                    onChange={handleToDateInput}
                    className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <input
                    type="time"
                    step="1"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    className="flex h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            <Button size="sm" className="w-full" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick chips */}
      <div className="flex items-center">
        <span className="w-px h-5 bg-border mx-1.5 shrink-0" aria-hidden />
        {quickChips.map((p) => (
          <button
            key={p.id}
            onClick={() => handleQuickChip(p)}
            className={cn(
              'text-xs font-medium px-2.5 h-9 transition-colors whitespace-nowrap',
              presetId === p.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
            )}
          >
            {p.shortLabel ?? p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
