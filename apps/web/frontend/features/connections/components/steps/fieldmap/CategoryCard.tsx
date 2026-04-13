import { useState } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { CustomProperty, PropertyType } from '@/types'
import { ColumnCombobox } from './ColumnCombobox'
import { CategoryBadge } from './CategoryBadge'

const PROPERTY_TYPES: PropertyType[] = ['string', 'number', 'boolean', 'timestamp']

interface Props {
  category: string | null // null = "no category"
  props: Array<{ prop: CustomProperty; idx: number }>
  colNames: string[]
  enabledFields: Record<string, { label: string; icon: string }>
  onFilterToggleCategory: () => void // toggles filter for all props in this category
  onChangeCategory: (newCat: string | null) => void // change category for all props in this group
  onChangeProp: (idx: number, patch: Partial<CustomProperty>) => void
  onRemoveProp: (idx: number) => void
  onAddToCategory: () => void // adds a new blank prop in this category
}

export function CategoryCard({
  category,
  props,
  colNames,
  enabledFields,
  onFilterToggleCategory,
  onChangeCategory,
  onChangeProp,
  onRemoveProp,
  onAddToCategory,
}: Props) {
  // Determine filter state for the group: any prop with path and enabled → "on"
  const anyEnabled = props.some((p) => p.prop.path && enabledFields[p.prop.path])
  const allHavePath = props.every((p) => !!p.prop.path)

  return (
    <div className="border border-border rounded-lg bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2 border-b border-border">
        <CategoryBadge value={category} onChange={(v) => onChangeCategory(v)} />
        {/* Filter toggle for the whole group */}
        <button
          type="button"
          onClick={onFilterToggleCategory}
          disabled={!allHavePath && props.length === 0}
          aria-label={
            anyEnabled ? 'Disable filters for this group' : 'Enable filters for this group'
          }
          className={cn(
            'flex items-center gap-1 group',
            !allHavePath && props.length > 0 && 'opacity-50'
          )}
        >
          <span
            className={cn(
              'text-[9px] font-medium transition-colors',
              anyEnabled
                ? 'text-primary'
                : 'text-muted-foreground/40 group-hover:text-muted-foreground/70'
            )}
          >
            filter
          </span>
          <span
            className={cn(
              'relative inline-flex w-5 h-3 rounded-full transition-colors shrink-0',
              anyEnabled ? 'bg-primary' : 'bg-muted-foreground/20'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 w-2 h-2 rounded-full bg-white shadow-sm transition-transform',
                anyEnabled ? 'translate-x-[9px]' : 'translate-x-0.5'
              )}
            />
          </span>
        </button>
      </div>

      {/* Property rows */}
      <div className="flex flex-col divide-y divide-border">
        {props.map(({ prop, idx }) => (
          <PropertyRow
            key={prop.id ?? idx}
            prop={prop}
            colNames={colNames}
            onChange={(patch) => onChangeProp(idx, patch)}
            onRemove={() => onRemoveProp(idx)}
          />
        ))}
      </div>

      {/* Footer: add to category */}
      <button
        type="button"
        onClick={onAddToCategory}
        className="flex items-center gap-1 px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors rounded-b-lg"
      >
        <Plus className="h-3 w-3" />
        {category ? `add to ${category}` : 'add uncategorized'}
      </button>
    </div>
  )
}

// ── Compact property row ────────────────────────────────────────────────────

interface RowProps {
  prop: CustomProperty
  colNames: string[]
  onChange: (patch: Partial<CustomProperty>) => void
  onRemove: () => void
}

function PropertyRow({ prop, colNames, onChange, onRemove }: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const typeIdx = PROPERTY_TYPES.indexOf(prop.type)
  const nextType = PROPERTY_TYPES[(typeIdx + 1) % PROPERTY_TYPES.length]

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2">
      <div className="flex items-center gap-1.5">
        {/* Name */}
        <Input
          aria-label="Property name"
          value={prop.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Property name"
          className="h-6 text-xs font-medium flex-1"
        />
        {/* Type badge */}
        <button
          type="button"
          onClick={() => onChange({ type: nextType })}
          className="shrink-0 text-[9px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full hover:bg-muted/80 transition-colors"
          aria-label={`Type: ${prop.type}. Click to change.`}
        >
          {prop.type}
        </button>
        {/* ⋯ menu */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="shrink-0 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
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
      {/* Column path */}
      <ColumnCombobox
        value={prop.path}
        detectedColumns={colNames}
        onChange={(v) => onChange({ path: v })}
        placeholder="column.path"
      />
    </div>
  )
}
