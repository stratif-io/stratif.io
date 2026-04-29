import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ColumnCombobox } from './ColumnCombobox'
import type { PendingDetection } from '@/features/connections/hooks/useSchemaForm'

type RowState = 'suggested' | 'mapped' | 'missing' | 'empty'

interface Props {
  testId: string
  label: string
  required?: boolean
  value: string
  pending: PendingDetection | undefined
  colNames: string[]
  filterEnabled: boolean
  onFilterToggle: () => void
  onAccept: () => void
  onReject: () => void
  onChange: (v: string) => void
  onClear?: () => void
}

function getState(
  value: string,
  pending: PendingDetection | undefined,
  required: boolean
): RowState {
  if (pending) return 'suggested'
  if (value) return 'mapped'
  if (required) return 'missing'
  return 'empty'
}

export function FieldRow({
  testId,
  label,
  required = false,
  value,
  pending,
  colNames,
  filterEnabled,
  onFilterToggle,
  onAccept,
  onReject,
  onChange,
  onClear,
}: Props) {
  const state = getState(value, pending, required)

  const fieldKey = testId.replace(/^(field-row-|identity-row-)/, '')

  return (
    <div
      data-testid={testId}
      data-suggested={state === 'suggested' ? 'true' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5',
        state === 'suggested' && 'border-amber-400/70 bg-amber-50/60 dark:bg-amber-950/20',
        state === 'mapped' && 'border-green-300 bg-green-50/60 dark:bg-green-950/20',
        state === 'missing' && 'border-dashed border-red-300 bg-red-50/60 dark:bg-red-950/20',
        state === 'empty' && 'border-border bg-background'
      )}
    >
      {/* Label + state sub-label */}
      <div className="w-28 shrink-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p
          className={cn(
            'text-[10px] mt-0.5',
            state === 'suggested' && 'text-amber-600',
            state === 'mapped' && 'text-green-600',
            state === 'missing' && 'text-red-500',
            state === 'empty' && 'text-muted-foreground'
          )}
        >
          {state === 'suggested' && 'suggestion pending'}
          {state === 'mapped' && '✓ mapped'}
          {state === 'missing' && 'required · missing'}
          {state === 'empty' && (required ? 'required' : 'optional')}
        </p>
      </div>

      {/* Pending: editable combobox + accept/reject */}
      {state === 'suggested' ? (
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 [&_[data-slot=combobox]]:border-amber-400 [&_[data-slot=combobox]]:bg-amber-50/60 dark:[&_[data-slot=combobox]]:bg-amber-950/20">
            <ColumnCombobox
              value={pending!.proposedColumn}
              detectedColumns={colNames}
              onChange={onChange}
              placeholder="Select column…"
            />
          </div>
          <button
            type="button"
            data-testid={`accept-${fieldKey}`}
            onClick={onAccept}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-green-300 bg-green-50 text-green-600 hover:bg-green-100 shrink-0"
            aria-label={`Accept suggestion for ${label}`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            data-testid={`reject-${fieldKey}`}
            onClick={onReject}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive/50 shrink-0"
            aria-label={`Reject suggestion for ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Normal: combobox */
        <div className="flex-1">
          <ColumnCombobox
            value={value}
            detectedColumns={colNames}
            onChange={onChange}
            placeholder={state === 'empty' ? 'Not mapped' : 'Select column…'}
          />
        </div>
      )}

      {/* Filter toggle — hidden when suggested */}
      {state !== 'suggested' && (
        <button
          type="button"
          onClick={onFilterToggle}
          disabled={!value}
          aria-label={filterEnabled ? `Remove ${label} from filters` : `Add ${label} to filters`}
          className={cn(
            'flex items-center gap-1.5 shrink-0 group',
            !value && 'opacity-30 cursor-not-allowed'
          )}
        >
          <span
            className={cn(
              'text-[9px] font-medium transition-colors',
              filterEnabled
                ? 'text-primary'
                : 'text-muted-foreground/50 group-hover:text-muted-foreground/70'
            )}
          >
            filter
          </span>
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
      )}

      {/* Clear button (optional identity fields only) */}
      {onClear && value && state !== 'suggested' && (
        <button
          type="button"
          onClick={onClear}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label={`Clear ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
