import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ComponentSection, ComponentRow } from '../ComponentSection'
import { DateRangePicker } from '@/components/DateRangePicker'
import { FilterSelect } from '@/components/FilterSelect'
import { TrendMetricPicker } from '@/features/analytics/trends/components/TrendMetricPicker'
import { AggBadge } from '@/components/AggBadge'
import { Button } from '@/components/ui/button'
import { DbLogo } from '@/components/DbLogo'
import { DB_BRAND_COLORS } from '@/lib/db-colors'
import { FilterBar } from '@/components/shared/FilterBar'
import { GlobalFilters, GranularityControl } from '@/components/GlobalFilters'
import { QueryStatusIndicator } from '@/components/layout/QueryStatusIndicator'
import { useAppStore } from '@/stores'
import { DevCard } from '@/components/dev'
import { subDays } from 'date-fns'
import type { DateRange } from '@/types'

function DateRangePickerDemo() {
  const [value, setValue] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  return <DateRangePicker value={value} onChange={setValue} />
}

function DateRangePickerInlineDemo() {
  const [value, setValue] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  return (
    <div className="flex items-center rounded-lg border bg-background shadow-sm overflow-hidden divide-x divide-border px-2">
      <DateRangePicker value={value} onChange={setValue} inlineMode />
    </div>
  )
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

function TrendMetricPickerDemo({
  initialField,
  initialAgg,
  numericDimensions,
}: {
  initialField: string
  initialAgg: string
  numericDimensions: Array<{ value: string; label: string }>
}) {
  const [field, setField] = useState(initialField)
  const [agg, setAgg] = useState(initialAgg)
  return (
    <TrendMetricPicker
      measureField={field}
      aggregation={agg}
      standardMeasures={[
        { value: 'count_events', label: 'Event Count' },
        { value: 'unique_users', label: 'Unique Users' },
      ]}
      numericDimensions={numericDimensions}
      dimensions={[]}
      onChange={(f, a) => {
        setField(f)
        setAgg(a)
      }}
      onAggChange={(a) => setAgg(a)}
    />
  )
}

function QueryStatusIndicatorDemo() {
  const setQueryCounts = useAppStore((s) => s.setQueryCounts)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <QueryStatusIndicator />
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setQueryCounts(3, 2)}>
            3 running · 2 queued
          </Button>
          <Button size="sm" variant="outline" onClick={() => setQueryCounts(1, 0)}>
            1 running
          </Button>
          <Button size="sm" variant="outline" onClick={() => setQueryCounts(0, 0)}>
            all done
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        After "all done", the pill fades out after 3 s. Click a running state to bring it back.
      </p>
    </div>
  )
}

export function AppComponentsSection() {
  return (
    <ComponentSection id="app" title="App Components">
      <ComponentRow label="DateRangePicker">
        <DateRangePickerDemo />
      </ComponentRow>

      <ComponentRow label="DateRangePicker (inlineMode)">
        <DateRangePickerInlineDemo />
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

      <ComponentRow label="FilterSelect (tree)">
        <div className="w-56">
          <FilterSelect
            mode="single"
            tree={true}
            options={[
              { value: 'country', label: 'Country', category: 'Location' },
              { value: 'city', label: 'City', category: 'Location' },
              { value: 'browser', label: 'Browser', category: 'Device' },
              { value: 'os', label: 'OS', category: 'Device' },
              { value: 'event_name', label: 'Event Name', category: 'Event' },
            ]}
            value={null}
            onChange={() => {}}
            placeholder="Select dimension…"
          />
        </div>
      </ComponentRow>

      <ComponentRow label="FilterSelect (disabled options)">
        <div className="w-48">
          <FilterSelect
            mode="single"
            options={[
              { value: 'country', label: 'Country' },
              { value: 'browser', label: 'Browser', disabled: true },
              { value: 'os', label: 'OS', disabled: true },
              { value: 'event_name', label: 'Event Name' },
            ]}
            value={null}
            onChange={() => {}}
            placeholder="Select dimension…"
          />
        </div>
      </ComponentRow>

      <ComponentRow label="FilterSelect (triggerContent)">
        <FilterSelect
          mode="single"
          tree={true}
          options={[
            { value: 'country', label: 'Country', category: 'Location' },
            { value: 'browser', label: 'Browser', category: 'Device' },
            { value: 'browser', label: 'Browser (used)', category: 'Device', disabled: true },
          ]}
          value={null}
          onChange={() => {}}
          triggerContent={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          }
        />
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

      <ComponentRow label="DbLogo (brand colors)">
        <div className="flex items-center gap-4">
          {(
            [
              'duckdb',
              'postgresql',
              'bigquery',
              'snowflake',
              'databricks',
              'clickhouse',
              'redshift',
              'mysql',
              'sqlite',
            ] as const
          ).map((db) => (
            <DbLogo key={db} dbType={db} size={28} style={{ color: DB_BRAND_COLORS[db] }} />
          ))}
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

      <ComponentRow label="GranularityControl">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Active (interactive)</p>
          <div className="flex h-10 rounded-lg border bg-background shadow-sm overflow-hidden w-fit">
            <GranularityControl />
          </div>
          <p className="text-xs text-muted-foreground mt-3">Disabled (not applicable)</p>
          <div className="flex h-10 rounded-lg border bg-background shadow-sm overflow-hidden w-fit">
            <GranularityControl disabled />
          </div>
        </div>
      </ComponentRow>

      <ComponentRow label="QueryStatusIndicator">
        <QueryStatusIndicatorDemo />
      </ComponentRow>

      <ComponentRow label="TrendMetricPicker">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Standard metric selected</p>
            <TrendMetricPickerDemo
              initialField="count_events"
              initialAgg="sum"
              numericDimensions={[]}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Custom numeric metric selected</p>
            <TrendMetricPickerDemo
              initialField="revenue"
              initialAgg="avg"
              numericDimensions={[{ value: 'revenue', label: 'Revenue' }]}
            />
          </div>
        </div>
      </ComponentRow>

      <ComponentRow label="DevCard">
        <div className="flex gap-4 flex-wrap">
          <DevCard
            sql="SELECT event_name, count(*) AS total FROM events GROUP BY 1 ORDER BY 2 DESC LIMIT 10"
            sqlLabels="top events"
            className="w-48 h-28"
          >
            <div className="w-48 h-28 rounded border bg-card flex items-center justify-center text-sm text-muted-foreground">
              Single query card
            </div>
          </DevCard>
          <DevCard
            sql={[
              'SELECT count(*) FROM events WHERE event_name = $1',
              'SELECT count(DISTINCT user_id) FROM events',
            ]}
            sqlLabels={['event count', 'unique users']}
            className="w-48 h-28"
          >
            <div className="w-48 h-28 rounded border bg-card flex items-center justify-center text-sm text-muted-foreground">
              Multi-query card
            </div>
          </DevCard>
        </div>
      </ComponentRow>

      <ComponentRow label="AggBadge">
        <div className="flex gap-2 items-center flex-wrap">
          {(['sum', 'count', 'avg', 'min', 'max', 'countDistinct'] as const).map((agg) => (
            <AggBadge
              key={agg}
              aggFunc={agg}
              allowedAggFuncs={['sum', 'count', 'avg', 'min', 'max', 'countDistinct']}
              onAggChange={() => {}}
            />
          ))}
        </div>
      </ComponentRow>
    </ComponentSection>
  )
}
