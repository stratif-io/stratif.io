import { useMemo } from 'react'
import { BarChart2, ChevronDown } from 'lucide-react'
import { ValuePickerPopover } from '@/components/ValuePickerPopover'
import { AggBadge } from '@/components/AggBadge'
import type { LeafMeta } from '@/components/pivot-table/types'
import type { DimensionOption } from '@/types'

const DEFAULT_AGG_FUNCS = ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']
const CATEGORICAL_AGG_FUNCS = ['count', 'countDistinct']

export interface TrendMetricPickerProps {
  measureField: string
  aggregation: string
  standardMeasures: DimensionOption[]
  numericDimensions: DimensionOption[]
  dimensions: DimensionOption[]
  onChange: (field: string, agg: string) => void
  onAggChange: (agg: string) => void
}

export function TrendMetricPicker({
  measureField,
  aggregation,
  standardMeasures,
  numericDimensions,
  dimensions,
  onChange,
  onAggChange,
}: TrendMetricPickerProps) {
  const leafCols: LeafMeta[] = useMemo(
    () => [
      ...standardMeasures.map(
        (m): LeafMeta => ({
          colId: m.value,
          label: m.label,
          enableValue: true,
          enableRowGroup: false,
          enablePivot: false,
        })
      ),
      ...numericDimensions.map(
        (d): LeafMeta => ({
          colId: d.value,
          label: d.label,
          enableValue: true,
          enableRowGroup: false,
          enablePivot: false,
        })
      ),
      ...dimensions.map(
        (d): LeafMeta => ({
          colId: d.value,
          label: d.label,
          enableValue: true,
          enableRowGroup: false,
          enablePivot: false,
          allowedAggFuncs: CATEGORICAL_AGG_FUNCS,
        })
      ),
    ],
    [standardMeasures, numericDimensions, dimensions]
  )

  const isStandard = standardMeasures.some((m) => m.value === measureField)
  const isNumeric = numericDimensions.some((d) => d.value === measureField)
  const isCategorical = dimensions.some((d) => d.value === measureField)
  const isCustom = !isStandard

  const chipLabel = useMemo(() => {
    const std = standardMeasures.find((m) => m.value === measureField)
    if (std) return std.label
    const num = numericDimensions.find((d) => d.value === measureField)
    if (num) return num.label
    const dim = dimensions.find((d) => d.value === measureField)
    if (dim) return dim.label
    return measureField
  }, [measureField, standardMeasures, numericDimensions, dimensions])

  const badgeAllowedAggFuncs = isCategorical
    ? CATEGORICAL_AGG_FUNCS
    : isNumeric
      ? DEFAULT_AGG_FUNCS
      : []

  function handleSelect(colId: string, _label: string, aggFunc: string) {
    onChange(colId, aggFunc === 'countDistinct' ? 'count_distinct' : aggFunc)
  }

  const trigger = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 bg-muted rounded-md px-2.5 h-7 text-xs font-medium hover:bg-muted/80 transition-colors"
    >
      <BarChart2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span>{chipLabel}</span>
      {isCustom && badgeAllowedAggFuncs.length > 0 && (
        <span onClick={(e) => e.stopPropagation()}>
          <AggBadge
            aggFunc={aggregation}
            allowedAggFuncs={badgeAllowedAggFuncs}
            onAggChange={onAggChange}
          />
        </span>
      )}
      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
    </button>
  )

  return <ValuePickerPopover leafCols={leafCols} onSelect={handleSelect} trigger={trigger} />
}
