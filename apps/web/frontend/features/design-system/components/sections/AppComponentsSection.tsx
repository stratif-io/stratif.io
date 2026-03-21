import { useState } from 'react'
import { ComponentSection, ComponentRow } from '../ComponentSection'
import { DateRangePicker } from '@/components/DateRangePicker'
import { FilterSelect } from '@/components/FilterSelect'
import { DbLogo } from '@/components/DbLogo'
import { FilterBar } from '@/components/shared/FilterBar'
import { GlobalFilters } from '@/components/GlobalFilters'
import { subDays } from 'date-fns'
import type { DateRange } from '@/types'

function DateRangePickerDemo() {
  const [value, setValue] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  return <DateRangePicker value={value} onChange={setValue} />
}

function FilterSelectDemo() {
  const [value, setValue] = useState<string>('page_view')
  return (
    <FilterSelect
      mode="single"
      options={[
        { value: 'page_view', label: 'Page View' },
        { value: 'click', label: 'Click' },
        { value: 'signup', label: 'Signup' },
        { value: 'purchase', label: 'Purchase' },
      ]}
      value={value}
      onChange={(v) => setValue(v as string)}
      placeholder="Select event…"
    />
  )
}

export function AppComponentsSection() {
  return (
    <ComponentSection id="app" title="App Components">
      <ComponentRow label="DateRangePicker">
        <DateRangePickerDemo />
      </ComponentRow>

      <ComponentRow label="FilterSelect (single)">
        <div className="w-48">
          <FilterSelectDemo />
        </div>
      </ComponentRow>

      <ComponentRow label="FilterSelect (multi)">
        <div className="w-48">
          <FilterSelect
            mode="multi"
            options={[
              { value: 'page_view', label: 'Page View' },
              { value: 'click', label: 'Click' },
              { value: 'signup', label: 'Signup' },
              { value: 'purchase', label: 'Purchase' },
            ]}
            value={['page_view', 'click']}
            onChange={() => {}}
            placeholder="Select events…"
          />
        </div>
      </ComponentRow>

      <ComponentRow label="DbLogo">
        <div className="flex items-center gap-4">
          <DbLogo dbType="duckdb" size={28} />
          <DbLogo dbType="postgresql" size={28} />
          <DbLogo dbType="bigquery" size={28} />
          <DbLogo dbType="snowflake" size={28} />
          <DbLogo dbType="databricks" size={28} />
          <DbLogo dbType="clickhouse" size={28} />
          <DbLogo dbType="redshift" size={28} />
          <DbLogo dbType="mysql" size={28} />
          <DbLogo dbType="sqlite" size={28} />
        </div>
      </ComponentRow>

      <ComponentRow label="FilterBar">
        <div className="w-full">
          <FilterBar
            filters={[
              { label: 'Country', value: 'United States', onClear: () => {} },
              { label: 'Browser', value: 'Chrome', onClear: () => {} },
              { label: 'Device', value: 'Desktop', onClear: () => {} },
            ]}
          />
        </div>
      </ComponentRow>

      <ComponentRow label="GlobalFilters">
        <div className="w-full max-w-2xl">
          <GlobalFilters />
        </div>
      </ComponentRow>
    </ComponentSection>
  )
}
