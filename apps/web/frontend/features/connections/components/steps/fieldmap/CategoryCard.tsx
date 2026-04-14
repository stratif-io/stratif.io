import { useState, useEffect } from 'react'
import { Plus, ChevronDown, ChevronRight, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  expanded?: boolean // when true, force-expand (e.g. after schema detect)
  onFilterToggleProp: (idx: number) => void // toggles filter for a single prop
  onChangeCategory: (newCat: string | null) => void // change category for all props in this group
  onChangeProp: (idx: number, patch: Partial<CustomProperty>) => void
  onAddToCategory: () => void // adds a new blank prop in this category
  onRemoveProp: (idx: number) => void
}

export function CategoryCard({
  category,
  props,
  colNames,
  enabledFields,
  expanded = false,
  onFilterToggleProp,
  onChangeCategory,
  onChangeProp,
  onAddToCategory,
  onRemoveProp,
}: Props) {
  const isNullCategory = category === null
  // All cards collapsed by default; force-expand when detect runs
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    if (expanded) setCollapsed(false)
  }, [expanded])

  return (
    <div className="border border-border rounded-lg bg-card flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-border cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        {isNullCategory ? (
          <span className="text-xs font-medium text-muted-foreground">Other</span>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <CategoryBadge value={category} onChange={(v) => onChangeCategory(v)} />
          </div>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">{props.length}</span>
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
      {/* Per-row category picker */}
      <CategoryBadge
        value={prop.category}
        onChange={(newCat) => onChange({ category: newCat ?? undefined })}
      />
      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove property"
        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
