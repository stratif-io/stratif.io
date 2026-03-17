import { X } from 'lucide-react'

interface FilterChip {
  label: string
  value: string
  onClear: () => void
}

interface FilterBarProps {
  filters: FilterChip[]
}

export function FilterBar({ filters }: FilterBarProps) {
  if (filters.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 px-4 py-1.5 border-b border-border bg-muted/10 items-center">
      {filters.map((f) => (
        <span
          key={f.label}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
        >
          {f.label}: {f.value}
          <button
            onClick={f.onClear}
            className="hover:opacity-70 ml-0.5"
            aria-label={`Clear ${f.label} filter`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
    </div>
  )
}
