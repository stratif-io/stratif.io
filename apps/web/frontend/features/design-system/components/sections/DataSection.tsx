import { ComponentSection, ComponentRow } from '../ComponentSection'
import { DataTable } from '@/components/data-table'
import { EventsDataTable, generateMockEvents } from '@/components/data-table'
import { EventsTable } from '@/components/events-table/EventsTable'
import { PivotTable } from '@/components/pivot-table/PivotTable'
import type { ColumnDef } from '@tanstack/react-table'

interface SampleRow {
  id: string
  name: string
  value: number
  status: string
}

const sampleColumns: ColumnDef<SampleRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Value' },
  { accessorKey: 'status', header: 'Status' },
]

const sampleRows: SampleRow[] = [
  { id: '1', name: 'page_view', value: 1240, status: 'active' },
  { id: '2', name: 'click', value: 830, status: 'active' },
  { id: '3', name: 'signup', value: 142, status: 'active' },
  { id: '4', name: 'purchase', value: 38, status: 'inactive' },
]

const mockEvents = generateMockEvents(5)

const eventsTableProps = {
  data: [
    { event_id: '1', user_id: 'u1', event_name: 'page_view', timestamp: '2024-01-07T10:00:00Z' },
    { event_id: '2', user_id: 'u2', event_name: 'click', timestamp: '2024-01-07T10:01:00Z' },
    { event_id: '3', user_id: 'u1', event_name: 'signup', timestamp: '2024-01-07T10:02:00Z' },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
  loading: false,
  sortField: 'timestamp',
  sortOrder: 'desc' as const,
  onSortChange: () => {},
  filterFields: [{ field: 'event_name', label: 'Event' }],
  customProperties: [],
  filterOptions: {},
  allEventNames: ['page_view', 'click', 'signup'],
  columnFilters: {},
  onColumnFilterChange: () => {},
  onColumnFilterClear: () => {},
  eventNameFilter: [],
  onEventNameFilterChange: () => {},
  userIdFilter: '',
  onUserIdFilterChange: () => {},
  onPageChange: () => {},
  onUserClick: () => {},
}

export function DataSection() {
  return (
    <ComponentSection id="data" title="Data Display">
      <ComponentRow label="DataTable">
        <div className="w-full border rounded-md overflow-hidden">
          <DataTable columns={sampleColumns} data={sampleRows} />
        </div>
      </ComponentRow>
      <ComponentRow label="EventsDataTable">
        <div className="w-full border rounded-md overflow-hidden">
          <EventsDataTable events={mockEvents} />
        </div>
      </ComponentRow>
      <ComponentRow label="EventsTable">
        <div className="w-full border rounded-md overflow-hidden">
          <EventsTable {...eventsTableProps} />
        </div>
      </ComponentRow>

      <ComponentRow label="PivotTable">
        <div className="w-full border rounded-md overflow-hidden" style={{ height: 400 }}>
          <PivotTable
            colDefsData={{ columnDefs: [
              { field: 'event_name', headerName: 'Event', enableRowGroup: true },
              { field: 'country', headerName: 'Country', enableRowGroup: true, enablePivot: true },
              { field: 'count', headerName: 'Count', enableValue: true, allowedAggFuncs: ['sum'] },
            ] }}
            colDefsLoading={false}
            activeFilters={{}}
            fetchRows={async () => ({ rows: [] })}
            fetchFilterValues={async () => []}
          />
        </div>
      </ComponentRow>
    </ComponentSection>
  )
}
