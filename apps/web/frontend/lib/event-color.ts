const EVENT_PALETTE = [
  {
    dot: 'bg-violet-500',
    ring: 'ring-violet-500/25',
    text: 'text-violet-600 dark:text-violet-400',
  },
  { dot: 'bg-blue-500', ring: 'ring-blue-500/25', text: 'text-blue-600 dark:text-blue-400' },
  { dot: 'bg-cyan-500', ring: 'ring-cyan-500/25', text: 'text-cyan-600 dark:text-cyan-400' },
  { dot: 'bg-success', ring: 'ring-success/25', text: 'text-success' },
  { dot: 'bg-amber-500', ring: 'ring-amber-500/25', text: 'text-amber-600 dark:text-amber-400' },
  {
    dot: 'bg-orange-500',
    ring: 'ring-orange-500/25',
    text: 'text-orange-600 dark:text-orange-400',
  },
  { dot: 'bg-rose-500', ring: 'ring-rose-500/25', text: 'text-rose-600 dark:text-rose-400' },
  { dot: 'bg-pink-500', ring: 'ring-pink-500/25', text: 'text-pink-600 dark:text-pink-400' },
]

export function getEventColor(eventName: string | null | undefined) {
  const s = eventName ?? ''
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) & 0x7fffffff
  }
  return EVENT_PALETTE[hash % EVENT_PALETTE.length]
}
