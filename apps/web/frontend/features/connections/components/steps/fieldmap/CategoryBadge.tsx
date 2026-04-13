import { useState } from 'react'
import {
  Timer,
  Activity,
  CircleUserRound,
  Globe2,
  Laptop,
  Target,
  MoreHorizontal,
  BarChart2,
  type LucideIcon,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import dimensionCategories from '@/config/dimension-categories.json'
import type { DimensionCategoryConfig } from '@/types'

const ICON_MAP: Record<string, LucideIcon> = {
  Timer,
  Activity,
  CircleUserRound,
  Globe2,
  Laptop,
  Target,
  MoreHorizontal,
  BarChart2,
}

// Colour per category id — extend as needed
const CAT_COLOURS: Record<string, string> = {
  metrics: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  time: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  event: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  user: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  geography: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  device: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  marketing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

const FALLBACK_COLOUR = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'

interface Props {
  value: string | null | undefined
  onChange: (v: string | null) => void
}

export function CategoryBadge({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const cats = dimensionCategories as DimensionCategoryConfig[]
  const selected = cats.find((c) => c.id === value)
  const Icon = selected ? (ICON_MAP[selected.icon] ?? null) : null
  const colour = value ? (CAT_COLOURS[value] ?? FALLBACK_COLOUR) : ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={selected?.label ?? 'Set category'}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-colors',
            selected ? colour : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {Icon && <Icon className="h-3 w-3 shrink-0" />}
          <span>{selected?.label ?? 'no category'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <button
          type="button"
          className="w-full rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
          onClick={() => {
            onChange(null)
            setOpen(false)
          }}
        >
          — no category
        </button>
        {cats.map((cat) => {
          const CatIcon = ICON_MAP[cat.icon] ?? null
          return (
            <button
              key={cat.id}
              type="button"
              className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2"
              onClick={() => {
                onChange(cat.id)
                setOpen(false)
              }}
            >
              {CatIcon && <CatIcon className="h-3 w-3 text-muted-foreground" />}
              {cat.label}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
