import { format, parseISO } from 'date-fns'
import type { Granularity } from '@/types'

const AXIS_FORMATS: Record<Granularity, string> = {
  hour: 'MMM d ha',
  day: "MMM d, ''yy",
  week: "MMM d, ''yy",
  month: 'MMM yyyy',
  quarter: 'QQQ yyyy',
  year: 'yyyy',
}

const TOOLTIP_FORMATS: Record<Granularity, string> = {
  hour: 'MMM d, yyyy, h:mm a',
  day: 'EEE, MMM d, yyyy',
  week: "'Week of' MMM d, yyyy",
  month: 'MMMM yyyy',
  quarter: 'QQQ yyyy',
  year: 'yyyy',
}

export function formatAxisDate(dateStr: string, granularity: Granularity): string {
  try {
    return format(parseISO(dateStr), AXIS_FORMATS[granularity])
  } catch {
    return dateStr
  }
}

export function formatTooltipDate(dateStr: string, granularity: Granularity): string {
  try {
    return format(parseISO(dateStr), TOOLTIP_FORMATS[granularity])
  } catch {
    return dateStr
  }
}
