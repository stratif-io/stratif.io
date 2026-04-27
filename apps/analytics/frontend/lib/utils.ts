import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Date for use as an API query parameter.
 * Returns 'yyyy-MM-dd' when the time is exactly midnight (00:00:00),
 * otherwise returns 'yyyy-MM-dd\'T\'HH:mm:ss' to preserve time precision.
 */
export function formatDateParam(d: Date): string {
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    return format(d, 'yyyy-MM-dd')
  }
  return format(d, "yyyy-MM-dd'T'HH:mm:ss")
}
