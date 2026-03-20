import { FilterSelect } from '@/components/FilterSelect'
import type { DimensionOption } from '@/types'

interface DimensionTreeSelectProps {
  value: string | null
  onChange: (value: string) => void
  dimensions: DimensionOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'default' | 'sm'
}

/**
 * @deprecated Use FilterSelect with tree={true} mode="single" directly.
 */
export function DimensionTreeSelect({
  value,
  onChange,
  dimensions,
  placeholder = 'Select dimension…',
  disabled = false,
  className,
  size,
}: DimensionTreeSelectProps) {
  return (
    <FilterSelect
      mode="single"
      tree={true}
      options={dimensions}
      value={value}
      onChange={(v) => onChange(v as string)}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      size={size}
    />
  )
}
