import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { CustomProperty, PropertyType } from '@/types'
import { ColumnCombobox } from './ColumnCombobox'
import { CategoryBadge } from './CategoryBadge'

const PROPERTY_TYPES: PropertyType[] = ['string', 'number', 'boolean', 'timestamp']

interface Props {
  prop: CustomProperty
  colNames: string[]
  filterEnabled: boolean
  onFilterToggle: () => void
  onChange: (patch: Partial<CustomProperty>) => void
  onRemove: () => void
}

export function PropertyCard({
  prop,
  colNames,
  filterEnabled,
  onFilterToggle,
  onChange,
  onRemove,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const typeIdx = PROPERTY_TYPES.indexOf(prop.type)
  const nextType = PROPERTY_TYPES[(typeIdx + 1) % PROPERTY_TYPES.length]

  return (
    <div className="border border-border rounded-lg p-3 bg-card flex flex-col gap-2.5">
      {/* Top row: category badge + filter + menu */}
      <div className="flex items-center justify-between gap-2">
        <CategoryBadge
          value={prop.category}
          onChange={(v) => onChange({ category: v ?? undefined })}
        />
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            type="button"
            onClick={onFilterToggle}
            disabled={!prop.path}
            aria-label={
              filterEnabled
                ? `Remove ${prop.name || 'property'} from filters`
                : `Add ${prop.name || 'property'} to filters`
            }
            className={cn(
              'flex items-center gap-1 group',
              !prop.path && 'opacity-30 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'text-[9px] font-medium transition-colors',
                filterEnabled
                  ? 'text-primary'
                  : 'text-muted-foreground/40 group-hover:text-muted-foreground/70'
              )}
            >
              filter
            </span>
            <span
              className={cn(
                'relative inline-flex w-5 h-3 rounded-full transition-colors shrink-0',
                filterEnabled ? 'bg-primary' : 'bg-muted-foreground/20'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-2 h-2 rounded-full bg-white shadow-sm transition-transform',
                  filterEnabled ? 'translate-x-[9px]' : 'translate-x-0.5'
                )}
              />
            </span>
          </button>

          {/* ⋯ options menu */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Property options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="end">
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setMenuOpen(false)
                  onRemove()
                }}
              >
                Delete property
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Name */}
      <Input
        aria-label="Property name"
        value={prop.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Property name"
        className="h-7 text-xs font-medium"
      />

      {/* Column path combobox */}
      <ColumnCombobox
        value={prop.path}
        detectedColumns={colNames}
        onChange={(v) => onChange({ path: v })}
        placeholder="column.path"
      />

      {/* Type — click to cycle */}
      <button
        type="button"
        onClick={() => onChange({ type: nextType })}
        className="self-start text-[9px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full hover:bg-muted/80 transition-colors"
        aria-label={`Type: ${prop.type}. Click to change.`}
      >
        {prop.type}
      </button>
    </div>
  )
}
