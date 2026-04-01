import { useMemo } from 'react'
import { BarChart2, ChevronDown } from 'lucide-react'
import { ValuePickerPopover } from '@/components/ValuePickerPopover'
import type { LeafMeta } from '@/components/pivot-table/types'
import type { DimensionOption } from '@/types'

const CHIP_AGG_LABELS: Record<string, string> = {
  sum: 'Sum',
  count: 'Count',
  avg: 'Avg',
  min: 'Min',
  max: 'Max',
  countDistinct: 'Distinct',
  count_distinct: 'Distinct',
}

export interface TrendMetricPickerProps {
  measureField: string
  aggregation: string
  standardMeasures: DimensionOption[]
  numericDimensions: DimensionOption[]
  dimensions: DimensionOption[]
  onChange: (field: string, agg: string) => void
}

export function TrendMetricPicker({
  measureField,
  aggregation,
  standardMeasures,
  numericDimensions,
  dimensions,
  onChange,
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
          allowedAggFuncs: ['count', 'countDistinct'],
        })
      ),
    ],
    [standardMeasures, numericDimensions, dimensions]
  )

  const chipLabel = useMemo(() => {
    const std = standardMeasures.find((m) => m.value === measureField)
    if (std) return std.label
    const num = numericDimensions.find((d) => d.value === measureField)
    if (num) return `${num.label} (${CHIP_AGG_LABELS[aggregation] ?? aggregation})`
    const dim = dimensions.find((d) => d.value === measureField)
    if (dim) return `${dim.label} (${CHIP_AGG_LABELS[aggregation] ?? aggregation})`
    return measureField
  }, [measureField, aggregation, standardMeasures, numericDimensions, dimensions])

  function handleSelect(colId: string, _label: string, aggFunc: string) {
    // Normalize countDistinct → count_distinct for backend compatibility
    onChange(colId, aggFunc === 'countDistinct' ? 'count_distinct' : aggFunc)
  }

  const trigger = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 bg-muted rounded-md px-2.5 h-7 text-xs font-medium hover:bg-muted/80 transition-colors"
    >
      <BarChart2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span>{chipLabel}</span>
      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
    </button>
  )

  return <ValuePickerPopover leafCols={leafCols} onSelect={handleSelect} trigger={trigger} />
}
