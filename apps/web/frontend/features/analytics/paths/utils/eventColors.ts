const STEP_COLORS = [
  'bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))]',
  'bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))]',
  'bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))]',
  'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))]',
  'bg-[hsl(var(--chart-5)/0.15)] text-[hsl(var(--chart-5))]',
  'bg-[hsl(var(--chart-1)/0.10)] text-[hsl(var(--chart-1))]',
]

function hashEventName(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Returns a stable color class string for a given event name. */
export function getEventColor(eventName: string): string {
  return STEP_COLORS[hashEventName(eventName) % STEP_COLORS.length]
}
