import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ColumnEntry {
  id: string
  label: string
  visible: boolean
}

interface ColumnPanelProps {
  columns: ColumnEntry[]
  onToggle: (id: string) => void
  onClose: () => void
}

export function ColumnPanel({ columns, onToggle, onClose }: ColumnPanelProps) {
  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-border bg-background shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Columns</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close column panel">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {columns.map((col) => (
          <label
            key={col.id}
            className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent/50"
          >
            <input
              type="checkbox"
              checked={col.visible}
              onChange={() => onToggle(col.id)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span className={cn(!col.visible && 'text-muted-foreground')}>{col.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
