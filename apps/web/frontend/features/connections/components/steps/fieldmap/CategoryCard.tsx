import { useState } from 'react'
import { Plus, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
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
  onFilterToggleProp: (idx: number) => void // toggles filter for a single prop
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
  onFilterToggleProp,
  onChangeCategory,
  onChangeProp,
  onRemoveProp,
  onAddToCategory,
}: Props) {
  const isNullCategory = category === null
  // "Other" card (null category): collapsible, collapsed by default
  const [collapsed, setCollapsed] = useState(isNullCategory)

  return (
    <div className="border border-border rounded-lg bg-card flex flex-col">
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-border',
          isNullCategory && 'cursor-pointer select-none hover:bg-muted/30 transition-colors'
        )}
        onClick={isNullCategory ? () => setCollapsed((c) => !c) : undefined}
      >
        {isNullCategory ? (
          <>
            {collapsed ? (
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs font-medium text-muted-foreground">Other</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{props.length}</span>
          </>
        ) : (
          <CategoryBadge value={category} onChange={(v) => onChangeCategory(v)} />
        )}
      </div>

      {/* Property rows (hidden when collapsed) */}
      {!collapsed && (
        <div className="flex flex-col divide-y divide-border">
          {props.map(({ prop, idx }) => {
            const filterEnabled = !!prop.path && !!enabledFields[prop.path]
            return (
              <PropertyRow
                key={prop.id ?? idx}
                prop={prop}
                colNames={colNames}
                filterEnabled={filterEnabled}
                onChange={(patch) => onChangeProp(idx, patch)}
                onFilterToggle={() => onFilterToggleProp(idx)}
                onRemove={() => onRemoveProp(idx)}
              />
            )
          })}
        </div>
      )}

      {/* Footer: add to category (hidden when collapsed) */}
      {!collapsed && (
        <button
          type="button"
          onClick={onAddToCategory}
          className="flex items-center gap-1 px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors rounded-b-lg"
        >
          <Plus className="h-3 w-3" />
          {category ? `add to ${category}` : 'add to Other'}
        </button>
      )}
    </div>
  )
}

// ── Compact property row ────────────────────────────────────────────────────

interface RowProps {
  prop: CustomProperty
  colNames: string[]
  filterEnabled: boolean
  onChange: (patch: Partial<CustomProperty>) => void
  onFilterToggle: () => void
  onRemove: () => void
}

function PropertyRow({
  prop,
  colNames,
  filterEnabled,
  onChange,
  onFilterToggle,
  onRemove,
}: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const typeIdx = PROPERTY_TYPES.indexOf(prop.type)
  const nextType = PROPERTY_TYPES[(typeIdx + 1) % PROPERTY_TYPES.length]

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Name */}
      <Input
        aria-label="Property name"
        value={prop.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Property name"
        className="h-6 text-xs font-medium flex-1 min-w-0"
      />
      {/* Column combobox */}
      <div className="flex-1 min-w-0">
        <ColumnCombobox
          value={prop.path}
          detectedColumns={colNames}
          onChange={(v) => onChange({ path: v })}
          placeholder="column.path"
        />
      </div>
      {/* Type badge */}
      <button
        type="button"
        onClick={() => onChange({ type: nextType })}
        className="shrink-0 text-[9px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full hover:bg-muted/80 transition-colors"
        aria-label={`Type: ${prop.type}. Click to change.`}
      >
        {prop.type}
      </button>
      {/* Filter toggle */}
      <button
        type="button"
        onClick={onFilterToggle}
        disabled={!prop.path}
        aria-label={
          filterEnabled
            ? `Remove ${prop.name || prop.path} from filters`
            : `Add ${prop.name || prop.path} to filters`
        }
        className={cn(
          'shrink-0 flex items-center group',
          !prop.path && 'opacity-30 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'relative inline-flex w-6 h-3.5 rounded-full transition-colors shrink-0',
            filterEnabled ? 'bg-primary' : 'bg-muted-foreground/20'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform',
              filterEnabled ? 'translate-x-[11px]' : 'translate-x-0.5'
            )}
          />
        </span>
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
  )
}
